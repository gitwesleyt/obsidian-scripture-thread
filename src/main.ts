import { Plugin } from 'obsidian';
import { registerAll } from './commands';
import { withDefaults, type ScriptureThreadSettings } from './settings-data';

export default class ScriptureThreadPlugin extends Plugin {
	settings: ScriptureThreadSettings = withDefaults(null);
	/** Set by `registerAll`, which wires the verse blocks in. */
	applyVerseBlocks = (): void => {};

	async onload() {
		await this.loadSettings();
		registerAll(this);
	}

	async loadSettings() {
		this.settings = withDefaults((await this.loadData()) as Partial<ScriptureThreadSettings> | null);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
