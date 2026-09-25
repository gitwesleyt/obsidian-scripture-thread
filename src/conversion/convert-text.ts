import { stripHiddenCharacters } from '../hidden-characters';
import { findVerseReferences } from '../verse-rules';
import { targetsFor } from './note-names';
import { findProtectedRanges, overlapsAny } from './protected-ranges';

/** Replace `[from, to)` of the original text with `insert`. */
export type TextEdit = { from: number; to: number; insert: string };

export type Conversion = {
	/** In ascending order, never overlapping. */
	edits: TextEdit[];
	/** One parent chain per edit, the linked note first. */
	chains: string[][];
};

/**
 * Every plain-text reference in a note, as the edits that turn it into alias
 * wikilinks.
 *
 * Detection runs on the text with its invisible characters taken out, because
 * one inside a reference hides it (`hidden-characters.ts`). The edits are mapped
 * back onto the original text, so only the references themselves change -- an
 * invisible character anywhere else stays where it was.
 */
export function convertText(text: string): Conversion {
	const cleaned = stripHiddenCharacters(text);
	const toOriginal = offsetMap(text, cleaned);
	const protectedRanges = findProtectedRanges(cleaned);

	const conversion: Conversion = { edits: [], chains: [] };
	let convertedUpTo = 0;

	for (const match of findVerseReferences(cleaned)) {
		if (match.start < convertedUpTo) continue;
		if (overlapsAny(protectedRanges, match.start, match.end)) continue;

		for (const target of targetsFor(match)) {
			conversion.edits.push({
				from: toOriginal(target.from),
				to: toOriginal(target.to - 1) + 1,
				insert: `[[${target.chain[0] ?? ''}|${target.alias}]]`,
			});
			conversion.chains.push(target.chain);
		}

		convertedUpTo = match.end;
	}

	return conversion;
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
