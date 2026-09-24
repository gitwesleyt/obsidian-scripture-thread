# Scripture Thread

An Obsidian plugin that surfaces everything you've previously written about a Bible verse, and
converts plain-text Bible references into linked notes.

## What it does

**See what you've already written.** Place your cursor on a Bible verse reference and a side
panel shows every other note that mentions that verse — including the actual surrounding text
from each note, not just a list of titles. It's the difference between Obsidian's native graph
view (which only tells you *that* two notes are connected) and actually seeing *what you said*
the last time you wrote about that passage.

**Convert plain text into linked notes.** Write or paste notes normally, including plain-text
references like `Psalm 23:3` in the middle of a sentence. When you're done editing, run a
conversion command and it rewrites detected references into wikilinks, creating the linked note
(and its parent chain — verse → chapter → book) automatically if it doesn't exist yet.

Conversion is manual, not automatic-as-you-type — nothing changes in your document until you
trigger it.

## Installation

**Manual:**
1. Download the latest release
2. Extract it into `<your-vault>/.obsidian/plugins/scripture-thread/`
3. Reload Obsidian and enable the plugin in Settings → Community Plugins

**Via BRAT:**
1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Add this repository as a beta plugin source in BRAT's settings
3. Enable Scripture Thread in Settings → Community Plugins

## Usage

### Context panel
Open the Scripture Thread panel from the ribbon icon or command palette. It updates automatically
as you move your cursor between verse links, showing every other note that references the same
verse and the paragraph each mention appears in.

### Converting references
Three commands are available from the command palette (each can be given its own hotkey in
Settings → Hotkeys):

- **Scripture Thread: Convert references in this document**
- **Scripture Thread: Convert references in folder** — set the target folder in plugin settings,
  or right-click a folder in the file explorer for a one-off conversion
- **Scripture Thread: Convert references in vault** — scans every note. You'll be asked to
  confirm before it runs, since this touches every matching reference across your vault and can't
  be undone with a single ctrl/cmd-Z.

Converted references use the form `[[Psalm 23 3|Psalm 23:3]]` — the link target has the colon
replaced with a space (Markdown filenames can't contain `:`), but the displayed text keeps the
colon.

Text inside `{curly braces}`, callouts, code blocks, and YAML frontmatter is never touched by
conversion, so it's safe to run alongside other Bible-reference plugins that use those
conventions.

## What it doesn't do (yet)

- Doesn't populate newly created verse notes with actual scripture text — conversion creates the
  note structure only. Adding verse text depends on wiring up a translation source, which isn't
  built yet.
- No settings for excluding folders or customizing the ignore-pattern list — the default ignore
  list (curly braces, callouts, code blocks, frontmatter) is currently fixed.
- Mobile: conversion and the context panel both run entirely in-plugin (no external processes),
  so there's no fundamental blocker, but mobile hasn't been specifically tested yet.

## License

MIT
