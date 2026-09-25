import type { App, WorkspaceLeaf } from 'obsidian';
import { parseBibleLink } from '../bible-link';
import type { VerseLinksAtCursor } from '../context/cursor-tracker';
import { linksAtCursor } from '../context/links-at-cursor';
import { VERSE_CONTEXT_VIEW, VerseContextView } from '../ui/verse-context-view';

/**
 * Shows the verses at the caret, opening the panel only if it isn't open --
 * a panel the user has tucked behind another tab or a collapsed sidebar stays there.
 */
export async function showVerseContext(app: App, found: VerseLinksAtCursor): Promise<void> {
	const existing = app.workspace.getLeavesOfType(VERSE_CONTEXT_VIEW)[0];
	const leaf = existing ?? (await openPanel(app, false));
	await showIn(leaf, found);
}

/** From the command or ribbon: open and reveal the panel, filled from the caret if it can be. */
export async function openVerseContext(app: App): Promise<void> {
	const leaf = await openPanel(app, true);
	const found = linksAtActiveCaret(app);
	if (found) await showIn(leaf, found);
}

function openPanel(app: App, active: boolean): Promise<WorkspaceLeaf> {
	return app.workspace.ensureSideLeaf(VERSE_CONTEXT_VIEW, 'right', { active, reveal: true });
}

async function showIn(leaf: WorkspaceLeaf, found: VerseLinksAtCursor): Promise<void> {
	await leaf.loadIfDeferred();
	if (leaf.view instanceof VerseContextView) leaf.view.showVerses(found.linkpaths, found.sourcePath);
}

function linksAtActiveCaret(app: App): VerseLinksAtCursor | null {
	const { editor, file } = app.workspace.activeEditor ?? {};
	if (!editor || !file) return null;

	const caret = editor.getCursor();
	const linkpaths = linksAtCursor(
		{ lineCount: editor.lineCount(), line: (index) => editor.getLine(index) },
		caret.line,
		caret.ch,
	).filter((linkpath) => parseBibleLink(linkpath));

	return linkpaths.length > 0 ? { linkpaths, sourcePath: file.path } : null;
}
