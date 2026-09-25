import { Component, ItemView, Keymap, MarkdownRenderer, debounce } from 'obsidian';
import { findMentions, type NoteMentions, type VerseMentions } from '../context/find-mentions';
import { mentionSourceFor } from '../context/obsidian-mention-source';

export const VERSE_CONTEXT_VIEW = 'scripture-thread-verse-context';

type Shown = { linkpaths: string[]; sourcePath: string };

const REFRESH_PAUSE_MS = 500;

/** The side panel: every other note that mentions the verses at the caret, with its paragraph. */
export class VerseContextView extends ItemView {
	private shown: Shown | null = null;
	private rendered: Component | null = null;
	private renderedContent: string | null = null;
	private renderCount = 0;
	private readonly refreshSoon = debounce(() => void this.render(), REFRESH_PAUSE_MS, true);

	getViewType(): string {
		return VERSE_CONTEXT_VIEW;
	}

	getDisplayText(): string {
		return 'Verse context';
	}

	getIcon(): string {
		return 'book-open';
	}

	async onOpen(): Promise<void> {
		this.contentEl.addClass('scripture-thread-context');
		this.registerEvent(
			this.app.metadataCache.on('resolved', () => {
				if (this.shown) this.refreshSoon();
			}),
		);
		await this.render();
	}

	showVerses(linkpaths: string[], sourcePath: string): void {
		if (this.shown && isSame(this.shown, { linkpaths, sourcePath })) return;
		this.shown = { linkpaths, sourcePath };
		void this.render();
	}

	private async render(): Promise<void> {
		const renderId = ++this.renderCount;
		const verses = await this.lookUp();
		// A newer caret move started its own render while this one was reading notes.
		if (renderId !== this.renderCount) return;

		// The cache resolves after every save anywhere, which mostly changes nothing shown here;
		// rebuilding anyway would flicker and lose the scroll position.
		const content = JSON.stringify(verses);
		if (content === this.renderedContent) return;
		this.renderedContent = content;

		if (this.rendered) this.removeChild(this.rendered);
		this.rendered = this.addChild(new Component());
		this.contentEl.empty();

		if (verses.length === 0) {
			this.contentEl.createEl('p', {
				text: 'Click a verse or chapter link in a note to see every other note that mentions it.',
				cls: 'scripture-thread-muted',
			});
			return;
		}

		for (const verse of verses) this.renderVerse(verse);
	}

	private async lookUp(): Promise<VerseMentions[]> {
		const shown = this.shown;
		if (!shown) return [];

		const source = mentionSourceFor(this.app);
		const verses = await Promise.all(
			shown.linkpaths.map((linkpath) => findMentions(source, linkpath, shown.sourcePath)),
		);
		return verses.filter((verse): verse is VerseMentions => verse !== null);
	}

	private renderVerse(verse: VerseMentions): void {
		const section = this.contentEl.createDiv({ cls: 'scripture-thread-verse' });
		section.createEl('h3', { text: verse.reference, cls: 'scripture-thread-verse-title' });

		const exact = this.renderGroup(section, 'This verse', verse.exact.length);
		if (verse.exact.length === 0) {
			exact.createEl('p', { text: 'No other notes link here yet.', cls: 'scripture-thread-muted' });
		}
		for (const note of verse.exact) this.renderNote(exact, note, false);

		if (verse.overlapping.length === 0) return;
		const overlapping = this.renderGroup(section, 'Overlapping passages', verse.overlapping.length);
		for (const note of verse.overlapping) this.renderNote(overlapping, note, true);
	}

	/** A group heading with its note count, and the indented container its notes go in. */
	private renderGroup(parent: HTMLElement, title: string, noteCount: number): HTMLElement {
		const heading = parent.createEl('h4', { cls: 'scripture-thread-group-title' });
		heading.createSpan({ text: title });
		heading.createSpan({ text: String(noteCount), cls: 'scripture-thread-count' });
		return parent.createDiv({ cls: 'scripture-thread-group' });
	}

	private renderNote(parent: HTMLElement, note: NoteMentions, showLinkedAs: boolean): void {
		const noteEl = parent.createDiv({ cls: 'scripture-thread-note' });
		const title = noteEl.createEl('a', { text: basename(note.path), cls: 'scripture-thread-note-title' });
		title.onClickEvent((evt) => void this.openAt(note.path, 0, evt));

		for (const mention of note.mentions) {
			const mentionEl = noteEl.createDiv({ cls: 'scripture-thread-mention' });
			if (showLinkedAs) {
				mentionEl.createDiv({ text: `Links to ${mention.linkedAs}`, cls: 'scripture-thread-muted' });
			}

			if (mention.text === null) {
				mentionEl.createDiv({ text: 'Linked in properties', cls: 'scripture-thread-muted' });
			} else {
				const paragraphEl = mentionEl.createDiv({ cls: 'scripture-thread-paragraph' });
				void MarkdownRenderer.render(this.app, mention.text, paragraphEl, note.path, this.rendered ?? this);
			}

			mentionEl.onClickEvent((evt) => this.onMentionClick(evt, note.path, mention.line));
		}
	}

	/** A link inside the paragraph opens its own target; anywhere else opens the note there. */
	private onMentionClick(evt: MouseEvent, path: string, line: number): void {
		const link = evt.target instanceof HTMLElement ? evt.target.closest('a') : null;

		if (link?.hasClass('internal-link')) {
			evt.preventDefault();
			const linktext = link.getAttr('data-href') ?? link.getText();
			void this.app.workspace.openLinkText(linktext, path, Keymap.isModEvent(evt));
			return;
		}

		if (!link) void this.openAt(path, line, evt);
	}

	private async openAt(path: string, line: number, evt: MouseEvent): Promise<void> {
		const file = this.app.vault.getFileByPath(path);
		if (!file) return;
		await this.app.workspace.getLeaf(Keymap.isModEvent(evt)).openFile(file, { eState: { line } });
	}
}

function isSame(a: Shown, b: Shown): boolean {
	return a.sourcePath === b.sourcePath && a.linkpaths.join('\n') === b.linkpaths.join('\n');
}

function basename(path: string): string {
	return (path.split('/').pop() ?? path).replace(/\.md$/, '');
}
