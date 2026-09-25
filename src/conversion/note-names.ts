import { BIBLE_BOOKS, type BibleBook } from '../bible-books';
import type { VerseMatch } from '../verse-rules';

/**
 * Note names, parent chains and note paths for converted references.
 *
 * Names follow the notes already in the user's vaults: the plural canonical book
 * name, with a space where the colon was because file names cannot hold one --
 * "Psalms 23 1", "Psalms 23", "Psalms", "John 3 16-18", "Matthew 5-7".
 */

export type Testament = 'Old Testament' | 'New Testament';

/** One wikilink to write, and the notes it needs. */
export type LinkTarget = {
	/** Where the linked text starts in the text handed in. */
	from: number;
	/** Where it ends, exclusive. */
	to: number;
	/** The text exactly as typed, which becomes the link's alias. */
	alias: string;
	/** The linked note first, then each parent up to and including the testament. */
	chain: string[];
};

/** The same three choices as Obsidian's "Default location for new notes". */
export type NotesLocation = 'root' | 'current' | 'folder';

export type NoteLocation = {
	notesLocation: NotesLocation;
	/** Used only when `notesLocation` is 'folder'. */
	notesFolder: string;
	splitByTestament: boolean;
};

const OLD_TESTAMENT_BOOK_COUNT = 39;

export function testamentOf(book: BibleBook): Testament {
	return BIBLE_BOOKS.indexOf(book) < OLD_TESTAMENT_BOOK_COUNT
		? 'Old Testament'
		: 'New Testament';
}

export function isTestament(name: string): name is Testament {
	return name === 'Old Testament' || name === 'New Testament';
}

/**
 * One target per chapter the reference names. "Proverbs 17:7; 30:22" is two
 * links, each to its own verse note, with the "; " left as plain text between.
 */
export function targetsFor(match: VerseMatch): LinkTarget[] {
	const book = BIBLE_BOOKS.find((candidate) => candidate.name === match.verses[0]?.book);
	if (!book) return [];

	const displayName = book.singular ?? book.name;
	const parts = match.reference.slice(displayName.length + 1).split('; ');
	const pieces = typedPieces(match);

	if (pieces.length !== parts.length) return [];

	return parts.map((part, index) => {
		const piece = pieces[index] as Piece;
		return { ...piece, chain: chainFor(book, part) };
	});
}

/**
 * Where a note belongs, given the note whose reference asked for it. Testament
 * notes always sit at the root of the chosen location.
 */
export function notePath(
	name: string,
	testament: Testament,
	location: NoteLocation,
	sourcePath: string,
): string {
	const folder = baseFolder(location, sourcePath).trim().replace(/^\/+|\/+$/g, '');
	const subfolder = location.splitByTestament && !isTestament(name) ? testament : '';

	return [folder, subfolder, `${name}.md`].filter((segment) => segment !== '').join('/');
}

function baseFolder(location: NoteLocation, sourcePath: string): string {
	switch (location.notesLocation) {
		case 'root':
			return '';
		case 'current':
			return sourcePath.slice(0, Math.max(sourcePath.lastIndexOf('/'), 0));
		case 'folder':
			return location.notesFolder;
	}
}

/** "23", "23:1-6", "5-7" or "6:1-3,7" -- one part of a canonical reference, book removed. */
function chainFor(book: BibleBook, part: string): string[] {
	const testament = testamentOf(book);
	const [chapter, verses] = part.split(':');

	if (verses === undefined) return [`${book.name} ${part}`, book.name, testament];

	const chapterNote = `${book.name} ${chapter ?? ''}`;
	return [`${chapterNote} ${verses}`, chapterNote, book.name, testament];
}

type Piece = { from: number; to: number; alias: string };

/** The typed text, cut at each semicolon, with the spacing around them left out. */
function typedPieces(match: VerseMatch): Piece[] {
	const pieces: Piece[] = [];
	let start = 0;

	for (const segment of match.text.split(';')) {
		const leading = segment.length - segment.trimStart().length;
		const alias = segment.trim();

		pieces.push({
			from: match.start + start + leading,
			to: match.start + start + leading + alias.length,
			alias,
		});
		start += segment.length + 1;
	}

	return pieces;
}
