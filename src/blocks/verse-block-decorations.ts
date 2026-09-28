import { RangeSetBuilder, type Text } from '@codemirror/state';
import {
	Decoration,
	ViewPlugin,
	type DecorationSet,
	type EditorView,
	type PluginValue,
	type ViewUpdate,
} from '@codemirror/view';
import { editorInfoField } from 'obsidian';
import { lineRole, verseBlocks, type LineSource, type VerseBlock } from '../verse-block-rules';
import { verseLinkOpener } from './opens-block';

const LINE_CLASS: Record<ReturnType<typeof lineRole>, string> = {
	only: 'scripture-thread-verse-block scripture-thread-verse-block-start scripture-thread-verse-block-end',
	start: 'scripture-thread-verse-block scripture-thread-verse-block-start',
	middle: 'scripture-thread-verse-block',
	end: 'scripture-thread-verse-block scripture-thread-verse-block-end',
};

/**
 * Draws the verse block border in Live Preview and Source mode. The blocks are
 * worked out from the whole note when its text changes, and only the visible
 * lines are decorated.
 */
export const verseBlockDecorations = ViewPlugin.fromClass(
	class implements PluginValue {
		decorations: DecorationSet;
		private blocks: VerseBlock[];

		constructor(view: EditorView) {
			this.blocks = blocksIn(view);
			this.decorations = decorate(view, this.blocks);
		}

		update(update: ViewUpdate) {
			if (update.docChanged) this.blocks = blocksIn(update.view);
			if (update.docChanged || update.viewportChanged) {
				this.decorations = decorate(update.view, this.blocks);
			}
		}
	},
	{ decorations: (plugin) => plugin.decorations },
);

function blocksIn(view: EditorView): VerseBlock[] {
	const path = view.state.field(editorInfoField, false)?.file?.path ?? '';
	return verseBlocks(linesOf(view.state.doc), verseLinkOpener(path));
}

function linesOf(doc: Text): LineSource {
	return { lineCount: doc.lines, line: (index) => doc.line(index + 1).text };
}

function decorate(view: EditorView, blocks: VerseBlock[]): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const doc = view.state.doc;
	// Visible ranges can share a line, and a line is decorated once.
	let decoratedUpTo = -1;

	for (const { from, to } of view.visibleRanges) {
		const first = Math.max(doc.lineAt(from).number - 1, decoratedUpTo + 1);
		const last = doc.lineAt(to).number - 1;

		for (const block of blocks) {
			if (block.endLine < first || block.startLine > last) continue;
			const start = Math.max(block.startLine, first);
			const end = Math.min(block.endLine, last);
			for (let line = start; line <= end; line++) {
				const position = doc.line(line + 1).from;
				builder.add(position, position, Decoration.line({ class: LINE_CLASS[lineRole(block, line)] }));
			}
		}
		decoratedUpTo = Math.max(decoratedUpTo, last);
	}
	return builder.finish();
}
