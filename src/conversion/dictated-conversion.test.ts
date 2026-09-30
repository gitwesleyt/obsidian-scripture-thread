import { describe, expect, it } from 'vitest';

import { applyEdits, convertText, DEFAULT_CONVERSION_OPTIONS } from './convert-text';
import {
	findReferences,
	groupByReference,
	heldReference,
	isDoubtfulDictated,
	type HeldReference,
} from './references';

const dictating = { ...DEFAULT_CONVERSION_OPTIONS, spokenReferences: true };

function converted(text: string, options = dictating): string {
	return applyEdits(text, convertText(text, options).edits);
}

describe('converting dictated references', () => {
	it('links the words as they were spoken, the way a typed reference keeps its text', () => {
		expect(converted('so revelation three verses five through seven it is')).toBe(
			'so [[Revelation 3 5-7|revelation three verses five through seven]] it is',
		);
	});

	it.each([
		['first john four verse eight', '[[1 John 4 8|first john four verse eight]]'],
		['john three sixteen', '[[John 3 16|john three sixteen]]'],
		['Psalm 23 to 25', '[[Psalms 23-25|Psalm 23 to 25]]'],
		['Matthew 6 verses 1 to 3, 7 and 9', '[[Matthew 6 1-3,7,9|Matthew 6 verses 1 to 3, 7 and 9]]'],
	])('reads %s', (spoken, expected) => {
		expect(converted(spoken)).toBe(expected);
	});

	it('creates the chain a typed reference would', () => {
		expect(convertText('first john four verse eight', dictating).chains).toEqual([
			['1 John 4 8', '1 John 4', '1 John', 'New Testament'],
		]);
	});

	it('finds nothing dictated while the setting is off', () => {
		const text = 'revelation three verses five through seven';
		expect(converted(text, DEFAULT_CONVERSION_OPTIONS)).toBe(text);
	});

	it('still converts every typed reference, next to a dictated one', () => {
		expect(converted('John 3:16 and then mark four verse two')).toBe(
			'[[John 3 16|John 3:16]] and then [[Mark 4 2|mark four verse two]]',
		);
	});

	it('changes nothing the second time', () => {
		const once = converted('john three sixteen, then revelation three verses five through seven');
		expect(convertText(once, dictating).edits).toEqual([]);
	});

	it('skips dictated words in every place typed ones are skipped', () => {
		const note = ['`john three sixteen`', '{john three sixteen}', '> [!note]', '> john three sixteen'].join('\n');
		expect(converted(note)).toBe(note);
	});

	it('finds a dictated reference split by an invisible character, as a typed one is', () => {
		expect(converted('john\u200b three sixteen')).toBe('[[John 3 16|john three sixteen]]');
	});
});

describe('transforming dictated references', () => {
	const usual = { ...dictating, standardizeDictated: true };

	it('shows the standard form instead of the spoken words', () => {
		expect(converted('so revelation three verses five through seven it is', usual)).toBe(
			'so [[Revelation 3 5-7|Revelation 3:5-7]] it is',
		);
		expect(converted('first john four verse eight', usual)).toBe('[[1 John 4 8|1 John 4:8]]');
	});

	it('leaves a reference the writer typed exactly as typed, however it is spelt', () => {
		expect(converted('jn 3:16 and ps 23:1', usual)).toBe('[[John 3 16|jn 3:16]] and [[Psalms 23 1|ps 23:1]]');
	});

	it('does both in one line', () => {
		expect(converted('Ps 23:1 and john three sixteen', usual)).toBe(
			'[[Psalms 23 1|Ps 23:1]] and [[John 3 16|John 3:16]]',
		);
	});

	it('standardizes what was typed as well, when both switches are on', () => {
		const both = { ...usual, standardizeReferences: true };
		expect(converted('Ps 23:1 and john three sixteen', both)).toBe(
			'[[Psalms 23 1|Psalm 23:1]] and [[John 3 16|John 3:16]]',
		);
	});

	it('is the only switch that changes dictated words', () => {
		const standardizeOnly = { ...dictating, standardizeReferences: true };
		expect(converted('Ps 23:1 and john three sixteen', standardizeOnly)).toBe(
			'[[Psalms 23 1|Psalm 23:1]] and [[John 3 16|john three sixteen]]',
		);
	});

	it('does nothing while dictated references are not recognized', () => {
		const text = 'john three sixteen';
		expect(converted(text, { ...DEFAULT_CONVERSION_OPTIONS, standardizeDictated: true })).toBe(text);
	});
});

describe('links that already show dictated words', () => {
	const transforming = { ...dictating, standardizeDictated: true };

	it('are rewritten by Transform, and never where the link points', () => {
		expect(converted('[[Revelation 3 5-7|revelation three verses five through seven]]', transforming)).toBe(
			'[[Revelation 3 5-7|Revelation 3:5-7]]',
		);
	});

	it('are not touched by Standardize references', () => {
		const link = '[[Revelation 3 5-7|revelation three verses five through seven]]';
		expect(converted(link, { ...dictating, standardizeReferences: true })).toBe(link);
	});

	it('leave typed links alone when only Transform is on', () => {
		const link = '[[John 3 16|Jn 3.16]] and [[Psalms 23 1]]';
		expect(converted(link, transforming)).toBe(link);
	});

	it('keeps them while dictated references are not recognized', () => {
		const link = '[[John 3 16|john three sixteen]]';
		expect(converted(link, { ...DEFAULT_CONVERSION_OPTIONS, standardizeDictated: true })).toBe(link);
	});

	it('keeps visible text that is not a reference to the same passage', () => {
		const link = '[[John 3 16|john three seventeen]]';
		expect(converted(link, transforming)).toBe(link);
	});
});

describe('converting only the line just typed', () => {
	it('converts dictated words on the touched line and nothing else', () => {
		const text = 'old mark one line\nnew john three sixteen line';
		const from = text.indexOf('new');
		const edits = convertText(text, dictating, [{ from, to: text.length }]).edits;

		expect(applyEdits(text, edits)).toBe('old mark one line\nnew [[John 3 16|john three sixteen]] line');
	});

	it('leaves a dictated reference inside a link still being typed', () => {
		const text = 'see [[john three sixteen';
		expect(applyEdits(text, convertText(text, dictating, [{ from: 0, to: text.length }]).edits)).toBe(text);
	});
});

describe('which dictated references are doubtful', () => {
	function doubtful(text: string): string[] {
		return findReferences(text, true)
			.filter(isDoubtfulDictated)
			.map((found) => found.match.reference);
	}

	it.each([
		['mark one', ['Mark 1']],
		['john three sixteen', ['John 3:16']],
		['psalm twenty three', ['Psalm 23']],
		['mark one verse two', []],
		['revelation three verses five through seven', []],
		['Psalm 23', []],
		['jn 3:16', []],
	])('%s', (text, expected) => {
		expect(doubtful(text)).toEqual(expected);
	});

	it('never counts a typed match as dictated, even in lower case', () => {
		expect(findReferences('first john 4:8', true).map((found) => found.dictated)).toEqual([false]);
	});

	it('holds back nothing unless asked', () => {
		expect(convertText('mark one', dictating).held).toEqual([]);
	});

	it('holds back what it is told to, leaving it as text', () => {
		const held = convertText('mark one', { ...dictating, holdBack: () => true });

		expect(held.edits).toEqual([]);
		expect(held.held).toEqual([{ reference: 'Mark 1', source: 'mark one', before: '', after: '' }]);
	});

	it('holds back only the doubtful, and only what it is told to', () => {
		const text = 'mark one and job two verse three and john three sixteen';
		const result = convertText(text, { ...dictating, holdBack: (source) => source === 'mark one' });

		expect(result.held.map((held) => held.source)).toEqual(['mark one']);
		expect(applyEdits(text, result.edits)).toBe(
			'mark one and [[Job 2 3|job two verse three]] and [[John 3 16|john three sixteen]]',
		);
	});
});

describe('the words around a held reference', () => {
	const held = (text: string) => heldReference(text, findReferences(text, true)[0]!);

	it('stays inside its own line', () => {
		expect(held('first line\nI met mark one today\nlast line')).toMatchObject({
			before: 'I met ',
			after: ' today',
		});
	});

	it('is cut, and marked, when the line runs on', () => {
		const long = `${'a '.repeat(60)}mark one${' b'.repeat(60)}`;
		const { before, after } = held(long);

		expect(before.startsWith('…')).toBe(true);
		expect(after.endsWith('…')).toBe(true);
		expect(before.length).toBeLessThan(60);
	});
});

describe('grouping the doubtful references', () => {
	const mention = (reference: string, path: string): HeldReference & { path: string } => ({
		reference,
		path,
		source: reference.toLowerCase(),
		before: '',
		after: '',
	});

	it('puts the most mentioned first, then alphabetical', () => {
		const groups = groupByReference([
			mention('Mark 1', 'a.md'),
			mention('Job 2', 'a.md'),
			mention('Job 2', 'b.md'),
			mention('Acts 3', 'a.md'),
		]);

		expect(groups.map((group) => [group.reference, group.mentions.length])).toEqual([
			['Job 2', 2],
			['Acts 3', 1],
			['Mark 1', 1],
		]);
	});
});
