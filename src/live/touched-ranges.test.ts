import { history, isolateHistory, undo } from '@codemirror/commands';
import { EditorState, type Transaction, type TransactionSpec } from '@codemirror/state';
import { describe, expect, it } from 'vitest';

import { convertedTyping, mergeRanges, splitAtCaretLine, touchedRanges } from './touched-ranges';

function editor(doc: string): EditorState {
	return EditorState.create({ doc, extensions: [touchedRanges] });
}

function apply(state: EditorState, ...specs: TransactionSpec[]): EditorState {
	return specs.reduce((current, spec) => current.update(spec).state, state);
}

const typing = (from: number, insert: string): TransactionSpec => ({
	changes: { from, insert },
	userEvent: 'input.type',
});

describe('tracking typed text', () => {
	it('marks text typed a character at a time as one range', () => {
		const state = apply(editor('Read '), typing(5, 'P'), typing(6, 's'), typing(7, ' 23'));
		expect(state.field(touchedRanges)).toEqual([{ from: 5, to: 10 }]);
	});

	it('marks a pasted paragraph', () => {
		const state = apply(editor('x'), { changes: { from: 1, insert: '\nJohn 3:16' }, userEvent: 'input.paste' });
		expect(state.field(touchedRanges)).toEqual([{ from: 1, to: 11 }]);
	});

	it('never marks text put back by undo, or edits from elsewhere', () => {
		const state = apply(
			editor('John 3:16'),
			{ changes: { from: 0, insert: 'Ps 23 ' }, userEvent: 'undo' },
			{ changes: { from: 0, insert: 'Synced ' } },
		);
		expect(state.field(touchedRanges)).toEqual([]);
	});

	it('follows the typed text when lines are added above it', () => {
		const state = apply(editor('ab'), typing(2, 'Ps 1'), { changes: { from: 0, insert: 'new\n' } });
		expect(state.field(touchedRanges)).toEqual([{ from: 6, to: 10 }]);
	});

	it('drops typed text that is deleted again', () => {
		const state = apply(editor('ab'), typing(2, 'xy'), { changes: { from: 2, to: 4 }, userEvent: 'delete' });
		expect(state.field(touchedRanges)).toEqual([]);
	});

	it('keeps only what a conversion says is still waiting', () => {
		const typed = apply(editor(''), typing(0, 'Ps 1\nJn 3'));
		const converted = apply(typed, {
			changes: { from: 0, to: 4, insert: '[[Psalms 1|Ps 1]]' },
			annotations: convertedTyping.of([{ from: 5, to: 9 }]),
		});
		expect(converted.field(touchedRanges)).toEqual([{ from: 18, to: 22 }]);
	});
});

describe('undoing a conversion', () => {
	function undone(state: EditorState): EditorState {
		let result = state;
		undo({ state, dispatch: (tr: Transaction) => (result = tr.state) });
		return result;
	}

	it('puts back the plain text, which is then no longer waiting to convert', () => {
		const typed = apply(
			EditorState.create({ doc: '', extensions: [history(), touchedRanges] }),
			typing(0, 'Ps 1'),
			typing(4, '\n'),
		);
		const converted = apply(typed, {
			changes: { from: 0, to: 4, insert: '[[Psalms 1|Ps 1]]' },
			annotations: [convertedTyping.of([]), isolateHistory.of('full')],
		});

		const afterUndo = undone(converted);
		expect(afterUndo.doc.toString()).toBe('Ps 1\n');
		expect(afterUndo.field(touchedRanges)).toEqual([]);
	});
});

describe('merging ranges', () => {
	it('joins touching and overlapping ranges, in order', () => {
		expect(mergeRanges([{ from: 8, to: 9 }, { from: 0, to: 3 }, { from: 3, to: 5 }, { from: 4, to: 6 }])).toEqual([
			{ from: 0, to: 6 },
			{ from: 8, to: 9 },
		]);
	});
});

describe('waiting for the caret to leave the line', () => {
	const caretLine = { from: 10, to: 20 };

	it('holds back typed text on the caret line', () => {
		expect(splitAtCaretLine([{ from: 12, to: 15 }], caretLine)).toEqual({
			ready: [],
			waiting: [{ from: 12, to: 15 }],
		});
	});

	it('releases typed text on other lines', () => {
		expect(splitAtCaretLine([{ from: 0, to: 5 }, { from: 25, to: 30 }], caretLine)).toEqual({
			ready: [{ from: 0, to: 5 }, { from: 25, to: 30 }],
			waiting: [],
		});
	});

	it('splits a paste that ends on the caret line', () => {
		expect(splitAtCaretLine([{ from: 2, to: 14 }], caretLine)).toEqual({
			ready: [{ from: 2, to: 10 }],
			waiting: [{ from: 10, to: 14 }],
		});
	});

	it('releases everything when the editor has lost focus', () => {
		expect(splitAtCaretLine([{ from: 12, to: 15 }], null)).toEqual({ ready: [{ from: 12, to: 15 }], waiting: [] });
	});
});
