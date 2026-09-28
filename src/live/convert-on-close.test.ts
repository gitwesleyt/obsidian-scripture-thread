import type { App } from 'obsidian';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { convertText } from '../conversion/convert-text';
import { convertOnClose } from './convert-on-close';

const location = { notesLocation: 'root', notesFolder: '', splitByTestament: false } as const;
const NOTE = 'Journal.md';
const TYPED = 'Read Ps 1 today';

/** A vault holding `saved` as the note, with the note optionally still open in an editor. */
function fakeApp(saved: string, openPaths: string[] = []) {
	const files = new Map([[NOTE, saved]]);
	const file = (path: string) => ({ path });

	const app = {
		vault: {
			getFileByPath: (path: string) => (files.has(path) ? file(path) : null),
			read: async (f: { path: string }) => files.get(f.path) ?? '',
			process: async (f: { path: string }, change: (data: string) => string) => {
				files.set(f.path, change(files.get(f.path) ?? ''));
			},
			create: async (path: string, data: string) => {
				files.set(path, data);
			},
			createFolder: async () => {},
			getFolderByPath: () => null,
			getAbstractFileByPath: (path: string) => (files.has(path) ? file(path) : null),
		},
		metadataCache: { getFirstLinkpathDest: () => null },
		workspace: {
			getLeavesOfType: () =>
				openPaths.map((path) => ({ view: { file: file(path) } })),
		},
	} as unknown as App;

	return { app, files };
}

async function closeWith(app: App, text: string) {
	const conversion = convertText(text, undefined, [{ from: 0, to: text.length }]);
	await convertOnClose(app, location, NOTE, text, conversion);
}

describe('converting what was still waiting when a note closes', () => {
	beforeEach(() => {
		// Every wait for Obsidian's save passes at once.
		vi.stubGlobal('window', { setTimeout: (run: () => void) => queueMicrotask(run) });
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('writes the links, and creates the notes, when the saved file is what the editor held', async () => {
		const { app, files } = fakeApp(TYPED);
		await closeWith(app, TYPED);

		expect(files.get(NOTE)).toBe('Read [[Psalms 1|Ps 1]] today');
		expect(files.get('Psalms 1.md')).toBe('[[Psalms]]\n');
	});

	it('leaves the file alone when it holds other text', async () => {
		const { app, files } = fakeApp('Newer text');
		await closeWith(app, TYPED);

		expect(files.get(NOTE)).toBe('Newer text');
		expect(files.has('Psalms 1.md')).toBe(false);
	});

	it('leaves the file alone while the note is still open in an editor', async () => {
		const { app, files } = fakeApp(TYPED, [NOTE]);
		await closeWith(app, TYPED);

		expect(files.get(NOTE)).toBe(TYPED);
	});
});
