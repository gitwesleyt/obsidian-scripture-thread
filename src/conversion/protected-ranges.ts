/**
 * The parts of a note that conversion must never touch.
 *
 * Hardcoded on purpose (CLAUDE.md: the ignore list is not user-editable). Worked
 * out from the raw text rather than from `metadataCache.sections`: sections have
 * no entry for inline code or `{...}`, and the cache lags behind unsaved text in
 * the editor.
 */

export type Range = { from: number; to: number };

type Line = { start: number; end: number; text: string };

export function findProtectedRanges(text: string): Range[] {
	const lines = splitLines(text);

	return [
		...frontmatter(text),
		...fencedCodeBlocks(lines, text.length),
		...calloutBlocks(lines),
		...curlyBraceBlocks(text),
		...matchesOf(INLINE_CODE, text),
		...matchesOf(WIKILINK, text),
		...matchesOf(MARKDOWN_LINK, text),
		...matchesOf(BIBLE_REFERENCE_SYNTAX, text),
	];
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
