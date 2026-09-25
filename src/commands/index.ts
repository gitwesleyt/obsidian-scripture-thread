import { TFolder } from 'obsidian';
import { ScriptureThreadSettingTab, type SettingsHost } from '../settings';
import {
	convertCurrentNote,
	convertFolder,
	convertSettingsFolder,
	openVaultConversion,
} from './conversion-actions';

/** Everything the plugin wires into Obsidian, in one place. */
export function registerAll(plugin: SettingsHost): void {
	plugin.addSettingTab(new ScriptureThreadSettingTab(plugin.app, plugin));

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
