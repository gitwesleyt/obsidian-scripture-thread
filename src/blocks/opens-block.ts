import { parseBibleLink } from '../bible-link';
import { isParentLink } from '../context/find-mentions';
import { linksIn } from '../context/links-at-cursor';

/**
 * What opens a verse block in the note at `sourcePath`: a line holding a verse
 * or chapter link. Embeds don't count, and neither does the parent link a verse
 * note carries (`[[John 3]]` in `John 3 16.md`).
 */
export function verseLinkOpener(sourcePath: string): (line: string) => boolean {
	return (line) => {
		if (!line.includes('[[')) return false;
		return linksIn(line).some((link) => {
			if (line[link.from] === '!') return false;
			const destination = parseBibleLink(link.linkpath);
			return destination !== null && !isParentLink(sourcePath, destination);
		});
	};
}
