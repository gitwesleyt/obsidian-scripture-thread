import { parseBibleLink } from '../bible-link';
import { linkpathOf } from '../context/links-at-cursor';
import { overlapsAny, type Range } from './protected-ranges';

/** Delete `[from, to)`, as `convert-text.ts` edits do. */
type Deletion = { from: number; to: number; insert: '' };

// Live Preview draws `<u>` as inline HTML and doesn't read Markdown inside it,
// so a link there shows as raw `[[...]]` text. Only a tag that wraps nothing but
// the reference is removed.
const UNDERLINE = /<u>([^<\n]*)<\/u>/gi;
const OPENING_TAG = /<u>/i;
const OPENING_TAG_LENGTH = '<u>'.length;
const WHOLE_WIKILINK = /^\[\[([^\]\n|]+)(?:\|[^\]\n]*)?\]\]$/;

/** A quick test, so a note without one skips the work of finding skipped regions. */
export function hasUnderlineTag(text: string): boolean {
	return OPENING_TAG.test(text);
}

/**
 * The edits that take `<u>` and `</u>` off a verse or chapter reference: one
 * being converted (`converted`), or a link that is already there. Tags inside a
 * skipped region stay, and so do those outside what `isWanted` allows.
 */
export function underlineWrapperEdits(
	text: string,
	skipped: readonly Range[],
	converted: readonly Range[],
	isWanted: (from: number, to: number) => boolean,
): Deletion[] {
	const edits: Deletion[] = [];

	for (const found of text.matchAll(UNDERLINE)) {
		const from = found.index;
		const to = from + found[0].length;
		const inner = { from: from + OPENING_TAG_LENGTH, to: to - '</u>'.length };
		if (overlapsAny(skipped, from, to) || !isWanted(inner.from, inner.to)) continue;
		if (!isConverted(inner, converted) && !isBibleLink(found[1] ?? '')) continue;

		edits.push({ from, to: inner.from, insert: '' }, { from: inner.to, to, insert: '' });
	}

	return edits;
}

function isConverted(inner: Range, converted: readonly Range[]): boolean {
	return converted.some((range) => range.from === inner.from && range.to === inner.to);
}

function isBibleLink(inner: string): boolean {
	const target = WHOLE_WIKILINK.exec(inner)?.[1];
	return target !== undefined && parseBibleLink(linkpathOf(target)) !== null;
}
