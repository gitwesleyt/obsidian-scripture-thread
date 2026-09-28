import { blockAt, type LineSource, type VerseBlock } from '../verse-block-rules';

/**
 * The line the first Enter grew a block to -- the empty caret line directly
 * under a block -- given the blocks with the caret line already applied.
 */
export function grownLine(blocks: readonly VerseBlock[], caretLine: number | null): number | null {
	if (caretLine === null) return null;
	const grown = blocks.some((block) => block.endLine === caretLine && block.startLine < caretLine);
	return grown ? caretLine : null;
}

/**
 * The block to play the closing animation on, once the caret has left the line
 * a block grew to: the second Enter, an arrow key or a tap.
 *
 * `previousGrown` is that line in the new text, or null when an edit removed it.
 * The block closes only when the line is still there and still empty, so
 * deleting it, undoing the first Enter or typing on it plays nothing.
 */
export function closingBlock(
	blocks: readonly VerseBlock[],
	lines: LineSource,
	previousGrown: number | null,
	grownNow: number | null,
): VerseBlock | null {
	if (previousGrown === null || previousGrown === grownNow) return null;
	if (previousGrown >= lines.lineCount || lines.line(previousGrown).trim() !== '') return null;

	const above = blockAt(blocks, previousGrown - 1);
	return above?.endLine === previousGrown - 1 ? above : null;
}
