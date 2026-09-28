import { Annotation, StateField, type ChangeDesc, type Transaction } from '@codemirror/state';
import type { Range } from '../conversion/protected-ranges';

/**
 * Marks the transaction that converted the typed text, carrying the ranges
 * still waiting (in the text before it), which become the field's new value.
 */
export const convertedTyping = Annotation.define<Range[]>();

/**
 * The text typed or pasted in this editor and not yet converted.
 *
 * Only `input` transactions add to it (typing, Enter, paste, drop), so text an
 * undo puts back, and edits from sync or other plugins, are never converted.
 */
export const touchedRanges = StateField.define<Range[]>({
	create: () => [],
	update(ranges, tr) {
		const waiting = tr.annotation(convertedTyping);
		if (waiting) return mapRanges(waiting, tr.changes);
		if (!tr.docChanged) return ranges;

		const mapped = mapRanges(ranges, tr.changes);
		return isTyping(tr) ? mergeRanges([...mapped, ...insertedRanges(tr.changes)]) : mapped;
	},
});

function isTyping(tr: Transaction): boolean {
	return tr.isUserEvent('input');
}

/** Text deleted out of a range shrinks it, and a range deleted whole is dropped. */
export function mapRanges(ranges: readonly Range[], changes: ChangeDesc): Range[] {
	const mapped: Range[] = [];
	for (const range of ranges) {
		const from = changes.mapPos(range.from, 1);
		const to = changes.mapPos(range.to, -1);
		if (from < to) mapped.push({ from, to });
	}
	return mapped;
}

function insertedRanges(changes: ChangeDesc): Range[] {
	const inserted: Range[] = [];
	changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
		if (fromB < toB) inserted.push({ from: fromB, to: toB });
	});
	return inserted;
}

/** Sorted, with touching and overlapping ranges joined. */
export function mergeRanges(ranges: readonly Range[]): Range[] {
	const sorted = [...ranges].sort((a, b) => a.from - b.from);
	const merged: Range[] = [];

	for (const range of sorted) {
		const last = merged[merged.length - 1];
		if (last && range.from <= last.to) last.to = Math.max(last.to, range.to);
		else merged.push({ ...range });
	}
	return merged;
}

/**
 * Splits the typed ranges into those ready to convert and those still on the
 * caret's line. `caretLine` runs from the line's start to just past its line
 * break; null means there is no caret to wait for (the editor lost focus).
 */
export function splitAtCaretLine(
	ranges: readonly Range[],
	caretLine: Range | null,
): { ready: Range[]; waiting: Range[] } {
	if (!caretLine) return { ready: [...ranges], waiting: [] };

	const ready: Range[] = [];
	const waiting: Range[] = [];

	for (const { from, to } of ranges) {
		if (from < caretLine.from) ready.push({ from, to: Math.min(to, caretLine.from) });
		if (from < caretLine.to && caretLine.from < to) {
			waiting.push({ from: Math.max(from, caretLine.from), to: Math.min(to, caretLine.to) });
		}
		if (to > caretLine.to) ready.push({ from: Math.max(from, caretLine.to), to });
	}
	return { ready, waiting };
}
