import { stripHiddenCharacters } from '../hidden-characters';
import { targetsFor } from './note-names';
import {
	DEFAULT_IGNORE_RULES,
	findProtectedRanges,
	overlapsAny,
	skippedRegions,
	type IgnoreRules,
	type Range,
} from './protected-ranges';
import {
	findReferences,
	heldReference,
	isDoubtfulDictated,
	type FoundReference,
	type HeldReference,
} from './references';
import { standardizeLinks } from './standardize';

/** Replace `[from, to)` of the original text with `insert`. */
export type TextEdit = { from: number; to: number; insert: string };

export type ConversionOptions = {
	ignore: IgnoreRules;
	/** Show references in standard form, including in links already converted. */
	standardizeReferences: boolean;
	/** Also find references the way dictation writes them: "john three sixteen". */
	spokenReferences: boolean;
	/** Show a dictated reference in standard form, and leave the ones you typed as typed. Only dictated words are touched by it, and only it touches them. */
	standardizeDictated: boolean;
	/**
	 * Asked about every doubtful dictated reference, with its words; true leaves
	 * it as text and reports it in `held`. Left out, every reference converts.
	 */
	holdBack?: (source: string) => boolean;
};

export const DEFAULT_CONVERSION_OPTIONS: ConversionOptions = {
	ignore: DEFAULT_IGNORE_RULES,
	standardizeReferences: false,
	spokenReferences: false,
	standardizeDictated: false,
};

export type Conversion = {
	/** In ascending order, never overlapping. */
	edits: TextEdit[];
	/** One parent chain per converted reference, the linked note first. */
	chains: string[][];
	/** How many existing links had their visible text standardized. */
	standardized: number;
	/** Doubtful dictated references `holdBack` left as text. */
	held: HeldReference[];
};

/**
 * Every plain-text reference in a note, as the edits that turn it into alias
 * wikilinks -- plus, when standardizing, the edits that tidy existing links.
 *
 * Detection runs on the text with its invisible characters taken out, because
 * one inside a reference hides it (`hidden-characters.ts`). The edits are mapped
 * back onto the original text, so only the references themselves change -- an
 * invisible character anywhere else stays where it was.
 *
 * `within`, in offsets of the original text, limits the edits to references and
 * links that overlap it -- the text just typed, for live conversion. Only the
 * lines it touches are searched, since the detector is by far the slowest part,
 * but skipped regions come from the whole note: a code fence or callout needs
 * its other lines.
 */
export function convertText(
	text: string,
	options: ConversionOptions = DEFAULT_CONVERSION_OPTIONS,
	within?: readonly Range[],
): Conversion {
	const cleaned = stripHiddenCharacters(text);
	const toOriginal = offsetMap(text, cleaned);
	const protectedRanges = findProtectedRanges(cleaned, options.ignore);
	const isWanted = (from: number, to: number) =>
		!within || overlapsAny(within, toOriginal(from), toOriginal(to - 1) + 1);

	const conversion: Conversion = { edits: [], chains: [], standardized: 0, held: [] };
	let convertedUpTo = 0;

	const lines = within && linesTouched(cleaned, within, toOriginal);
	for (const found of referencesIn(cleaned, lines, options.spokenReferences)) {
		const { match } = found;
		if (match.start < convertedUpTo) continue;
		if (overlapsAny(protectedRanges, match.start, match.end)) continue;
		if (!isWanted(match.start, match.end)) continue;
		if (within && insideUnfinishedLink(cleaned, match.start)) continue;

		if (options.holdBack && isDoubtfulDictated(found) && options.holdBack(match.text)) {
			conversion.held.push(heldReference(cleaned, found));
			continue;
		}

		// Standardize touches what was typed; only the dictated switch touches dictated words.
		const standardForm = found.dictated ? options.standardizeDictated : options.standardizeReferences;
		for (const target of targetsFor(match)) {
			const alias = standardForm ? target.standard : target.alias;
			conversion.edits.push({
				from: toOriginal(target.from),
				to: toOriginal(target.to - 1) + 1,
				insert: `[[${target.chain[0] ?? ''}|${alias}]]`,
			});
			conversion.chains.push(target.chain);
		}

		convertedUpTo = match.end;
	}

	const kinds = {
		typed: options.standardizeReferences,
		dictated: options.spokenReferences && options.standardizeDictated,
	};
	if (kinds.typed || kinds.dictated) {
		const skipped = skippedRegions(cleaned, options.ignore);
		const linkEdits = standardizeLinks(cleaned, skipped, kinds).filter((edit) =>
			isWanted(edit.from, edit.to),
		);
		for (const edit of linkEdits) {
			conversion.edits.push({ ...edit, from: toOriginal(edit.from), to: toOriginal(edit.to - 1) + 1 });
		}
		conversion.standardized = linkEdits.length;
		// Links never overlap a converted reference (links are protected), so sorting is enough.
		conversion.edits.sort((a, b) => a.from - b.from);
	}

	return conversion;
}

function referencesIn(
	text: string,
	lines: readonly Range[] | undefined,
	spoken: boolean,
): FoundReference[] {
	if (!lines) return findReferences(text, spoken);

	return lines.flatMap(({ from, to }) =>
		findReferences(text.slice(from, to), spoken).map(({ match, dictated }) => ({
			dictated,
			match: { ...match, start: match.start + from, end: match.end + from },
		})),
	);
}

/** The lines of `cleaned` that `within`, in offsets of the original text, overlaps. */
function linesTouched(
	cleaned: string,
	within: readonly Range[],
	toOriginal: (offset: number) => number,
): Range[] {
	const lines: Range[] = [];
	let from = 0;

	while (from <= cleaned.length) {
		const lineBreak = cleaned.indexOf('\n', from);
		const to = lineBreak === -1 ? cleaned.length : lineBreak;
		if (overlapsAny(within, toOriginal(from), toOriginal(to) + 1)) lines.push({ from, to });
		from = to + 1;
	}
	return lines;
}

/**
 * After a `[[` or `{` not yet closed on its line: a link or a Bible Verse block
 * still being typed, which a live conversion would split in two.
 */
function insideUnfinishedLink(text: string, offset: number): boolean {
	const before = text.slice(text.lastIndexOf('\n', offset - 1) + 1, offset);
	return (
		before.lastIndexOf('[[') > before.lastIndexOf(']]') || before.lastIndexOf('{') > before.lastIndexOf('}')
	);
}

export function applyEdits(text: string, edits: readonly TextEdit[]): string {
	let result = '';
	let copiedUpTo = 0;

	for (const edit of edits) {
		result += text.slice(copiedUpTo, edit.from) + edit.insert;
		copiedUpTo = edit.to;
	}

	return result + text.slice(copiedUpTo);
}

/**
 * Where each character of `cleaned` came from in `original`.
 *
 * Stripping only ever deletes characters, or turns a line or paragraph separator
 * into a newline, so walking the two side by side lines them up exactly.
 */
function offsetMap(original: string, cleaned: string): (offset: number) => number {
	if (original === cleaned) return (offset) => offset;

	const positions: number[] = [];
	let at = 0;

	// By UTF-16 unit, not by `for...of` code point: offsets everywhere are units.
	for (let index = 0; index < cleaned.length; index += 1) {
		const char = cleaned[index] ?? '';
		while (at < original.length && !sameCharacter(original[at], char)) at += 1;
		positions.push(at);
		at += 1;
	}

	return (offset) => positions[offset] ?? original.length;
}

function sameCharacter(original: string | undefined, cleaned: string): boolean {
	if (original === cleaned) return true;
	return cleaned === '\n' && (original === '\u2028' || original === '\u2029');
}
