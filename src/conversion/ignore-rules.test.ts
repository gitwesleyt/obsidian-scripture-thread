import { describe, expect, it } from 'vitest';

import { applyEdits, convertText, DEFAULT_CONVERSION_OPTIONS } from './convert-text';
import { DEFAULT_IGNORE_RULES, markerRanges, type IgnoreRules } from './protected-ranges';

function convertedWith(text: string, ignore: Partial<IgnoreRules>): string {
	const options = { ...DEFAULT_CONVERSION_OPTIONS, ignore: { ...DEFAULT_IGNORE_RULES, ...ignore } };
	return applyEdits(text, convertText(text, options).edits);
}

const ALL_OFF: Partial<IgnoreRules> = {
	frontmatter: false,
	codeBlocks: false,
	inlineCode: false,
	comments: false,
	callouts: false,
	curlyBraces: false,
	bibleReferenceSyntax: false,
};

describe('switching a built-in rule off', () => {
	it.each([
		['frontmatter', '---\nverse: John 3:16\n---\n', '---\nverse: [[John 3 16|John 3:16]]\n---\n'],
		['codeBlocks', '```\nJohn 3:16\n```', '```\n[[John 3 16|John 3:16]]\n```'],
		['inlineCode', '`John 3:16`', '`[[John 3 16|John 3:16]]`'],
		['comments', '%% John 3:16 %%', '%% [[John 3 16|John 3:16]] %%'],
		['callouts', '> [!quote]\n> John 3:16', '> [!quote]\n> [[John 3 16|John 3:16]]'],
		['curlyBraces', '{John 3:16}', '{[[John 3 16|John 3:16]]}'],
		['bibleReferenceSyntax', '--John 3:16', '--[[John 3 16|John 3:16]]'],
	] as const)('converts inside %s', (rule, text, expected) => {
		expect(convertedWith(text, {})).toBe(text);
		expect(convertedWith(text, { [rule]: false })).toBe(expected);
	});

	it('still never converts inside a link, with every switch off', () => {
		const text = '[[John 3 16|John 3:16]] and [John 3:17](https://example.com)';
		expect(convertedWith(text, ALL_OFF)).toBe(text);
	});
});

describe('your own markers', () => {
	const ranges = (text: string, start: string, end: string) =>
		markerRanges(text, { start, end }).map(({ from, to }) => text.slice(from, to));

	it('skips from a start marker to the next end marker, across lines', () => {
		expect(ranges('a %% one %% b %% two\nlines %% c', '%%', '%%')).toEqual([
			'%% one %%',
			'%% two\nlines %%',
		]);
		expect(ranges('x <!-- John 3:16 --> y', '<!--', '-->')).toEqual(['<!-- John 3:16 -->']);
	});

	it('reads an empty end marker as the end of the line', () => {
		expect(ranges('Source: John 3:16\nJohn 3:17', 'Source:', '')).toEqual(['Source: John 3:16']);
	});

	it('runs an unclosed start marker to the end of the note', () => {
		expect(ranges('a %% never closed\nJohn 3:16', '%%', '%%')).toEqual(['%% never closed\nJohn 3:16']);
	});

	it('ignores a pair with no start marker', () => {
		expect(ranges('John 3:16', '', '%%')).toEqual([]);
	});

	it('keeps what they cover from being converted', () => {
		const markers = [
			{ start: '%%', end: '%%' },
			{ start: 'Source:', end: '' },
		];
		expect(convertedWith('%% John 3:16 %%\nSource: Rom 8:28\nJohn 3:17', { markers })).toBe(
			'%% John 3:16 %%\nSource: Rom 8:28\n[[John 3 17|John 3:17]]',
		);
	});
});
