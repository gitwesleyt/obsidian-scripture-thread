/** Just enough of a document to read lines from, so tests can pass plain arrays. */
export type LineSource = {
	lineCount: number;
	/** 0-based. */
	line(index: number): string;
};

export type LinkSpan = { from: number; to: number; linkpath: string };

const WIKILINK = /!?\[\[([^\]\n]+)\]\]/g;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s/;
const HEADING = /^\s{0,3}#{1,6}\s/;

/**
 * The link targets the panel should show for a caret position.
 *
 * On a link (its brackets included), just that link. Anywhere else, every link in
 * the caret's paragraph, in order and without repeats.
 */
export function linksAtCursor(doc: LineSource, line: number, column: number): string[] {
	const underCaret = linksIn(doc.line(line)).find(
		(link) => link.from <= column && column <= link.to,
	);
	if (underCaret) return [underCaret.linkpath];

	const linkpaths = paragraphLines(doc, line).flatMap((text) =>
		linksIn(text).map((link) => link.linkpath),
	);
	return [...new Set(linkpaths)];
}

/** `John 3 16#Notes` and `John 3 16|John 3:16` both point at the note `John 3 16`. */
export function linkpathOf(linktext: string): string {
	const withoutAlias = linktext.split('|')[0] ?? '';
	return (withoutAlias.split('#')[0] ?? '').trim();
}

export function linksIn(text: string): LinkSpan[] {
	return [...text.matchAll(WIKILINK)]
		.map((match) => ({
			from: match.index,
			to: match.index + match[0].length,
			linkpath: linkpathOf(match[1] ?? ''),
		}))
		.filter((link) => link.linkpath !== '');
}

/**
 * The lines around `line` up to blank lines. A list item or heading is a
 * paragraph of its own, and also ends the paragraph next to it.
 */
function paragraphLines(doc: LineSource, line: number): string[] {
	const text = doc.line(line);
	if (isBlank(text)) return [];
	if (standsAlone(text)) return [text];

	let first = line;
	while (first > 0 && continuesParagraph(doc.line(first - 1))) first -= 1;

	let last = line;
	while (last < doc.lineCount - 1 && continuesParagraph(doc.line(last + 1))) last += 1;

	const lines: string[] = [];
	for (let index = first; index <= last; index += 1) lines.push(doc.line(index));
	return lines;
}

function continuesParagraph(text: string): boolean {
	return !isBlank(text) && !standsAlone(text);
}

function standsAlone(text: string): boolean {
	return LIST_ITEM.test(text) || HEADING.test(text);
}

function isBlank(text: string): boolean {
	return text.trim() === '';
}
