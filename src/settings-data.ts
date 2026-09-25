import type { NotesLocation } from './conversion/note-names';
import { DEFAULT_IGNORE_RULES, type IgnoreRules } from './conversion/protected-ranges';

export interface ScriptureThreadSettings {
	/** Where every note the plugin creates goes. */
	notesLocation: NotesLocation;
	/** Used only when `notesLocation` is 'folder'. */
	notesFolder: string;
	splitByTestament: boolean;
	/** Show references in standard form, including in links already converted. */
	standardizeReferences: boolean;
	/** What the convert commands skip, besides existing links. */
	ignore: IgnoreRules;
	/** Which folder the "convert in folder" command scans. */
	conversionFolderLocation: ConversionFolderLocation;
	/** Used only when `conversionFolderLocation` is 'folder'. */
	conversionFolder: string;
	/** Skipped by the whole-vault command only. */
	excludedFolders: string[];
}

export type ConversionFolderLocation = 'current' | 'folder';

export const DEFAULT_SETTINGS: ScriptureThreadSettings = {
	notesLocation: 'folder',
	notesFolder: 'Bible',
	splitByTestament: true,
	standardizeReferences: false,
	ignore: DEFAULT_IGNORE_RULES,
	conversionFolderLocation: 'current',
	conversionFolder: '',
	excludedFolders: [],
};

/**
 * Saved settings over the defaults, one level deep for the ignore switches, so a
 * vault saved before a switch existed gets that switch's default. Arrays are
 * copied, so editing them never changes the defaults.
 */
export function withDefaults(saved: Partial<ScriptureThreadSettings> | null): ScriptureThreadSettings {
	const settings = { ...DEFAULT_SETTINGS, ...saved };
	const ignore = { ...DEFAULT_IGNORE_RULES, ...saved?.ignore };

	return {
		...settings,
		excludedFolders: [...settings.excludedFolders],
		ignore: { ...ignore, markers: ignore.markers.map((pair) => ({ ...pair })) },
	};
}
