import { describe, expect, it } from 'vitest';

import { BIBLE_BOOKS } from '../bible-books';
import { findVerseReferences } from '../verse-rules';
import { notePath, targetsFor, testamentOf } from './note-names';

function targetsIn(text: string) {
	return findVerseReferences(text).flatMap(targetsFor);
}

function chainsIn(text: string): string[][] {
	return targetsIn(text).map((target) => target.chain);
}

describe('note names and parent chains', () => {
	it('uses the plural book name, and a space where the colon was', () => {
		expect(chainsIn('Psalm 23:1')).toEqual([
			['Psalms 23 1', 'Psalms 23', 'Psalms', 'Old Testament'],
		]);
	});

	it('names a whole chapter and links it to the book', () => {
		expect(chainsIn('Romans 8')).toEqual([['Romans 8', 'Romans', 'New Testament']]);
	});

	it('gives a verse range or list its own note under the chapter', () => {
		expect(chainsIn('John 3:16-18')[0]).toEqual([
			'John 3 16-18',
			'John 3',
			'John',
			'New Testament',
		]);
		expect(chainsIn('Matt 6:1-3,7')[0]?.[0]).toBe('Matthew 6 1-3,7');
	});

	it('links a chapter range straight to the book', () => {
		expect(chainsIn('Matthew 5-7')).toEqual([['Matthew 5-7', 'Matthew', 'New Testament']]);
	});

	it('names numbered books canonically however they were typed', () => {
		expect(chainsIn('III John 1')[0]?.[0]).toBe('3 John 1');
		expect(chainsIn('First Sam 3:4')[0]?.[0]).toBe('1 Samuel 3 4');
	});

	it('reads the dot and space forms the same as the colon', () => {
		expect(chainsIn('John 3.16')[0]?.[0]).toBe('John 3 16');
		expect(chainsIn('Psalms 23 1')[0]?.[0]).toBe('Psalms 23 1');
	});
});

describe('link targets', () => {
	it('keeps the text exactly as typed for the alias', () => {
		const [target] = targetsIn('read Ps 23:1 today');
		expect(target).toMatchObject({ from: 5, to: 12, alias: 'Ps 23:1' });
	});

	it('splits a semicolon reference into one target per chapter', () => {
		const text = 'Proverbs 17:7; 30:22';
		const targets = targetsIn(text);

		expect(targets.map((target) => target.alias)).toEqual(['Proverbs 17:7', '30:22']);
		expect(targets.map((target) => target.chain[0])).toEqual([
			'Proverbs 17 7',
			'Proverbs 30 22',
		]);
		expect(targets.map((target) => text.slice(target.from, target.to))).toEqual([
			'Proverbs 17:7',
			'30:22',
		]);
	});
});

describe('testaments', () => {
	it('splits the books 39 and 27', () => {
		const testaments = BIBLE_BOOKS.map(testamentOf);
		expect(testaments.filter((name) => name === 'Old Testament')).toHaveLength(39);
		expect(testaments.filter((name) => name === 'New Testament')).toHaveLength(27);
		expect(testaments[38]).toBe('Old Testament'); // Malachi
		expect(testaments[39]).toBe('New Testament'); // Matthew
	});
});

describe('note paths', () => {
	const source = 'Journal/2026/Sept.md';
	const inFolder = { notesLocation: 'folder', notesFolder: 'Bible', splitByTestament: false } as const;
	const split = { ...inFolder, splitByTestament: true };

	it('puts every note in the specified folder', () => {
		expect(notePath('Psalms 23 1', 'Old Testament', inFolder, source)).toBe(
			'Bible/Psalms 23 1.md',
		);
	});

	it('puts every note in the vault root when asked', () => {
		expect(notePath('Psalms 23 1', 'Old Testament', { ...inFolder, notesLocation: 'root' }, source)).toBe(
			'Psalms 23 1.md',
		);
	});

	it('puts every note beside the note being converted when asked', () => {
		const current = { ...inFolder, notesLocation: 'current' } as const;
		expect(notePath('Psalms 23 1', 'Old Testament', current, source)).toBe(
			'Journal/2026/Psalms 23 1.md',
		);
		expect(notePath('Psalms 23 1', 'Old Testament', current, 'Top.md')).toBe('Psalms 23 1.md');
	});

	it('splits by testament under whichever location is chosen', () => {
		expect(notePath('Psalms 23 1', 'Old Testament', split, source)).toBe(
			'Bible/Old Testament/Psalms 23 1.md',
		);
		expect(notePath('John', 'New Testament', { ...split, notesLocation: 'current' }, source)).toBe(
			'Journal/2026/New Testament/John.md',
		);
	});

	it('keeps testament notes at the root of the location', () => {
		expect(notePath('Old Testament', 'Old Testament', split, source)).toBe(
			'Bible/Old Testament.md',
		);
	});

	it('treats an empty folder as the vault root and tidies slashes', () => {
		expect(notePath('John', 'New Testament', { ...inFolder, notesFolder: '' }, source)).toBe(
			'John.md',
		);
		expect(notePath('John', 'New Testament', { ...inFolder, notesFolder: '/Bible/' }, source)).toBe(
			'Bible/John.md',
		);
	});
});
