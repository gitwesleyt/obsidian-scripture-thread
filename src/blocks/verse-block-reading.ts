import type { MarkdownPostProcessorContext } from 'obsidian';
import { lineRole, verseBlocks, type VerseBlock } from '../verse-block-rules';
import { verseLinkOpener } from './opens-block';

const BLOCK_CLASS = 'scripture-thread-verse-block';
/** Embeds and hover previews show another note inside this one; neither gets boxes. */
const NESTED_PREVIEW = '.markdown-embed, .hover-popover';

let cached: { key: string; blocks: VerseBlock[] } | null = null;

/**
 * Marks each Reading view section that falls in a verse block, with the same
 * rule the editor uses, run over the note text Obsidian hands the section.
 *
 * Obsidian often gives a section its position only once it's on the page, so
 * the marking waits a frame.
 */
export function markVerseBlocks(el: HTMLElement, context: MarkdownPostProcessorContext): void {
	window.requestAnimationFrame(() => markSection(el, context));
}

function markSection(el: HTMLElement, context: MarkdownPostProcessorContext): void {
	if (el.closest(NESTED_PREVIEW)) return;
	const info = context.getSectionInfo(el);
	if (!info) return;

	const block = blocksOf(info.text, context.sourcePath).find(
		(candidate) => candidate.startLine <= info.lineEnd && info.lineStart <= candidate.endLine,
	);
	if (!block) return;

	el.addClass(BLOCK_CLASS);
	const first = lineRole(block, Math.max(info.lineStart, block.startLine));
	const last = lineRole(block, Math.min(info.lineEnd, block.endLine));
	if (first === 'start' || first === 'only') el.addClass(`${BLOCK_CLASS}-start`);
	if (last === 'end' || last === 'only') el.addClass(`${BLOCK_CLASS}-end`);
}

/** Every section of a render gets the same text, so the rule runs once per render. */
function blocksOf(text: string, sourcePath: string): VerseBlock[] {
	const key = `${sourcePath}\n${text}`;
	if (cached?.key !== key) {
		cached = { key, blocks: verseBlocks(text.split('\n'), verseLinkOpener(sourcePath)) };
	}
	return cached.blocks;
}
