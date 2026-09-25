import { describe, expect, it } from 'vitest';

import { isExcluded, isInFolder } from './scope';

describe('folder scope', () => {
	it('includes notes in the folder and below it', () => {
		expect(isInFolder('Journal/2026/Sept.md', 'Journal')).toBe(true);
		expect(isInFolder('Journal/Sept.md', 'Journal/')).toBe(true);
	});

	it('does not match a folder that merely starts with the same letters', () => {
		expect(isInFolder('Journal2/Sept.md', 'Journal')).toBe(false);
	});

	it('treats an empty folder as the whole vault', () => {
		expect(isInFolder('anything.md', '')).toBe(true);
	});
});

describe('excluded folders', () => {
	it('skips notes inside any excluded folder', () => {
		expect(isExcluded('Templates/Daily.md', ['Archive', 'Templates'])).toBe(true);
		expect(isExcluded('Templates2/Daily.md', ['Templates'])).toBe(false);
	});

	it('ignores blank lines in the list rather than excluding everything', () => {
		expect(isExcluded('Journal/Sept.md', ['', '  '])).toBe(false);
	});
});
