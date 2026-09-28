import type { Setting, SettingDefinition, SettingDefinitionItem } from 'obsidian';
import type { NotesLocation } from './conversion/note-names';
import type { MarkerPair } from './conversion/protected-ranges';
import type { ConversionFolderLocation, ScriptureThreadSettings } from './settings-data';
import {
	CONVERSION_FOLDER_LABELS,
	EXCLUDED_FOLDERS_PLACEHOLDER,
	HEADINGS,
	IGNORE_SWITCHES,
	MARKER_PLACEHOLDERS,
	NOTES_LOCATION_LABELS,
	TEXT,
	type IgnoreSwitch,
} from './settings-text';

/** What the marker rows need from the settings tab. */
export type MarkerActions = {
	add(): void;
	remove(index: number): void;
	/** A field of a pair changed; the pair is already updated. */
	changed(): void;
	/** The pair whose start field should take the focus when drawn, if any. */
	focusIndex: number | null;
};

/**
 * The settings tab as Obsidian 1.13's declarative definitions, which make every
 * setting searchable. Values go through `readSetting` and `writeSetting`.
 */
export function settingDefinitions(
	settings: ScriptureThreadSettings,
	markers: MarkerActions,
): SettingDefinitionItem[] {
	return [
		{
			type: 'group',
			heading: HEADINGS.general,
			items: [
				{ ...TEXT.notesLocation, control: { type: 'dropdown', key: 'notesLocation', options: NOTES_LOCATION_LABELS } },
				{
					...TEXT.notesFolder,
					control: { type: 'folder', key: 'notesFolder', placeholder: 'Bible' },
					visible: () => settings.notesLocation === 'folder',
				},
				toggle(TEXT.splitByTestament, 'splitByTestament'),
				toggle(TEXT.standardizeReferences, 'standardizeReferences'),
				toggle(TEXT.liveConversion, 'liveConversion'),
				toggle(TEXT.verseBlocks, 'verseBlocks'),
			],
		},
		{
			type: 'group',
			heading: HEADINGS.skippedText,
			items: [
				{ ...TEXT.skippedText, searchable: false },
				...IGNORE_SWITCHES.map((rule) => toggle(rule, `ignore.${rule.key}`)),
				TEXT.markers,
			],
		},
		{
			type: 'list',
			emptyState: 'No markers yet.',
			addItem: { name: 'Add marker pair', action: () => markers.add() },
			onDelete: (index) => markers.remove(index),
			items: settings.ignore.markers.map((pair, index) => markerRow(pair, index, markers)),
		},
		{
			type: 'group',
			heading: HEADINGS.currentNote,
			items: [{ ...TEXT.currentNote, searchable: false }],
		},
		{
			type: 'group',
			heading: HEADINGS.folder,
			items: [
				{
					...TEXT.conversionFolderLocation,
					control: { type: 'dropdown', key: 'conversionFolderLocation', options: CONVERSION_FOLDER_LABELS },
				},
				{
					...TEXT.conversionFolder,
					control: { type: 'folder', key: 'conversionFolder' },
					visible: () => settings.conversionFolderLocation === 'folder',
				},
			],
		},
		{
			type: 'group',
			heading: HEADINGS.wholeVault,
			items: [
				{
					...TEXT.excludedFolders,
					control: { type: 'textarea', key: 'excludedFolders', rows: 4, placeholder: EXCLUDED_FOLDERS_PLACEHOLDER },
				},
			],
		},
	];
}

function toggle(text: { name: string; desc: string }, key: SettingKey): SettingDefinition {
	return { name: text.name, desc: text.desc, control: { type: 'toggle', key } };
}

function markerRow(pair: MarkerPair, index: number, markers: MarkerActions): SettingDefinition {
	return {
		name: `Markers ${index + 1}`,
		render: (setting: Setting) => {
			setting
				.addText((text) => {
					text
						.setPlaceholder(MARKER_PLACEHOLDERS.start)
						.setValue(pair.start)
						.onChange((value) => {
							pair.start = value;
							markers.changed();
						});
					if (index === markers.focusIndex) window.setTimeout(() => text.inputEl.focus(), 0);
				})
				.addText((text) =>
					text
						.setPlaceholder(MARKER_PLACEHOLDERS.end)
						.setValue(pair.end)
						.onChange((value) => {
							pair.end = value;
							markers.changed();
						}),
				);
		},
	};
}

export type SettingKey =
	| 'notesLocation'
	| 'notesFolder'
	| 'splitByTestament'
	| 'standardizeReferences'
	| 'liveConversion'
	| 'verseBlocks'
	| 'conversionFolderLocation'
	| 'conversionFolder'
	| 'excludedFolders'
	| `ignore.${IgnoreSwitch}`;

type SwitchKey = 'splitByTestament' | 'standardizeReferences' | 'liveConversion' | 'verseBlocks';

const IGNORE_PREFIX = 'ignore.';

/** The value a control shows: the switch for `ignore.*`, one excluded folder per line. */
export function readSetting(settings: ScriptureThreadSettings, key: string): unknown {
	if (key.startsWith(IGNORE_PREFIX)) return settings.ignore[key.slice(IGNORE_PREFIX.length) as IgnoreSwitch];
	if (key === 'excludedFolders') return settings.excludedFolders.join('\n');
	return settings[key as keyof ScriptureThreadSettings];
}

/** Stores a control's value, trimming folder paths and splitting excluded folders into lines. */
export function writeSetting(settings: ScriptureThreadSettings, key: string, value: unknown): void {
	if (key.startsWith(IGNORE_PREFIX)) {
		settings.ignore[key.slice(IGNORE_PREFIX.length) as IgnoreSwitch] = value === true;
		return;
	}

	switch (key as SettingKey) {
		case 'notesLocation':
			settings.notesLocation = asText(value) as NotesLocation;
			break;
		case 'conversionFolderLocation':
			settings.conversionFolderLocation = asText(value) as ConversionFolderLocation;
			break;
		case 'notesFolder':
		case 'conversionFolder':
			settings[key as 'notesFolder' | 'conversionFolder'] = asText(value).trim();
			break;
		case 'excludedFolders':
			settings.excludedFolders = asText(value)
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line !== '');
			break;
		case 'splitByTestament':
		case 'standardizeReferences':
		case 'liveConversion':
		case 'verseBlocks':
			settings[key as SwitchKey] = value === true;
			break;
	}
}

function asText(value: unknown): string {
	return typeof value === 'string' ? value : '';
}
