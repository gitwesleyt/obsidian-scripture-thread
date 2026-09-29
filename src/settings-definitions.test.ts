import type { SettingDefinition, SettingDefinitionItem } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { withDefaults } from './settings-data';
import { readSetting, settingDefinitions, writeSetting, type MarkerActions } from './settings-definitions';

const noMarkerActions: MarkerActions = { add() {}, remove() {}, changed() {}, focusIndex: null };

/** Every definition, groups and lists opened up. */
function allDefinitions(items: SettingDefinitionItem[]): SettingDefinition[] {
	return items.flatMap((item) =>
		'type' in item && (item.type === 'group' || item.type === 'list')
			? allDefinitions(item.items ?? [])
			: [item as SettingDefinition],
	);
}

function controlKeys(items: SettingDefinitionItem[]): string[] {
	return allDefinitions(items).flatMap((definition) =>
		'control' in definition && definition.control ? [definition.control.key] : [],
	);
}

function named(items: SettingDefinitionItem[], name: string): SettingDefinition | undefined {
	return allDefinitions(items).find((definition) => definition.name === name);
}

function isVisible(definition: SettingDefinition | undefined): boolean {
	const visible = definition?.visible ?? true;
	return typeof visible === 'function' ? visible() : visible;
}

describe('settings as searchable definitions', () => {
	it('has a control for every setting, each with a value to show', () => {
		const settings = withDefaults(null);
		const keys = controlKeys(settingDefinitions(settings, noMarkerActions));

		expect(keys).toEqual(
			expect.arrayContaining([
				'notesLocation',
				'notesFolder',
				'splitByTestament',
				'standardizeReferences',
				'liveConversion',
				'verseBlocks',
				'ignore.frontmatter',
				'ignore.bibleReferenceSyntax',
				'conversionFolderLocation',
				'conversionFolder',
				'excludedFolders',
			]),
		);
		for (const key of keys) expect(readSetting(settings, key)).not.toBeUndefined();
	});

	it('shows each folder picker only for "In the folder specified below"', () => {
		const settings = withDefaults(null);
		const definitions = settingDefinitions(settings, noMarkerActions);

		settings.notesLocation = 'root';
		settings.conversionFolderLocation = 'current';
		expect(isVisible(named(definitions, 'Folder to create new notes in'))).toBe(false);
		expect(isVisible(named(definitions, 'Folder to convert references in'))).toBe(false);

		settings.notesLocation = 'folder';
		settings.conversionFolderLocation = 'folder';
		expect(isVisible(named(definitions, 'Folder to create new notes in'))).toBe(true);
		expect(isVisible(named(definitions, 'Folder to convert references in'))).toBe(true);
	});

	it('lists one row per marker pair', () => {
		const settings = withDefaults({ ignore: { ...withDefaults(null).ignore, markers: [{ start: '<!--', end: '-->' }] } });
		expect(named(settingDefinitions(settings, noMarkerActions), 'Markers 1')).toBeDefined();
	});
});

describe('reading and writing a setting by its key', () => {
	it('reaches the skipped-text switches', () => {
		const settings = withDefaults(null);
		writeSetting(settings, 'ignore.callouts', false);
		expect(settings.ignore.callouts).toBe(false);
		expect(readSetting(settings, 'ignore.callouts')).toBe(false);
	});

	it('shows excluded folders one per line, and stores them trimmed without blanks', () => {
		const settings = withDefaults(null);
		writeSetting(settings, 'excludedFolders', ' Templates \n\nArchive\n');
		expect(settings.excludedFolders).toEqual(['Templates', 'Archive']);
		expect(readSetting(settings, 'excludedFolders')).toBe('Templates\nArchive');
	});

	it('trims folder paths', () => {
		const settings = withDefaults(null);
		writeSetting(settings, 'notesFolder', ' Bible/Notes ');
		expect(settings.notesFolder).toBe('Bible/Notes');
	});

	it('stores switches and choices', () => {
		const settings = withDefaults(null);
		writeSetting(settings, 'liveConversion', true);
		writeSetting(settings, 'conversionFolderLocation', 'folder');
		expect(settings.liveConversion).toBe(true);
		expect(settings.conversionFolderLocation).toBe('folder');
	});
});
