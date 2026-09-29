import type { NotesLocation } from './conversion/note-names';
import type { IgnoreRules } from './conversion/protected-ranges';
import type { ConversionFolderLocation } from './settings-data';

/**
 * Every heading, name and description in the settings tab, shared by the
 * declarative definitions (Obsidian 1.13 and later, searchable) and the
 * `display()` fallback for older versions, so the two never drift apart.
 */

/** The settings every command shares come first, without a heading, as Obsidian's guidelines ask. */
export const HEADINGS = {
	skippedText: 'Convert commands: skipped text',
	currentNote: 'Convert command: current note',
	folder: 'Convert command: references in folder',
	wholeVault: 'Convert command: whole vault',
};

type Text = { name: string; desc: string };

export const TEXT = {
	notesLocation: {
		name: 'Default location for new notes',
		desc: 'Where new verse, chapter, book and testament notes are placed, for every command. When converting a folder or the whole vault, the current file is each note being converted.',
	},
	notesFolder: {
		name: 'Folder to create new notes in',
		desc: 'New verse, chapter, book and testament notes will appear in this folder.',
	},
	splitByTestament: {
		name: 'Split by testament',
		desc: 'File new notes into "Old Testament" and "New Testament" subfolders of the location above.',
	},
	standardizeReferences: {
		name: 'Standardize references',
		desc: 'Show every reference in one standard form: Ps 23:1 becomes Psalm 23:1, and Jn 3.16 becomes John 3:16. Also updates links you have already converted. Where a link points never changes.',
	},
	liveConversion: {
		name: 'Convert as you type',
		desc: 'Turn a reference you type into a link when you leave its line, and create its notes. Undo turns it back into plain text. Uses the skipped-text settings below, and does nothing in the whole-vault excluded folders.',
	},
	verseBlocks: {
		name: 'Verse blocks',
		desc: 'Draw a border round a paragraph that links to a verse, and the lines you add under it. A blank line closes it.',
	},
	skippedText: {
		name: '',
		desc: 'All three convert commands leave these parts of a note alone. Existing links and Markdown links are always skipped, so converting twice is safe.',
	},
	markers: {
		name: 'Your own markers',
		desc: 'Text from a start marker to the next end marker is skipped, even across lines. Leave the end empty to skip to the end of the line.',
	},
	currentNote: {
		name: '',
		desc: 'The "convert references in current note" command converts the note open in the editor. It uses the general and skipped-text settings above, and one undo reverses it.',
	},
	conversionFolderLocation: {
		name: 'Folder to convert',
		desc: 'Scanned by the "convert references in folder" command, including subfolders. Right-clicking a folder in the file explorer converts that folder instead.',
	},
	conversionFolder: {
		name: 'Folder to convert references in',
		desc: 'The "convert references in folder" command will scan this folder.',
	},
	excludedFolders: {
		name: 'Excluded folders',
		desc: 'Skipped by the "convert references in whole vault" command, which always asks for confirmation first, and by convert as you type. One folder per line.',
	},
} satisfies Record<string, Text>;

export const NOTES_LOCATION_LABELS: Record<NotesLocation, string> = {
	root: 'Vault folder',
	current: 'Same folder as current file',
	folder: 'In the folder specified below',
};

export const CONVERSION_FOLDER_LABELS: Record<ConversionFolderLocation, string> = {
	current: 'Same folder as current file',
	folder: 'In the folder specified below',
};

export type IgnoreSwitch = Exclude<keyof IgnoreRules, 'markers'>;

export const IGNORE_SWITCHES: { key: IgnoreSwitch; name: string; desc: string }[] = [
	{ key: 'frontmatter', name: 'Frontmatter', desc: 'The properties at the top of a note. If you turn this off, check them afterwards: a link in a property needs quotes around it.' },
	{ key: 'codeBlocks', name: 'Code blocks', desc: 'Blocks fenced by ``` or ~~~ lines.' },
	{ key: 'inlineCode', name: 'Inline code', desc: 'Text between backticks.' },
	{ key: 'comments', name: 'Obsidian comments', desc: 'Text between %% marks, which Obsidian hides when reading.' },
	{ key: 'callouts', name: 'Callouts', desc: 'A > [!type] line and the > lines under it.' },
	{ key: 'curlyBraces', name: 'Curly braces', desc: 'Text inside {braces}, the Bible Verse plugin\'s syntax.' },
	{ key: 'bibleReferenceSyntax', name: 'Double-dash references', desc: 'The Bible Reference plugin\'s --John1:1 syntax.' },
];

export const MARKER_PLACEHOLDERS = { start: 'Start, e.g. %%', end: 'End of line' };
export const EXCLUDED_FOLDERS_PLACEHOLDER = 'Templates\nArchive';
