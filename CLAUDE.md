# Scripture Thread — Claude Code Brief

Obsidian plugin. Read this whole file before writing code.

## Features

### Feature 1: Verse context side panel
When the cursor is on a Bible verse reference (a wikilink like `[[Psalm 23 3]]`), show a side
panel listing every other note that references that same verse — and for each one, the actual
**paragraph text** surrounding the link, not just the note title.

- No block-ID system needed. Use Obsidian's metadata cache (`links[]` with position data,
  `sections[]` / `listItems[]` for paragraph boundaries) to locate the paragraph containing a
  given link.
- **`getBacklinksForFile()` is not in the installed `obsidian.d.ts` (checked at v1.12.3)** — use
  the documented `metadataCache.resolvedLinks` / `unresolvedLinks` to find the notes linking to
  a verse instead. Don't assume API shapes from training data; the plugin API has changed before.
- **Responds to verse and chapter links** (`[[Psalms 23 3]]`, `[[John 3 16-18]]`, `[[Psalms 23]]`,
  `[[Matthew 5-7]]`), not book or testament links. With the caret **on** such a link, the panel
  shows that link; with it elsewhere in a paragraph, it shows every verse link in the paragraph,
  stacked.
- **Overlapping references are included**, in their own group: on `[[John 3 16]]`, notes linking
  to `[[John 3 16-18]]` also appear. Overlap means sharing a detector verse key, so verse and
  chapter links don't pull each other in.
- **Opens itself** in the right sidebar when the caret reaches a verse link; also a command and
  ribbon icon. It never closes itself — it keeps the last verse when the caret moves away.
- It follows **caret moves only, never typing**, and reads only the caret's paragraph — no
  scanning of note text.
- Skips the current note, and the parent links inside verse notes (the `[[John 3]]` line the
  converter writes into `John 3 16.md`).
- Removing a linked verse from the panel is explicitly **not needed**. Don't build it.

**Done when:** placing the cursor on a verse link opens/updates a panel showing every other note
referencing that verse, with the containing paragraph's actual text visible per note.

### Feature 2: Manual reference-to-wikilink conversion
Detect plain-text Bible references (e.g. `Psalm 23:3`) and convert them to wikilinks, on demand
through three commands or as you type (a setting), auto-creating the linked note and its parent
chain.

- `Psalm 23:3` → `[[Psalms 23 3|Psalm 23:3]]` — **use the alias form**, not a bare `[[Psalms 23 3]]`.
  The alias is the text **exactly as typed**, so the colon stays visible in rendered text for
  compatibility with other reference-detection plugins (conVERsum) that may rely on it.
- **Setting: standardize references** (off by default). When on, the alias is the standard form
  instead — `Ps 23:1` → `Psalm 23:1`, `Jn 3.16` → `John 3:16`, `II Cor 5:17` →
  `2 Corinthians 5:17` (singular for one psalm; the colon always stays) — and existing verse and
  chapter links get their visible text rewritten on the next run. Only text that is itself a
  reference to the same passage is rewritten (`[[John 3 16|this verse]]` is kept); a bare link
  gains standard text; a semicolon continuation stays short (`30:22`); targets never change.
- **Note file names match the user's existing vaults** (created by their old script): plural
  canonical book name, with a space between chapter and verse because file names can't contain
  `:`. Examples: `Psalms 23 3`, `Psalms 23`, `Psalms`, `John 3 16-18`, `Matthew 6 1-3,7`,
  `Matthew 5-7`. A mismatch would duplicate notes and split backlinks.
- Auto-create parent notes up the chain: verse or range → chapter → book → `Old Testament` /
  `New Testament` (chapter ranges link straight to the book). A new note's body is its
  `[[parent]]` link; testament notes are created empty. An existing note with the same name
  anywhere in the vault is reused and never modified.
- A semicolon reference gets one link per chapter:
  `[[Proverbs 17 7|Proverbs 17:7]]; [[Proverbs 30 22|30:22]]`.
- Everything the detector finds is converted, lowercase book names included — no extra filter.
- Three separate commands, each independently hotkey-able:
  1. Convert references in **this document**
  2. Convert references in **a folder** — which folder is a setting with two options, *Same
     folder as current file* or *In the folder specified below* (picker shown only for that
     option); refuses when the current note is in the vault root, since that would be a vault-wide
     run without the confirmation. Also a right-click item on any folder in the file explorer.
  3. Convert references in **the entire vault** — requires a confirmation step and a progress
     indicator before running; this is a one-way, potentially large operation.
- **Text inside `{...}` is skipped by default** — that's another installed plugin's (Bible Verse)
  live rendering syntax, not something to convert. The user can switch that off (below).
- **Skipped text, a setting.** Each built-in rule has an on/off switch, all on by default:
  `{...}` curly-brace blocks, callout blocks, code blocks, inline code, Obsidian `%%comments%%`,
  YAML frontmatter, and Bible Reference's `--John1:1` syntax. Users can add their own
  **start/end marker pairs** (plain text, not regex; an empty end means end of line; an unclosed
  start runs to the end of the note).
  **Existing wikilinks/embeds and markdown links are always skipped** — not switchable — so
  re-running is safe. Applies to all three commands.
- **Setting: convert as you type** (off by default). The references typed or pasted on a line
  are converted when the caret leaves it (Enter, an arrow key, a tap, or the editor losing focus),
  so nothing moves under the caret mid-sentence and the first Enter opens the verse block.
  - Only **typed or pasted** text (CM6 `input` transactions). Undo, redo, sync and other plugins'
    edits never are, and nor is an old plain reference elsewhere in the note.
  - The conversion is **its own undo step**. Undo turns the link back into the plain text, and
    it stays plain until that text is edited again. Notes it created stay.
  - The same rules as the commands: Skipped text, alias form, Standardize (only the links typed
    on the line), semicolons, hidden characters, and its parent chain created at once. A reference
    after an unclosed `[[` or `{` on its line is left alone: a link still being typed.
  - **Leaving the note** (switching notes, closing the tab) converts what's still waiting on the
    caret's line by writing to the saved file — only when the file is exactly the editor's text
    and the note isn't open in another pane, else nothing. That one can't be undone in the editor.
  - Skips the whole-vault **excluded folders**. No Notice.
  - The detector runs on the typed lines only; skipped regions come from the whole note.
- Conversion produces the linked note **structure only** — do not populate new verse notes with
  actual scripture text. That's out of scope (see below).
- **Setting: location for new notes.** Mirrors Obsidian's own "Default location for new notes":
  *Vault folder*, *Same folder as current file* (for folder/vault runs, each note being
  converted), or *In the folder specified below* (with a folder picker shown only for that
  option, e.g. `Bible/`). Applies to **every** note the plugin creates — verse, chapter, book and
  testament alike — and to all three conversion commands.
- **Setting: split by testament.** A toggle that files created notes into `Old Testament/` and
  `New Testament/` subfolders of the chosen location. Testament notes themselves sit at the
  location's root.
- **Setting: excluded folders.** A configurable list of folders the vault-wide scan should skip
  entirely (e.g. templates, archives). Applies to the vault-scope command and to convert as you
  type — the single-document and folder-scope commands are already an explicit, deliberate choice
  of what to scan, so exclusions don't apply there.

**Done when:** running any of the three commands finds plain-text Bible references in its scope,
rewrites them to the alias wikilink form, creates missing parent-chain notes, and — for the
vault-wide command only — shows a confirmation prompt and progress indicator first.

### Feature 3: Verse blocks
A grey rounded border around a **verse block**: the paragraph holding a Bible reference and the
lines typed under it. Enter grows the border to the new line at once; Enter again closes it back
over the paragraph above, with a short closing animation. Behaviour follows the Bible Journal web
app's item 4.1; nothing is shared with it, and import/export with the app is not a goal. Drawn in
Live Preview, Source mode and Reading view, on Mac, iPhone and iPad. Full rules:
`spec/verse-blocks.md`; build plan: `PLAN.md`, "Verse blocks".

- **A verse block is a run of non-blank lines holding a verse or chapter link** — the links
  `parseBibleLink` accepts, the same ones the context panel responds to. Book and testament links,
  embeds and plain-text references don't open a block. The whole run is boxed, including lines
  above the link.
- **A blank line closes it.** That's the whole of "closed": nothing is stored and no note text is
  written. Double-Enter is Obsidian's own "new paragraph", so the plugin never takes the Enter key.
- **The empty line holding the caret, directly under a block, is drawn inside it** (the first
  Enter). When the caret leaves that line and it's still empty, the block closes with the
  animation (the second Enter, an arrow key or a tap).
- **Never boxed, and each ends a run:** frontmatter, fenced code, `$$` math, callouts, embed-only
  lines and headings — Live Preview renders them as widgets that would leave the box open.
- **No boxes inside embeds or hover previews**, and a verse note's parent link (`[[John 3]]` in
  `John 3 16.md`, the `isParentLink` rule) doesn't open a block.
- **Closing animation:** the border colour settles from `--text-muted` to its resting colour over
  320ms `ease-out`, on every line of the block at once; `prefers-reduced-motion` removes it.
- **Setting: Verse blocks**, in General, on by default; off removes the border in all three modes.
- The grouping rule lives in `src/verse-block-rules.ts` — pure, no imports, tested — so Verse
  Graph can copy it the way it copies `verse-rules.ts`.

**Done when:** a verse link in a paragraph draws the border in Live Preview, Source mode and
Reading view; Enter grows it at once and Enter again closes it with the animation, leaving the
next paragraph outside; all of it on Mac and on iOS with both keyboards.

## Explicitly out of scope — do not build these

- Populating verse notes with real scripture text (depends on a translation source, not decided)
- Any traVERture/conVERsum forking or merging
- Removing a verse from the side panel

If a task seems to require one of these, stop and flag it rather than building it.

## Files ported from the web app (Bible Journal project)

**Ported 2026-09-25.** The copies in `src/` and `spec/` are now the only source of truth — do not
read or reference the web app repo again. Since the port, the detector also accepts `John 3.16`
and `Romans 8 28` (dot and space in place of the colon); `spec/verse-linking.md` records the rules.
The original porting notes follow.

- `bible-books.ts` — 66-book list, chapter counts, alternate spellings. No imports.
- `verse-rules.ts` — **the actual detector**: matching, canonical-form conversion, range
  expansion, caps handling, reference toggling. Only imports `bible-books.ts`.
- `verse-rules.test.ts` — the real test suite for the detector. Runs under Vitest unchanged.
  Run this immediately after porting, before writing any new plugin code, as a correctness
  checkpoint.
- `hidden-characters.ts` — strips invisible characters from pasted text before detection. Not
  imported by the detector itself, but run it on note text before detection (in this plugin:
  inside the conversion step, since there's no paste handling) — it fixed a real
  bug (191 missed references in one journal) from invisible characters breaking recognition on
  paste.
- `spec/verse-linking.md`, **lines 7–62 only** ("Detection" and "What else counts as a reference"
  sections) — written rules for accepted formats and edge cases. Ignore the rest of that file;
  it's UI documentation for the web app, not applicable here.

**Required edit after copying:** `verse-rules.ts` imports `bible-books.ts` via `@/lib/bible-books`
— a path alias from the web app's config that won't resolve here. Change it to a relative import:
`./bible-books`.

**Do not port `verse-detection.ts`.** It's Tiptap/ProseMirror wiring around the real detector,
not the detector itself, and pulls in the web app's block-grouping logic (Feature 3 has its own,
text-based rule). It's fine to read
for the general idea of debounce-on-pause / cache-unchanged-paragraphs, but don't copy it.

## Coding conventions

- Clean Code principles — small functions, descriptive names, minimal comments (comment only
  where the *why* isn't obvious from the code itself, never to restate what a line does).
- Obsidian plugins have no router. The equivalent of a routing table here is a **single
  registration point**: all `addCommand`, ribbon icons, and settings-tab registration happen in
  one file (e.g. `src/commands/index.ts`), not scattered across feature files. Keep that file as
  the one place that shows everything the plugin has wired up.
- TypeScript strict mode and the template's existing ESLint config stay as-is — don't reconfigure.
- No on-keystroke *reference detection*. The detector runs from a command, or, with convert as
  you type on, once per line the caret leaves, on the typed lines only — never on every
  keystroke and never over the whole note. The verse block border re-reads the note's lines for
  `[[links]]` on each edit (cheap: a line without `[[` is skipped) and never runs the detector.
- Style with **Obsidian's theme variables only** (`--background-modifier-border`, `--text-muted`,
  `--radius-m`, `--size-4-*`, …) — never values copied from the web app's CSS, never fixed
  colours — so changing the theme restyles the plugin. Plugin variables may only alias theme ones.

## Coexistence constraints (other installed plugins)

- **Bible Verse**: `{John 3:16}` is its live-render syntax. Conversion skips text inside
  `{...}` by default (a switch in Skipped text).
- **Bible Reference**: only triggers on its own `--John1:1` syntax — but the detector does match
  the `John1:1` part, so conversion skips that syntax by default (a switch in Skipped text).
- **Bible Sidecar**: passive read-only panel — no overlap risk.
- **conVERsum / traVERture**: both do live, passive decoration of plain-text references.
  Converting once per line left (or by command), not per keystroke, avoids adding to that
  continuous-rescan load, and once a reference is converted to a wikilink it stops matching their
  plain-text pattern entirely.
