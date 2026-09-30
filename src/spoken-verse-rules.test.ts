import { describe, expect, it } from "vitest";

import { readSpokenNumber } from "./spoken-numbers";
import { findSpokenVerseReferences } from "./spoken-verse-rules";
import { activeMatches, findVerseReferences, keptRemovals, scanText } from "./verse-rules";

/**
 * Item 11.2: references the way dictation spells them, found only with the
 * switch on. `verse-rules.test.ts` is the other half of the proof -- it runs
 * unchanged, and it is what says the switch off leaves detection alone.
 */

function spoken(text: string): string[] {
  return scanText(text, { spoken: true }).map((match) => match.reference);
}

function typed(text: string): string[] {
  return scanText(text).map((match) => match.reference);
}

/** The app owner's own paragraph, dictated on iOS, verbatim (item 11.1). */
const DICTATED =
  "This is me dictating my thoughts on June 16 if I were to summarize the chapter of John 17 that's that Jesus is praying for me. Psalm 23 is a really powerful chapter because it is on my favorites revelation three verses five through seven is an important part of the Bible.";

describe("the app owner's dictated paragraph", () => {
  it("finds John 17, Psalm 23 and Revelation 3:5-7 with the switch on, and nothing on June 16", () => {
    expect(spoken(DICTATED)).toEqual(["John 17", "Psalm 23", "Revelation 3:5-7"]);
  });

  it("finds exactly what it found before with the switch off", () => {
    expect(typed(DICTATED)).toEqual(["John 17", "Psalm 23"]);
    expect(scanText(DICTATED, { spoken: false })).toEqual(findVerseReferences(DICTATED));
  });

  it("tags every verse of the dictated range", () => {
    const match = scanText(DICTATED, { spoken: true }).at(-1);
    expect(match?.text).toBe("revelation three verses five through seven");
    expect(match?.keys).toEqual(["Revelation|3|5", "Revelation|3|6", "Revelation|3|7"]);
  });
});

describe("the spoken shapes", () => {
  it.each([
    ["John three", "John 3"],
    ["job two", "Job 2"],
    ["Romans chapter 8 verse 28", "Romans 8:28"],
    ["romans chapter eight verse twenty eight", "Romans 8:28"],
    ["First John 4 verse 8", "1 John 4:8"],
    ["first john four verse eight", "1 John 4:8"],
    ["1st John four verse eight", "1 John 4:8"],
    ["2nd Kings two", "2 Kings 2"],
    ["John 3 verses 16 to 18", "John 3:16-18"],
    ["John 3 verses 16 through 18", "John 3:16-18"],
    ["John 3 verses 16 thru 18", "John 3:16-18"],
    ["Matthew 6 verses 1 to 3, 7 and 9", "Matthew 6:1-3,7,9"],
    ["Psalm 23 to 25", "Psalm 23-25"],
    ["John three sixteen", "John 3:16"],
    ["Psalm one hundred and nineteen verse five", "Psalm 119:5"],
    ["Psalm one hundred nineteen", "Psalm 119"],
    ["Genesis twenty-three", "Genesis 23"],
    ["Song of Songs two", "Song of Solomon 2"],
  ])("reads %s as %s", (text, reference) => {
    expect(spoken(text)).toEqual([reference]);
  });

  it("leaves the chapter standing when `verses` has no number after it", () => {
    expect(spoken("John 3 verses are the ones I keep coming back to")).toEqual(["John 3"]);
  });

  it("finds a spoken reference beside a typed one", () => {
    expect(spoken("John 3:16 and then mark four verse two")).toEqual(["John 3:16", "Mark 4:2"]);
  });

  it("stops a range at a numbered book", () => {
    expect(spoken("Genesis one through 2 Corinthians 5")).toEqual(["Genesis 1", "2 Corinthians 5"]);
  });

  it("ignores an abbreviation with a chapter spoken as a word", () => {
    expect(spoken("my ex two years ago")).toEqual([]);
    expect(spoken("Phil two doors down")).toEqual([]);
  });

  it("never reads an inherited property name as a number word", () => {
    expect(spoken("John constructor")).toEqual([]);
    expect(spoken("Psalm twenty toString")).toEqual(["Psalm 20"]);
  });

  it("finds nothing inside a web address", () => {
    expect(spoken("https://example.com/john three")).toEqual([]);
  });
});

describe("what it must not find", () => {
  it.each([
    ["it was a revelation to me", []],
    ["the acts of the apostles", []],
    ["numbers don't lie", []],
    ["I lost my job last week", []],
    ["Mark my words", []],
    ["revelation three hundred", []],
    ["Psalm 23 one of my favourites", ["Psalm 23"]],
    ["Philippians 4:13 to me", ["Philippians 4:13"]],
    ["John 3:16 and 17 people", ["John 3:16"]],
    ["John 3 verse 16 and 17 people", ["John 3:16"]],
  ])("%s", (text, expected) => {
    expect(spoken(text)).toEqual(expected);
  });
});

describe("the switch", () => {
  it("never runs the spoken scan while it is off", () => {
    expect(typed("revelation three verses five through seven")).toEqual([]);
  });

  it("answers the same words differently on and off, and the cache keeps them apart", () => {
    const text = "mark four verse two";
    expect(typed(text)).toEqual([]);
    expect(spoken(text)).toEqual(["Mark 4:2"]);
    expect(typed(text)).toEqual([]);
  });

  it("carries through activeMatches and keptRemovals", () => {
    const text = "mark four verse two";
    expect(activeMatches(text, [], { spoken: true })).toHaveLength(1);
    expect(activeMatches(text, ["Mark|4|2"], { spoken: true })).toHaveLength(0);

    // A removal lasts as long as the words name it -- which, switched off,
    // they no longer do.
    expect(keptRemovals(text, ["Mark|4|2"], { spoken: true })).toBeNull();
    expect(keptRemovals(text, ["Mark|4|2"])).toEqual([]);
  });

  it("finds nothing spoken without a book name", () => {
    expect(findSpokenVerseReferences("three verses five through seven")).toEqual([]);
  });
});

describe("number words", () => {
  it.each([
    ["one", 1],
    ["nineteen", 19],
    ["twenty", 20],
    ["twenty three", 23],
    ["twenty-three", 23],
    ["one hundred", 100],
    ["one hundred and nineteen", 119],
    ["one hundred seventy six", 176],
    ["three hundred", 300],
  ])("reads %s as %i", (text, value) => {
    expect(readSpokenNumber(text, 0)).toEqual({ value, end: text.length });
  });

  it("reads a whole word, never the start of one", () => {
    expect(readSpokenNumber("onerous", 0)).toBeNull();
    expect(readSpokenNumber("one's", 0)).toBeNull();
    expect(readSpokenNumber("tenfold", 0)).toBeNull();
  });

  it("leaves an `and` that the number does not continue", () => {
    expect(readSpokenNumber("one hundred and then", 0)).toEqual({ value: 100, end: 11 });
  });
});
