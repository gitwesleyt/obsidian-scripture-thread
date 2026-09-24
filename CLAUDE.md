# Scripture Thread — Claude Code Brief

Obsidian plugin. Two features only. Read this whole file before writing code.

## Scope — build exactly these two features, nothing else

### Feature 1: Verse context side panel
When the cursor is on a Bible verse reference (a wikilink like `[[Psalm 23 3]]`), show a side
panel listing every other note that references that same verse — and for each one, the actual
**paragraph text** surrounding the link, not just the note title.

- No block-ID system needed. Use Obsidian's metadata cache (`links[]` with position data,
  `sections[]` for paragraph boundaries) and `getBacklinksForFile()` to locate the paragraph
  containing a given link.
- `getBacklinksForFile()` is undocumented but stable — before using it, check its current
  signature against `obsidian.d.ts` in `node_modules/obsidian`. Don't assume the shape from
  training data; the plugin API has changed before.
- Removing a linked verse from the panel is explicitly **not needed**. Don't build it.

**Done when:** placing the cursor on a verse link opens/updates a panel showing every other note
referencing that verse, with the containing paragraph's actual text visible per note.

### Feature 2: Manual reference-to-wikilink conversion
Detect plain-text Bible references (e.g. `Psalm 23:3`) and convert them to wikilinks on demand
(not live-as-you-type), auto-creating the linked note and its parent chain.

- `Psalm 23:3` → `[[Psalm 23 3|Psalm 23:3]]` — **use the alias form**, not a bare `[[Psalm 23 3]]`.
  The colon must stay visible in rendered text for compatibility with other reference-detection
  plugins (conVERsum) that may rely on it.
- Auto-create parent notes up the chain: `Psalm 23` note links to `Psalm` note (or however the
  ported parent-chain logic defines it — see ported files below).
- Three separate commands, each independently hotkey-able:
  1. Convert references in **this document**
  2. Convert references in **a folder** (folder path set in settings; optional right-click on a
     folder in the file explorer for one-offs)
  3. Convert references in **the entire vault** — requires a confirmation step and a progress
     indicator before running; this is a one-way, potentially large operation.
- **Do not touch text inside `{...}`** — that's another installed plugin's (Bible Verse) live
  rendering syntax, not something to convert.
- Default ignore list for the conversion scan: `{...}` curly-brace blocks, callout blocks, code
  blocks/inline code, YAML frontmatter.
- Conversion produces the linked note **structure only** — do not populate new verse notes with
  actual scripture text. That's out of scope (see below).
- **Setting: parent notes root folder.** A plugin setting where the user picks the folder that
  auto-created parent-chain notes (chapter, book, etc.) get created in — e.g. `Bible/`, rather
  than hardcoding the vault root or wherever the triggering note happens to live. Applies to all
  three conversion commands; the individual verse note itself is still created next to (or per
  existing script behavior relative to) the reference's source note — only the parent-chain notes
  respect this setting.
- **Setting: excluded folders.** A configurable list of folders the vault-wide scan should skip
  entirely (e.g. templates, archives). Applies to the vault-scope command specifically — the
  single-document and folder-scope commands are already an explicit, deliberate choice of what to
  scan, so exclusions don't apply there.

**Done when:** running any of the three commands finds plain-text Bible references in its scope,
rewrites them to the alias wikilink form, creates missing parent-chain notes, and — for the
vault-wide command only — shows a confirmation prompt and progress indicator first.

## Explicitly out of scope — do not build these

- Ignore-pattern configuration UI (the default ignore list above is hardcoded, not user-editable)
- Populating verse notes with real scripture text (depends on a translation source, not decided)
- Reformat-references / citation-style feature
- Any traVERture/conVERsum forking or merging
- Removing a verse from the side panel
- Grey border around a "verse block," double-enter to expand/close a block (both explicitly
  deferred — not buildable without a structural document model Obsidian's CodeMirror 6 doesn't
  have)
- A real-time/live scan mode for conversion — manual trigger only

If a task seems to require one of these, stop and flag it rather than building it.

## Files being ported from the web app (Bible Journal project)

These already exist and work in another project. Port the logic; don't redesign it.

- `bible-books.ts` — 66-book list, chapter counts, alternate spellings. No imports.
- `verse-rules.ts` — **the actual detector**: matching, canonical-form conversion, range
  expansion, caps handling, reference toggling. Only imports `bible-books.ts`.
- `verse-rules.test.ts` — the real test suite for the detector. Runs under Vitest unchanged.
  Run this immediately after porting, before writing any new plugin code, as a correctness
  checkpoint.
- `hidden-characters.ts` — strips invisible characters from pasted text before detection. Not
  imported by the detector itself, but run it on pasted text before detection — it fixed a real
  bug (191 missed references in one journal) from invisible characters breaking recognition on
  paste.
- `spec/verse-linking.md`, **lines 7–62 only** ("Detection" and "What else counts as a reference"
  sections) — written rules for accepted formats and edge cases. Ignore the rest of that file;
  it's UI documentation for the web app, not applicable here.

**Required edit after copying:** `verse-rules.ts` imports `bible-books.ts` via `@/lib/bible-books`
— a path alias from the web app's config that won't resolve here. Change it to a relative import:
`./bible-books`.

**Do not port `verse-detection.ts`.** It's Tiptap/ProseMirror wiring around the real detector,
not the detector itself, and pulls in block-grouping logic that's out of scope. It's fine to read
for the general idea of debounce-on-pause / cache-unchanged-paragraphs, but don't copy it.

## Coding conventions

- Clean Code principles — small functions, descriptive names, minimal comments (comment only
  where the *why* isn't obvious from the code itself, never to restate what a line does).
- Obsidian plugins have no router. The equivalent of a routing table here is a **single
  registration point**: all `addCommand`, ribbon icons, and settings-tab registration happen in
  one file (e.g. `src/commands/index.ts`), not scattered across feature files. Keep that file as
  the one place that shows everything the plugin has wired up.
- TypeScript strict mode and the template's existing ESLint config stay as-is — don't reconfigure.
- No live/on-keystroke scanning anywhere in this plugin — everything is manually triggered, by
  design (see "Explicitly out of scope").

## Coexistence constraints (other installed plugins)

- **Bible Verse**: `{John 3:16}` is its live-render syntax. Never convert or scan text inside
  `{...}`.
- **Bible Reference**: only triggers on its own `--John1:1` syntax — no overlap risk.
- **Bible Sidecar**: passive read-only panel — no overlap risk.
- **conVERsum / traVERture**: both do live, passive decoration of plain-text references. Manual
  (not live) conversion here avoids adding to that continuous-rescan load, and once a reference
  is converted to a wikilink it stops matching their plain-text pattern entirely.
