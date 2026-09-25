import { describe, expect, it } from 'vitest';

import { linkpathOf, linksAtCursor, type LineSource } from './links-at-cursor';

function doc(...lines: string[]): LineSource {
	return { lineCount: lines.length, line: (index) => lines[index] ?? '' };
}

describe('the caret on a link', () => {
	const line = 'Read [[John 3 16|John 3:16]] and [[Psalms 23]] today.';

	it('shows only that link', () => {
		expect(linksAtCursor(doc(line), 0, 10)).toEqual(['John 3 16']);
		expect(linksAtCursor(doc(line), 0, 40)).toEqual(['Psalms 23']);
	});

	it('counts the brackets on both sides as part of the link', () => {
		const start = line.indexOf('[[');
		const end = line.indexOf(']]') + 2;
		expect(linksAtCursor(doc(line), 0, start)).toEqual(['John 3 16']);
		expect(linksAtCursor(doc(line), 0, end)).toEqual(['John 3 16']);
	});

	it('reads an embed the same way', () => {
		expect(linksAtCursor(doc('![[Psalms 23 1]]'), 0, 3)).toEqual(['Psalms 23 1']);
	});
});

describe('the caret elsewhere in a paragraph', () => {
	it('shows every link in the paragraph, in order', () => {
		const text = doc('Read [[John 3 16|John 3:16]]', 'and then [[Psalms 23]].', 'More [[John 3 16]].');
		expect(linksAtCursor(text, 1, 0)).toEqual(['John 3 16', 'Psalms 23']);
	});

	it('stops at blank lines', () => {
		const text = doc('[[Luke 2 10]]', '', 'Plain words here.', '[[Psalms 23]]', '', '[[John 3 16]]');
		expect(linksAtCursor(text, 2, 0)).toEqual(['Psalms 23']);
	});

	it('treats a list item as its own paragraph', () => {
		const text = doc('- one [[Luke 2 10]]', '- two, caret here', '- three [[Psalms 23]]');
		expect(linksAtCursor(text, 0, 0)).toEqual(['Luke 2 10']);
		expect(linksAtCursor(text, 1, 0)).toEqual([]);
	});

	it('treats a heading as its own paragraph', () => {
		const text = doc('## On [[Psalms 23]]', 'Body text with [[John 3 16]].');
		expect(linksAtCursor(text, 1, 0)).toEqual(['John 3 16']);
		expect(linksAtCursor(text, 0, 0)).toEqual(['Psalms 23']);
	});

	it('finds nothing on a blank line', () => {
		expect(linksAtCursor(doc('[[John 3 16]]', ''), 1, 0)).toEqual([]);
	});
});

describe('link targets', () => {
	it('drop the alias and the heading or block', () => {
		expect(linkpathOf('John 3 16|John 3:16')).toBe('John 3 16');
		expect(linkpathOf('John 3 16#Notes|see')).toBe('John 3 16');
		expect(linkpathOf('Bible/New Testament/John 3 16')).toBe('Bible/New Testament/John 3 16');
	});
});
