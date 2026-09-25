import type { App } from 'obsidian';
import { isTestament, notePath, type NoteLocation, type Testament } from './note-names';

/**
 * Makes sure every note in a parent chain exists, for one conversion run.
 *
 * A note with the same name anywhere in the vault counts as existing and is
 * never modified -- the user's vaults already hold notes from their older
 * script, and a second copy would split the backlinks between the two.
 */
export class NoteCreator {
	private readonly handled = new Set<string>();
	createdCount = 0;

	constructor(
		private readonly app: App,
		private readonly location: NoteLocation,
	) {}

	/** `chain` is the linked note first, then each parent up to the testament. */
	async ensureChain(chain: readonly string[], sourcePath: string): Promise<void> {
		const testament = chain[chain.length - 1];
		if (testament === undefined || !isTestament(testament)) return;

		for (const [index, name] of chain.entries()) {
			await this.ensureNote(name, chain[index + 1], testament, sourcePath);
		}
	}

	private async ensureNote(
		name: string,
		parent: string | undefined,
		testament: Testament,
		sourcePath: string,
	): Promise<void> {
		if (this.handled.has(name)) return;
		this.handled.add(name);

		if (this.app.metadataCache.getFirstLinkpathDest(name, sourcePath)) return;

		const path = notePath(name, testament, this.location, sourcePath);
		if (this.app.vault.getAbstractFileByPath(path)) return;

		await this.ensureFolder(path.slice(0, Math.max(path.lastIndexOf('/'), 0)));
		await this.app.vault.create(path, parent === undefined ? '' : `[[${parent}]]\n`);
		this.createdCount += 1;
	}

	/** One level at a time, since obsidian.d.ts does not promise `createFolder` makes parents. */
	private async ensureFolder(folderPath: string): Promise<void> {
		const segments = folderPath.split('/').filter((segment) => segment !== '');

		for (let depth = 1; depth <= segments.length; depth += 1) {
			const path = segments.slice(0, depth).join('/');
			if (!this.app.vault.getFolderByPath(path)) await this.app.vault.createFolder(path);
		}
	}
}
