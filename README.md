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

Requires Obsidian 1.11 or later, on desktop and mobile. Each vault has its own plugins, so install
it in every vault you want it in — a vault synced across devices (iCloud, Obsidian Sync) brings the
plugin along.

### From Community plugins
1. In Obsidian, open Settings → Community plugins, and turn off Restricted mode if it's on.
2. Choose **Browse**, search for **Scripture Thread**, then **Install** and **Enable**.

Obsidian offers new versions under Settings → Community plugins → **Check for updates**.

### With BRAT (beta versions)
[BRAT](https://github.com/TfTHacker/obsidian42-brat) installs plugins straight from their GitHub
releases, including pre-release betas.

1. Install and enable **BRAT** from Settings → Community plugins → Browse.
2. In BRAT's settings choose **Add beta plugin**, enter `gitwesleyt/obsidian-scripture-thread`,
   and pick a version.
3. Enable **Scripture Thread** in Settings → Community plugins.

### By hand
1. From the [latest release](https://github.com/gitwesleyt/obsidian-scripture-thread/releases/latest),
   download `main.js`, `manifest.json` and `styles.css`.
2. Put them in `<your-vault>/.obsidian/plugins/scripture-thread/` (create the folder).
3. Restart Obsidian. It only notices a newly added plugin folder when it starts, or when you
   click the refresh button next to **Installed plugins** in Settings → Community plugins.
4. Enable **Scripture Thread** in Settings → Community plugins.

To update, download the new release's three files over the old ones, then turn the plugin off
and on again.

## Privacy

Scripture Thread works entirely inside your vault. It makes no network requests, collects no
telemetry, needs no account, and never reads or writes files outside the vault. The only notes it
changes are the ones you convert, and the only notes it creates are the verse, chapter, book and
testament notes those conversions link to.

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

**Dictated references.** Phone dictation writes `revelation three verses five through seven` where
you would type `Revelation 3:5-7`. Turn on **Recognize dictated references** in Settings and those
are found and linked too, by every command and by convert as you type — which links a dictated
reference once you've moved off its line, the same moment as any other. See *Dictated
references* below.

**Convert as you type.** Turn this on in Settings and a reference you type or paste becomes a
link as soon as you leave its line — press Enter, use an arrow key, or tap elsewhere — and its
notes are created. Nothing changes while you're still on the line, so `John 3` isn't linked
before you've typed `:16`. It follows the same rules as the commands: the skipped text, the alias
form, Standardize references and Transform dictated references.

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
Each of these has a switch under **Convert commands: skipped text** in the plugin's settings, and you can add
your own start/end markers there too (see Settings below).

### Dictated references

Off by default. With **Recognize dictated references** on, these are found after a book name:

| Dictated | Links to |
|---|---|
| `John three`, `job two` | `John 3`, `Job 2` |
| `Romans chapter 8 verse 28` | `Romans 8 28` |
| `John 3 verses 16 to 18`, `…through 18` | `John 3 16-18` |
| `Matthew 6 verses 1 to 3, 7 and 9` | `Matthew 6 1-3,7,9` |
| `John three sixteen` | `John 3 16` |
| `Psalm 23 to 25` | `Psalms 23-25` |
| `first john four verse eight` | `1 John 4 8` |
| `Psalm one hundred and nineteen` | `Psalms 119` |

- **Only full book names.** With a chapter spoken as a word, an abbreviation is mostly English —
  `my ex two years ago`, `Phil two doors down` — so `Ex`, `Phil` and `Dan` still want digits.
- **Words like "it was a revelation to me" and "numbers don't lie" are left alone**, as is a date
  such as `June 16`.
- **The link keeps the words as spoken** — `[[Revelation 3 5-7|revelation three verses five
  through seven]]` — unless you turn on **Transform dictated references**, which shows
  `Revelation 3:5-7` instead, and does the same to links already converted from dictated words.
  That switch is the only one that changes dictated words, and it changes only them: ones you
  typed keep the text you wrote. **Standardize references** works on typed references only, so
  `Rev 3` becomes `Revelation 3` but `revelation three` stays as spoken.
- **The folder and whole-vault commands ask about the doubtful ones first.** Those rewrite many
  notes at once where you can't see them, so a dictated reference that doesn't say `verse` —
  `mark one`, `psalm twenty three` — is listed for you to untick if it's just words. Every one
  starts ticked; an unticked one stays plain text, and you're asked again next time. `mark one
  verse two` isn't doubtful. The current-note command and convert as you type don't ask: you're
  looking at the line, and undo turns it back.
- **With Transform on, the bulk commands also rewrite links you already made from dictated
  words**, so the whole-vault confirmation and the review screen say so first. Cancel and turn it
  off to keep those words as spoken. The folder command asks only when it has doubtful references
  to ask about.
- It can't tell you're dictating; it only reads what was written. A dictation revises its last
  words for a moment after you stop speaking, which is why nothing converts until you leave the
  line.

Some things are always skipped, whatever the settings: existing wikilinks and embeds (so running
a command twice is safe), Markdown links, and web addresses.

## Settings

On Obsidian 1.13 and later, every setting below shows up in the settings search.

**At the top** — used by every command.
- **Default location for new notes** — where created notes go: *Vault folder*, *Same folder as
  current file* (the note being converted), or *In the folder specified below* (default:
  `Bible`). Applies to every note the plugin creates, from all three commands.
- **Split by testament** — files new notes into `Old Testament/` and `New Testament/` subfolders
  of that location. The two testament notes themselves sit at the location's root. On by default.
- **Standardize references** — writes the references you typed in one standard form, including
  links you've already converted (see Converting references). Dictated words are left as spoken.
  Off by default.
- **Recognize dictated references** — also finds references the way dictation writes them (see
  Dictated references). Off by default.
- **Transform dictated references** — shown only while the setting above is on. A dictated
  reference's link reads `Revelation 3:5-7` instead of the spoken words, including links already
  converted from dictated words; references you typed keep your text. Off by default.
- **Convert as you type** — converts the references on a line when you leave it (see Converting
  references). Off by default.
- **Verse blocks** — draws the border round verse blocks (see Verse blocks). On by default.

**Convert commands: skipped text** — applies to all three commands.
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

**Convert command: current note** — uses the settings above and the skipped text; nothing of its
own.

**Convert command: references in folder**
- **Folder to convert** — *Same folder as current file* (the default) or *In the folder specified
  below*. With the first option, the command won't run from a note in the vault root, since that
  would convert the whole vault without the confirmation step — use the whole-vault command
  instead.

**Convert command: whole vault**
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
GitHub Actions publishes each release when its tag is pushed, after running the same checks, and
attaches build provenance so anyone can verify the files were built from this repository.

1. In `CHANGELOG.md`, move the entries under *Unreleased* into a new heading for the version.
   Commit that on `master`.
2. Bump the version. Use `patch` for fixes (1.0.0 → 1.0.1), `minor` for new features (1.1.0),
   `major` for changes that break how it's used (2.0.0):
   ```bash
   npm version patch
   ```
   This updates `package.json`, `manifest.json` and `versions.json`, commits, and tags the
   commit `1.0.1` — no `v`, which is what Obsidian and BRAT expect.
3. Check, then push the commit and its tag:
   ```bash
   npm run release
   ```
   The *Release Obsidian plugin* workflow then publishes the release with `main.js`,
   `manifest.json` and `styles.css`, and refuses a tag that doesn't match `manifest.json`.

**A beta for BRAT:** tag a branch's commit with a pre-release version and push the tag. The
workflow publishes it as a prerelease whose manifest carries that version, and nothing on the
branch changes:
```bash
git tag 1.3.2-beta.1
git push origin 1.3.2-beta.1
```

## License

[0BSD](LICENSE)
