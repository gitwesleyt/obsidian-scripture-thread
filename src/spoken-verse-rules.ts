import { BIBLE_BOOKS, MAX_VERSE_NUMBER, type BibleBook } from "./bible-books";
import { readSpokenNumber } from "./spoken-numbers";
import {
  bookNamed,
  DASH,
  GAP,
  insideWebAddress,
  spellingsPattern,
  startsABookName,
  verseMatch,
  type Span,
  type Tail,
  type VerseMatch,
} from "./verse-rules";

/**
 * Bible references the way dictation spells them (item 11.2).
 *
 * Apple dictation writes `revelation three verses five through seven` where a
 * writer types `Revelation 3:5-7`: small numbers as words, the book in lower
 * case, and `chapter`, `verse(s)`, `to` and `through` where the punctuation
 * would go. `verse-rules.ts` finds none of that and is deliberately not taught
 * it -- **this file only runs when the writer has switched *Recognise dictated
 * verse references* on**, through `scanText(text, { spoken: true })`, so with
 * the switch off detection is exactly what it was
 * (`v3/decisions/11.2-spoken-verse-detection.md`).
 *
 * What it reads, after a book name:
 *
 *   John three             a chapter as a word, counted exactly as `John 3` is
 *   Romans chapter 8       `chapter` between the book and its number
 *   John 3 verse 16        `verse` or `verses` where the colon goes
 *   John 3 verses 16 to 18 `to`, `through`, `thru` or a dash for a range
 *   verses 5, 7 and 9      `and` as a comma -- only in a list opened by `verses`
 *   John three sixteen     a verse after a space -- only after a *spoken* chapter
 *   Psalm 23 to 25         a chapter range
 *   1st John four          beside the `First John` and `1 John` forms
 *
 * **Only full book names**, never an abbreviation. Dictation writes names, and
 * with a chapter spoken as a word an abbreviation is mostly English -- `my ex
 * two years ago`, `Phil two doors down`, `Dan three times`. `Job two` still
 * counts, which is the app owner's own call: it is the book's real name.
 *
 * A match comes back in the same `VerseMatch` shape a typed one does, built by
 * `verseMatch`, so a dictated reference is expanded, capped and written back in
 * canonical form by the same code. `mergeSpokenMatches` decides which of the
 * two scans wins where they both read the same words.
 */

const ORDINAL_FOR_DIGIT: Record<string, string> = { "1": "1st", "2": "2nd", "3": "3rd" };
const WORD_FOR_DIGIT: Record<string, string> = { "1": "First", "2": "Second", "3": "Third" };

/**
 * Full-name spellings a book is also known by. Everything else in a book's
 * alias list is an abbreviation, which is what this file refuses; `Song` and
 * `Songs` on their own are left out as the plainest English of all.
 */
const FULL_NAME_ALIASES = ["Song of Songs", "Revelations"];

/** The names dictation can write for a book: its name, and a numbered book's word forms. */
function dictatedSpellings(book: BibleBook): string[] {
  const names = [book.name, ...(book.singular ? [book.singular] : [])];
  const numbered = /^([123]) (.+)$/.exec(book.name);
  if (!numbered) return names;

  const [, digit, rest] = numbered;
  if (digit === undefined || rest === undefined) return names;

  return [...names, `${WORD_FOR_DIGIT[digit]} ${rest}`, `${ORDINAL_FOR_DIGIT[digit]} ${rest}`];
}

/** `1st John` is looked up as `1 John`; every other spelling is `verse-rules.ts`'s own. */
function bookFor(spelling: string): BibleBook | undefined {
  return bookNamed(spelling.replace(/^([123])(?:st|nd|rd)/i, "$1"));
}

type Patterns = {
  book: RegExp;
  gap: RegExp;
  chapterCue: RegExp;
  verseCue: RegExp;
  colon: RegExp;
  to: RegExp;
  comma: RegExp;
  and: RegExp;
  digits: RegExp;
};

let compiled: Patterns | null = null;

/**
 * Built on the first spoken scan rather than when the file loads, so a writer
 * with the switch off never pays for it -- and because `verse-rules.ts` imports
 * this file, reading its constants at load time would read them before they
 * exist.
 */
function patterns(): Patterns {
  if (compiled) return compiled;

  const spellings = [
    ...BIBLE_BOOKS.flatMap(dictatedSpellings),
    ...FULL_NAME_ALIASES,
  ];

  compiled = {
    // A book name with a space after it: everything spoken starts with one.
    book: new RegExp(`\\b(${spellingsPattern(spellings)})\\.?(?=${GAP})`, "gi"),
    gap: new RegExp(`${GAP}+`, "y"),
    chapterCue: new RegExp(`${GAP}+chapter(?![a-z])`, "iy"),
    verseCue: new RegExp(`${GAP}+(verses|verse)(?![a-z])`, "iy"),
    colon: new RegExp(`${GAP}*:${GAP}*`, "y"),
    to: new RegExp(`(?:${GAP}*${DASH}${GAP}*|${GAP}+(?:to|through|thru)${GAP}+)`, "iy"),
    comma: new RegExp(`${GAP}*,${GAP}*`, "y"),
    and: new RegExp(`${GAP}*,?${GAP}+and${GAP}+`, "iy"),
    digits: /\d{1,3}(?![\d])/y,
  };

  return compiled;
}

function take(pattern: RegExp, text: string, at: number): number | null {
  pattern.lastIndex = at;
  return pattern.test(text) ? pattern.lastIndex : null;
}

type Reading = { value: number; end: number; spoken: boolean };

/** Digits or words, starting exactly here -- never the start of a book name. */
function readNumber(text: string, at: number): Reading | null {
  if (startsABookName(text, at)) return null;

  const { digits } = patterns();
  digits.lastIndex = at;
  const found = digits.exec(text);
  if (found !== null) return { value: Number(found[0]), end: digits.lastIndex, spoken: false };

  const word = readSpokenNumber(text, at);
  return word === null ? null : { ...word, spoken: true };
}

function isVerse(value: number): boolean {
  return value >= 1 && value <= MAX_VERSE_NUMBER;
}

/** Another number after a separator, when it makes a verse. */
function nextVerse(text: string, at: number | null): Reading | null {
  if (at === null) return null;
  const next = readNumber(text, at);
  return next !== null && isVerse(next.value) ? next : null;
}

/** `16`, or `16 to 18` when the end is a later verse. Records the span, returns where it stopped. */
function closeSpan(text: string, first: Reading, chapter: number, spans: Span[]): number {
  const last = nextVerse(text, take(patterns().to, text, first.end));

  if (last !== null && last.value > first.value) {
    spans.push({ chapter, first: first.value, last: last.value });
    return last.end;
  }

  spans.push({ chapter, first: first.value, last: first.value });
  return first.end;
}

/**
 * A list of verses after its first one. `and` joins it only when `verses`
 * opened it, so `John 3:16 and 17 people` stays John 3:16.
 */
function readVerses(
  text: string,
  first: Reading,
  chapter: number,
  andJoins: boolean,
): Tail {
  const { comma, and } = patterns();
  const spans: Span[] = [];
  let cursor = closeSpan(text, first, chapter, spans);

  for (;;) {
    const separated = (andJoins ? take(and, text, cursor) : null) ?? take(comma, text, cursor);
    const next = nextVerse(text, separated);
    if (next === null) break;

    cursor = closeSpan(text, next, chapter, spans);
  }

  return { kind: "verses", end: cursor, spans };
}

/** Everything after the chapter number, read left to right. */
function readTail(text: string, at: number, book: BibleBook, chapter: Reading): Tail {
  const { verseCue, colon, gap, to } = patterns();

  // `verse` or `verses`: a verse was meant, but unlike a colon a cue with no
  // number after it is a word in a sentence -- `John 3 verses are...` is John 3.
  verseCue.lastIndex = at;
  const cue = verseCue.exec(text);
  if (cue !== null) {
    const first = nextVerse(text, take(gap, text, verseCue.lastIndex));
    if (first === null) return { kind: "chapter", end: at };
    return readVerses(text, first, chapter.value, cue[1]?.toLowerCase() === "verses");
  }

  const afterColon = take(colon, text, at);
  if (afterColon !== null) {
    const first = nextVerse(text, afterColon);
    if (first === null) return { kind: "chapter", end: at };
    return readVerses(text, first, chapter.value, false);
  }

  // `John three sixteen`. Only after a chapter spoken as a word: dictation
  // writes `Psalm 23 one of my favourites`, and that is not Psalm 23:1.
  if (chapter.spoken) {
    const first = nextVerse(text, take(gap, text, at));
    if (first !== null) return readVerses(text, first, chapter.value, false);
  }

  const last = readNumberAfter(text, take(to, text, at));
  if (last !== null && last.value > chapter.value && last.value <= book.chapters) {
    return { kind: "chapters", end: last.end, lastChapter: last.value };
  }

  return { kind: "chapter", end: at };
}

function readNumberAfter(text: string, at: number | null): Reading | null {
  return at === null ? null : readNumber(text, at);
}

/** Every dictated-shape reference in the text. Only ever reached with the switch on. */
export function findSpokenVerseReferences(text: string): VerseMatch[] {
  if (typeof text !== "string" || text === "") return [];

  const { book: bookPattern, chapterCue, gap } = patterns();
  const matches: VerseMatch[] = [];

  bookPattern.lastIndex = 0;

  for (const found of text.matchAll(bookPattern)) {
    const start = found.index ?? 0;
    const book = bookFor(found[1] ?? "");
    if (!book) continue;

    const afterName = start + found[0].length;
    const afterCue = take(chapterCue, text, afterName) ?? afterName;
    const chapter = readNumberAfter(text, take(gap, text, afterCue));
    if (chapter === null || chapter.value < 1 || chapter.value > book.chapters) continue;

    const tail = readTail(text, chapter.end, book, chapter);
    if (insideWebAddress(text, start, tail.end)) continue;

    matches.push(verseMatch(text, start, book, chapter.value, tail));
  }

  return matches;
}

/**
 * The typed scan's matches with the spoken scan's added.
 *
 * **A typed match is never changed by this** unless a spoken one starts no
 * later, ends no earlier and is longer -- the same reference, read further:
 * `John 3 verses 16 to 18` is found by the typed scan as `John 3`, and the
 * spoken reading replaces it. Anything else that overlaps a match already kept
 * is dropped, so the two scans can never draw two chips over the same words.
 * An equal reading keeps the typed one, which is what leaves
 * `Philippians 4:13 to me` exactly as it was.
 */
export function mergeSpokenMatches(
  typed: readonly VerseMatch[],
  spoken: readonly VerseMatch[],
): VerseMatch[] {
  if (spoken.length === 0) return [...typed];

  let kept = [...typed];

  for (const candidate of spoken) {
    const overlapping = kept.filter(
      (match) => match.start < candidate.end && candidate.start < match.end,
    );

    const extendsEvery = overlapping.every(
      (match) =>
        candidate.start <= match.start &&
        match.end <= candidate.end &&
        candidate.end - candidate.start > match.end - match.start,
    );
    if (!extendsEvery) continue;

    kept = [...kept.filter((match) => !overlapping.includes(match)), candidate];
  }

  return kept.sort((a, b) => a.start - b.start);
}
