import type { TFile, TFolder, Vault } from 'obsidian';

/** True for a path inside `folder` or any folder below it. An empty folder is the vault root. */
export function isInFolder(path: string, folder: string): boolean {
	const trimmed = folder.trim().replace(/^\/+|\/+$/g, '');
	return trimmed === '' || path.startsWith(`${trimmed}/`);
}

export function isExcluded(path: string, excludedFolders: readonly string[]): boolean {
	return excludedFolders.some((folder) => folder.trim() !== '' && isInFolder(path, folder));
}

export function markdownFilesIn(vault: Vault, folder: TFolder): TFile[] {
	return vault.getMarkdownFiles().filter((file) => isInFolder(file.path, folder.path));
}

/** Exclusions apply to the whole-vault scope only; the other scopes are an explicit choice. */
export function vaultFilesExcluding(vault: Vault, excludedFolders: readonly string[]): TFile[] {
	return vault.getMarkdownFiles().filter((file) => !isExcluded(file.path, excludedFolders));
}
