import { describe, expect, it } from 'vitest';

import { DEFAULT_IGNORE_RULES } from './conversion/protected-ranges';
import { DEFAULT_SETTINGS, withDefaults } from './settings-data';

describe('loading saved settings', () => {
	it('uses the defaults when nothing is saved', () => {
		expect(withDefaults(null)).toEqual(DEFAULT_SETTINGS);
	});

	it('fills in settings added since a vault was saved', () => {
		const savedBy100 = { notesFolder: 'Scripture', excludedFolders: ['Templates'] };
		expect(withDefaults(savedBy100)).toMatchObject({
			notesFolder: 'Scripture',
			excludedFolders: ['Templates'],
			standardizeReferences: false,
			ignore: DEFAULT_IGNORE_RULES,
			verseBlocks: true,
			liveConversion: false,
			spokenReferences: false,
			standardizeDictated: false,
		});
	});

	it('fills in a missing ignore switch without losing the saved ones', () => {
		const saved = { ignore: { callouts: false } } as Parameters<typeof withDefaults>[0];
		expect(withDefaults(saved).ignore).toEqual({ ...DEFAULT_IGNORE_RULES, callouts: false });
	});

	it('never lets edits reach the defaults', () => {
		const settings = withDefaults(null);
		settings.ignore.markers.push({ start: '%%', end: '%%' });
		settings.excludedFolders.push('Archive');
		expect(DEFAULT_IGNORE_RULES.markers).toEqual([]);
		expect(DEFAULT_SETTINGS.excludedFolders).toEqual([]);
	});
});
