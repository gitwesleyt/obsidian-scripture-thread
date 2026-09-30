import type { App, Editor, TFile } from 'obsidian';
import { applyEdits, convertText, type Conversion, type ConversionOptions } from './convert-text';
import { NoteCreator } from './note-creator';
import type { NoteLocation } from './note-names';
import { heldKey, type HeldReference } from './references';

export type ConversionSummary = {
	filesChanged: number;
	linksCreated: number;
	linksStandardized: number;
	notesCreated: number;
	/** Doubtful dictated references left as text, because nobody said yes to them. */
	referencesHeld: number;
	failedPaths: string[];
	stoppedEarly: boolean;
};

/** What a conversion run needs from the plugin settings. */
export type ConversionSettings = NoteLocation & ConversionOptions;

export type BatchOptions = {
	onProgress?: (done: number, total: number, file: TFile) => void;
	isStopped?: () => boolean;
	/**
	 * The doubtful dictated references that may become links, as `heldKey`s.
	 * Given, every other doubtful one stays text; left out, they all convert.
	 */
	approved?: ReadonlySet<string>;
};

/** A doubtful dictated reference, and the note it is in. */
export type HeldMention = HeldReference & { path: string };

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
		referencesHeld: 0,
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
		referencesHeld: 0,
		failedPaths: [],
		stoppedEarly: false,
	};

	for (const [index, file] of files.entries()) {
		if (options.isStopped?.()) {
			summary.stoppedEarly = true;
			break;
		}

		try {
			const conversion = await convertFile(app, file, withApproval(settings, file, options.approved));
			await ensureChains(creator, conversion, file.path);

			if (conversion.edits.length > 0) summary.filesChanged += 1;
			summary.linksCreated += conversion.chains.length;
			summary.linksStandardized += conversion.standardized;
			summary.referencesHeld += conversion.held.length;
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

	if (summary.referencesHeld > 0) {
		sentences.push(`Left ${count(summary.referencesHeld, 'dictated reference')} as text.`);
	}
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
	const unchanged = convertText(await app.vault.cachedRead(file), options);
	if (unchanged.edits.length === 0) return unchanged;

	let conversion = unchanged;
	await app.vault.process(file, (data) => {
		conversion = convertText(data, options);
		return applyEdits(data, conversion.edits);
	});

	return conversion;
}

/** The options for one note: a doubtful dictated reference converts only where it was approved. */
function withApproval(
	settings: ConversionOptions,
	file: TFile,
	approved: ReadonlySet<string> | undefined,
): ConversionOptions {
	if (!approved) return settings;
	return { ...settings, holdBack: (source) => !approved.has(heldKey(file.path, source)) };
}

/**
 * The doubtful dictated references in these notes, for the writer to answer
 * before a bulk run rewrites them. Reads only; nothing is changed.
 *
 * One entry per note and wording, since an answer is given to both alike.
 */
export async function findHeldReferences(
	app: App,
	settings: ConversionOptions,
	files: readonly TFile[],
	options: BatchOptions = {},
): Promise<HeldMention[]> {
	const held: HeldMention[] = [];

	for (const [index, file] of files.entries()) {
		if (options.isStopped?.()) break;

		const { held: inNote } = convertText(await app.vault.cachedRead(file), {
			...settings,
			holdBack: () => true,
		});
		const seen = new Set<string>();

		for (const reference of inNote) {
			if (seen.has(reference.source)) continue;
			seen.add(reference.source);
			held.push({ ...reference, path: file.path });
		}

		options.onProgress?.(index + 1, files.length, file);
	}

	return held;
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
