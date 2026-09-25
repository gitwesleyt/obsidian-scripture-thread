import { describe, expect, it } from 'vitest';

import { applyEdits, convertText } from './convert-text';

function converted(text: string): string {
	return applyEdits(text, convertText(text).edits);
}

describe('converting a note', () => {
	it('writes the alias form, keeping the text as typed', () => {
		expect(converted('Reading Ps 23:1 today.')).toBe('Reading [[Psalms 23 1|Ps 23:1]] today.');
	});

	it('converts every reference in the note', () => {
		expect(converted('John 3:16 and Romans 8')).toBe(
			'[[John 3 16|John 3:16]] and [[Romans 8|Romans 8]]',
		);
	});

	it('links each chapter of a semicolon reference separately', () => {
		expect(converted('Proverbs 17:7; 30:22')).toBe(
			'[[Proverbs 17 7|Proverbs 17:7]]; [[Proverbs 30 22|30:22]]',
		);
	});

	it('changes nothing the second time', () => {
		const once = converted('Ps 23:1, John 3:16-18 and Proverbs 17:7; 30:22');
		expect(convertText(once).edits).toEqual([]);
	});

	it('leaves every ignored region exactly as it was', () => {
		const note = [
			'---',
			'verse: John 3:16',
			'---',
			'```',
			'John 3:16',
			'```',
			'`John 3:16` and {John 3:16} and --John3:16',
			'> [!note]',
			'> John 3:16',
			'[John 3:16](https://example.com)',
		].join('\n');

		expect(converted(note)).toBe(note);
	});

	it('returns one parent chain per link', () => {
		expect(convertText('Psalm 23 and John 3:16').chains).toEqual([
			['Psalms 23', 'Psalms', 'Old Testament'],
			['John 3 16', 'John 3', 'John', 'New Testament'],
		]);
	});
});

describe('invisible characters', () => {
	it('finds a reference split by one, and replaces it cleanly', () => {
		expect(converted('see Genesis\u200b 1:1 now')).toBe('see [[Genesis 1 1|Genesis 1:1]] now');
	});

	it('leaves one outside a reference where it was', () => {
		expect(converted('\u200bhello John 3:16')).toBe('\u200bhello [[John 3 16|John 3:16]]');
	});

	it('keeps offsets right after an emoji and a hidden character', () => {
		expect(converted('🙏\u202d John 3:16')).toBe('🙏\u202d [[John 3 16|John 3:16]]');
	});
});
