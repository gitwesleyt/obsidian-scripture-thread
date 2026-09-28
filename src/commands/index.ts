import type { Extension } from '@codemirror/state';
import { TFolder } from 'obsidian';
import { verseBlockDecorations } from '../blocks/verse-block-decorations';
import { markVerseBlocks } from '../blocks/verse-block-reading';
import { cursorTracker } from '../context/cursor-tracker';
import { liveConversion } from '../live/live-conversion';
import { ScriptureThreadSettingTab, type SettingsHost } from '../settings';
import { VERSE_CONTEXT_VIEW, VerseContextView } from '../ui/verse-context-view';
import { openVerseContext, showVerseContext } from './context-actions';
import {
	convertCurrentNote,
	convertFolder,
	convertSettingsFolder,
	openVaultConversion,
} from './conversion-actions';

/** Everything the plugin wires into Obsidian, in one place. */
export function registerAll(plugin: SettingsHost): void {
	plugin.addSettingTab(new ScriptureThreadSettingTab(plugin.app, plugin));
	registerVerseContext(plugin);
	registerConversion(plugin);
	registerLiveConversion(plugin);
	registerVerseBlocks(plugin);
}

function registerLiveConversion(plugin: SettingsHost): void {
	const editorExtensions: Extension[] = [];
	plugin.registerEditorExtension(editorExtensions);

	plugin.applyLiveConversion = () => {
		editorExtensions.length = 0;
		if (plugin.settings.liveConversion) editorExtensions.push(liveConversion(plugin));
		plugin.app.workspace.updateOptions();
	};
	plugin.applyLiveConversion();
}

function registerVerseBlocks(plugin: SettingsHost): void {
	const editorExtensions: Extension[] = [];
	plugin.registerEditorExtension(editorExtensions);
	// Reading view keeps sections it has already drawn, so they're always marked and
	// the setting's body class decides whether the marks are drawn.
	plugin.registerMarkdownPostProcessor(markVerseBlocks);

	plugin.applyVerseBlocks = () => {
		editorExtensions.length = 0;
		if (plugin.settings.verseBlocks) editorExtensions.push(verseBlockDecorations);
		plugin.app.workspace.updateOptions();
		for (const doc of openDocuments(plugin)) showVerseBlocks(doc, plugin.settings.verseBlocks);
	};
	plugin.applyVerseBlocks();

	plugin.registerEvent(
		plugin.app.workspace.on('window-open', (win) => showVerseBlocks(win.doc, plugin.settings.verseBlocks)),
	);
	plugin.register(() => {
		for (const doc of openDocuments(plugin)) showVerseBlocks(doc, false);
	});
}

function showVerseBlocks(doc: Document, show: boolean): void {
	doc.body.toggleClass('scripture-thread-verse-blocks-on', show);
}

/** The main window and any pop-out windows. */
function openDocuments(plugin: SettingsHost): Set<Document> {
	const docs = new Set<Document>([document]);
	plugin.app.workspace.iterateAllLeaves((leaf) => docs.add(leaf.view.containerEl.doc));
	return docs;
}

function registerVerseContext(plugin: SettingsHost): void {
	plugin.registerView(VERSE_CONTEXT_VIEW, (leaf) => new VerseContextView(leaf));
	plugin.registerEditorExtension(
		cursorTracker((found) => void showVerseContext(plugin.app, found)),
	);

	plugin.addCommand({
		id: 'open-verse-context-panel',
		name: 'Open verse context panel',
		callback: () => void openVerseContext(plugin.app),
	});

	plugin.addRibbonIcon('book-open', 'Open verse context panel', () => {
		void openVerseContext(plugin.app);
	});
}

function registerConversion(plugin: SettingsHost): void {
	plugin.addCommand({
		id: 'convert-references-in-current-note',
		name: 'Convert Bible references in current note',
		editorCheckCallback: (checking, editor, context) => {
			const file = context.file;
			if (!file) return false;
			if (!checking) void convertCurrentNote(plugin, editor, file);
			return true;
		},
	});

	plugin.addCommand({
		id: 'convert-references-in-folder',
		name: 'Convert Bible references in folder',
		callback: () => void convertSettingsFolder(plugin),
	});

	plugin.addCommand({
		id: 'convert-references-in-vault',
		name: 'Convert Bible references in whole vault',
		callback: () => openVaultConversion(plugin),
	});

	plugin.registerEvent(
		plugin.app.workspace.on('file-menu', (menu, file) => {
			if (!(file instanceof TFolder) || file.isRoot()) return;

			menu.addItem((item) =>
				item
					.setTitle('Convert Bible references in folder')
					.setIcon('link')
					.onClick(() => void convertFolder(plugin, file)),
			);
		}),
	);
}
