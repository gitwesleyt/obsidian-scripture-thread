import type { CachedMetadata, Pos } from 'obsidian';

export type Paragraph = { start: number; end: number; line: number };

/**
 * The block of a note that holds `offset`: its section, or for a list, just the
 * list item, so one bullet shows rather than the whole list.
 */
export function paragraphAt(cache: CachedMetadata, offset: number): Paragraph | null {
	const section = cache.sections?.find((candidate) => contains(candidate.position, offset));
	if (!section) return null;

	if (section.type === 'list') {
		const item = innermost((cache.listItems ?? []).map((entry) => entry.position), offset);
		if (item) return paragraphOf(item);
	}

	return paragraphOf(section.position);
}

function innermost(positions: Pos[], offset: number): Pos | undefined {
	return positions
		.filter((position) => contains(position, offset))
		.sort((a, b) => b.start.offset - a.start.offset)[0];
}

function contains(position: Pos, offset: number): boolean {
	return position.start.offset <= offset && offset < position.end.offset;
}

function paragraphOf(position: Pos): Paragraph {
	return { start: position.start.offset, end: position.end.offset, line: position.start.line };
}
