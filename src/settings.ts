import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	SettingGroup,
	requireApiVersion,
	type SettingDefinitionItem,
} from 'obsidian';
import type { NotesLocation } from './conversion/note-names';
import type { MarkerPair } from './conversion/protected-ranges';
import type { ConversionFolderLocation, ScriptureThreadSettings } from './settings-data';
import { readSetting, settingDefinitions, writeSetting } from './settings-definitions';
import {
	CONVERSION_FOLDER_LABELS,
	EXCLUDED_FOLDERS_PLACEHOLDER,
	HEADINGS,
	IGNORE_SWITCHES,
	MARKER_PLACEHOLDERS,
	NOTES_LOCATION_LABELS,
	TEXT,
} from './settings-text';
import { FolderSuggest } from './ui/folder-suggest';

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

	/**
	 * Obsidian 1.13 and later draws the tab from these and can search them, and
	 * then never calls `display()`, which stays as the fallback for older versions.
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		const { markers } = this.host.settings.ignore;
		const definitions = settingDefinitions(this.host.settings, {
			add: () => {
				markers.push({ start: '', end: '' });
				this.focusMarkerIndex = markers.length - 1;
				void this.saveAndUpdate();
			},
			remove: (index) => {
				markers.splice(index, 1);
				void this.saveAndUpdate();
			},
			changed: () => void this.host.saveSettings(),
			focusIndex: this.focusMarkerIndex,
		});
		this.focusMarkerIndex = null;
		return definitions;
	}

	getControlValue(key: string): unknown {
		return readSetting(this.host.settings, key);
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		writeSetting(this.host.settings, key, value);
		await this.host.saveSettings();

		if (key === 'liveConversion') this.host.applyLiveConversion();
		if (key === 'verseBlocks') this.host.applyVerseBlocks();
		// Each shows or hides another setting. Only 1.13, which draws from definitions, calls this.
		const showsMore =
			key === 'notesLocation' || key === 'conversionFolderLocation' || key === 'spokenReferences';
		if (requireApiVersion('1.13.0') && showsMore) this.refreshDomState();
	}

	private async saveAndUpdate(): Promise<void> {
		await this.host.saveSettings();
		if (requireApiVersion('1.13.0')) this.update();
	}

	display(): void {
		this.draw();
	}

	/** The tab for Obsidian before 1.13, which has no `getSettingDefinitions()`. */
	private draw(): void {
		this.containerEl.empty();

		this.addGeneralSection();
		this.addSkippedTextSection();
		this.addCurrentNoteSection();
		this.addFolderSection();
		this.addWholeVaultSection();
	}

	private addGeneralSection(): void {
		const group = new SettingGroup(this.containerEl);
		const { settings } = this.host;

		group.addSetting((setting) => {
			setting
				.setName(TEXT.notesLocation.name)
				.setDesc(
					TEXT.notesLocation.desc,
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
					TEXT.notesFolder.name,
					TEXT.notesFolder.desc,
					'notesFolder',
				);
			});
		}

		group.addSetting((setting) => {
			setting
				.setName(TEXT.splitByTestament.name)
				.setDesc(TEXT.splitByTestament.desc)
				.addToggle((toggle) =>
					toggle.setValue(settings.splitByTestament).onChange(async (value) => {
						settings.splitByTestament = value;
						await this.host.saveSettings();
					}),
				);
		});

		group.addSetting((setting) => {
			setting
				.setName(TEXT.standardizeReferences.name)
				.setDesc(
					TEXT.standardizeReferences.desc,
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
				.setName(TEXT.spokenReferences.name)
				.setDesc(TEXT.spokenReferences.desc)
				.addToggle((toggle) =>
					toggle.setValue(settings.spokenReferences).onChange(async (value) => {
						settings.spokenReferences = value;
						// Shows or hides the switch under it.
						await this.saveAndRedraw();
					}),
				);
		});

		if (settings.spokenReferences) {
			group.addSetting((setting) => {
				setting
					.setName(TEXT.standardizeDictated.name)
					.setDesc(TEXT.standardizeDictated.desc)
					.addToggle((toggle) =>
						toggle.setValue(settings.standardizeDictated).onChange(async (value) => {
							settings.standardizeDictated = value;
							await this.host.saveSettings();
						}),
					);
			});
		}

		group.addSetting((setting) => {
			setting
				.setName(TEXT.liveConversion.name)
				.setDesc(
					TEXT.liveConversion.desc,
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
				.setName(TEXT.verseBlocks.name)
				.setDesc(
					TEXT.verseBlocks.desc,
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
		const group = new SettingGroup(this.containerEl).setHeading(HEADINGS.skippedText);
		const { ignore } = this.host.settings;

		group.addSetting((setting) => {
			setting.setDesc(
				TEXT.skippedText.desc,
			);
		});

		for (const rule of IGNORE_SWITCHES) {
			group.addSetting((setting) => {
				setting
					.setName(rule.name)
					.setDesc(rule.desc)
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
				.setName(TEXT.markers.name)
				.setDesc(
					TEXT.markers.desc,
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
				text.setPlaceholder(MARKER_PLACEHOLDERS.start).setValue(pair.start).onChange((value) => save('start', value));
				if (index === this.focusMarkerIndex) this.fieldToFocus = text.inputEl;
			})
			.addText((text) => text.setPlaceholder(MARKER_PLACEHOLDERS.end).setValue(pair.end).onChange((value) => save('end', value)))
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
		new SettingGroup(this.containerEl).setHeading(HEADINGS.currentNote).addSetting((setting) => {
			setting.setDesc(
				TEXT.currentNote.desc,
			);
		});
	}

	private addFolderSection(): void {
		const group = new SettingGroup(this.containerEl).setHeading(HEADINGS.folder);
		const { settings } = this.host;

		group.addSetting((setting) => {
			setting
				.setName(TEXT.conversionFolderLocation.name)
				.setDesc(
					TEXT.conversionFolderLocation.desc,
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
					TEXT.conversionFolder.name,
					TEXT.conversionFolder.desc,
					'conversionFolder',
				);
			});
		}
	}

	private addWholeVaultSection(): void {
		new SettingGroup(this.containerEl).setHeading(HEADINGS.wholeVault).addSetting((setting) => {
			setting.settingEl.addClass('scripture-thread-stacked-setting');
			setting
				.setName(TEXT.excludedFolders.name)
				.setDesc(
					TEXT.excludedFolders.desc,
				)
				.addTextArea((textArea) => {
					// Unwrapped, so a long folder path never looks like two entries.
					textArea.inputEl.setAttr('wrap', 'off');
					textArea.inputEl.rows = 4;
					textArea
						.setPlaceholder(EXCLUDED_FOLDERS_PLACEHOLDER)
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
		this.draw();
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
