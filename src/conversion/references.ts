import { findVerseReferences, scanText, type VerseMatch } from '../verse-rules';

/** A reference the detector found, and whether only the dictated grammar found it. */
export type FoundReference = { match: VerseMatch; dictated: boolean };

/** How many characters of the line are shown either side of a held reference. */
const CONTEXT_EITHER_SIDE = 50;

/**
 * Every reference in the text. With `spoken`, references the way dictation
 * writes them are found as well.
 *
 * A match the typed grammar also makes at exactly the same characters is the
 * writer's own -- `jn 3:16` -- and never counts as dictated. Only the dictated
 * grammar's own matches do, which is the test the Bible Journal app draws.
 */
export function findReferences(text: string, spoken: boolean): FoundReference[] {
	if (!spoken) return findVerseReferences(text).map((match) => ({ match, dictated: false }));

	const typed = new Set(scanText(text).map((match) => `${match.start}:${match.end}`));
	return scanText(text, { spoken: true }).map((match) => ({
		match,
		dictated: !typed.has(`${match.start}:${match.end}`),
	}));
}

/**
 * A dictated reference is doubtful unless it says `verse` or `verses`, which
 * stands in for the colon a writer would type. `mark one` is far likelier to be
 * prose than `mark one verse two`, and `John three sixteen` is a guess about
 * three words where `John 3 verse 16` is not.
 */
export function isDoubtfulDictated(found: FoundReference): boolean {
	return found.dictated && !/\bverses?\b/i.test(found.match.text);
}

/** A dictated reference left as text, for the bulk commands to ask about first. */
export type HeldReference = {
	/** The reference in standard form: "Job 2". */
	reference: string;
	/** The words exactly as written. */
	source: string;
	before: string;
	after: string;
};

/** The reference with the words around it, cut to a readable length. */
export function heldReference(text: string, found: FoundReference): HeldReference {
	const { match } = found;
	const lineStart = text.lastIndexOf('\n', match.start - 1) + 1;
	const lineBreak = text.indexOf('\n', match.end);
	const lineEnd = lineBreak === -1 ? text.length : lineBreak;

	const from = Math.max(lineStart, match.start - CONTEXT_EITHER_SIDE);
	const to = Math.min(lineEnd, match.end + CONTEXT_EITHER_SIDE);

	return {
		reference: match.reference,
		source: match.text,
		before: `${from > lineStart ? '…' : ''}${text.slice(from, match.start)}`,
		after: `${text.slice(match.end, to)}${to < lineEnd ? '…' : ''}`,
	};
}

/** What the writer said yes to, by note and words -- offsets move, so they are not used. */
export function heldKey(path: string, source: string): string {
	return `${path}\u0000${source}`;
}

/** One reference and every place it was doubtful. */
export type HeldGroup<Mention extends HeldReference> = { reference: string; mentions: Mention[] };

/** By reference, the most mentioned first, then alphabetical so the order never jumps about. */
export function groupByReference<Mention extends HeldReference>(held: readonly Mention[]): HeldGroup<Mention>[] {
	const groups = new Map<string, HeldGroup<Mention>>();

	for (const mention of held) {
		const group = groups.get(mention.reference) ?? { reference: mention.reference, mentions: [] };
		group.mentions.push(mention);
		groups.set(mention.reference, group);
	}

	return [...groups.values()].sort(
		(a, b) => b.mentions.length - a.mentions.length || a.reference.localeCompare(b.reference),
	);
}
