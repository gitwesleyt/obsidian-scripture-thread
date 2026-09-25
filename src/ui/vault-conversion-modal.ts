import { App, Modal, Notice, ProgressBarComponent, Setting } from 'obsidian';
import {
	describeSummary,
	type BatchOptions,
	type ConversionSummary,
} from '../conversion/run-conversion';

type RunConversion = (options: BatchOptions) => Promise<ConversionSummary>;

/**
 * The whole-vault conversion: a confirmation first, because the change is one-way
 * and can touch every note, then progress while it runs.
 */
export class VaultConversionModal extends Modal {
	private stopped = false;
	private running = false;

	constructor(
		app: App,
		private readonly fileCount: number,
		private readonly excludedFolders: readonly string[],
		private readonly runConversion: RunConversion,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle('Convert Bible references in the whole vault');
		this.showConfirmation();
	}

	onClose(): void {
		this.stopped = true;
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

		const { contentEl } = this;
		contentEl.empty();

		const progressBar = new ProgressBarComponent(contentEl);
		const status = contentEl.createEl('p', { text: `0 / ${this.fileCount}` });

		new Setting(contentEl).addButton((button) =>
			button.setButtonText('Stop').onClick(() => {
				this.stopped = true;
				button.setDisabled(true).setButtonText('Stopping…');
			}),
		);

		const summary = await this.runConversion({
			onProgress: (done, total, file) => {
				progressBar.setValue((done / total) * 100);
				status.setText(`${done} / ${total} — ${file.path}`);
			},
			isStopped: () => this.stopped,
		});

		const message = describeSummary(summary);
		new Notice(message);
		this.showSummary(message);
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
