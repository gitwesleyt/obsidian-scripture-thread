import type { App, Editor, TFile } from 'obsidian';
import { applyEdits, convertText, type Conversion, type ConversionOptions } from './convert-text';
import { NoteCreator } from './note-creator';
import type { NoteLocation } from './note-names';

export type ConversionSummary = {
	filesChanged: number;
	linksCreated: number;
	linksStandardized: number;
	notesCreated: number;
	failedPaths: string[];
	stoppedEarly: boolean;
};

/** What a conversion run needs from the plugin settings. */
export type ConversionSettings = NoteLocation & ConversionOptions;

export type BatchOptions = {
	onProgress?: (done: number, total: number, file: TFile) => void;
	isStopped?: () => boolean;
};

/**
 * The open note, edited through the editor in one transaction so a single
 * Ctrl+Z puts it back.
 */
export async function convertEditor(
	app: App,
	settings: ConversionSettings,
	editor: Editor,
	file: TFile,
): Promise<ConversionSummary> {
	const conversion = convertText(editor.getValue(), settings);

	if (conversion.edits.length > 0) {
		// Last edit first, so each position is still right whichever way the changes are applied.
		const changes = [...conversion.edits].reverse().map((edit) => ({
			from: editor.offsetToPos(edit.from),
			to: editor.offsetToPos(edit.to),
			text: edit.insert,
		}));
		editor.transaction({ changes });
	}

	const creator = new NoteCreator(app, settings);
	await ensureChains(creator, conversion, file.path);

	return {
		filesChanged: conversion.edits.length > 0 ? 1 : 0,
		linksCreated: conversion.chains.length,
		linksStandardized: conversion.standardized,
		notesCreated: creator.createdCount,
		failedPaths: [],
		stoppedEarly: false,
	};
}

/** Files on disk, one at a time. A failure in one file is recorded and the run goes on. */
export async function convertFiles(
	app: App,
	settings: ConversionSettings,
	files: readonly TFile[],
	options: BatchOptions = {},
): Promise<ConversionSummary> {
	const creator = new NoteCreator(app, settings);
	const summary: ConversionSummary = {
		filesChanged: 0,
		linksCreated: 0,
		linksStandardized: 0,
		notesCreated: 0,
		failedPaths: [],
		stoppedEarly: false,
	};

	for (const [index, file] of files.entries()) {
		if (options.isStopped?.()) {
			summary.stoppedEarly = true;
			break;
		}

		try {
			const conversion = await convertFile(app, file, settings);
			await ensureChains(creator, conversion, file.path);

			if (conversion.edits.length > 0) summary.filesChanged += 1;
			summary.linksCreated += conversion.chains.length;
			summary.linksStandardized += conversion.standardized;
		} catch {
			summary.failedPaths.push(file.path);
		}

		options.onProgress?.(index + 1, files.length, file);
	}

	summary.notesCreated = creator.createdCount;
	return summary;
}

export function describeSummary(summary: ConversionSummary): string {
	const standardized =
		summary.linksStandardized > 0
			? ` and standardized ${count(summary.linksStandardized, 'link')}`
			: '';
	const sentences = [
		`Converted ${count(summary.linksCreated, 'reference')}${standardized}` +
			` in ${count(summary.filesChanged, 'note')}` +
			` and created ${count(summary.notesCreated, 'new note')}.`,
	];

	if (summary.stoppedEarly) sentences.push('Stopped before the end.');
	if (summary.failedPaths.length > 0) sentences.push(describeFailures(summary.failedPaths));

	return sentences.join(' ');
}

const FAILURES_NAMED = 3;

function describeFailures(paths: readonly string[]): string {
	const named = paths.slice(0, FAILURES_NAMED).join(', ');
	const rest = paths.length - FAILURES_NAMED;
	return `Could not convert ${named}${rest > 0 ? ` and ${rest} more` : ''}.`;
}

/**
 * Read first and write only when something changes, so a vault-wide run does not
 * touch the modified time of every note that had nothing to convert.
 */
async function convertFile(app: App, file: TFile, options: ConversionOptions): Promise<Conversion> {
	const unchanged: Conversion = { edits: [], chains: [], standardized: 0 };
	if (convertText(await app.vault.cachedRead(file), options).edits.length === 0) return unchanged;

	let conversion = unchanged;
	await app.vault.process(file, (data) => {
		conversion = convertText(data, options);
		return applyEdits(data, conversion.edits);
	});

	return conversion;
}

async function ensureChains(
	creator: NoteCreator,
	conversion: Conversion,
	sourcePath: string,
): Promise<void> {
	for (const chain of conversion.chains) await creator.ensureChain(chain, sourcePath);
}

function count(amount: number, noun: string): string {
	return `${amount} ${noun}${amount === 1 ? '' : 's'}`;
}
