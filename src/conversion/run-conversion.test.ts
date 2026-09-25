import type { App, Editor, EditorPosition, TFile } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { DEFAULT_CONVERSION_OPTIONS } from './convert-text';
import {
	convertEditor,
	convertFiles,
	describeSummary,
	type ConversionSummary,
} from './run-conversion';

/** Just enough of Obsidian's vault and link resolution to run a conversion in memory. */
function fakeVault(initial: Record<string, string>) {
	const files = new Map(Object.entries(initial));
	const folders = new Set<string>();
	const fileFor = (path: string) =>
		({ path, basename: path.split('/').pop()?.replace(/\.md$/, '') }) as unknown as TFile;

	const app = {
		vault: {
			cachedRead: async (file: TFile) => files.get(file.path) ?? '',
			process: async (file: TFile, change: (data: string) => string) => {
				const next = change(files.get(file.path) ?? '');
				files.set(file.path, next);
				return next;
			},
			create: async (path: string, data: string) => {
				if (files.has(path)) throw new Error(`${path} already exists`);
				files.set(path, data);
				return fileFor(path);
			},
			createFolder: async (path: string) => {
				folders.add(path);
			},
			getFolderByPath: (path: string) => (folders.has(path) ? { path } : null),
			getAbstractFileByPath: (path: string) => (files.has(path) ? fileFor(path) : null),
		},
		metadataCache: {
			getFirstLinkpathDest: (name: string) => {
				const path = [...files.keys()].find(
					(candidate) => candidate === `${name}.md` || candidate.endsWith(`/${name}.md`),
				);
				return path === undefined ? null : fileFor(path);
			},
		},
	} as unknown as App;

	return { app, files, folders, fileFor };
}

/** An editor over a plain string, applying transaction changes against the original text. */
function fakeEditor(initial: string) {
	let text = initial;
	const offsetToPos = (offset: number): EditorPosition => {
		const before = text.slice(0, offset).split('\n');
		return { line: before.length - 1, ch: before[before.length - 1]?.length ?? 0 };
	};
	const posToOffset = (pos: EditorPosition): number =>
		text.split('\n').slice(0, pos.line).reduce((sum, line) => sum + line.length + 1, 0) + pos.ch;

	const editor = {
		getValue: () => text,
		offsetToPos,
		transaction: ({ changes }: { changes: { from: EditorPosition; to: EditorPosition; text: string }[] }) => {
			const offsets = changes.map((change) => ({
				from: posToOffset(change.from),
				to: posToOffset(change.to),
				text: change.text,
			}));
			for (const change of offsets.sort((a, b) => b.from - a.from)) {
				text = text.slice(0, change.from) + change.text + text.slice(change.to);
			}
		},
	} as unknown as Editor;

	return { editor, text: () => text };
}

const split = {
	...DEFAULT_CONVERSION_OPTIONS,
	notesLocation: 'folder',
	notesFolder: 'Bible',
	splitByTestament: true,
} as const;

describe('converting files on disk', () => {
	it('rewrites references and creates the whole parent chain', async () => {
		const { app, files, fileFor } = fakeVault({ 'Journal/Sept.md': 'Today: Ps 23:1.' });

		const summary = await convertFiles(app, split, [fileFor('Journal/Sept.md')]);

		expect(files.get('Journal/Sept.md')).toBe('Today: [[Psalms 23 1|Ps 23:1]].');
		expect(files.get('Bible/Old Testament/Psalms 23 1.md')).toBe('[[Psalms 23]]\n');
		expect(files.get('Bible/Old Testament/Psalms 23.md')).toBe('[[Psalms]]\n');
		expect(files.get('Bible/Old Testament/Psalms.md')).toBe('[[Old Testament]]\n');
		expect(files.get('Bible/Old Testament.md')).toBe('');
		expect(summary).toMatchObject({ filesChanged: 1, linksCreated: 1, notesCreated: 4 });
	});

	it('reuses a note that already exists anywhere, and leaves it alone', async () => {
		const { app, files, fileFor } = fakeVault({
			'Journal/Sept.md': 'Ps 23:1',
			'6 - Bible Tags/Old Testament/Psalms 23 1.md': 'my own notes',
		});

		await convertFiles(app, split, [fileFor('Journal/Sept.md')]);

		expect(files.get('6 - Bible Tags/Old Testament/Psalms 23 1.md')).toBe('my own notes');
		expect(files.has('Bible/Old Testament/Psalms 23 1.md')).toBe(false);
		expect(files.has('Bible/Old Testament/Psalms 23.md')).toBe(true);
	});

	it('creates each note once, however many references need it', async () => {
		const { app, fileFor } = fakeVault({ 'a.md': 'John 3:16', 'b.md': 'John 3:17' });

		const summary = await convertFiles(app, split, [fileFor('a.md'), fileFor('b.md')]);

		// John 3 16, John 3 17, John 3, John, New Testament
		expect(summary.notesCreated).toBe(5);
	});

	it('puts everything flat in the notes folder when not split', async () => {
		const { app, files, fileFor } = fakeVault({ 'a.md': 'Romans 8' });

		await convertFiles(app, { ...split, splitByTestament: false }, [fileFor('a.md')]);

		expect([...files.keys()].sort()).toEqual([
			'Bible/New Testament.md',
			'Bible/Romans 8.md',
			'Bible/Romans.md',
			'a.md',
		]);
	});

	it('creates notes beside each converted note, reusing ones made for an earlier note', async () => {
		const { app, files, fileFor } = fakeVault({
			'Journal/a.md': 'John 3:16',
			'Sermons/b.md': 'John 3:17',
		});
		const current = { ...split, notesLocation: 'current', splitByTestament: false } as const;

		await convertFiles(app, current, [fileFor('Journal/a.md'), fileFor('Sermons/b.md')]);

		expect(files.has('Journal/John 3 16.md')).toBe(true);
		expect(files.has('Journal/John 3.md')).toBe(true);
		expect(files.has('Sermons/John 3 17.md')).toBe(true);
		expect(files.has('Sermons/John 3.md')).toBe(false);
	});

	it('changes nothing on a second run', async () => {
		const { app, files, fileFor } = fakeVault({ 'a.md': 'Proverbs 17:7; 30:22' });
		const note = [fileFor('a.md')];

		await convertFiles(app, split, note);
		const afterFirst = new Map(files);
		const second = await convertFiles(app, split, note);

		expect(files).toEqual(afterFirst);
		expect(second).toMatchObject({ filesChanged: 0, linksCreated: 0, notesCreated: 0 });
	});

	it('stops between files when asked', async () => {
		const { app, fileFor } = fakeVault({ 'a.md': 'John 1', 'b.md': 'John 2' });
		let calls = 0;

		const summary = await convertFiles(app, split, [fileFor('a.md'), fileFor('b.md')], {
			onProgress: () => (calls += 1),
			isStopped: () => calls > 0,
		});

		expect(summary).toMatchObject({ filesChanged: 1, stoppedEarly: true });
	});
});

describe('converting the open note', () => {
	it('edits through the editor, across lines, and creates the chain', async () => {
		const { app, files, fileFor } = fakeVault({});
		const { editor, text } = fakeEditor('Line one John 3:16\nand Romans 8:28 here');

		const summary = await convertEditor(app, split, editor, fileFor('a.md'));

		expect(text()).toBe(
			'Line one [[John 3 16|John 3:16]]\nand [[Romans 8 28|Romans 8:28]] here',
		);
		expect(files.has('Bible/New Testament/Romans 8 28.md')).toBe(true);
		expect(summary).toMatchObject({ filesChanged: 1, linksCreated: 2 });
	});
});

const nothingDone: ConversionSummary = {
	filesChanged: 0,
	linksCreated: 0,
	linksStandardized: 0,
	notesCreated: 0,
	failedPaths: [],
	stoppedEarly: false,
};

describe('standardizing references', () => {
	it('writes standard text for new links and tidies existing ones, counting each', async () => {
		const { app, files, fileFor } = fakeVault({
			'Journal/Sept.md': 'Read Ps 23:1 and [[John 3 16|Jn 3.16]].',
		});
		const settings = { ...split, standardizeReferences: true };

		const summary = await convertFiles(app, settings, [fileFor('Journal/Sept.md')]);

		expect(files.get('Journal/Sept.md')).toBe('Read [[Psalms 23 1|Psalm 23:1]] and [[John 3 16|John 3:16]].');
		expect(summary).toMatchObject({ filesChanged: 1, linksCreated: 1, linksStandardized: 1 });

		const again = await convertFiles(app, settings, [fileFor('Journal/Sept.md')]);
		expect(again).toMatchObject({ filesChanged: 0, linksCreated: 0, linksStandardized: 0 });
	});
});

describe('the summary a run ends with', () => {
	it('counts what was converted and created', () => {
		expect(
			describeSummary({ ...nothingDone, filesChanged: 2, linksCreated: 5, notesCreated: 1 }),
		).toBe('Converted 5 references in 2 notes and created 1 new note.');
	});

	it('mentions standardized links only when there were some', () => {
		expect(
			describeSummary({ ...nothingDone, filesChanged: 2, linksCreated: 3, linksStandardized: 5, notesCreated: 4 }),
		).toBe('Converted 3 references and standardized 5 links in 2 notes and created 4 new notes.');
	});

	it('says when a run was stopped', () => {
		expect(describeSummary({ ...nothingDone, stoppedEarly: true })).toContain(
			'Stopped before the end.',
		);
	});

	it('names the first few failures and counts the rest', () => {
		const failedPaths = ['a.md', 'b.md', 'c.md', 'd.md', 'e.md'];
		expect(describeSummary({ ...nothingDone, failedPaths })).toContain(
			'Could not convert a.md, b.md, c.md and 2 more.',
		);
	});
});
