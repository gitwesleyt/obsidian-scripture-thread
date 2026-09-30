import { parseBibleLink, parseReference, samePassage, type BibleLink } from '../bible-link';
import { linkpathOf } from '../context/links-at-cursor';
import { overlapsAny, type Range } from './protected-ranges';

/** Replace `[from, to)` with `insert`, as `convert-text.ts` does. */
type LinkEdit = { from: number; to: number; insert: string };

// Target, then the visible text if there is one. An embed's "!" is captured to skip it.
const WIKILINK = /(!?)\[\[([^\]\n|]+)(?:\|([^\]\n]*))?\]\]/g;
const STARTS_WITH_NUMBER = /^\d/;

/**
 * Rewrites the visible text of existing verse and chapter links into standard
 * form: `[[John 3 16|Jn 3.16]]` becomes `[[John 3 16|John 3:16]]`.
 *
 * Where the link points never changes, and text that isn't a reference to the
 * same passage -- `[[John 3 16|this verse]]` -- is the writer's own and is kept.
 * The two kinds of visible text are switched separately: `typed` for what the
 * writer typed (`Jn 3.16`), `dictated` for words that only the dictated grammar
 * reads (`john three sixteen`). Standardizing typed references never touches
 * dictated words.
 */
export type StandardizeKinds = { typed: boolean; dictated: boolean };

export function standardizeLinks(
	text: string,
	skipped: readonly Range[],
	kinds: StandardizeKinds = { typed: true, dictated: false },
): LinkEdit[] {
	const edits: LinkEdit[] = [];

	for (const found of text.matchAll(WIKILINK)) {
		const [whole, embed, target = '', visible] = found;
		const from = found.index;
		const to = from + whole.length;
		if (embed || overlapsAny(skipped, from, to)) continue;

		const link = parseBibleLink(linkpathOf(target));
		const standard = link && standardFor(link, target, visible, kinds);
		if (standard && standard !== visible) {
			edits.push({ from, to, insert: `[[${target}|${standard}]]` });
		}
	}

	return edits;
}

function standardFor(
	link: BibleLink,
	target: string,
	visible: string | undefined,
	kinds: StandardizeKinds,
): string | null {
	// Text the typed grammar reads is typed, whatever else also reads it.
	const typed = standardTextFor(link, target, visible, false);
	if (typed !== null) return kinds.typed ? typed : null;

	return kinds.dictated ? standardTextFor(link, target, visible, true) : null;
}

function standardTextFor(
	link: BibleLink,
	target: string,
	visible: string | undefined,
	spoken: boolean,
): string | null {
	// A bare link to a heading shows the heading too, which a standard reference would hide.
	if (visible === undefined) return target.includes('#') ? null : link.reference;

	const typed = parseReference(visible, spoken);
	if (typed) return samePassage(typed, link) ? link.reference : null;

	// "30:22" in "Proverbs 17:7; 30:22" -- a later chapter of the same book, which stays short.
	if (!STARTS_WITH_NUMBER.test(visible.trim())) return null;
	const continued = parseReference(`${link.book} ${visible}`, spoken);
	return continued && samePassage(continued, link) ? link.passage : null;
}
