import type { Extension } from '@codemirror/state';
import { MarkdownView, TFolder } from 'obsidian';
import { verseBlockDecorations } from '../blocks/verse-block-decorations';
import { markVerseBlocks } from '../blocks/verse-block-reading';
import { cursorTracker } from '../context/cursor-tracker';
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
	registerVerseBlocks(plugin);
}

function registerVerseBlocks(plugin: SettingsHost): void {
	const editorExtensions: Extension[] = [];
	plugin.registerEditorExtension(editorExtensions);
	plugin.registerMarkdownPostProcessor((el, context) => {
		if (plugin.settings.verseBlocks) markVerseBlocks(el, context);
	});

	plugin.applyVerseBlocks = () => {
		editorExtensions.length = 0;
		if (plugin.settings.verseBlocks) editorExtensions.push(verseBlockDecorations);
		plugin.app.workspace.updateOptions();
		rerenderReadingViews(plugin);
	};
	plugin.applyVerseBlocks();
}

function rerenderReadingViews(plugin: SettingsHost): void {
	for (const leaf of plugin.app.workspace.getLeavesOfType('markdown')) {
		if (leaf.view instanceof MarkdownView) leaf.view.previewMode.rerender(true);
	}
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
