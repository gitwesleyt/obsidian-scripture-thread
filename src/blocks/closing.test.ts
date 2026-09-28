import { describe, expect, it } from 'vitest';
import { growToCaret, verseBlocks, type LineSource } from '../verse-block-rules';
import { closingBlock, grownLine } from './closing';

const opens = (line: string) => line.includes('[[v]]');
const source = (lines: string[]): LineSource => ({ lineCount: lines.length, line: (index) => lines[index] ?? '' });

describe('grownLine', () => {
	const lines = ['[[v]] one', '', '', 'outside'];
	const base = verseBlocks(lines, opens);

	it('is the empty caret line directly under a block', () => {
		expect(grownLine(growToCaret(base, lines, 1), 1)).toBe(1);
	});

	it('is null anywhere else', () => {
		expect(grownLine(growToCaret(base, lines, 2), 2)).toBeNull();
		expect(grownLine(growToCaret(base, lines, 0), 0)).toBeNull();
		expect(grownLine(base, null)).toBeNull();
	});
});

describe('closingBlock', () => {
	it('closes the block when the second Enter moves the caret on from the grown line', () => {
		const after = ['[[v]] one', '', '', 'outside'];
		expect(closingBlock(verseBlocks(after, opens), source(after), 1, null)).toEqual({ startLine: 0, endLine: 0 });
	});

	it('closes it when the caret leaves by an arrow key or a tap', () => {
		const lines = ['[[v]] one', '', 'outside'];
		expect(closingBlock(verseBlocks(lines, opens), source(lines), 1, null)).toEqual({ startLine: 0, endLine: 0 });
	});

	it('does nothing while the caret is still on the grown line', () => {
		const lines = ['[[v]] one', ''];
		expect(closingBlock(verseBlocks(lines, opens), source(lines), 1, 1)).toBeNull();
	});

	it('does nothing when the grown line was typed on, and so joined the block', () => {
		const lines = ['[[v]] one', 'more'];
		expect(closingBlock(verseBlocks(lines, opens), source(lines), 1, null)).toBeNull();
	});

	it('does nothing when an edit removed the grown line, such as undoing the first Enter', () => {
		const lines = ['[[v]] one'];
		expect(closingBlock(verseBlocks(lines, opens), source(lines), null, null)).toBeNull();
		expect(closingBlock(verseBlocks(lines, opens), source(lines), 1, null)).toBeNull();
	});

	it('does nothing when the line above is no longer the end of a block', () => {
		const lines = ['plain writing', '', ''];
		expect(closingBlock(verseBlocks(lines, opens), source(lines), 1, null)).toBeNull();
	});
});
