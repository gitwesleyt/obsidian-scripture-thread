import { Plugin } from 'obsidian';
import { registerAll } from './commands';
import { DEFAULT_SETTINGS, type ScriptureThreadSettings } from './settings';

export default class ScriptureThreadPlugin extends Plugin {
	settings: ScriptureThreadSettings = { ...DEFAULT_SETTINGS };

	async onload() {
		await this.loadSettings();
		registerAll(this);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<ScriptureThreadSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
