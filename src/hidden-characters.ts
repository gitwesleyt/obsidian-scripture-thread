/**
 * Invisible characters taken out of the writing.
 *
 * Pure, portable, and shared on purpose. The import has cleaned pasted writing
 * since item 7.2; the editor never did, which meant the *same* paste was
 * cleaned coming through a Day One export and kept when it was pasted straight
 * into an entry -- and pasting straight in is the commoner route, since it is
 * how the entries were written in the first place. One function is what stops
 * the two sets drifting apart (GitHub issue #39).
 *
 * ---
 *
 * WHY THIS MATTERS AT ALL, given that none of these can be seen.
 *
 * One at the start or end of a line is harmless. One *inside* a reference is
 * not: "Genesis 1:1" is found and "Genesis<ZWSP> 1:1" is not, so a pasted verse
 * silently gets no chip, no group border and nothing in the Linked Verses
 * sidebar, in an entry that looks exactly like every other one. There is
 * nothing on screen to explain it and nothing to click.
 *
 * **Measured, on a real journal.** The 250 entries imported into the preview
 * account carry 1,909 of these across 1,354 blocks, and taking them out turns
 * up **191 references the app had missed**. Not one existing reference is lost
 * by the strip. All 1,909 are the bidirectional pair below; the five characters
 * the import removed before this change appear **zero** times in that data --
 * so item 7.2's set was cleaning something real journals do not carry and
 * missing the thing they do.
 *
 * ---
 *
 * WHICH CHARACTERS, AND WHY EACH ONE.
 *
 *  - **Zero-width space, non-joiner, joiner, word joiner, byte-order mark**
 *    (U+200B-U+200D, U+2060, U+FEFF) -- item 7.2's original set, kept.
 *  - **The bidirectional formatting characters** (U+200E, U+200F,
 *    U+202A-U+202E, U+2066-U+2069) -- **this is what YouVersion emits**, and it
 *    is the whole of what was found. A copied verse arrives shaped like
 *    "<LRO><LRO>Job<PDF> <LRO>8<PDF>:<LRO>20<PDF>", so every piece of the
 *    reference is fenced off from the piece beside it.
 *  - **Soft hyphen** (U+00AD) -- a hint about where a word may break, which
 *    nothing in this app honours, and which lands inside words.
 *  - **Object replacement character** (U+FFFC) -- what an app leaves in the
 *    text where something embedded was, usually a picture. Apple draws it as a
 *    dashed box reading `OBJ`, so it is not even invisible; it only stands for
 *    something that is not there. Item 3.10 found 35 in 9 of the app owner's
 *    Evernote notes, each where a forwarded email had an inline image the
 *    export does not carry.
 *
 * **The line and paragraph separators become newlines rather than vanishing.**
 * U+2028 and U+2029 mean "a line ends here", so deleting them would run the two
 * lines together and let a reference form across the join -- the opposite of
 * the bug being fixed. A reference never spans a newline (`blockText`), which
 * is exactly the behaviour wanted here.
 *
 * **The non-breaking space is deliberately kept.** `verse-rules.ts` already
 * treats U+00A0 as an ordinary gap, so "Genesis<NBSP>1:1" is detected today.
 * Removing it would join the book to its chapter and break what works.
 *
 * Written as \u.... escapes throughout: the characters are invisible, and a
 * regular expression nobody can see the contents of is one nobody can correct.
 */

/** Removed outright -- see the note above for what each one is. */
const REMOVED =
  /[\u00ad\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff\ufffc]/gu;

/** Kept as a line ending rather than deleted, for the reason above. */
const SEPARATORS = /[\u2028\u2029]/gu;

/**
 * The writing with the invisible characters taken out.
 *
 * Idempotent, and it hands back the very same string when there was nothing to
 * take out -- which is what lets a caller compare the two to find out whether
 * anything was there.
 */
export function stripHiddenCharacters(text: string): string {
  return text.replace(REMOVED, "").replace(SEPARATORS, "\n");
}
