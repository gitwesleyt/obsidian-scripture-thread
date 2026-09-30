import { Modal, Setting, type App } from 'obsidian';
import { groupByReference, heldKey } from '../conversion/references';
import { TRANSFORM_WARNING } from '../settings-text';
import type { HeldMention } from '../conversion/run-conversion';

/** The keys of the references the writer left ticked, or null when they backed out. */
export type ReviewAnswer = Set<string> | null;

/**
 * Asks about the doubtful dictated references a bulk run found, before it
 * rewrites anything. Every one starts ticked -- most are what they look like --
 * and a reference left unticked stays plain text.
 */
export function renderDictatedReview(
	container: HTMLElement,
	held: readonly HeldMention[],
	transformsDictated: boolean,
	decide: (answer: ReviewAnswer) => void,
): void {
	container.empty();

	const keyOf = (mention: HeldMention) => heldKey(mention.path, mention.source);
	const ticked = new Set(held.map(keyOf));

	container.createEl('p', {
		text:
			'These dictated references could be ordinary words, not Bible references. ' +
			'Untick any that are not; those stay as plain text.',
	});
	if (transformsDictated) container.createEl('p', { text: TRANSFORM_WARNING, cls: 'mod-warning' });
	const summary = container.createEl('p', { cls: 'scripture-thread-review-summary' });
	const list = container.createDiv({ cls: 'scripture-thread-review-list' });

	const refresh = () => {
		summary.setText(`${ticked.size} of ${held.length} will become links.`);
		for (const update of updaters) update();
	};
	const updaters: (() => void)[] = [];

	for (const group of groupByReference(held)) {
		const section = list.createDiv({ cls: 'scripture-thread-review-group' });
		const head = section.createEl('label', { cls: 'scripture-thread-review-head' });
		const all = head.createEl('input', { type: 'checkbox' });
		head.createEl('strong', { text: group.reference });
		head.createSpan({ cls: 'scripture-thread-count', text: String(group.mentions.length) });

		const boxes = group.mentions.map((mention) => {
			const row = section.createEl('label', { cls: 'scripture-thread-review-row' });
			const box = row.createEl('input', { type: 'checkbox' });
			const text = row.createDiv();
			text.createDiv({ cls: 'scripture-thread-review-path', text: mention.path });
			const context = text.createDiv({ cls: 'scripture-thread-review-context' });
			context.appendText(mention.before);
			context.createSpan({ cls: 'scripture-thread-review-match', text: mention.source });
			context.appendText(mention.after);

			box.checked = true;
			box.addEventListener('change', () => {
				if (box.checked) ticked.add(keyOf(mention));
				else ticked.delete(keyOf(mention));
				refresh();
			});
			return { box, mention };
		});

		all.addEventListener('change', () => {
			for (const { box, mention } of boxes) {
				box.checked = all.checked;
				if (all.checked) ticked.add(keyOf(mention));
				else ticked.delete(keyOf(mention));
			}
			refresh();
		});

		updaters.push(() => {
			const on = boxes.filter(({ box }) => box.checked).length;
			all.checked = on === boxes.length;
			all.indeterminate = on > 0 && on < boxes.length;
		});
	}

	refresh();

	new Setting(container)
		.addButton((button) => button.setButtonText('Cancel').onClick(() => decide(null)))
		.addButton((button) =>
			button
				.setButtonText('Continue')
				.setCta()
				.onClick(() => decide(new Set(ticked))),
		);
}

class DictatedReviewModal extends Modal {
	private decided = false;

	constructor(
		app: App,
		private readonly held: readonly HeldMention[],
		private readonly transformsDictated: boolean,
		private readonly answer: (answer: ReviewAnswer) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle('Check dictated references');
		renderDictatedReview(this.contentEl, this.held, this.transformsDictated, (answer) => this.finish(answer));
	}

	onClose(): void {
		this.finish(null);
		this.contentEl.empty();
	}

	private finish(answer: ReviewAnswer): void {
		if (this.decided) return;
		this.decided = true;
		this.answer(answer);
		this.close();
	}
}

/** Opens the review on its own, for the command that has no dialog of its own. */
export function askAboutDictated(
	app: App,
	held: readonly HeldMention[],
	transformsDictated: boolean,
): Promise<ReviewAnswer> {
	return new Promise((resolve) => new DictatedReviewModal(app, held, transformsDictated, resolve).open());
}
