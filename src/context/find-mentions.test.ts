import type { CachedMetadata, Loc, Pos, ReferenceCache } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { findMentions, type MentionSource } from './find-mentions';
import { paragraphAt } from './paragraph';

/**
 * A rough stand-in for Obsidian's markdown indexing: blank lines split sections,
 * `- ` lines are list items, `> [!` starts a callout, and a leading `---` block is
 * frontmatter whose `[[links]]` become property links.
 */
function metadataFor(text: string): CachedMetadata {
	const loc = (offset: number): Loc => {
		const before = text.slice(0, offset).split('\n');
		return { line: before.length - 1, col: before[before.length - 1]?.length ?? 0, offset };
	};
	const pos = (start: number, end: number): Pos => ({ start: loc(start), end: loc(end) });

	const frontmatterEnd = text.startsWith('---\n') ? text.indexOf('\n---', 4) + 4 : 0;
	const cache: CachedMetadata = { sections: [], listItems: [], links: [], embeds: [], frontmatterLinks: [] };

	for (const block of text.slice(frontmatterEnd).matchAll(/[^\n](?:.|\n(?!\s*\n))*/g)) {
		const start = frontmatterEnd + block.index;
		const end = start + block[0].length;
		const type = block[0].startsWith('- ') ? 'list' : block[0].startsWith('> [!') ? 'callout' : 'paragraph';
		cache.sections?.push({ type, position: pos(start, end) });

		if (type === 'list') {
			for (const item of block[0].matchAll(/^\s*- .*$/gm)) {
				cache.listItems?.push({ parent: -1, position: pos(start + item.index, start + item.index + item[0].length) });
			}
		}
	}

	for (const link of text.matchAll(/(!?)\[\[([^\]]+)\]\]/g)) {
		const destination = link[2]?.split('|')[0] ?? '';
		if (link.index < frontmatterEnd) {
			cache.frontmatterLinks?.push({ key: 'verse', link: destination, original: link[0] });
			continue;
		}
		const reference: ReferenceCache = {
			link: destination,
			original: link[0],
			position: pos(link.index, link.index + link[0].length),
		};
		(link[1] ? cache.embeds : cache.links)?.push(reference);
	}

	return cache;
}

/** Notes by path, with modified times in the order given (later means newer). */
function fakeVault(notes: Record<string, string>): MentionSource {
	const paths = Object.keys(notes);
	const caches = new Map(paths.map((path) => [path, metadataFor(notes[path] ?? '')]));
	const resolve = (linkpath: string) =>
		paths.find((path) => path === `${linkpath}.md` || path.endsWith(`/${linkpath}.md`)) ?? null;

	const resolvedLinks: Record<string, Record<string, number>> = {};
	const unresolvedLinks: Record<string, Record<string, number>> = {};
	for (const [path, cache] of caches) {
		resolvedLinks[path] = {};
		unresolvedLinks[path] = {};
		const references = [...(cache.links ?? []), ...(cache.embeds ?? []), ...(cache.frontmatterLinks ?? [])];
		for (const { link } of references) {
			const linkpath = link.split('#')[0] ?? '';
			const target = resolve(linkpath);
			const bucket = target ? resolvedLinks[path] : unresolvedLinks[path];
			const key = target ?? linkpath;
			bucket[key] = (bucket[key] ?? 0) + 1;
		}
	}

	return {
		resolvedLinks,
		unresolvedLinks,
		getCache: (path) => caches.get(path) ?? null,
		resolve,
		read: async (path) => notes[path] ?? '',
		modifiedTime: (path) => paths.indexOf(path),
	};
}

describe('finding the notes that mention a verse', () => {
	const vault = fakeVault({
		'Bible/New Testament/John 3 16.md': '[[John 3]]\n',
		'Bible/New Testament/John 3.md': '[[John]]\n',
		'Journal/Monday.md': 'Plain first paragraph.\n\nI keep coming back to [[John 3 16|John 3:16]].\nIt stays with me.\n',
		'Journal/Tuesday.md': 'Studied [[John 3 16-18|John 3:16-18]] with friends.\n',
		'Journal/Wednesday.md': '- groceries\n- memorise [[John 3 16|Jn 3:16]]\n- call Mum\n',
		'Journal/Thursday.md': '> [!quote] Today\n> For God so loved [[John 3 16|John 3:16]]\n\nAfter the callout.\n',
		'Journal/Friday.md': 'Unrelated [[Psalms 23]] and [[Romans 8 28]].\n',
	});

	it('lists every other note with the paragraph around the link', async () => {
		const found = await findMentions(vault, 'John 3 16', 'Journal/Current.md');

		expect(found?.reference).toBe('John 3:16');
		expect(found?.exact).toEqual([
			{
				path: 'Journal/Thursday.md',
				mentions: [{ line: 0, text: '> [!quote] Today\n> For God so loved [[John 3 16|John 3:16]]', linkedAs: 'John 3:16' }],
			},
			{
				path: 'Journal/Wednesday.md',
				mentions: [{ line: 1, text: '- memorise [[John 3 16|Jn 3:16]]', linkedAs: 'John 3:16' }],
			},
			{
				path: 'Journal/Monday.md',
				mentions: [
					{ line: 2, text: 'I keep coming back to [[John 3 16|John 3:16]].\nIt stays with me.', linkedAs: 'John 3:16' },
				],
			},
		]);
	});

	it('puts notes linking to an overlapping range in their own group', async () => {
		const found = await findMentions(vault, 'John 3 16', 'Journal/Current.md');

		expect(found?.overlapping).toEqual([
			{
				path: 'Journal/Tuesday.md',
				mentions: [{ line: 0, text: 'Studied [[John 3 16-18|John 3:16-18]] with friends.', linkedAs: 'John 3:16-18' }],
			},
		]);
	});

	it('leaves out the note the caret is in', async () => {
		const found = await findMentions(vault, 'John 3 16', 'Journal/Monday.md');
		expect(found?.exact.map((note) => note.path)).not.toContain('Journal/Monday.md');
	});

	it('skips the parent links inside verse notes', async () => {
		const found = await findMentions(vault, 'John 3', 'Journal/Current.md');
		expect(found?.exact).toEqual([]);
	});

	it('returns nothing for a link that is not a verse or chapter', async () => {
		expect(await findMentions(vault, 'John', 'Journal/Current.md')).toBeNull();
	});
});

describe('the edges of what counts', () => {
	it('finds links to a verse note that does not exist yet', async () => {
		const vault = fakeVault({ 'A.md': 'Hoping in [[Lamentations 3 22|Lam 3:22]].' });
		const found = await findMentions(vault, 'Lamentations 3 22', 'B.md');
		expect(found?.exact[0]?.path).toBe('A.md');
	});

	it('matches chapter ranges against a chapter, but not verses in it', async () => {
		const vault = fakeVault({
			'Sermon.md': 'Series on [[Matthew 5-7]].',
			'Verse.md': 'Just [[Matthew 6 9]].',
		});
		const found = await findMentions(vault, 'Matthew 6', 'Other.md');
		expect(found?.exact).toEqual([]);
		expect(found?.overlapping.map((note) => note.path)).toEqual(['Sermon.md']);
	});

	it('shows a paragraph once however many times it links the verse', async () => {
		const vault = fakeVault({ 'A.md': '[[John 3 16]] and again [[John 3 16|v16]].\n\nLater, [[John 3 16]].' });
		const found = await findMentions(vault, 'John 3 16', 'B.md');
		expect(found?.exact[0]?.mentions.map((mention) => mention.line)).toEqual([0, 2]);
	});

	it('lists a link in the properties without a paragraph', async () => {
		const vault = fakeVault({ 'A.md': '---\nverse: "[[John 3 16]]"\n---\nNo body mention.' });
		const found = await findMentions(vault, 'John 3 16', 'B.md');
		expect(found?.exact).toEqual([{ path: 'A.md', mentions: [{ line: 0, text: null, linkedAs: 'John 3:16' }] }]);
	});

	it('counts embeds and links with a heading', async () => {
		const vault = fakeVault({ 'A.md': '![[John 3 16]]', 'B.md': 'See [[John 3 16#Notes]].' });
		const found = await findMentions(vault, 'John 3 16', 'C.md');
		expect(found?.exact.map((note) => note.path).sort()).toEqual(['A.md', 'B.md']);
	});
});

describe('paragraph boundaries', () => {
	const text = 'Intro line.\n\n- one\n- two [[x]]\n- three\n\nLast paragraph\nspans two lines.';
	const cache = metadataFor(text);
	const slice = (offset: number) => {
		const paragraph = paragraphAt(cache, offset);
		return paragraph && text.slice(paragraph.start, paragraph.end);
	};

	it('is the list item, not the whole list', () => {
		expect(slice(text.indexOf('[[x]]'))).toBe('- two [[x]]');
	});

	it('is the whole section otherwise', () => {
		expect(slice(text.indexOf('spans'))).toBe('Last paragraph\nspans two lines.');
		expect(slice(0)).toBe('Intro line.');
	});

	it('is nothing between sections', () => {
		expect(slice(text.indexOf('\n\n') + 1)).toBeNull();
	});
});
