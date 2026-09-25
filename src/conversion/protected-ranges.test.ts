import { describe, expect, it } from 'vitest';

import { findProtectedRanges, overlapsAny } from './protected-ranges';

/** Whether the first occurrence of `needle` in `text` is protected. */
function isProtected(text: string, needle: string): boolean {
	const from = text.indexOf(needle);
	if (from < 0) throw new Error(`"${needle}" is not in the text`);
	return overlapsAny(findProtectedRanges(text), from, from + needle.length);
}

describe('the default ignore list', () => {
	it('protects YAML frontmatter', () => {
		const note = '---\nverse: John 3:16\n---\nJohn 3:17';
		expect(isProtected(note, 'John 3:16')).toBe(true);
		expect(isProtected(note, 'John 3:17')).toBe(false);
	});

	it('only treats --- at the very top as frontmatter', () => {
		expect(isProtected('Intro\n---\nJohn 3:16\n---', 'John 3:16')).toBe(false);
	});

	it('protects fenced code blocks, backticks and tildes', () => {
		expect(isProtected('```\nJohn 3:16\n```\nafter', 'John 3:16')).toBe(true);
		expect(isProtected('~~~js\nJohn 3:16\n~~~', 'John 3:16')).toBe(true);
		expect(isProtected('```\ncode\n```\nJohn 3:16', 'John 3:16')).toBe(false);
	});

	it('runs an unclosed fence to the end of the note', () => {
		expect(isProtected('```\ncode\n\nJohn 3:16', 'John 3:16')).toBe(true);
	});

	it('protects inline code', () => {
		expect(isProtected('see `John 3:16` here', 'John 3:16')).toBe(true);
		expect(isProtected('see ``a `John 3:16` b`` here', 'John 3:16')).toBe(true);
		expect(isProtected('a stray ` then John 3:16', 'John 3:16')).toBe(false);
	});

	it('protects a callout block and every quoted line under it', () => {
		const note = '> [!quote] Title\n> John 3:16\n> more\nJohn 3:17';
		expect(isProtected(note, 'John 3:16')).toBe(true);
		expect(isProtected(note, 'John 3:17')).toBe(false);
	});

	it('leaves an ordinary blockquote alone', () => {
		expect(isProtected('> John 3:16', 'John 3:16')).toBe(false);
	});

	it("protects {...}, the Bible Verse plugin's syntax", () => {
		expect(isProtected('{John 3:16}', 'John 3:16')).toBe(true);
		expect(isProtected('{outer {John 3:16} still}', 'still')).toBe(true);
	});

	it('does not let a stray brace swallow the next paragraph', () => {
		expect(isProtected('a { stray\n\nJohn 3:16 }', 'John 3:16')).toBe(false);
	});
});

describe('what else is protected, so conversion is safe to run twice', () => {
	it('protects existing wikilinks and embeds, alias included', () => {
		expect(isProtected('[[Psalms 23 1|Ps 23:1]]', 'Ps 23:1')).toBe(true);
		expect(isProtected('![[John 3#Nicodemus]]', 'John 3')).toBe(true);
	});

	it('protects markdown links, text and destination', () => {
		expect(isProtected('[John 3:16](https://example.com)', 'John 3:16')).toBe(true);
	});

	it("protects the Bible Reference plugin's --John1:1 syntax", () => {
		expect(isProtected('--John1:1', 'John1:1')).toBe(true);
		expect(isProtected('--1 Jn 1:9-10', 'Jn 1:9')).toBe(true);
	});
});
