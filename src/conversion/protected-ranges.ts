/**
 * The parts of a note that conversion must not touch.
 *
 * Worked out from the raw text rather than from `metadataCache.sections`:
 * sections have no entry for inline code or `{...}`, and the cache lags behind
 * unsaved text in the editor.
 */

export type Range = { from: number; to: number };

/** Text from `start` to the next `end` is skipped; an empty `end` means the end of the line. */
export type MarkerPair = { start: string; end: string };

/** The user's choices of what to skip. Links are not among them: those are always skipped. */
export type IgnoreRules = {
	frontmatter: boolean;
	codeBlocks: boolean;
	inlineCode: boolean;
	callouts: boolean;
	curlyBraces: boolean;
	bibleReferenceSyntax: boolean;
	markers: MarkerPair[];
};

export const DEFAULT_IGNORE_RULES: IgnoreRules = {
	frontmatter: true,
	codeBlocks: true,
	inlineCode: true,
	callouts: true,
	curlyBraces: true,
	bibleReferenceSyntax: true,
	markers: [],
};

type Line = { start: number; end: number; text: string };

/** Everything conversion leaves alone: the chosen regions, plus every existing link. */
export function findProtectedRanges(text: string, rules: IgnoreRules = DEFAULT_IGNORE_RULES): Range[] {
	return [...skippedRegions(text, rules), ...linkRanges(text)];
}

/**
 * Only what the rules choose. Existing links are left out, since converting
 * inside one would nest links and make a second run unsafe -- that is why they
 * can't be switched off, and why standardizing, which edits links, starts here.
 */
export function skippedRegions(text: string, rules: IgnoreRules): Range[] {
	const lines = splitLines(text);
	const fences = fencedCodeBlocks(lines, text.length);

	return [
		...(rules.frontmatter ? frontmatter(text) : []),
		...(rules.codeBlocks ? fences : []),
		...(rules.callouts ? calloutBlocks(lines) : []),
		...(rules.curlyBraces ? curlyBraceBlocks(text) : []),
		...(rules.inlineCode ? inlineCode(text, fences) : []),
		...(rules.bibleReferenceSyntax ? matchesOf(BIBLE_REFERENCE_SYNTAX, text) : []),
		...rules.markers.flatMap((pair) => markerRanges(text, pair)),
	];
}

// A fence's backticks also look like inline code; they belong to the code-block switch.
function inlineCode(text: string, fences: readonly Range[]): Range[] {
	return matchesOf(INLINE_CODE, text).filter((range) => !overlapsAny(fences, range.from, range.to));
}

function linkRanges(text: string): Range[] {
	return [...matchesOf(WIKILINK, text), ...matchesOf(MARKDOWN_LINK, text)];
}

/** An unclosed start runs to the end of the note, like an unclosed code fence. */
export function markerRanges(text: string, { start, end }: MarkerPair): Range[] {
	if (start === '') return [];

	const ranges: Range[] = [];
	let from = text.indexOf(start);

	while (from !== -1) {
		const to = markerEnd(text, from + start.length, end);
		ranges.push({ from, to });
		from = text.indexOf(start, to);
	}

	return ranges;
}

function markerEnd(text: string, searchFrom: number, end: string): number {
	if (end === '') {
		const lineEnd = text.indexOf('\n', searchFrom);
		return lineEnd === -1 ? text.length : lineEnd;
	}

	const endAt = text.indexOf(end, searchFrom);
	return endAt === -1 ? text.length : endAt + end.length;
}

export function overlapsAny(ranges: readonly Range[], from: number, to: number): boolean {
	return ranges.some((range) => from < range.to && range.from < to);
}

const FRONTMATTER = /^---\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?=\r?\n|$)/;
const FENCE = /^[ \t]*(`{3,}|~{3,})/;
const CALLOUT_START = /^[ \t]*(?:>[ \t]*)+\[![^\]\n]+\]/;
const QUOTED = /^[ \t]*>/;
const BLANK_LINE = /\n[ \t]*(?:\n|$)/y;

// A run of backticks closed by a run of the same length, never across a blank line.
const INLINE_CODE = /(`+)(?!`)(?:(?!\n[ \t]*\n)[\s\S])+?(?<!`)\1(?!`)/g;
const WIKILINK = /!?\[\[[^\]\n]*\]\]/g;
const MARKDOWN_LINK = /!?\[[^\]\n]*\]\([^)\n]*\)/g;

// The Bible Reference plugin's trigger, e.g. "--John1:1" or "--1 Jn 1:9-10". The
// detector would otherwise read the reference inside it and break the trigger.
const BIBLE_REFERENCE_SYNTAX = /--[1-3]?[ ]?[A-Za-z]+\.?[ ]?\d+(?::\d+(?:[-\u2013]\d+)?)?/g;

function splitLines(text: string): Line[] {
	const lines: Line[] = [];
	let start = 0;

	for (const lineText of text.split('\n')) {
		lines.push({ start, end: start + lineText.length, text: lineText });
		start += lineText.length + 1;
	}

	return lines;
}

function frontmatter(text: string): Range[] {
	const found = FRONTMATTER.exec(text);
	return found ? [{ from: 0, to: found[0].length }] : [];
}

function fencedCodeBlocks(lines: readonly Line[], textLength: number): Range[] {
	const ranges: Range[] = [];
	let open: { fence: string; from: number } | null = null;

	for (const line of lines) {
		const fence = FENCE.exec(line.text)?.[1];
		if (fence === undefined) continue;

		if (open === null) {
			open = { fence, from: line.start };
		} else if (closes(open.fence, fence, line.text)) {
			ranges.push({ from: open.from, to: line.end });
			open = null;
		}
	}

	// An unclosed fence runs to the end of the note, as it renders.
	if (open !== null) ranges.push({ from: open.from, to: textLength });

	return ranges;
}

function closes(opening: string, candidate: string, lineText: string): boolean {
	return (
		candidate[0] === opening[0] &&
		candidate.length >= opening.length &&
		lineText.trim() === candidate
	);
}

function calloutBlocks(lines: readonly Line[]): Range[] {
	const ranges: Range[] = [];
	let open: Range | null = null;

	for (const line of lines) {
		if (open !== null && QUOTED.test(line.text) && !CALLOUT_START.test(line.text)) {
			open.to = line.end;
			continue;
		}

		if (open !== null) ranges.push(open);
		open = CALLOUT_START.test(line.text) ? { from: line.start, to: line.end } : null;
	}

	if (open !== null) ranges.push(open);

	return ranges;
}

/**
 * `{...}` is the Bible Verse plugin's live-render syntax. Braces are matched so
 * nesting works, and a blank line abandons anything still open, so one stray
 * "{" cannot swallow the rest of a note.
 */
function curlyBraceBlocks(text: string): Range[] {
	const ranges: Range[] = [];
	const openings: number[] = [];

	for (let at = 0; at < text.length; at += 1) {
		const char = text[at];

		if (char === '{') openings.push(at);
		else if (char === '}') closeBrace(openings, at, ranges);
		else if (char === '\n' && startsBlankLine(text, at)) openings.length = 0;
	}

	return ranges;
}

function closeBrace(openings: number[], at: number, ranges: Range[]): void {
	const from = openings.pop();
	if (from !== undefined && openings.length === 0) ranges.push({ from, to: at + 1 });
}

function startsBlankLine(text: string, newlineAt: number): boolean {
	BLANK_LINE.lastIndex = newlineAt;
	return BLANK_LINE.test(text);
}

function matchesOf(pattern: RegExp, text: string): Range[] {
	return [...text.matchAll(pattern)].map((found) => ({
		from: found.index ?? 0,
		to: (found.index ?? 0) + found[0].length,
	}));
}
