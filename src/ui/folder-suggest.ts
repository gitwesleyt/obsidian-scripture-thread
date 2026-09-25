import { AbstractInputSuggest, TFolder } from 'obsidian';

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	protected getSuggestions(query: string): TFolder[] {
		const needle = query.toLowerCase();
		return this.app.vault
			.getAllFolders()
			.filter((folder) => folder.path.toLowerCase().includes(needle));
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}
}
