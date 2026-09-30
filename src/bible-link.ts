import { BIBLE_BOOKS } from './bible-books';
import { scanText, verseKey } from './verse-rules';

/** A link, or a piece of text, that is wholly one verse or chapter reference. */
export type BibleLink = {
	/** How it reads in standard form, e.g. "John 3:16-18" or "Psalm 23". */
	reference: string;
	/** The reference without its book, e.g. "3:16-18" or "23". */
	passage: string;
	/** Canonical book name, e.g. "Psalms". */
	book: string;
	level: 'verse' | 'chapter';
	/** `verseKey` for every verse or chapter it covers. Two links overlap when these meet. */
	keys: string[];
	/** The key of each chapter it sits in, e.g. "John|3|" for John 3:16. */
	chapterKeys: string[];
};

const parsed = new Map<string, BibleLink | null>();
const parsedSpoken = new Map<string, BibleLink | null>();

/**
 * Reads a link target, or a note path, as a Bible reference.
 *
 * Only a name that is wholly one reference counts, so `Psalms 23 1` does and
 * `Psalms` or `Notes on John 3` do not.
 */
export function parseBibleLink(linkpath: string): BibleLink | null {
	return parseReference(noteName(linkpath));
}

/**
 * The same test for a piece of text, such as a link's visible text. Results are
 * remembered, since the same names come up on every caret move. With `spoken`,
 * the words a writer dictated count as a reference too.
 */
export function parseReference(text: string, spoken = false): BibleLink | null {
	const trimmed = text.trim();
	const remembered = spoken ? parsedSpoken : parsed;
	if (!remembered.has(trimmed)) remembered.set(trimmed, readReference(trimmed, spoken));
	return remembered.get(trimmed) ?? null;
}

/** Both name exactly the same verses, or the same chapters. */
export function samePassage(a: BibleLink, b: BibleLink): boolean {
	return a.keys.length === b.keys.length && a.keys.every((key) => b.keys.includes(key));
}

function readReference(text: string, spoken: boolean): BibleLink | null {
	const matches = scanText(text, { spoken });
	const match = matches[0];
	if (matches.length !== 1 || !match || match.start !== 0 || match.end !== text.length) {
		return null;
	}

	const book = BIBLE_BOOKS.find((candidate) => candidate.name === match.verses[0]?.book);
	if (!book) return null;

	const displayName = book.singular ?? book.name;
	const isChapter = match.verses.every((verse) => verse.verse === null);
	const chapterKeys = match.verses.map((verse) => verseKey({ ...verse, verse: null }));

	return {
		reference: match.reference,
		passage: match.reference.slice(displayName.length + 1),
		book: book.name,
		level: isChapter ? 'chapter' : 'verse',
		keys: match.keys,
		chapterKeys: [...new Set(chapterKeys)],
	};
}

function noteName(linkpath: string): string {
	const basename = linkpath.split('/').pop() ?? '';
	return basename.replace(/\.md$/i, '');
}
