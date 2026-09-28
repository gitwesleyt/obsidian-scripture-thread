import { App, Plugin, PluginSettingTab, Setting, SettingGroup } from 'obsidian';
import type { NotesLocation } from './conversion/note-names';
import type { IgnoreRules, MarkerPair } from './conversion/protected-ranges';
import type { ConversionFolderLocation, ScriptureThreadSettings } from './settings-data';
import { FolderSuggest } from './ui/folder-suggest';

const NOTES_LOCATION_LABELS: Record<NotesLocation, string> = {
	root: 'Vault folder',
	current: 'Same folder as current file',
	folder: 'In the folder specified below',
};

type IgnoreSwitch = Exclude<keyof IgnoreRules, 'markers'>;

const IGNORE_SWITCHES: { key: IgnoreSwitch; name: string; description: string }[] = [
	{ key: 'frontmatter', name: 'Frontmatter', description: 'The properties at the top of a note. If you turn this off, check them afterwards: a link in a property needs quotes around it.' },
	{ key: 'codeBlocks', name: 'Code blocks', description: 'Blocks fenced by ``` or ~~~ lines.' },
	{ key: 'inlineCode', name: 'Inline code', description: 'Text between backticks.' },
	{ key: 'comments', name: 'Obsidian comments', description: 'Text between %% marks, which Obsidian hides when reading.' },
	{ key: 'callouts', name: 'Callouts', description: 'A > [!type] line and the > lines under it.' },
	{
		key: 'curlyBraces',
		name: 'Curly braces',
		description: 'Text inside {braces}, the Bible Verse plugin\'s syntax.',
	},
	{
		key: 'bibleReferenceSyntax',
		name: 'Double-dash references',
		description: 'The Bible Reference plugin\'s --John1:1 syntax.',
	},
];

const CONVERSION_FOLDER_LABELS: Record<ConversionFolderLocation, string> = {
	current: 'Same folder as current file',
	folder: 'In the folder specified below',
};

export interface SettingsHost extends Plugin {
	settings: ScriptureThreadSettings;
	saveSettings(): Promise<void>;
	/** Turns the verse block border on or off everywhere, to match the setting. */
	applyVerseBlocks(): void;
	/** Turns live conversion on or off in every editor, to match the setting. */
	applyLiveConversion(): void;
}

type FolderKey = 'notesFolder' | 'conversionFolder';

/** One section per command, plus the settings every command shares. */
export class ScriptureThreadSettingTab extends PluginSettingTab {
	/** The start field of a marker pair just added, focused once the redraw is done. */
	private fieldToFocus: HTMLInputElement | null = null;
	private focusMarkerIndex: number | null = null;

	constructor(
		app: App,
		private readonly host: SettingsHost,
	) {
		super(app, host);
	}

	display(): void {
		this.containerEl.empty();

		this.addGeneralSection();
		this.addSkippedTextSection();
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

		group.addSetting((setting) => {
			setting
				.setName('Standardize references')
				.setDesc(
					'Show every reference in one standard form: Ps 23:1 becomes Psalm 23:1, and Jn 3.16 becomes John 3:16. Also updates links you have already converted. Where a link points never changes.',
				)
				.addToggle((toggle) =>
					toggle.setValue(settings.standardizeReferences).onChange(async (value) => {
						settings.standardizeReferences = value;
						await this.host.saveSettings();
					}),
				);
		});

		group.addSetting((setting) => {
			setting
				.setName('Convert as you type')
				.setDesc(
					'Turn a reference you type into a link when you leave its line, and create its notes. Undo turns it back into plain text. Uses the skipped-text settings below, and does nothing in the whole-vault excluded folders.',
				)
				.addToggle((toggle) =>
					toggle.setValue(settings.liveConversion).onChange(async (value) => {
						settings.liveConversion = value;
						await this.host.saveSettings();
						this.host.applyLiveConversion();
					}),
				);
		});

		group.addSetting((setting) => {
			setting
				.setName('Verse blocks')
				.setDesc(
					'Draw a border round a paragraph that links to a verse, and the lines you add under it. A blank line closes it.',
				)
				.addToggle((toggle) =>
					toggle.setValue(settings.verseBlocks).onChange(async (value) => {
						settings.verseBlocks = value;
						await this.host.saveSettings();
						this.host.applyVerseBlocks();
					}),
				);
		});

	}

	private addSkippedTextSection(): void {
		const group = new SettingGroup(this.containerEl).setHeading('Convert commands: Skipped Text');
		const { ignore } = this.host.settings;

		group.addSetting((setting) => {
			setting.setDesc(
				'All three convert commands leave these parts of a note alone. Existing links and Markdown links are always skipped, so converting twice is safe.',
			);
		});

		for (const rule of IGNORE_SWITCHES) {
			group.addSetting((setting) => {
				setting
					.setName(rule.name)
					.setDesc(rule.description)
					.addToggle((toggle) =>
						toggle.setValue(ignore[rule.key]).onChange(async (value) => {
							ignore[rule.key] = value;
							await this.host.saveSettings();
						}),
					);
			});
		}

		group.addSetting((setting) => {
			setting
				.setName('Your own markers')
				.setDesc(
					'Text from a start marker to the next end marker is skipped, even across lines. Leave the end empty to skip to the end of the line.',
				)
				.addButton((button) => {
					button.setButtonText('Add marker pair').onClick(() => void this.addMarker());
				});
		});

		ignore.markers.forEach((pair, index) => {
			group.addSetting((setting) => {
				this.markerRow(setting, pair, index);
			});
		});
	}

	private markerRow(setting: Setting, pair: MarkerPair, index: number): void {
		const save = async (key: keyof MarkerPair, value: string) => {
			pair[key] = value;
			await this.host.saveSettings();
		};

		setting
			.setName(`Markers ${index + 1}`)
			.addText((text) => {
				text.setPlaceholder('Start, e.g. %%').setValue(pair.start).onChange((value) => save('start', value));
				if (index === this.focusMarkerIndex) this.fieldToFocus = text.inputEl;
			})
			.addText((text) => text.setPlaceholder('End of line').setValue(pair.end).onChange((value) => save('end', value)))
			.addExtraButton((button) => {
				button
					.setIcon('trash')
					.setTooltip('Remove')
					.onClick(() => void this.changeMarkers((markers) => markers.splice(index, 1)));
			});
	}

	private async addMarker(): Promise<void> {
		const { markers } = this.host.settings.ignore;
		markers.push({ start: '', end: '' });
		this.focusMarkerIndex = markers.length - 1;
		await this.saveAndRedraw();

		this.fieldToFocus?.focus();
		this.fieldToFocus = null;
		this.focusMarkerIndex = null;
	}

	private async changeMarkers(change: (markers: MarkerPair[]) => void): Promise<void> {
		change(this.host.settings.ignore.markers);
		await this.saveAndRedraw();
	}

	private addCurrentNoteSection(): void {
		new SettingGroup(this.containerEl).setHeading('Convert command: Current Note').addSetting((setting) => {
			setting.setDesc(
				'The "convert references in current note" command converts the note open in the editor. It uses the general and skipped-text settings above, and one undo reverses it.',
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
					'Skipped by the "convert references in whole vault" command, which always asks for confirmation first, and by convert as you type. One folder per line.',
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

	/** Redraws for settings that show or hide others, keeping the screen where it was. */
	private async saveAndRedraw(): Promise<void> {
		await this.host.saveSettings();

		const scroller = scrollingAncestor(this.containerEl);
		const scrollTop = scroller?.scrollTop ?? 0;
		this.display();
		if (scroller) scroller.scrollTop = scrollTop;
	}
}

/** The element that scrolls the settings, which `display()` would otherwise send back to the top. */
function scrollingAncestor(el: HTMLElement): HTMLElement | null {
	for (let current: HTMLElement | null = el; current; current = current.parentElement) {
		const { overflowY } = getComputedStyle(current);
		if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
			return current;
		}
	}
	return null;
}
