import { Notice, type Editor, type TFile, type TFolder } from 'obsidian';
import {
	convertEditor,
	convertFiles,
	describeSummary,
	findHeldReferences,
} from '../conversion/run-conversion';
import { markdownFilesIn, vaultFilesExcluding } from '../conversion/scope';
import type { SettingsHost } from '../settings';
import { askAboutDictated } from '../ui/dictated-review';
import { VaultConversionModal } from '../ui/vault-conversion-modal';

export async function convertCurrentNote(
	plugin: SettingsHost,
	editor: Editor,
	file: TFile,
): Promise<void> {
	const summary = await convertEditor(plugin.app, plugin.settings, editor, file);
	new Notice(describeSummary(summary));
}

export async function convertSettingsFolder(plugin: SettingsHost): Promise<void> {
	const folder =
		plugin.settings.conversionFolderLocation === 'current'
			? currentNoteFolder(plugin)
			: specifiedFolder(plugin);

	if (folder) await convertFolder(plugin, folder);
}

function currentNoteFolder(plugin: SettingsHost): TFolder | null {
	const folder = plugin.app.workspace.getActiveFile()?.parent ?? null;

	if (!folder) {
		new Notice('Open a note first. This command converts the folder the current note is in.');
		return null;
	}

	// The root would be the whole vault, without the confirmation or the excluded folders.
	if (folder.isRoot()) {
		new Notice(
			'The current note is in the vault root. Use the whole-vault command, which confirms first and skips excluded folders.',
		);
		return null;
	}

	return folder;
}

function specifiedFolder(plugin: SettingsHost): TFolder | null {
	const folderPath = plugin.settings.conversionFolder.trim();
	const folder = folderPath === '' ? null : plugin.app.vault.getFolderByPath(folderPath);

	if (!folder) new Notice('Choose a folder to convert in the Scripture Thread settings first.');
	return folder;
}

export async function convertFolder(plugin: SettingsHost, folder: TFolder): Promise<void> {
	const files = markdownFilesIn(plugin.app.vault, folder);

	const approved = await approvedDictated(plugin, files, folder);
	if (approved === null) return;

	const progress = new Notice(`Converting Bible references in ${folder.path}…`, 0);
	const summary = await convertFiles(plugin.app, plugin.settings, files, { approved });

	progress.hide();
	new Notice(describeSummary(summary));
}

/**
 * What the writer approved of the doubtful dictated references in these notes:
 * undefined when dictation is not recognized, null when they backed out.
 */
async function approvedDictated(
	plugin: SettingsHost,
	files: readonly TFile[],
	folder: TFolder,
): Promise<Set<string> | null | undefined> {
	if (!plugin.settings.spokenReferences) return undefined;

	const progress = new Notice(`Looking for dictated references in ${folder.path}…`, 0);
	const held = await findHeldReferences(plugin.app, plugin.settings, files);
	progress.hide();

	return held.length === 0 ? new Set<string>() : askAboutDictated(plugin.app, held);
}

export function openVaultConversion(plugin: SettingsHost): void {
	const { excludedFolders } = plugin.settings;
	const files = vaultFilesExcluding(plugin.app.vault, excludedFolders);

	new VaultConversionModal(plugin.app, files.length, excludedFolders, {
		findDictated: plugin.settings.spokenReferences
			? (options) => findHeldReferences(plugin.app, plugin.settings, files, options)
			: undefined,
		convert: (options) => convertFiles(plugin.app, plugin.settings, files, options),
	}).open();
}
