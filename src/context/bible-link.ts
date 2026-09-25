import { findVerseReferences, verseKey } from '../verse-rules';

/** A link whose note name is a verse or chapter reference. */
export type BibleLink = {
	/** How it reads, e.g. "John 3:16-18" or "Psalm 23". */
	reference: string;
	level: 'verse' | 'chapter';
	/** `verseKey` for every verse or chapter it covers. Two links overlap when these meet. */
	keys: string[];
	/** The key of each chapter it sits in, e.g. "John|3|" for John 3:16. */
	chapterKeys: string[];
};

const parsed = new Map<string, BibleLink | null>();

/**
 * Reads a link target, or a note path, as a Bible reference.
 *
 * Only a name that is wholly one reference counts, so `Psalms 23 1` does and
 * `Psalms` or `Notes on John 3` do not. Results are remembered, since the same
 * names come up on every caret move.
 */
export function parseBibleLink(linkpath: string): BibleLink | null {
	const name = noteName(linkpath);
	if (!parsed.has(name)) parsed.set(name, readName(name));
	return parsed.get(name) ?? null;
}

function readName(name: string): BibleLink | null {
	const matches = findVerseReferences(name);
	const match = matches[0];
	if (matches.length !== 1 || !match || match.start !== 0 || match.end !== name.length) {
		return null;
	}

	const isChapter = match.verses.every((verse) => verse.verse === null);
	const chapterKeys = match.verses.map((verse) => verseKey({ ...verse, verse: null }));

	return {
		reference: match.reference,
		level: isChapter ? 'chapter' : 'verse',
		keys: match.keys,
		chapterKeys: [...new Set(chapterKeys)],
	};
}

function noteName(linkpath: string): string {
	const basename = linkpath.split('/').pop() ?? '';
	return basename.replace(/\.md$/i, '').trim();
}
