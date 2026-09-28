import { MapMode, RangeSetBuilder, StateEffect, type EditorState, type Text } from '@codemirror/state';
import {
	Decoration,
	ViewPlugin,
	type DecorationSet,
	type EditorView,
	type PluginValue,
	type ViewUpdate,
} from '@codemirror/view';
import { editorInfoField } from 'obsidian';
import {
	growToCaret,
	lineRole,
	verseBlocks,
	type LineSource,
	type VerseBlock,
} from '../verse-block-rules';
import { closingBlock, grownLine } from './closing';
import { verseLinkOpener } from './opens-block';

/** Matches the animation's length in styles.css. */
const CLOSING_MS = 320;
const closingEnded = StateEffect.define<null>();

const LINE_CLASS: Record<ReturnType<typeof lineRole>, string> = {
	only: 'scripture-thread-verse-block scripture-thread-verse-block-start scripture-thread-verse-block-end',
	start: 'scripture-thread-verse-block scripture-thread-verse-block-start',
	middle: 'scripture-thread-verse-block',
	end: 'scripture-thread-verse-block scripture-thread-verse-block-end',
};
const CLOSING_CLASS = ' scripture-thread-verse-block-closing';

/**
 * Draws the verse block border in Live Preview and Source mode, grows it to the
 * empty line the first Enter makes, and plays the closing animation when the
 * caret leaves that line. The blocks are worked out from the whole note when its
 * text changes; a caret move only re-applies the caret line.
 */
export const verseBlockDecorations = ViewPlugin.fromClass(
	class implements PluginValue {
		decorations: DecorationSet = Decoration.none;
		private blocks: VerseBlock[];
		/** Where the line the first Enter grew a block to starts, so it can follow later edits. */
		private grownAt: number | null = null;
		private closing: VerseBlock | null = null;
		private closingTimer: number | null = null;

		constructor(private readonly view: EditorView) {
			this.blocks = blocksIn(view.state);
			this.redraw(null);
		}

		update(update: ViewUpdate) {
			if (update.docChanged) this.blocks = blocksIn(update.state);
			const ended = update.transactions.some((tr) => tr.effects.some((effect) => effect.is(closingEnded)));
			if (ended) this.closing = null;

			if (update.docChanged || update.selectionSet || update.viewportChanged || ended) {
				this.redraw(this.grownLineAfter(update));
			}
		}

		destroy() {
			if (this.closingTimer !== null) window.clearTimeout(this.closingTimer);
		}

		private redraw(previousGrown: number | null) {
			const { doc } = this.view.state;
			const lines = linesOf(doc);
			const caret = caretLine(this.view.state);
			const shown = growToCaret(this.blocks, lines, caret);
			const grownNow = grownLine(shown, caret);

			const closed = closingBlock(this.blocks, lines, previousGrown, grownNow);
			if (closed) this.startClosing(closed);

			this.grownAt = grownNow === null ? null : doc.line(grownNow + 1).from;
			this.decorations = decorate(this.view, shown, this.closing);
		}

		/** The grown line from before this update, in the new text, or null when it was removed. */
		private grownLineAfter(update: ViewUpdate): number | null {
			if (this.grownAt === null) return null;
			const at = update.changes.mapPos(this.grownAt, -1, MapMode.TrackDel);
			return at === null ? null : update.state.doc.lineAt(at).number - 1;
		}

		private startClosing(block: VerseBlock) {
			this.closing = block;
			if (this.closingTimer !== null) window.clearTimeout(this.closingTimer);
			this.closingTimer = window.setTimeout(() => {
				this.closingTimer = null;
				this.view.dispatch({ effects: closingEnded.of(null) });
			}, CLOSING_MS);
		}
	},
	{ decorations: (plugin) => plugin.decorations },
);

function blocksIn(state: EditorState): VerseBlock[] {
	const path = state.field(editorInfoField, false)?.file?.path ?? '';
	return verseBlocks(linesOf(state.doc), verseLinkOpener(path));
}

function linesOf(doc: Text): LineSource {
	return { lineCount: doc.lines, line: (index) => doc.line(index + 1).text };
}

/** The main caret's line, only when nothing is selected. */
function caretLine(state: EditorState): number | null {
	const main = state.selection.main;
	return main.empty ? state.doc.lineAt(main.head).number - 1 : null;
}

function decorate(view: EditorView, blocks: VerseBlock[], closing: VerseBlock | null): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const doc = view.state.doc;
	// Visible ranges can share a line, and a line is decorated once.
	let decoratedUpTo = -1;

	for (const { from, to } of view.visibleRanges) {
		const first = Math.max(doc.lineAt(from).number - 1, decoratedUpTo + 1);
		const last = doc.lineAt(to).number - 1;

		for (const block of blocks) {
			if (block.endLine < first || block.startLine > last) continue;
			const isClosing = closing?.startLine === block.startLine;
			for (let line = Math.max(block.startLine, first); line <= Math.min(block.endLine, last); line++) {
				const position = doc.line(line + 1).from;
				const cls = LINE_CLASS[lineRole(block, line)] + (isClosing ? CLOSING_CLASS : '');
				builder.add(position, position, Decoration.line({ class: cls }));
			}
		}
		decoratedUpTo = Math.max(decoratedUpTo, last);
	}
	return builder.finish();
}
