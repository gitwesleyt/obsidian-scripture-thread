import { describe, expect, it } from 'vitest';

import { applyEdits, convertText, DEFAULT_CONVERSION_OPTIONS } from './convert-text';
import { DEFAULT_IGNORE_RULES } from './protected-ranges';

const standardizing = { ...DEFAULT_CONVERSION_OPTIONS, standardizeReferences: true };

function standardized(text: string, options = standardizing): string {
	return applyEdits(text, convertText(text, options).edits);
}

describe('standardizing new conversions', () => {
	it.each([
		['Ps 23', '[[Psalms 23|Psalm 23]]'],
		['Ps 23:1', '[[Psalms 23 1|Psalm 23:1]]'],
		['Jn 3.16', '[[John 3 16|John 3:16]]'],
		['Romans 8 28', '[[Romans 8 28|Romans 8:28]]'],
		['II Cor 5:17', '[[2 Corinthians 5 17|2 Corinthians 5:17]]'],
		['acts 3', '[[Acts 3|Acts 3]]'],
		['Matt 6:1-3,7', '[[Matthew 6 1-3,7|Matthew 6:1-3,7]]'],
	])('writes %s in standard form', (typed, expected) => {
		expect(standardized(typed)).toBe(expected);
	});

	it('keeps a semicolon continuation short', () => {
		expect(standardized('Prov 17 7; 30 22')).toBe(
			'[[Proverbs 17 7|Proverbs 17:7]]; [[Proverbs 30 22|30:22]]',
		);
	});

	it('changes nothing with the toggle off', () => {
		expect(standardized('Jn 3.16', DEFAULT_CONVERSION_OPTIONS)).toBe('[[John 3 16|Jn 3.16]]');
	});
});

describe('standardizing existing links', () => {
	it('rewrites text that is a reference to the same passage', () => {
		expect(standardized('[[John 3 16|Jn 3.16]]')).toBe('[[John 3 16|John 3:16]]');
		expect(standardized('[[Psalms 23|ps 23]]')).toBe('[[Psalms 23|Psalm 23]]');
	});

	it('keeps the letter naming part of a verse', () => {
		expect(standardized('Heb 12.1b')).toBe('[[Hebrews 12 1|Hebrews 12:1b]]');
		expect(standardized('[[Hebrews 12 1|Heb 12:1b]]')).toBe('[[Hebrews 12 1|Hebrews 12:1b]]');
	});

	it('gives a bare link standard text', () => {
		expect(standardized('[[Psalms 23 1]]')).toBe('[[Psalms 23 1|Psalm 23:1]]');
	});

	it('tidies a continuation without adding the book', () => {
		expect(standardized('[[Proverbs 17 7|Proverbs 17:7]]; [[Proverbs 30 22|30 22]]')).toBe(
			'[[Proverbs 17 7|Proverbs 17:7]]; [[Proverbs 30 22|30:22]]',
		);
	});

	it('keeps the target, headings included', () => {
		expect(standardized('[[Bible/John 3 16#Notes|Jn 3:16]]')).toBe('[[Bible/John 3 16#Notes|John 3:16]]');
	});

	it.each([
		['the writer\'s own words', '[[John 3 16|this verse]]'],
		['text naming another passage', '[[John 3 16|John 3:17]]'],
		['a book link', '[[Psalms|the Psalms]]'],
		['a testament link', '[[Old Testament]]'],
		['an embed', '![[John 3 16|Jn 3.16]]'],
		['a bare link to a heading', '[[John 3 16#Notes]]'],
		['a link already in standard form', '[[John 3 16|John 3:16]]'],
	])('leaves alone %s', (_, text) => {
		expect(convertText(text, standardizing).edits).toEqual([]);
	});

	it('leaves links in skipped regions alone, unless that rule is off', () => {
		const text = '`[[John 3 16|Jn 3.16]]`';
		expect(standardized(text)).toBe(text);

		const inlineCodeOff = { ...standardizing, ignore: { ...DEFAULT_IGNORE_RULES, inlineCode: false } };
		expect(standardized(text, inlineCodeOff)).toBe('`[[John 3 16|John 3:16]]`');
	});

	it('counts standardized links apart from converted references', () => {
		const conversion = convertText('Jn 3:16 and [[Romans 8 28|Rom 8.28]]', standardizing);
		expect(conversion.chains).toHaveLength(1);
		expect(conversion.standardized).toBe(1);
	});

	it('changes nothing on a second run', () => {
		const once = standardized('Ps 23:1, [[John 3 16|Jn 3.16]] and [[Psalms 23]]; Prov 17 7; 30 22');
		expect(convertText(once, standardizing).edits).toEqual([]);
	});
});
