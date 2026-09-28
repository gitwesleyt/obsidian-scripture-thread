import type { App, MarkdownView } from 'obsidian';
import { applyEdits, type Conversion } from '../conversion/convert-text';
import { NoteCreator } from '../conversion/note-creator';
import type { NoteLocation } from '../conversion/note-names';

/** Obsidian saves a note as it closes; when to look for that save. */
const SAVE_CHECKS_MS = [0, 250, 1000];

/**
 * Writes the conversion of the lines still waiting when a note's editor closes
 * (switching notes, closing the tab), since the editor can no longer be changed.
 *
 * Only writes when the saved file is exactly the text the editor held, and the
 * note isn't open anywhere else -- so it never overwrites newer text or races an
 * open editor. Otherwise the references stay plain, for a command to convert.
 */
export async function convertOnClose(
	app: App,
	location: NoteLocation,
	path: string,
	text: string,
	conversion: Conversion,
): Promise<void> {
	for (const delay of SAVE_CHECKS_MS) {
		await sleep(delay);
		if (isOpenInEditor(app, path)) return;

		const file = app.vault.getFileByPath(path);
		if (!file) return;
		if ((await app.vault.read(file)) !== text) continue;

		let written = false;
		await app.vault.process(file, (data) => {
			if (data !== text) return data;
			written = true;
			return applyEdits(data, conversion.edits);
		});
		if (!written) return;

		const creator = new NoteCreator(app, location);
		for (const chain of conversion.chains) await creator.ensureChain(chain, path);
		return;
	}
}

function isOpenInEditor(app: App, path: string): boolean {
	return app.workspace
		.getLeavesOfType('markdown')
		.some((leaf) => (leaf.view as MarkdownView).file?.path === path);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
