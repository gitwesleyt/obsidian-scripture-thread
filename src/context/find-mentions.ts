import type { CachedMetadata, Reference, ReferenceCache } from 'obsidian';
import { parseBibleLink, type BibleLink } from './bible-link';
import { linkpathOf } from './links-at-cursor';
import { paragraphAt, type Paragraph } from './paragraph';

/** The parts of Obsidian's metadata cache and vault that finding mentions reads. */
export type MentionSource = {
	resolvedLinks: Record<string, Record<string, number>>;
	unresolvedLinks: Record<string, Record<string, number>>;
	getCache(path: string): CachedMetadata | null;
	/** The path of the note a link opens, or null when no such note exists yet. */
	resolve(linkpath: string, sourcePath: string): string | null;
	read(path: string): Promise<string>;
	modifiedTime(path: string): number;
};

export type Mention = {
	/** Where the paragraph starts, for opening the note there. */
	line: number;
	/** The paragraph's markdown, or null for a link in the note's properties. */
	text: string | null;
	/** What the note links to -- for an overlap, not the verse being shown. */
	linkedAs: string;
};

export type NoteMentions = { path: string; mentions: Mention[] };

export type VerseMentions = {
	reference: string;
	/** Notes linking to this very verse or chapter. */
	exact: NoteMentions[];
	/** Notes linking to a range that shares a verse (or chapter) with it. */
	overlapping: NoteMentions[];
};

type MatchKind = 'exact' | 'overlapping';
type Destination = { link: BibleLink; kind: MatchKind };
type Found = Record<MatchKind, Mention[]>;

/**
 * Every other note that links to `linkpath`'s verse or chapter, or to one
 * overlapping it, with the paragraph around each link.
 */
export async function findMentions(
	source: MentionSource,
	linkpath: string,
	currentPath: string,
): Promise<VerseMentions | null> {
	const target = parseBibleLink(linkpath);
	if (!target) return null;

	const destinations = relatedDestinations(source, target);
	const result: VerseMentions = { reference: target.reference, exact: [], overlapping: [] };

	for (const path of notesLinkingTo(source, destinations, currentPath)) {
		const found = await mentionsIn(source, path, destinations);
		for (const kind of ['exact', 'overlapping'] as const) {
			if (found[kind].length > 0) result[kind].push({ path, mentions: found[kind] });
		}
	}

	const newestFirst = (a: NoteMentions, b: NoteMentions) =>
		source.modifiedTime(b.path) - source.modifiedTime(a.path);
	result.exact.sort(newestFirst);
	result.overlapping.sort(newestFirst);
	return result;
}

/** Keyed like `destinationId`: a note path, or the link text of a note not created yet. */
function relatedDestinations(source: MentionSource, target: BibleLink): Map<string, Destination> {
	const related = new Map<string, Destination>();

	for (const id of allDestinationIds(source)) {
		const link = parseBibleLink(id.replace(UNRESOLVED, ''));
		const kind = link && matchKind(link, target);
		if (link && kind) related.set(id, { link, kind });
	}

	return related;
}

function matchKind(link: BibleLink, target: BibleLink): MatchKind | null {
	if (sameKeys(link.keys, target.keys)) return 'exact';
	return link.keys.some((key) => target.keys.includes(key)) ? 'overlapping' : null;
}

function sameKeys(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((key) => b.includes(key));
}

const UNRESOLVED = /^unresolved:/;

function unresolvedId(linktext: string): string {
	return `unresolved:${linkpathOf(linktext)}`;
}

function destinationId(source: MentionSource, linktext: string, sourcePath: string): string {
	return source.resolve(linkpathOf(linktext), sourcePath) ?? unresolvedId(linktext);
}

function allDestinationIds(source: MentionSource): Set<string> {
	const ids = new Set<string>();
	for (const targets of Object.values(source.resolvedLinks)) {
		for (const path of Object.keys(targets)) ids.add(path);
	}
	for (const targets of Object.values(source.unresolvedLinks)) {
		for (const linktext of Object.keys(targets)) ids.add(unresolvedId(linktext));
	}
	return ids;
}

function notesLinkingTo(
	source: MentionSource,
	destinations: Map<string, Destination>,
	currentPath: string,
): string[] {
	const notes = new Set<string>();

	for (const [path, targets] of Object.entries(source.resolvedLinks)) {
		if (Object.keys(targets).some((target) => destinations.has(target))) notes.add(path);
	}
	for (const [path, targets] of Object.entries(source.unresolvedLinks)) {
		if (Object.keys(targets).some((target) => destinations.has(unresolvedId(target)))) {
			notes.add(path);
		}
	}

	notes.delete(currentPath);
	return [...notes];
}

async function mentionsIn(
	source: MentionSource,
	path: string,
	destinations: Map<string, Destination>,
): Promise<Found> {
	const found: Found = { exact: [], overlapping: [] };
	const cache = source.getCache(path);
	if (!cache) return found;

	const destinationOf = (reference: Reference) => {
		const destination = destinations.get(destinationId(source, reference.link, path));
		return destination && !isParentLink(path, destination.link) ? destination : undefined;
	};

	addPropertyMentions(found, cache, destinationOf);
	await addBodyMentions(found, source, path, cache, destinationOf);
	return found;
}

function addPropertyMentions(
	found: Found,
	cache: CachedMetadata,
	destinationOf: (reference: Reference) => Destination | undefined,
): void {
	for (const reference of cache.frontmatterLinks ?? []) {
		const destination = destinationOf(reference);
		if (!destination || found[destination.kind].some((mention) => mention.text === null)) continue;
		found[destination.kind].push({ line: 0, text: null, linkedAs: destination.link.reference });
	}
}

async function addBodyMentions(
	found: Found,
	source: MentionSource,
	path: string,
	cache: CachedMetadata,
	destinationOf: (reference: Reference) => Destination | undefined,
): Promise<void> {
	const references: ReferenceCache[] = [...(cache.links ?? []), ...(cache.embeds ?? [])].sort(
		(a, b) => a.position.start.offset - b.position.start.offset,
	);
	const seen: Record<MatchKind, Set<number>> = { exact: new Set(), overlapping: new Set() };
	let text: string | undefined;

	for (const reference of references) {
		const destination = destinationOf(reference);
		if (!destination) continue;

		const paragraph = paragraphAt(cache, reference.position.start.offset) ?? linkOnly(reference);
		if (seen[destination.kind].has(paragraph.start)) continue;
		seen[destination.kind].add(paragraph.start);

		text ??= await source.read(path);
		found[destination.kind].push({
			line: paragraph.line,
			text: text.slice(paragraph.start, paragraph.end).trimEnd(),
			linkedAs: destination.link.reference,
		});
	}
}

function linkOnly(reference: ReferenceCache): Paragraph {
	const { start, end } = reference.position;
	return { start: start.offset, end: end.offset, line: start.line };
}

/**
 * The `[[John 3]]` inside `John 3 16.md` is the parent chain conversion wrote,
 * not something the writer said about John 3, so it would only bury the real
 * mentions under every verse note of the chapter.
 */
function isParentLink(path: string, destination: BibleLink): boolean {
	const note = parseBibleLink(path);
	return (
		destination.level === 'chapter' &&
		note?.level === 'verse' &&
		note.chapterKeys.some((key) => destination.keys.includes(key))
	);
}
