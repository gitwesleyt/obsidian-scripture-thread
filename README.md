# Scripture Thread

An Obsidian plugin that surfaces everything you've previously written about a Bible verse, and
converts plain-text Bible references into linked notes.

## What it does

**See what you've already written.** Place your cursor on a Bible verse link and a side panel
shows every other note that mentions that verse —
including the actual surrounding text from each note, not just a list of titles. It's the
difference between Obsidian's native graph view (which only tells you *that* two notes are
connected) and actually seeing *what you said* the last time you wrote about that passage.

**Convert plain text into linked notes.** Write or paste notes normally, including plain-text
references like `Psalm 23:3` in the middle of a sentence. When you're done editing, run a
conversion command and it rewrites detected references into wikilinks, creating the linked note
(and its parent chain — verse → chapter → book → testament) automatically if it doesn't exist yet.

**Keep a thought with its verse.** A paragraph that links to a verse gets a grey border, and it
grows as you add lines under it. Press Enter twice to close it and carry on writing outside.

Conversion is manual unless you turn on **Convert as you type** — nothing changes in your
document until you trigger it. Installing the plugin adds nothing to your vault either: notes and
folders are only created when a reference is converted.

## Installation

Requires Obsidian 1.11 or later. Each vault has its own plugins, so install it in every vault
you want it in — a vault synced across devices (iCloud, Obsidian Sync) brings the plugin along.

### With BRAT (recommended — updates itself)
[BRAT](https://github.com/TfTHacker/obsidian42-brat) installs plugins straight from their GitHub
releases and keeps them up to date.

1. Install and enable **BRAT** from Settings → Community plugins → Browse.
2. This repository is private, so BRAT needs a GitHub token to read it. On GitHub, go to
   Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate
   new token. Under *Repository access* choose *Only select repositories* and pick
   `obsidian-scripture-thread`; under *Permissions*, set **Contents** to *Read-only*. Copy the
   token and paste it into BRAT's settings (the personal access token field). Tokens expire, so
   when BRAT can no longer update, generate a new one.
3. In BRAT's settings choose **Add beta plugin**, enter `gitwesleyt/obsidian-scripture-thread`,
   and pick the latest version.
4. Enable **Scripture Thread** in Settings → Community plugins.

To get new versions, turn on BRAT's option to check for updates at startup, or run BRAT's
"Check for updates" command.

### By hand
1. From the [latest release](https://github.com/gitwesleyt/obsidian-scripture-thread/releases/latest),
   download `main.js`, `manifest.json` and `styles.css`.
2. Put them in `<your-vault>/.obsidian/plugins/scripture-thread/` (create the folder).
3. Restart Obsidian. It only notices a newly added plugin folder when it starts, or when you
   click the refresh button next to **Installed plugins** in Settings → Community plugins.
4. Enable **Scripture Thread** in Settings → Community plugins.

To update, download the new release's three files over the old ones, then turn the plugin off
and on again.

## Usage

### Verse context panel
Click on a verse or chapter link — `[[Psalms 23 3|Psalm 23:3]]`, `[[John 3 16-18]]`,
`[[Psalms 23]]`, `[[Matthew 5-7]]` — and the **Verse context** panel opens in the right sidebar.
It lists every other note that links to that verse, newest first, with the paragraph each link
sits in. Click a paragraph to jump to it in its note; links inside it work as usual.

- **Anywhere in a paragraph works too.** With the cursor on a link, the panel shows that link.
  With it elsewhere in a paragraph, it shows every verse link in the paragraph, one after
  another. A list item or heading counts as its own paragraph.
- **Overlapping passages** are listed separately: on John 3:16 you'll also see notes that link to
  John 3:16-18. For a chapter, that means chapter ranges — Matthew 6 shows notes linking to
  Matthew 5-7, but not every verse note in the chapter.
- A link in a note's properties is listed as "Linked in properties".
- Book and testament links (`[[Psalms]]`, `[[Old Testament]]`) don't open the panel, and the
  `[[John 3]]` line inside a verse note (the parent link conversion creates) isn't listed.

The panel follows your cursor, not your typing, and only reads the paragraph you're in. It
keeps showing the last verse when you move away from a link. If you close it, it comes back the
next time you land on a verse link; if you just switch to another sidebar tab or collapse the
sidebar, it stays out of the way and updates in the background. You can also open it with the
**Open verse context panel** command or the book icon in the ribbon.

### Verse blocks
A paragraph with a verse or chapter link gets a grey rounded border: a **verse block**. It's drawn
in Live Preview, Source mode and Reading view, in your theme's own colours.

- **Enter** at the end of the block gives you a new line inside the border straight away.
- **Enter again** on that empty line closes the block: the border settles back round the paragraph
  above, and what you write next is outside it. Moving off the empty line with the arrow keys or a
  tap closes it too.
- In a list, the second Enter only clears the empty bullet, as Obsidian always does, so it takes
  a third to close. A quote or callout takes two.
- A block is simply the lines between blank lines, so nothing extra is written into your note.
  The whole paragraph is boxed, even lines above the link.

Book and testament links (`[[Psalms]]`, `[[Old Testament]]`), embeds, and plain-text references
you haven't converted yet don't make a block, and neither does the `[[John 3]]` line inside a
verse note. Headings, code blocks, `$$` math, callouts and embeds are never inside a block; one
directly under a paragraph ends its block. Nothing is boxed inside an embedded note or a hover
preview. Turn the whole thing off with **Verse blocks** in the settings.

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

**Standardize references.** Turn this on in Settings and the visible text is written in one
standard form instead:

| You write | Shows as |
|---|---|
| `Ps 23`, `Ps 23:1` | `Psalm 23`, `Psalm 23:1` |
| `Jn 3.16`, `Romans 8 28` | `John 3:16`, `Romans 8:28` |
| `II Cor 5:17`, `acts 3` | `2 Corinthians 5:17`, `Acts 3` |

Links you've already converted are tidied the same way the next time you run a command:
`[[John 3 16|Jn 3.16]]` becomes `[[John 3 16|John 3:16]]`, and a bare `[[Psalms 23 1]]` becomes
`[[Psalms 23 1|Psalm 23:1]]`. Where a link points never changes, and link text that isn't a
reference to the same passage — `[[John 3 16|this verse]]` — is left as you wrote it.

**Convert as you type.** Turn this on in Settings and a reference you type or paste becomes a
link as soon as you leave its line — press Enter, use an arrow key, or tap elsewhere — and its
notes are created. Nothing changes while you're still on the line, so `John 3` isn't linked
before you've typed `:16`. It follows the same rules as the commands: the skipped text, the alias
form, and Standardize references.

- **Undo turns the link back into the text you typed**, and it stays plain until you edit it.
  Any notes it created stay.
- Only what you type is converted. An old plain reference elsewhere in the note waits for a
  command.
- Nothing happens in the whole-vault **excluded folders**, so templates stay as they are.
- A reference after a `[[` or `{` you haven't closed yet on that line is left alone.
- Switching to another note or closing it counts as leaving the line. That conversion is written
  to the saved note, so undo can't reverse it, and it's skipped if the note is still open in
  another pane.

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

### What conversion skips
By default, conversion leaves these alone:
- YAML frontmatter
- Code blocks and inline code
- Obsidian comments (`%%like this%%`)
- Callouts
- Text inside `{curly braces}` (the Bible Verse plugin's syntax)
- The Bible Reference plugin's `--John1:1` syntax

That makes it safe to run alongside other Bible-reference plugins that use those conventions.
Each of these has a switch under **Settings → Convert commands: Skipped Text**, and you can add
your own start/end markers there too (see Settings below).

Some things are always skipped, whatever the settings: existing wikilinks and embeds (so running
a command twice is safe), Markdown links, and web addresses.

## Settings

On Obsidian 1.13 and later, every setting below shows up in the settings search.

**General**
- **Default location for new notes** — where created notes go: *Vault folder*, *Same folder as
  current file* (the note being converted), or *In the folder specified below* (default:
  `Bible`). Applies to every note the plugin creates, from all three commands.
- **Split by testament** — files new notes into `Old Testament/` and `New Testament/` subfolders
  of that location. The two testament notes themselves sit at the location's root. On by default.
- **Standardize references** — writes references in one standard form, including links you've
  already converted (see Converting references). Off by default.
- **Convert as you type** — converts the references on a line when you leave it (see Converting
  references). Off by default.
- **Verse blocks** — draws the border round verse blocks (see Verse blocks). On by default.

**Convert commands: Skipped Text** — applies to all three commands.
- A switch for each built-in rule: **Frontmatter**, **Code blocks**, **Inline code**,
  **Obsidian comments** (`%%…%%`), **Callouts**, **Curly braces**, and **Double-dash
  references** (Bible Reference's `--John1:1`). All on by default; turn one off to convert
  inside that kind of text.
  Careful with **Frontmatter**: a link in a property needs quotes around it, which conversion
  doesn't add, so check your properties after converting with it off.
- **Your own markers** — click **Add marker pair** and fill in a start and an end, like `<!--` and
  `-->` (HTML comments). Everything from a start marker to the next end marker is skipped, even
  across lines. Leave the end empty to skip to the end of the line — a
  start of `Source:` skips every line that begins with it. A start marker with no end after it
  skips the rest of the note.

**Convert command: Current Note** — uses the General and Skipped Text settings; nothing of its
own.

**Convert command: References in Folder**
- **Folder to convert** — *Same folder as current file* (the default) or *In the folder specified
  below*. With the first option, the command won't run from a note in the vault root, since that
  would convert the whole vault without the confirmation step — use the whole-vault command
  instead.

**Convert command: Whole Vault**
- **Excluded folders** — one folder per line, skipped by the whole-vault command and by convert as
  you type (for example templates or archives). The other two commands don't use this list, since
  there you've already chosen exactly what to convert.

## What it doesn't do (yet)

- Doesn't populate newly created verse notes with actual scripture text — conversion creates the
  note structure only. Adding verse text depends on wiring up a translation source, which isn't
  built yet.
- A range across chapters isn't understood: `John 3:16-4:2` links only `John 3:16` and leaves
  `-4:2` as plain text.
- Very long ranges only count their first verse for the panel's overlap: `[[Psalms 119 1-176]]`
  overlaps Psalm 119:1 but not 119:50.
- Verse blocks in Reading view: a section Obsidian doesn't give a position for isn't boxed. With
  **Strict line breaks** on, Reading view runs a block's lines together into one paragraph.
- A table needs a blank line above it, so a table is never inside a verse block.
- Convert as you type: a reference that runs across a line break isn't found. One still on the
  caret's line when you leave a note that's also open in another pane isn't converted; run a
  command to catch it.

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

### Building from source
Needs [Node.js](https://nodejs.org/) 22 or later.

```bash
git clone https://github.com/gitwesleyt/obsidian-scripture-thread.git
cd obsidian-scripture-thread
npm install
npm run build
```

That writes `main.js`; copy it with `manifest.json` and `styles.css` into a vault's
`.obsidian/plugins/scripture-thread/` folder.

### Releasing a new version
Releases are made from your own machine with the [GitHub CLI](https://cli.github.com/) (`gh`),
so they don't use GitHub Actions minutes.

1. In `CHANGELOG.md`, move the entries under *Unreleased* into a new heading for the version.
   Commit that on `master`.
2. Bump the version. Use `patch` for fixes (1.0.0 → 1.0.1), `minor` for new features (1.1.0),
   `major` for changes that break how it's used (2.0.0):
   ```bash
   npm version patch
   ```
   This updates `package.json`, `manifest.json` and `versions.json`, commits, and tags the
   commit `1.0.1` — no `v`, which is what Obsidian and BRAT expect.
3. Push the commit and its tag:
   ```bash
   git push --follow-tags
   ```
4. Build, check, and publish the release with the three plugin files attached:
   ```bash
   npm run release
   ```

BRAT picks up the new version the next time it checks for updates.

## License

[0BSD](LICENSE)
