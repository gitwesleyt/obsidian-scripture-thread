import { App, Modal, Notice, ProgressBarComponent, Setting } from 'obsidian';
import {
	describeSummary,
	type BatchOptions,
	type ConversionSummary,
	type HeldMention,
} from '../conversion/run-conversion';
import { renderDictatedReview, type ReviewAnswer } from './dictated-review';

export type VaultConversionActions = {
	/** Reads the notes for doubtful dictated references. Left out when dictation is not recognized. */
	findDictated?: (options: BatchOptions) => Promise<HeldMention[]>;
	convert: (options: BatchOptions) => Promise<ConversionSummary>;
};

/**
 * The whole-vault conversion: a confirmation first, because the change is one-way
 * and can touch every note, then a check of any doubtful dictated references,
 * then progress while it runs.
 */
export class VaultConversionModal extends Modal {
	private stopped = false;
	private running = false;
	/** Answers the review with "cancel" if the dialog is closed while it is showing. */
	private cancelReview: (() => void) | null = null;

	constructor(
		app: App,
		private readonly fileCount: number,
		private readonly excludedFolders: readonly string[],
		private readonly actions: VaultConversionActions,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle('Convert Bible references in the whole vault');
		this.showConfirmation();
	}

	onClose(): void {
		this.stopped = true;
		this.cancelReview?.();
		this.contentEl.empty();
	}

	private showConfirmation(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('p', {
			text:
				`Plain-text Bible references in ${this.fileCount} notes will be rewritten as links, ` +
				'and any missing verse, chapter, book and testament notes will be created.',
		});

		if (this.excludedFolders.length > 0) {
			contentEl.createEl('p', { text: `Skipping: ${this.excludedFolders.join(', ')}.` });
		}

		if (this.actions.findDictated) {
			contentEl.createEl('p', {
				text: 'Dictated references are included. You will be asked about the doubtful ones first.',
			});
		}

		contentEl.createEl('p', {
			text: 'This cannot be undone. Consider backing up the vault first.',
			cls: 'mod-warning',
		});

		new Setting(contentEl)
			.addButton((button) => button.setButtonText('Cancel').onClick(() => this.close()))
			.addButton((button) =>
				button
					.setButtonText('Convert')
					.setWarning()
					.onClick(() => void this.run()),
			);
	}

	private async run(): Promise<void> {
		if (this.running) return;
		this.running = true;

		const approved = await this.checkDictated();
		if (approved === null) {
			this.close();
			return;
		}

		const summary = await this.actions.convert({ ...this.showProgress('Converting'), approved });

		const message = describeSummary(summary);
		new Notice(message);
		this.showSummary(message);
	}

	/**
	 * What the writer approved of the doubtful dictated references: undefined
	 * when dictation is not recognized, null when they backed out.
	 */
	private async checkDictated(): Promise<ReviewAnswer | undefined> {
		if (!this.actions.findDictated) return undefined;

		const held = await this.actions.findDictated(this.showProgress('Looking for dictated references'));
		if (this.stopped) return null;
		if (held.length === 0) return new Set();

		return new Promise((resolve) => {
			this.cancelReview = () => resolve(null);
			renderDictatedReview(this.contentEl, held, (answer) => {
				this.cancelReview = null;
				resolve(answer);
			});
		});
	}

	/** The progress bar, its count and a Stop button, drawn in place of whatever was showing. */
	private showProgress(action: string): BatchOptions {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('p', { text: `${action}…` });
		const progressBar = new ProgressBarComponent(contentEl);
		const status = contentEl.createEl('p', { text: `0 / ${this.fileCount}` });

		new Setting(contentEl).addButton((button) =>
			button.setButtonText('Stop').onClick(() => {
				this.stopped = true;
				button.setDisabled(true).setButtonText('Stopping…');
			}),
		);

		return {
			onProgress: (done, total, file) => {
				progressBar.setValue((done / total) * 100);
				status.setText(`${done} / ${total} — ${file.path}`);
			},
			isStopped: () => this.stopped,
		};
	}

	private showSummary(message: string): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('p', { text: message });
		new Setting(contentEl).addButton((button) =>
			button.setButtonText('Close').setCta().onClick(() => this.close()),
		);
	}
}
