import type { App } from 'obsidian';
import type { MentionSource } from './find-mentions';

export function mentionSourceFor(app: App): MentionSource {
	const { metadataCache, vault } = app;

	return {
		resolvedLinks: metadataCache.resolvedLinks,
		unresolvedLinks: metadataCache.unresolvedLinks,
		getCache: (path) => metadataCache.getCache(path),
		resolve: (linkpath, sourcePath) =>
			metadataCache.getFirstLinkpathDest(linkpath, sourcePath)?.path ?? null,
		read: async (path) => {
			const file = vault.getFileByPath(path);
			return file ? vault.cachedRead(file) : '';
		},
		modifiedTime: (path) => vault.getFileByPath(path)?.stat.mtime ?? 0,
	};
}
