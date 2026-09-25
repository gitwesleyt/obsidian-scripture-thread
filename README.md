# Scripture Thread

An Obsidian plugin that surfaces everything you've previously written about a Bible verse, and
converts plain-text Bible references into linked notes.

## What it does

**See what you've already written.** *(Coming next — not built yet.)* Place your cursor on a
Bible verse reference and a side panel shows every other note that mentions that verse —
including the actual surrounding text from each note, not just a list of titles. It's the
difference between Obsidian's native graph view (which only tells you *that* two notes are
connected) and actually seeing *what you said* the last time you wrote about that passage.

**Convert plain text into linked notes.** Write or paste notes normally, including plain-text
references like `Psalm 23:3` in the middle of a sentence. When you're done editing, run a
conversion command and it rewrites detected references into wikilinks, creating the linked note
(and its parent chain — verse → chapter → book → testament) automatically if it doesn't exist yet.

Conversion is manual, not automatic-as-you-type — nothing changes in your document until you
trigger it. Installing the plugin adds nothing to your vault either: notes and folders are only
created when you run a conversion command.

## Installation

There's no published release yet, so for now the plugin is built from source.

1. Build it (needs [Node.js](https://nodejs.org/) 22 or later):
   ```bash
   git clone https://github.com/gitwesleyt/obsidian-scripture-thread.git
   cd obsidian-scripture-thread
   npm install
   npm run build
   ```
2. Create the folder `<your-vault>/.obsidian/plugins/scripture-thread/` and copy `main.js`,
   `manifest.json` and `styles.css` into it.
3. Restart Obsidian. It only notices a newly added plugin folder when it starts, or when you
   click the refresh button next to **Installed plugins** in Settings → Community plugins.
4. Enable **Scripture Thread** in Settings → Community plugins.

To update, rebuild and copy the three files over the old ones, then turn the plugin off and on
again in Settings → Community plugins.

Requires Obsidian 1.11 or later.

## Usage

### Converting references
Three commands are available from the command palette (Cmd/Ctrl+P, then type "Convert Bible").
Each can be given its own hotkey in Settings → Hotkeys — search for "Scripture Thread".

- **Convert Bible references in current note** — converts the note open in the editor. One
  Cmd/Ctrl+Z undoes the whole conversion.
- **Convert Bible references in folder** — converts a folder and its subfolders. The folder is
  set in the plugin settings (the current note's folder, or a folder you choose). You can also
  right-click any folder in the file explorer and choose **Convert Bible references in folder**
  for a one-off conversion.
- **Convert Bible references in whole vault** — scans every note except your excluded folders.
  It shows how many notes it will scan and asks you to confirm first, then shows a progress bar
  with a Stop button. This can't be undone, so consider backing up your vault first.

Each command ends with a summary, for example "Converted 16 references in 1 note and created 35
new notes."

Converted references use the form `[[Psalms 23 3|Psalm 23:3]]`. The part after the `|` is your
text exactly as you typed it, so the colon stays visible for other plugins that look for it. The
part before it is the note's name: the full, plural book name, with a space instead of the colon
(file names can't contain `:`).

### What it recognizes

| You write | It links to |
|---|---|
| `John 3:16`, `Jn 3.16`, `Romans 8 28` | `John 3 16`, `John 3 16`, `Romans 8 28` |
| `Psalm 23` (a whole chapter) | `Psalms 23` |
| `John 3:16-18`, `Matt 6:1-3,7` | `John 3 16-18`, `Matthew 6 1-3,7` |
| `Matthew 5-7` (a chapter range) | `Matthew 5-7` |
| `Proverbs 17:7; 30:22` | one link per chapter: `Proverbs 17 7` and `Proverbs 30 22` |
| `II Corinthians 5:17`, `First Samuel 3` | `2 Corinthians 5 17`, `1 Samuel 3` |

Abbreviations and lowercase book names are recognized too. Everything it finds is converted,
which occasionally includes ordinary words — "he acts 3 times" becomes a link to Acts 3 — so
it's worth a glance over the result. A number that can't exist, like `Jonah 9` (Jonah has four
chapters), is left alone.

### The notes it creates
For each link, the plugin makes sure the whole chain exists. `Psalm 23:3` needs:

```
Psalms 23 3   →  contains [[Psalms 23]]
Psalms 23     →  contains [[Psalms]]
Psalms        →  contains [[Old Testament]]
Old Testament →  empty
```

Chapter ranges like `Matthew 5-7` link straight to the book. New notes contain only that parent
link — no scripture text.

**Existing notes are reused.** If a note with the same name already exists anywhere in your
vault (for example, one made by an older script), the plugin links to it and never modifies it,
so you don't end up with duplicates that split your backlinks.

### What conversion never touches
- YAML frontmatter
- Code blocks and inline code
- Callouts
- Text inside `{curly braces}` (the Bible Verse plugin's syntax)
- Existing wikilinks and embeds, so running a command twice is safe
- Markdown links and web addresses
- The Bible Reference plugin's `--John1:1` syntax

That makes it safe to run alongside other Bible-reference plugins that use those conventions.

## Settings

**General**
- **Default location for new notes** — where created notes go: *Vault folder*, *Same folder as
  current file* (the note being converted), or *In the folder specified below* (default:
  `Bible`). Applies to every note the plugin creates, from all three commands.
- **Split by testament** — files new notes into `Old Testament/` and `New Testament/` subfolders
  of that location. The two testament notes themselves sit at the location's root. On by default.

**Convert command: Current Note** — uses only the General settings.

**Convert command: References in Folder**
- **Folder to convert** — *Same folder as current file* (the default) or *In the folder specified
  below*. With the first option, the command won't run from a note in the vault root, since that
  would convert the whole vault without the confirmation step — use the whole-vault command
  instead.

**Convert command: Whole Vault**
- **Excluded folders** — one folder per line, skipped by the whole-vault command (for example
  templates or archives). The other two commands don't use this list, since there you've already
  chosen exactly what to convert.

## What it doesn't do (yet)

- The verse context side panel described above isn't built yet.
- Doesn't populate newly created verse notes with actual scripture text — conversion creates the
  note structure only. Adding verse text depends on wiring up a translation source, which isn't
  built yet.
- The ignore list above is fixed; there's no setting to customize it.
- A range across chapters isn't understood: `John 3:16-4:2` links only `John 3:16` and leaves
  `-4:2` as plain text.
- Mobile: conversion runs entirely in-plugin (no external processes), so there's no fundamental
  blocker, but mobile hasn't been specifically tested yet.

## Development

```bash
npm run check
```

Runs the type check and build, the linter, and the test suite, in that order, and stops at the
first failure. Run it before every commit. The GitHub workflow is manual-only (Actions → Run
workflow), so this local check is the main safety net.

The detection rules are written up in the "Detection" sections of
[spec/verse-linking.md](spec/verse-linking.md) (the rest of that file describes the web app it
was ported from).

## License

MIT
