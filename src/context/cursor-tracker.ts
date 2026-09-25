import { EditorView, type ViewUpdate } from '@codemirror/view';
import { debounce, editorInfoField } from 'obsidian';
import { parseBibleLink } from '../bible-link';
import { linksAtCursor } from './links-at-cursor';

export type VerseLinksAtCursor = { linkpaths: string[]; sourcePath: string };

const PAUSE_MS = 200;

/**
 * Reports the verse and chapter links at the caret after it stops moving.
 *
 * Only caret moves count, never edits -- so typing does no work here -- and only
 * the caret's paragraph is read.
 */
export function cursorTracker(onLinks: (found: VerseLinksAtCursor) => void) {
	const report = debounce(onLinks, PAUSE_MS, true);

	return EditorView.updateListener.of((update: ViewUpdate) => {
		if (!update.selectionSet || update.docChanged) return;

		const file = update.state.field(editorInfoField, false)?.file;
		if (!file) return;

		const linkpaths = verseLinksAtCaret(update).filter((linkpath) => parseBibleLink(linkpath));
		if (linkpaths.length > 0) report({ linkpaths, sourcePath: file.path });
	});
}

function verseLinksAtCaret(update: ViewUpdate): string[] {
	const { doc, selection } = update.state;
	const caret = selection.main.head;
	const line = doc.lineAt(caret);

	return linksAtCursor(
		{ lineCount: doc.lines, line: (index) => doc.line(index + 1).text },
		line.number - 1,
		caret - line.from,
	);
}
