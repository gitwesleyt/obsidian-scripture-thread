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
 */
export function standardizeLinks(text: string, skipped: readonly Range[]): LinkEdit[] {
	const edits: LinkEdit[] = [];

	for (const found of text.matchAll(WIKILINK)) {
		const [whole, embed, target = '', visible] = found;
		const from = found.index;
		const to = from + whole.length;
		if (embed || overlapsAny(skipped, from, to)) continue;

		const link = parseBibleLink(linkpathOf(target));
		const standard = link && standardTextFor(link, target, visible);
		if (standard && standard !== visible) {
			edits.push({ from, to, insert: `[[${target}|${standard}]]` });
		}
	}

	return edits;
}

function standardTextFor(link: BibleLink, target: string, visible: string | undefined): string | null {
	// A bare link to a heading shows the heading too, which a standard reference would hide.
	if (visible === undefined) return target.includes('#') ? null : link.reference;

	const typed = parseReference(visible);
	if (typed) return samePassage(typed, link) ? link.reference : null;

	// "30:22" in "Proverbs 17:7; 30:22" -- a later chapter of the same book, which stays short.
	if (!STARTS_WITH_NUMBER.test(visible.trim())) return null;
	const continued = parseReference(`${link.book} ${visible}`);
	return continued && samePassage(continued, link) ? link.passage : null;
}
