/**
 * Numbers written as words, the way dictation writes a small one (item 11.2).
 *
 * Apple dictation types `three` and `five` where a writer types `3` and `5`,
 * and switches to digits somewhere around twenty -- so a chapter or a verse can
 * arrive either way, and `spoken-verse-rules.ts` asks this file about the words.
 *
 * What it reads: one to nine, ten to nineteen, the tens, a ten and a unit with a
 * space or a hyphen between (`twenty three`, `twenty-three`), and a hundred
 * with or without `and` (`one hundred nineteen`, `one hundred and nineteen`).
 * Nothing checks the size here: whether 300 is a chapter is the book's to say,
 * and **reading `three hundred` as 300 rather than stopping at `three` is what
 * keeps `revelation three hundred` from becoming Revelation 3**.
 *
 * A word is read whole, apostrophe and all, so `one` never matches the start of
 * `onerous` or `one's`.
 */

const UNITS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

const TEENS: Record<string, number> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/** One word, apostrophes inside it included. Sticky: "is there a word exactly here?" */
const WORD = /[a-z]+(?:['’][a-z]+)*/iy;

/** A space between two number words -- the same spaces `verse-rules.ts` reads as one. */
const GAP = /[ \u00a0\u2000-\u200a\u202f\u205f\u3000]{1,2}/y;

/** Between a ten and its unit: a space, or a hyphen as in `twenty-three`. */
const JOIN = /(?:[ \u00a0\u2000-\u200a\u202f\u205f\u3000]{1,2}|-)/y;

export type ReadNumber = { value: number; end: number };

function wordAt(text: string, at: number): { word: string; end: number } | null {
  WORD.lastIndex = at;
  const found = WORD.exec(text);
  return found === null ? null : { word: found[0].toLowerCase(), end: WORD.lastIndex };
}

/** A table's own entry only: `constructor` and `toString` are inherited, not number words. */
function lookup(table: Record<string, number>, word: string): number | undefined {
  return Object.prototype.hasOwnProperty.call(table, word) ? table[word] : undefined;
}

function after(pattern: RegExp, text: string, at: number): number | null {
  pattern.lastIndex = at;
  return pattern.test(text) ? pattern.lastIndex : null;
}

/** A number below one hundred, written as words, starting exactly at `at`. */
function readBelowHundred(text: string, at: number): ReadNumber | null {
  const first = wordAt(text, at);
  if (first === null) return null;

  const unit = lookup(UNITS, first.word);
  if (unit !== undefined) return { value: unit, end: first.end };
  const teen = lookup(TEENS, first.word);
  if (teen !== undefined) return { value: teen, end: first.end };
  const tens = lookup(TENS, first.word);
  if (tens === undefined) return null;

  const joined = after(JOIN, text, first.end);
  const next = joined === null ? null : wordAt(text, joined);
  const nextUnit = next === null ? undefined : lookup(UNITS, next.word);

  if (next !== null && nextUnit !== undefined) {
    return { value: tens + nextUnit, end: next.end };
  }

  return { value: tens, end: first.end };
}

/**
 * A number written as words starting exactly at `at`, or null when there is
 * none there. Greedy: `twenty three` is 23 and never 20 with a word left over.
 */
export function readSpokenNumber(text: string, at: number): ReadNumber | null {
  const small = readBelowHundred(text, at);
  if (small === null) return null;

  // Only a single unit can be followed by "hundred": "twenty hundred" is not a
  // number anybody dictates, and reading it would be inventing one.
  if (small.value > 9) return small;

  const gap = after(GAP, text, small.end);
  const hundred = gap === null ? null : wordAt(text, gap);
  if (hundred === null || hundred.word !== "hundred") return small;

  const value = small.value * 100;

  // "one hundred nineteen" and "one hundred and nineteen" -- but an "and" with
  // no number after it is the sentence going on, and is left where it is.
  const rest = after(GAP, text, hundred.end);
  if (rest === null) return { value, end: hundred.end };

  const and = wordAt(text, rest);
  const tailAt = and !== null && and.word === "and" ? after(GAP, text, and.end) : rest;
  const tail = tailAt === null ? null : readBelowHundred(text, tailAt);

  return tail === null ? { value, end: hundred.end } : { value: value + tail.value, end: tail.end };
}
