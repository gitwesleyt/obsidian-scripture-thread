import { describe, expect, it } from 'vitest';

import { applyEdits, convertText, DEFAULT_CONVERSION_OPTIONS } from './convert-text';

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

describe('converting only the text just typed', () => {
	const standardize = { ...DEFAULT_CONVERSION_OPTIONS, standardizeReferences: true };

	function typed(text: string, typedText: string, options = DEFAULT_CONVERSION_OPTIONS): string {
		const from = text.indexOf(typedText);
		return applyEdits(text, convertText(text, options, [{ from, to: from + typedText.length }]).edits);
	}

	it('converts a reference the typed text overlaps, and nothing else', () => {
		expect(typed('Old John 3:16. New Ps 23:1.', 'New Ps 23:1')).toBe(
			'Old John 3:16. New [[Psalms 23 1|Ps 23:1]].',
		);
	});

	it('converts the whole reference when only its end was typed', () => {
		expect(typed('John 3:16 today', ':16')).toBe('[[John 3 16|John 3:16]] today');
	});

	it('converts nothing when nothing was typed', () => {
		expect(convertText('John 3:16', DEFAULT_CONVERSION_OPTIONS, []).edits).toEqual([]);
	});

	it('leaves a link or a Bible Verse block still being typed', () => {
		expect(typed('see [[John 3:16', 'John 3:16')).toBe('see [[John 3:16');
		expect(typed('see {John 3:16', 'John 3:16')).toBe('see {John 3:16');
		expect(typed('[[Psalms 23]] and John 3:16', 'John 3:16')).toBe(
			'[[Psalms 23]] and [[John 3 16|John 3:16]]',
		);
	});

	it('takes <u> off a reference the typed text overlaps, but not off one it does not', () => {
		expect(typed('<u>John 3:16</u> and <u>Ps 23:1</u>', 'Ps 23:1')).toBe(
			'<u>John 3:16</u> and [[Psalms 23 1|Ps 23:1]]',
		);
	});

	it('still skips a reference inside a code block opened on an earlier line', () => {
		const note = '```\nJohn 3:16\n```';
		expect(typed(note, 'John 3:16')).toBe(note);
	});

	it('standardizes only the links the typed text overlaps', () => {
		expect(typed('[[John 3 16|Jn 3.16]] and [[Psalms 23 1|Ps 23:1]]', 'Ps 23:1', standardize)).toBe(
			'[[John 3 16|Jn 3.16]] and [[Psalms 23 1|Psalm 23:1]]',
		);
	});
});

describe('underline wrappers', () => {
	it('takes <u> off a reference as it converts it', () => {
		expect(converted('<u>Psalm 23:3</u>')).toBe('[[Psalms 23 3|Psalm 23:3]]');
		expect(converted('<U>Ps 23:1; 30:2</U>')).toBe('[[Psalms 23 1|Ps 23:1]]; [[Psalms 30 2|30:2]]');
	});

	it('takes <u> off a verse or chapter link already in the note', () => {
		expect(converted('**<u>[[Ephesians 5 15-17|Ephesians 5:15-17]]</u>**')).toBe(
			'**[[Ephesians 5 15-17|Ephesians 5:15-17]]**',
		);
		expect(converted('<u>[[Psalms 23]]</u>')).toBe('[[Psalms 23]]');
	});

	it('keeps <u> that wraps more than the reference, or a link to anything else', () => {
		expect(converted('<u>see Psalm</u> 23:3')).toBe('<u>see Psalm</u> 23:3');
		expect(converted('Psalm <u>23:3</u>')).toBe('Psalm <u>23:3</u>');
		expect(converted('<u>[[Psalms]]</u>')).toBe('<u>[[Psalms]]</u>');
		expect(converted('<u>[[My notes|John 3:16]]</u>')).toBe('<u>[[My notes|John 3:16]]</u>');
		expect(converted('<u>Psalm 23:3 today</u>')).toBe('<u>[[Psalms 23 3|Psalm 23:3]] today</u>');
	});

	it('leaves <u> inside skipped text alone', () => {
		expect(converted('`<u>[[Psalms 23]]</u>`')).toBe('`<u>[[Psalms 23]]</u>`');
		expect(converted('{<u>Psalm 23:3</u>}')).toBe('{<u>Psalm 23:3</u>}');
	});

	it('changes nothing the second time', () => {
		const once = converted('<u>Psalm 23:3</u> and <u>John 3:16-18</u>');
		expect(once).toBe('[[Psalms 23 3|Psalm 23:3]] and [[John 3 16-18|John 3:16-18]]');
		expect(convertText(once).edits).toEqual([]);
	});
});
