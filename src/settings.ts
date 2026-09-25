import { App, Plugin, PluginSettingTab, Setting, SettingGroup } from 'obsidian';
import type { NotesLocation } from './conversion/note-names';
import { FolderSuggest } from './ui/folder-suggest';

export interface ScriptureThreadSettings {
	/** Where every note the plugin creates goes. */
	notesLocation: NotesLocation;
	/** Used only when `notesLocation` is 'folder'. */
	notesFolder: string;
	splitByTestament: boolean;
	/** Which folder the "convert in folder" command scans. */
	conversionFolderLocation: ConversionFolderLocation;
	/** Used only when `conversionFolderLocation` is 'folder'. */
	conversionFolder: string;
	/** Skipped by the whole-vault command only. */
	excludedFolders: string[];
}

export type ConversionFolderLocation = 'current' | 'folder';

export const DEFAULT_SETTINGS: ScriptureThreadSettings = {
	notesLocation: 'folder',
	notesFolder: 'Bible',
	splitByTestament: true,
	conversionFolderLocation: 'current',
	conversionFolder: '',
	excludedFolders: [],
};

const NOTES_LOCATION_LABELS: Record<NotesLocation, string> = {
	root: 'Vault folder',
	current: 'Same folder as current file',
	folder: 'In the folder specified below',
};

const CONVERSION_FOLDER_LABELS: Record<ConversionFolderLocation, string> = {
	current: 'Same folder as current file',
	folder: 'In the folder specified below',
};

export interface SettingsHost extends Plugin {
	settings: ScriptureThreadSettings;
	saveSettings(): Promise<void>;
}

type FolderKey = 'notesFolder' | 'conversionFolder';

/** One section per command, plus the settings every command shares. */
export class ScriptureThreadSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly host: SettingsHost,
	) {
		super(app, host);
	}

	display(): void {
		this.containerEl.empty();

		this.addGeneralSection();
		this.addCurrentNoteSection();
		this.addFolderSection();
		this.addWholeVaultSection();
	}

	private addGeneralSection(): void {
		const group = new SettingGroup(this.containerEl).setHeading('General');
		const { settings } = this.host;

		group.addSetting((setting) => {
			setting
				.setName('Default location for new notes')
				.setDesc(
					'Where new verse, chapter, book and testament notes are placed, for every command. When converting a folder or the whole vault, the current file is each note being converted.',
				)
				.addDropdown((dropdown) =>
					dropdown
						.addOptions(NOTES_LOCATION_LABELS)
						.setValue(settings.notesLocation)
						.onChange(async (value) => {
							settings.notesLocation = value as NotesLocation;
							await this.saveAndRedraw();
						}),
				);
		});

		if (settings.notesLocation === 'folder') {
			group.addSetting((setting) => {
				this.folderPicker(
					setting,
					'Folder to create new notes in',
					'New verse, chapter, book and testament notes will appear in this folder.',
					'notesFolder',
				);
			});
		}

		group.addSetting((setting) => {
			setting
				.setName('Split by testament')
				.setDesc('File new notes into "Old Testament" and "New Testament" subfolders of the location above.')
				.addToggle((toggle) =>
					toggle.setValue(settings.splitByTestament).onChange(async (value) => {
						settings.splitByTestament = value;
						await this.host.saveSettings();
					}),
				);
		});
	}

	private addCurrentNoteSection(): void {
		new SettingGroup(this.containerEl).setHeading('Convert command: Current Note').addSetting((setting) => {
			setting.setDesc(
				'The "convert references in current note" command converts the note open in the editor. It uses only the general settings above, and one undo reverses it.',
			);
		});
	}

	private addFolderSection(): void {
		const group = new SettingGroup(this.containerEl).setHeading('Convert command: References in Folder');
		const { settings } = this.host;

		group.addSetting((setting) => {
			setting
				.setName('Folder to convert')
				.setDesc(
					'Scanned by the "convert references in folder" command, including subfolders. Right-clicking a folder in the file explorer converts that folder instead.',
				)
				.addDropdown((dropdown) =>
					dropdown
						.addOptions(CONVERSION_FOLDER_LABELS)
						.setValue(settings.conversionFolderLocation)
						.onChange(async (value) => {
							settings.conversionFolderLocation = value as ConversionFolderLocation;
							await this.saveAndRedraw();
						}),
				);
		});

		if (settings.conversionFolderLocation === 'folder') {
			group.addSetting((setting) => {
				this.folderPicker(
					setting,
					'Folder to convert references in',
					'The "convert references in folder" command will scan this folder.',
					'conversionFolder',
				);
			});
		}
	}

	private addWholeVaultSection(): void {
		new SettingGroup(this.containerEl).setHeading('Convert command: Whole Vault').addSetting((setting) => {
			setting.settingEl.addClass('scripture-thread-stacked-setting');
			setting
				.setName('Excluded folders')
				.setDesc(
					'Skipped by the "convert references in whole vault" command, which always asks for confirmation first. One folder per line.',
				)
				.addTextArea((textArea) => {
					// Unwrapped, so a long folder path never looks like two entries.
					textArea.inputEl.setAttr('wrap', 'off');
					textArea.inputEl.rows = 4;
					textArea
						.setPlaceholder('Templates\nArchive')
						.setValue(this.host.settings.excludedFolders.join('\n'))
						.onChange(async (value) => {
							this.host.settings.excludedFolders = value
								.split('\n')
								.map((line) => line.trim())
								.filter((line) => line !== '');
							await this.host.saveSettings();
						});
				});
		});
	}

	private folderPicker(setting: Setting, name: string, description: string, key: FolderKey): void {
		setting
			.setName(name)
			.setDesc(description)
			.addSearch((search) => {
				const save = async (value: string) => {
					this.host.settings[key] = value.trim();
					await this.host.saveSettings();
				};

				search.setValue(this.host.settings[key]).onChange(save);
				new FolderSuggest(this.app, search.inputEl).onSelect((folder) => {
					search.setValue(folder.path);
					void save(folder.path);
				});
			});
	}

	private async saveAndRedraw(): Promise<void> {
		await this.host.saveSettings();
		this.display();
	}
}
