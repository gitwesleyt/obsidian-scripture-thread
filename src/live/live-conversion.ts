import { isolateHistory } from '@codemirror/commands';
import type { EditorState, Extension } from '@codemirror/state';
import { ViewPlugin, type EditorView, type PluginValue, type ViewUpdate } from '@codemirror/view';
import { editorInfoField } from 'obsidian';
import { convertText } from '../conversion/convert-text';
import { NoteCreator } from '../conversion/note-creator';
import type { Range } from '../conversion/protected-ranges';
import { isExcluded } from '../conversion/scope';
import type { SettingsHost } from '../settings';
import { convertOnClose } from './convert-on-close';
import { convertedTyping, splitAtCaretLine, touchedRanges } from './touched-ranges';

/**
 * Converts the references typed on a line once the caret leaves it -- Enter,
 * an arrow key, a tap elsewhere, the editor losing focus, or the note closing --
 * so nothing moves under the caret mid-sentence. The conversion is its own undo
 * step, and text an undo puts back is never typed text, so it stays plain.
 */
export function liveConversion(plugin: SettingsHost): Extension {
	const converter = ViewPlugin.fromClass(
		class implements PluginValue {
			private scheduled = false;
			private destroyed = false;
			/**
			 * The note the typed text belongs to. Read while typing, because by the
			 * time the editor closes, Obsidian may already show it the next note.
			 */
			private typedInPath: string | null = null;

			constructor(private readonly view: EditorView) {}

			destroy() {
				this.destroyed = true;
				this.convertWaitingOnClose();
			}

			update(update: ViewUpdate) {
				if (!update.docChanged && !update.selectionSet && !update.focusChanged) return;
				if (update.state.field(touchedRanges).length === 0) return;
				if (update.docChanged) this.typedInPath = update.state.field(editorInfoField, false)?.file?.path ?? null;
				if (this.scheduled) return;

				// A view can't be changed while it is being updated.
				this.scheduled = true;
				queueMicrotask(() => {
					this.scheduled = false;
					this.convertLinesLeft();
				});
			}

			private convertLinesLeft() {
				const { state } = this.view;
				if (this.destroyed || this.view.composing) return;

				const file = state.field(editorInfoField, false)?.file;
				if (!file || isExcluded(file.path, plugin.settings.excludedFolders)) return;

				const caretLine = this.view.hasFocus ? caretLineOf(state) : null;
				const { ready, waiting } = splitAtCaretLine(state.field(touchedRanges), caretLine);
				if (ready.length === 0) return;

				const conversion = convertText(state.doc.toString(), plugin.settings, ready);
				this.view.dispatch({
					changes: conversion.edits,
					annotations: [convertedTyping.of(waiting), isolateHistory.of('full')],
					userEvent: 'scripture-thread.convert',
				});

				const creator = new NoteCreator(plugin.app, plugin.settings);
				void (async () => {
					for (const chain of conversion.chains) await creator.ensureChain(chain, file.path);
				})();
			}

			/** The editor can't change any more, so what's still waiting goes to the saved file. */
			private convertWaitingOnClose() {
				const path = this.typedInPath;
				const touched = this.view.state.field(touchedRanges, false) ?? [];
				if (!path || touched.length === 0 || isExcluded(path, plugin.settings.excludedFolders)) return;

				const text = this.view.state.doc.toString();
				const conversion = convertText(text, plugin.settings, touched);
				if (conversion.edits.length === 0) return;

				void convertOnClose(plugin.app, plugin.settings, path, text, conversion);
			}
		},
	);

	return [touchedRanges, converter];
}

/** From the start of the caret's line to just past its line break. */
function caretLineOf(state: EditorState): Range {
	const line = state.doc.lineAt(state.selection.main.head);
	return { from: line.from, to: Math.min(line.to + 1, state.doc.length) };
}
