import { normalizePath, Plugin } from 'obsidian';
import { registerAll } from './commands';
import { withDefaults, type ScriptureThreadSettings } from './settings-data';

export default class ScriptureThreadPlugin extends Plugin {
	settings: ScriptureThreadSettings = withDefaults(null);
	/** Set by `registerAll`, which wires the verse blocks in. */
	applyVerseBlocks = (): void => {};
	/** Set by `registerAll`, which wires live conversion in. */
	applyLiveConversion = (): void => {};

	async onload() {
		await this.loadSettings();
		registerAll(this);
	}

	async loadSettings() {
		this.settings = withDefaults((await this.loadData()) as Partial<ScriptureThreadSettings> | null);
		normalizeFolders(this.settings);
	}

	async saveSettings() {
		normalizeFolders(this.settings);
		await this.saveData(this.settings);
	}
}

/** Folder paths as the user typed them, cleaned up the same way on every platform. */
function normalizeFolders(settings: ScriptureThreadSettings): void {
	settings.notesFolder = normalizeFolder(settings.notesFolder);
	settings.conversionFolder = normalizeFolder(settings.conversionFolder);
	settings.excludedFolders = settings.excludedFolders.map(normalizeFolder);
}

// `normalizePath('')` is '/', the vault root, where an empty setting means "none chosen".
function normalizeFolder(path: string): string {
	return path.trim() === '' ? '' : normalizePath(path);
}
