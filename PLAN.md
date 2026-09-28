# Feature 2 — Manual reference-to-wikilink conversion

Scope and rules: see CLAUDE.md, Feature 2. Each item is tagged with the "Done when" criterion it
serves:

- `DW1` finds plain-text references in the command's scope
- `DW2` rewrites them to the alias wikilink form
- `DW3` creates missing parent-chain notes
- `DW4` vault-wide command only: confirmation prompt and progress indicator first
- `SPEC` other CLAUDE.md constraints (ignore list, settings, single registration point,
  three hotkey-able commands)

## Precondition (done)
- [x] Port `bible-books.ts`, `verse-rules.ts`, `verse-rules.test.ts`, `hidden-characters.ts` and
      `spec/verse-linking.md` (Detection sections only); fix the import to `./bible-books`
- [x] `verse-rules.test.ts` passes under Vitest, unchanged (72/72)
- [x] Fold in the dot (`John 3.16`) and space (`Romans 8 28`) separators; 82/82 passing

## Decisions
- **Note file names match the existing vault**: plural canonical book name, with a space between
  chapter and verse because file names can't contain `:`. Examples: `Psalms 23 1.md`,
  `Psalms 23.md`, `Psalms.md`, `John 3 16-18.md`, `Matthew 6 1-3,7.md`, `Matthew 5-7.md`.
- **Link form:** `[[<note name>|<text exactly as typed>]]`. `Ps 23:1` becomes
  `[[Psalms 23 1|Ps 23:1]]`, so the visible text, colon included, doesn't change.
- **Parent chain:** verse or range → chapter → book → `Old Testament` / `New Testament`. Chapter
  ranges link straight to the book. A new note's body is `[[parent]]`; testament notes are empty.
- **Placement:** every created note goes where the *location for new notes* setting says, which
  has the same three options as Obsidian's own: vault folder, same folder as the note being
  converted, or a specified folder. That location can optionally be split into `Old Testament/`
  and `New Testament/` subfolders; testament notes sit at its root. An existing note with the
  same name anywhere in the vault is reused and never modified.
- **Semicolon references get one link per chapter:**
  `[[Proverbs 17 7|Proverbs 17:7]]; [[Proverbs 30 22|30:22]]`.
- **Everything the detector finds is converted**, lowercase book names included.

## 0. Housekeeping
- [x] Update CLAUDE.md Feature 2 to match the decisions above `SPEC`
- [x] Fix the 3 type errors in `src/verse-rules.ts` with type-narrowing only, no logic change;
      fix the one lint-flagged line in `src/verse-rules.test.ts` `SPEC`
- [x] Add `tsconfig.build.json` (excludes `src/**/*.test.ts`) and point `npm run build` at it;
      strict mode and ESLint config unchanged `SPEC`
- [x] Remove the template's sample code from `src/main.ts`; rename the manifest to
      `scripture-thread` / "Scripture Thread"; set `minAppVersion` to `1.11.0` (`SettingGroup`, the newest API used, is `@since 1.11.0`) `SPEC`

## 1. Pure conversion core (no Obsidian imports, Vitest-tested)
- [x] `src/conversion/protected-ranges.ts`: `findProtectedRanges(text)` covers frontmatter,
      fenced code, inline code, callout blocks, and `{...}`, plus existing `[[...]]`/`![[...]]`
      links, markdown links, and Bible Reference's `--John1:1` syntax. It's text-based, because
      `SectionCache` has no inline code or `{...}` and the metadata cache lags unsaved editor
      text `SPEC`
- [x] `src/conversion/note-names.ts`: turns a `VerseMatch` into link targets
      `{ from, to, alias, chain }`, splitting semicolon references; includes a
      `testamentOf(book)` helper `DW2 DW3`
- [x] `src/conversion/convert-text.ts`: `convertText(text)` returns `{ edits, chains }`. It strips
      hidden characters, detects, drops protected matches, and maps offsets back to the original
      text so that only the reference is replaced `DW1 DW2`
- [x] Tests: `protected-ranges.test.ts`, `note-names.test.ts`, `convert-text.test.ts`, covering
      a second run producing zero edits, ignored regions left untouched, and a reference split
      by a zero-width space `DW1 DW2 DW3`

## 2. Obsidian layer
- [x] `src/conversion/note-creator.ts`: `ensureChains(chains, sourcePath)` reuses a note via
      `metadataCache.getFirstLinkpathDest`, otherwise creates it with `vault.create` /
      `vault.createFolder` at the chosen location; per-run cache `DW3`
- [x] `src/conversion/run-conversion.ts`: `convertActiveEditor` uses one
      `editor.transaction({ changes })`, so it's undoable. `convertFiles(files, onProgress,
      isCancelled)` uses `vault.process` per file and returns a summary `DW1 DW2 DW3`
- [x] `src/conversion/scope.ts`: `markdownFilesIn(folder)` and
      `vaultFilesExcluding(excludedFolders)`, with path-prefix matching tested; exclusions apply
      to the vault scope only `DW1 SPEC`

## 3. UI
- [x] `src/settings.ts`: `notesLocation`, `notesFolder`, `splitByTestament`,
      `conversionFolderLocation`, `conversionFolder`, `excludedFolders`. Laid out in
      `SettingGroup` sections: **General** (default location for new notes — vault folder /
      same folder as current file / specified folder — and split by testament), **Convert
      command: Current Note** (description only), **Convert command: References in Folder**
      (folder to convert — same folder as current file / specified folder), **Convert command:
      Whole Vault** (excluded folders, full-width text box). Each folder picker appears only
      when "In the folder specified below" is chosen `SPEC`
- [x] `README.md`: replace the template README with install steps (including that Obsidian only
      picks up a manually added plugin on restart or refresh), the three commands and hotkeys,
      settings, note naming and layout, and what conversion never touches `SPEC`
- [x] `src/ui/folder-suggest.ts`: `AbstractInputSuggest<TFolder>` over
      `vault.getAllFolders()` `SPEC`
- [x] `src/ui/vault-conversion-modal.ts`: confirm step (file count, exclusions, "cannot be
      undone" warning), then a `ProgressBarComponent` with an "n / total" count, the current
      file, and a Stop button; ends with a summary and a Notice `DW4`

## 4. Single registration point
- [x] `src/commands/index.ts`: `registerAll(plugin)` is the only place that calls `addCommand`,
      `addSettingTab` and the `file-menu` event. It registers
      `convert-references-in-current-note`, `convert-references-in-folder`,
      `convert-references-in-vault`, and a folder right-click item. `main.ts` only loads
      settings and calls it `SPEC DW1 DW4`

## 5. Done-when check
- [x] Automated: `DW1`–`DW3` covered by in-memory runs of `convertFiles` and `convertEditor`
      (`src/conversion/run-conversion.test.ts`)
- [x] In Obsidian: each of the three commands finds references in its scope `DW1`, rewrites
      them to alias form `DW2`, and creates the missing chain `DW3`; only the vault command
      confirms first and shows progress `DW4`

## Verification
- [x] `npm test` 134/134, `npm run build` 0 type errors, `npm run lint` 0 errors. The 10
      warnings are: sentence-case on proper nouns (Bible, Old Testament, Scripture Thread), the
      Obsidian 1.13 `getSettingDefinitions()` suggestion, and one `TFile` cast in a test fake
- [x] Manual, in a scratch vault, with a fixture note covering every format and every ignored region:
  - Current-note command, then Ctrl+Z restores the note
  - A second run changes nothing
  - Folder command, via settings and via right-click
  - Vault command: confirm, progress, Stop, excluded folder untouched
  - Created notes have the right names, folders and parent links
  - An existing `Psalms 23 1.md` is reused, not duplicated

---

# Feature 1 — Verse context side panel

Scope and rules: see CLAUDE.md, Feature 1. Each item is tagged with the "Done when" criterion it
serves:

- `DW1` the cursor on a verse link opens/updates the panel
- `DW2` it lists every other note referencing that verse
- `DW3` each shows the containing paragraph's actual text
- `SPEC` other CLAUDE.md constraints (single registration point, no live scanning, docs)

API check against `obsidian.d.ts` v1.12.3: `getBacklinksForFile` isn't there, so the notes linking
to a verse come from the documented `metadataCache.resolvedLinks` / `unresolvedLinks`. There's no
cursor-moved workspace event; the caret is followed with a CodeMirror 6 `updateListener` through
`registerEditorExtension`.

## 0. Housekeeping
- [x] `LICENSE`: `Copyright (C) 2026 by Wesley Tullis` `SPEC`
- [x] CLAUDE.md Feature 1: `resolvedLinks` instead of `getBacklinksForFile`, plus the decisions
      (verse and chapter links, caret in a paragraph, overlapping group, opens itself, caret
      moves only) `SPEC`
- [x] `package.json`: `@codemirror/view` pinned to `6.38.6` (the version `obsidian` depends on) as
      a devDependency; esbuild keeps it external `SPEC`

## 1. Pure logic (Vitest-tested)
- [x] `src/context/links-at-cursor.ts`: `linksAtCursor` — the link under the caret, or every link
      in the caret's paragraph (list items and headings stand alone) `DW1`
- [x] `src/context/bible-link.ts`: `parseBibleLink` — a name that is wholly one verse or chapter
      reference, with its verse keys and chapter keys `DW1 DW2`
- [x] `src/context/paragraph.ts`: `paragraphAt` — the section holding an offset, or the innermost
      list item for a list `DW3`
- [x] `src/context/find-mentions.ts`: `findMentions` — exact and overlapping groups, current note
      left out, parent links in verse notes skipped, property links, newest first `DW2 DW3`
- [x] Tests: `links-at-cursor.test.ts`, `bible-link.test.ts`, `find-mentions.test.ts` (which also
      covers paragraph boundaries) — 26 tests `DW1 DW2 DW3`

## 2. Obsidian layer
- [x] `src/context/cursor-tracker.ts`: caret moves only (no document change), debounced 200 ms `DW1 SPEC`
- [x] `src/context/obsidian-mention-source.ts`: the metadata cache and vault behind `findMentions`
- [x] `src/ui/verse-context-view.ts`: stacked sections, each a verse heading with its note count and an "Overlapping passages" group,
      paragraphs rendered as markdown, click to open at the paragraph, refresh on `resolved` `DW2 DW3`
- [x] `src/commands/context-actions.ts`: opens the panel only when it isn't open; the command and
      ribbon also reveal it and fill it from the caret `DW1`

## 3. Single registration point
- [x] `src/commands/index.ts`: the view, the editor extension, the "Open verse context panel"
      command and the ribbon icon `SPEC DW1`

## 4. Docs
- [x] README "Verse context panel" section and limits; CHANGELOG entry `SPEC`

## 5. Done-when check
- [x] Automated: `DW2`/`DW3` by `find-mentions.test.ts` over a fake vault; `DW1` by the
      `linksAtCursor` + `parseBibleLink` tests
- [x] In Obsidian: the cursor on a verse link opens/updates the panel `DW1`, listing every other
      note referencing it `DW2`, with each paragraph's actual text visible `DW3`

## Verification
- [x] `npm run check`: build, lint 0 errors (the same 10 known warnings), 160/160 tests
- [x] Manual, in the test vault: paragraph, list item, callout and property mentions; the
      overlapping group; a paragraph with two verse links (stacked, and single with the caret on
      one); the panel opens without taking focus, stays when the caret moves off, comes back after
      closing; typing inside a link does nothing; the command and ribbon open it

---

# Settings: standardize references, and skipped text

Brings two items that CLAUDE.md had listed as out of scope into scope, at the user's request:
the "Reformat-references / citation-style feature" and the "Ignore-pattern configuration UI".

## A. Standardize references
- [x] CLAUDE.md: taken off the out-of-scope list; toggle and rules described
- [x] `src/bible-link.ts` (moved from `src/context/`): adds `parseReference`, `samePassage`, and
      each reference's `book` and `passage`; shared by the panel and conversion
- [x] `note-names.ts`: each `LinkTarget` carries its standard text (`30:22` after a semicolon)
- [x] `src/conversion/standardize.ts`: rewrites the visible text of existing verse and chapter
      links — only text that is itself the same passage, bare links, or short continuations;
      never embeds, headings-only bare links, or skipped regions; targets never change
- [x] `convert-text.ts`: `convertText(text, options)`; standard text for new links when on;
      counts standardized links apart from converted references
- [x] `run-conversion.ts`: settings passed through; summary adds "and standardized N links"
- [x] General toggle "Standardize references", off by default
- [x] Tests: `standardize.test.ts` (every example, what's left alone, second run, counts) and a
      whole-run test in `run-conversion.test.ts`

## B. Skipped text
- [x] CLAUDE.md: taken off the out-of-scope list; switches, markers and always-on links described
- [x] `protected-ranges.ts`: `IgnoreRules` (seven switches, including Obsidian `%%comments%%`,
      plus marker pairs), `DEFAULT_IGNORE_RULES` (all on), `skippedRegions`, `markerRanges`; links
      always protected. Inline code no longer matches a fenced block, so the two switches are
      independent
- [x] `src/settings-data.ts` (split from `settings.ts` so it can be tested): the new settings and
      `withDefaults`, which fills in switches missing from settings saved by 1.0.0
- [x] Settings section "Convert commands: Skipped Text": the seven switches, "Your own markers"
      with **Add marker pair** and a remove button per pair
- [x] Tests: `ignore-rules.test.ts` (each switch, links with everything off, markers) and
      `settings-data.test.ts`

## Docs, testing and release
- [x] README (Standardize references, What conversion skips, Settings), CHANGELOG
- [x] `npm run check`: build, lint 0 errors (the 10 known warnings), 203/203 tests
- [x] Manual, in the test vault: `Standardize.md` and `Skipped text.md` in the UAT kit
- [x] Release 1.1.0: `npm version minor`, `git push --follow-tags`, `npm run release`

---

# Verse blocks

Brings two items that CLAUDE.md lists as out of scope into scope, at your request: the grey border
round a verse block, and double-Enter to close it. The brief called them "not buildable without a
structural document model". They are, once "closed" is a blank line, because a markdown paragraph
already is the model. Behaviour follows the web app's item 4.1
(`bible-journal-app/v3/design/4.1-verse-block-enter/README.md`), read for behaviour only; no code
is shared, and import/export with the app isn't a goal. Mac, iPhone and iPad.

- `DW1` the box appears round a verse block in Live Preview, Source mode and Reading view
- `DW2` Enter grows it to the new line at once; Enter again closes it over the paragraph above,
  with the closing animation, and the next paragraph sits outside it
- `DW3` both work on the Mac and on iOS, with the on-screen keyboard and a hardware keyboard
- `SPEC` other constraints: the brief, `spec/`, the single registration point, Obsidian's theme,
  docs

## The rules
These also go in `spec/verse-blocks.md`.

1. **A verse block is a run of non-blank lines that holds a verse or chapter link.** These are
   the links the context panel responds to (`parseBibleLink`): `[[Psalms 23 3]]`,
   `[[John 3 16-18]]` and `[[Psalms 23]]` count, while `[[Psalms]]`, `[[Old Testament]]` and plain
   text don't. The whole run is boxed, including lines above the link, because Reading view
   draws a paragraph as one element and half of one can't be boxed.
2. **A blank line ends it.** A line of only spaces counts as blank.
3. **The empty line holding the caret, directly under a block, is drawn inside it.** This is the
   first Enter: the box grows as soon as the line exists, in the same update, with nothing typed.
   It isn't stored anywhere; it follows from where the caret is.
4. **When the caret leaves that line and the line is still empty, the block closes.** This is the
   second Enter, or an arrow key or a tap. The box shuts back over the paragraph above with the
   closing animation. Typing on the line instead joins it to the paragraph, so it stays in. Enter
   from the new line after that is an ordinary new paragraph, outside the box.
5. **Never boxed, and each ends a run:** frontmatter, fenced code, `$$` math, callouts, a line
   that is only an embed, and headings. A verse link in any of them opens nothing. Live Preview
   draws these as widgets that hide their lines, so the box closes neatly above them instead of
   being left open (spike finding). Embeds (`![[…]]`) don't open a block anywhere.
5a. **No boxes inside an embed or a hover preview**, and the parent link that the converter
   writes into a verse note (`[[John 3]]` in `John 3 16.md`) doesn't open a block. It's the
   same `isParentLink` rule the context panel uses (spike finding).
6. **Drawn in Obsidian's theme:** a 1px `--background-modifier-border` line (in dark themes,
   `--background-modifier-border-hover`, since the plain one was too faint there) down both sides of
   every line, with the top edge and rounded (`--radius-m`) corners on the first line and the
   bottom edge and rounded corners on the last. The lines of text don't move when a box opens or
   closes.
7. **Closing animation:** the border goes from `--text-muted` to its resting colour over 320 ms,
   `ease-out`, on every line of the block at once. `prefers-reduced-motion` turns it off. Nothing
   waits for it to finish.

**What this costs:** the lines in a block are joined by line breaks, not paragraph gaps, and with
**Strict line breaks** on, Reading view runs them together into one paragraph. Nothing is stored,
and no note text is written.

## Decisions
- [x] **"Closed" is a blank line.** A block is one run of non-blank lines, and double-Enter is
      already Obsidian's way to start a new paragraph. No syntax is added and Enter isn't taken
      over, which removes the risk around iOS keyboards. The other options were two blank lines
      (a visible gap in the editor) and a hidden `%%…%%` marker (raw text in Source mode)
- [x] **Only links open a block.** Live conversion (below) turns typed references into links,
      and those open blocks with no change here. The rule takes its opener as a parameter, so
      plain text could open blocks by swapping one function
- [x] Lines above the link in the same paragraph are in the block (rule 1)
- [x] Headings are never boxed and end a run. Revisit if notes go directly under a
      `## [[John 3 16]]` heading
- [x] Lists: Enter on an empty bullet only clears the bullet, so closing a block after a list
      takes three Enters. Accepted, since it's Obsidian's own list behaviour. Session 1 measures
      it
- [x] A **Verse blocks** switch in **General**, on by default
- [x] Verse Graph's note panel highlights the verse block that cites the selected verse, instead
      of showing that block alone, so the rest of the note stays readable around it
- [x] **Obsidian's theme only.** Every colour, radius, spacing value and timing curve comes from
      Obsidian's CSS variables, never from the web app's `globals.css` and never hard-coded, so
      changing the theme restyles the box. The plugin's own variables only alias the theme's
      (`--verse-block-border: var(--background-modifier-border)`), so a CSS snippet can still
      override one. The 320 ms is the one fixed value, because it's behaviour, not style

## 0. Brief and spec
- [x] CLAUDE.md: add "Feature 3: Verse blocks" with the rules above, and take the grey border and
      double-Enter off the out-of-scope list. Reword "No live/on-keystroke scanning" so the
      border can read the note's lines for links on each edit, while conversion stays manual.
      The live conversion mode stays out of scope until it has its own plan `SPEC`
- [x] CLAUDE.md coding conventions: style with Obsidian's theme variables only, never copied web
      app CSS or fixed colours `SPEC`
- [x] `spec/verse-blocks.md`: the rules and a table of examples. Verse Graph copies it along with
      the rule file `SPEC`

**Done when:** the brief no longer contradicts this plan.

## 1. Spike, on a throwaway branch (`spike/verse-blocks`, never merged)
Build a hard-coded run-of-non-blank-lines rule, drawn as CodeMirror 6 line decorations, plus a
Reading view post-processor. Test it in the test vault on one note that has a paragraph, several
lines, a list, a checkbox list, a quote, a callout, a table, an embed, an image, math, a code block
and a heading. Record what's found in a "Spike findings" table here. `DW1 DW2 DW3`
- [x] Which Live Preview widgets (table, callout, embed, image, math) break the box, and how. Pick
      a fallback for each, or list it as a known limit
- [x] Obsidian's own Enter in a paragraph, list, checkbox, quote and callout: the exact text each
      press leaves, and where the caret lands
- [x] iPhone and iPad, with the on-screen keyboard and a hardware keyboard: is it the same
      transaction, and does the box grow and close with the caret in the same update? Install
      through a BRAT beta (`1.2.0-beta.1`), as Verse Graph was tried on the phone
- [x] Drawing without moving text: `box-shadow` or a pseudo-element versus `border` on
      `.cm-line`; rounded corners; the gaps between lines; readable line width
- [x] Reading view: does `getSectionInfo` return a range for each kind of section, in hover
      previews and embeds too, with Strict line breaks both on and off? Do margins between a `p`
      and a `ul` break the sides?
- [x] Timing: the whole-note rule on a 10,000-line note, on every change, should take under 2 ms
      on the Mac. If it's slower, work outward from the visible lines to the nearest blank lines

**Done when:** every row has an answer, you've seen the prototype box on the Mac and on your
iPhone, and the rules above have been corrected wherever a finding contradicts them.

### Spike findings
Branch `spike/verse-blocks`, prerelease `1.2.0-beta.1`. **Done 2026-09-28:** you checked it on the Mac, iPhone and iPad and everything but the table rendered as expected. Hardware keyboards weren't logged separately, so session 3 checks them. Reading view's many sections with no section info didn't show as missing boxes; session 4 measures that again.

| Question | Mac | iPhone | iPad |
|---|---|---|---|
| Enter in a paragraph | One `"\n"`, event `input`. The box grows on the first Enter and closes on the second; also closes when the caret is clicked away. Typing on the grown line keeps it in, and two more Enters close it | Same as the Mac, on-screen keyboard: one `"\n"`, closes on the second Enter | Looks as expected, by eye |
| Enter in a list, checkbox, quote, callout | Not logged; looked right by eye | **Checkbox:** Enter continues it (`\n- [ ] `), Enter again clears the bullet (6 characters deleted), and a third Enter closes: three Enters, as expected. **Quote and callout:** Enter continues it (`\n> `), and Enter again replaces the `> ` with a new line, which closes: two Enters. The on-screen keyboard also rewrites the last typed letter as part of Enter (`1del+"x\n…"`) | Looks as expected, by eye |
| Live Preview widgets (table, callout, math, embed) | As on the iPhone | **Callout:** no box at all, because the rendered callout hides its lines. **Math (`$$`) and embed:** the box's top and sides are drawn above them, then left open where the widget starts. **Table:** shows as raw `\|` text because Obsidian needs a blank line before a table (you checked: it renders once it's outside the block). A table is never in a block, which is fine. **Quote and checkbox list:** fine. **Heading:** correctly unboxed. The embedded note's own `[[John 3]]` line was boxed inside the embed | Looks as expected, by eye |
| Drawing: box-shadow vs border | No visible difference. **Keep box-shadow**, which can't move text | Looks as expected, by eye | Looks as expected, by eye |
| Reading view | 15 sections boxed; 11 with no section info (`div`, `p`, `ul`), probably the embedded note's own sections. Looked right by eye on the Mac | Only 2 sections boxed; 86 with no section info. Looked right by eye | Looks as expected, by eye |
| Timing, 10,000 lines, in the app | Median 2.5 ms, p95 3.5 ms, max 8.7 ms: **over the 2 ms target**. The rule alone is ~1 ms in Node; the rest is reading the lines out of the editor and running on every caret move | Median 6 ms, p95 8 ms, max 22 ms: **well over** | Looks as expected, by eye |
| Changes with no user event | Another plugin rewrote `{Psalms }` → `{Psalms 23:1}`, and 6 characters were deleted on an empty line several times. Neither comes from this plugin. The close check shouldn't depend on the user event, and doesn't | — | Looks as expected, by eye |

**Changes to the plan so far:**
- Timing: session 2 works out the blocks only when the text changes, and applies the caret rule
  (rule 3) to the stored blocks when only the caret moves. It also reads lines straight from the
  editor's text instead of copying them into an array
- Timing, your call after the iPhone: **not worth more work.** 6 ms is added to each keystroke only
  in a 10,000-line note, which is still inside one screen refresh (16 ms), and real journal notes
  are a small fraction of that. Session 2 keeps the simple whole-note rule, caches it across caret
  moves, and keeps a timing test as a guard against it getting much slower. No per-line cache, and
  no viewport-only mode
- Drawing: inset `box-shadow`
- Rules 5 and 5a, decided with you after the iPhone: math, callouts and embed-only lines end a
  block; nothing is boxed inside embeds; parent links in verse notes don't open a block. The
  opener gets the note's path so it can apply `isParentLink` (export it from
  `src/context/find-mentions.ts`)
- Reading view: the post-processor retries `getSectionInfo` once the element is attached, and
  session 4 measures the retry on the iPhone

## 2. The rule file, and the box in the editor
- [x] `src/verse-block-rules.ts`: pure and without imports, so Verse Graph can copy it the way it
      copies `verse-rules.ts`. `verseBlocks(lines, opensBlock, caretLine?)` returns
      `{ startLine, endLine }[]` (0-based, inclusive), and `lineRole(block, line)` returns one of
      `only | start | middle | end`. Also `growToCaret`, the caret rule on its own, so the
      editor keeps the blocks while only the caret moves, and `blockAt` `DW1`
- [x] `src/blocks/opens-block.ts`: the opener. Export `linksIn` from
      `src/context/links-at-cursor.ts` for it rather than copying it, and use `parseBibleLink`.
      It skips any line without `[[` before parsing anything `DW1`
- [x] Tests in `verse-block-rules.test.ts`:
      - a one-line paragraph, and several lines
      - a link on a middle line (the lines above it are in the block)
      - blank and space-only lines end a block; two blocks one blank line apart
      - a list under the paragraph
      - a heading ends a block
      - frontmatter and code fences are never boxed; a link inside a code block doesn't open one
      - the caret's empty line under a block is in it; one line lower isn't; a caret on a line
        with text changes nothing
      - an empty note

      Also `opens-block.test.ts`: embeds, book links and testament links don't open a block. And
      a timing test in the style of Verse Graph's `vault-graph.timing.test.ts` `DW1`
- [x] `src/blocks/verse-block-decorations.ts`: a `ViewPlugin` that rebuilds the line decorations
      on `docChanged`, `viewportChanged` and `selectionSet`, and decorates only the visible
      lines `DW1`
- [x] `styles.css`: `.scripture-thread-verse-block` with start and end modifiers, in Obsidian's
      theme variables only. Checked in the default light and dark themes and in one community
      theme `DW1 SPEC`
- [x] `src/commands/index.ts`: register the extension there, the single registration point
      `SPEC`

Built: 29 new tests (232 in all). The rules follow the spike: math, callouts and embed-only lines
end a block, and `isParentLink` is exported from `find-mentions.ts` for the opener, which takes the
note's path. `@codemirror/state` is pinned to `6.5.0`, the version `obsidian` asks for. Try it in
`1.2.0-beta.2`.

Tried on the Mac: the box shows in Live Preview and Source mode, math, callouts and embeds close
neatly above, and there's no box inside the embed. The border was too faint in dark mode, so dark
themes use the theme's next border step up (`1.2.0-beta.3`). Checked again in dark and in a
community theme: both good. **Session 2 done.**

**Done when:** `npm run check` is green, and on the Mac a verse link in a paragraph draws the box
in Live Preview and Source mode, and a blank line ends it.

## 3. Enter: grow and close
- [x] Give the rule the caret's line: the main selection, only when nothing is selected, and only
      on a blank line `DW2`
- [x] Closing animation: when a block loses its caret line and that line still exists and is
      still blank, give the block's lines a `…-closing` class, and clear it after 320 ms with a
      `StateEffect`. It fires only on that change, not on deletes, pastes or undo `DW2`
- [x] Reduced motion in CSS `DW2`
- [x] Check that nothing flickers between the first Enter and the redraw (the web app's 200 ms
      bug) `DW2`
- [x] Tests for the closing check (pure), next to the rule tests `DW2`

Built: `src/blocks/closing.ts` (`grownLine`, `closingBlock`) with 8 tests, 240 in all. The editor
keeps the blocks between keystrokes and re-applies `growToCaret` on each caret move; the grown
line's position follows edits (`mapPos` with `TrackDel`), so undoing the first Enter or deleting
the line plays nothing. The border colour is a registered `@property` so the animation can fade
it. Try it in `1.2.0-beta.4`.

Tried in `1.2.0-beta.4` (2026-09-28): everything looked as expected. **Session 3 done.**

**Done when:** on the Mac, and on the iPhone and iPad with both keyboards, Enter grows the box at
once and a second Enter closes it with the animation. The next paragraph sits outside the box, and
lists behave as the spike recorded. `DW3`

## 4. Reading view, the setting, and release
- [x] `src/blocks/verse-block-reading.ts`: a `registerMarkdownPostProcessor` that runs the same
      rule over `getSectionInfo(el).text` once per render (cached by that text) and marks each
      section's element as start, middle or end. A section without section info gets no box,
      which goes in the known limits `DW1`
- [x] The **Verse blocks** switch in `src/settings-data.ts` (with `withDefaults`) and
      `src/settings.ts`. Switching it off clears the editor through a `Compartment` or
      `workspace.updateOptions()`, and Reading view on its next render `SPEC`
- [x] README: a "Verse blocks" section and its limits (Live Preview widgets, Strict line breaks);
      CHANGELOG `SPEC`
- [x] Release `1.2.0` (2026-09-28) `SPEC`

Built: the post-processor waits a frame so the section is on the page before asking
`getSectionInfo`, and skips anything inside `.markdown-embed` or `.hover-popover`. Sections get
`display: flow-root`, so a paragraph's margins stay inside the box and the sides run unbroken
into the next section. The switch empties the array given to `registerEditorExtension`, calls
`workspace.updateOptions()` and re-renders every open Reading view. Try it in `1.2.0-beta.5`.

Tried in `beta.5`: Reading view matched, but switching off left the boxes in Reading view, because
Obsidian keeps the sections it has already drawn and re-rendering didn't redraw them. Fixed in
`1.2.0-beta.6`: Reading view always marks its sections, and the switch puts a class on the body
of every window (`scripture-thread-verse-blocks-on`) that the CSS needs before it draws anything.
The editor still drops its extension when off, so it does no work. Tried in `beta.6`: off and back on
both work in Reading view.


**Done when:** the test note shows the same boxes in Reading view on the Mac and on iOS, the switch
turns them off in all three modes, and `1.2.0` is in your real vault through BRAT.

## 5. Verse Graph (built in `../obsidian-verse-graph`)
- [x] Copy `verse-block-rules.ts`, its test and `spec/verse-blocks.md`, each with a header noting
      where it came from and when. Add them to `npm run compare-app`, which already reads this
      repo
- [x] `src/ui/note-panel.ts`: instead of marking the first paragraph that links to the verse,
      find the verse block holding it, box it with the same CSS, and scroll to it as now
- [x] A row for this in Verse Graph's own PLAN.md

Built on Verse Graph's `feature/verse-blocks` branch: the panel renders the note in three parts
round the block (`citing-block.ts`, 6 tests) so the block is its own element to box. A citation in
no block keeps the old tint. Known limit: footnotes and reference-style links defined on the other
side of the cut don't resolve. Tried on the Mac in Verse Graph's test vault (2026-09-28), with long
notes for each case: good. On the phone in `0.6.0-beta.1`, through BRAT: good. **Session 5 done.**

**Done when:** choosing a note in the graph shows the block citing the selected verse boxed, on
the Mac and on the phone.

## Later, in its own plan: live conversion
You want references recognised as you type, not only when a command runs. It's on CLAUDE.md's
out-of-scope list, and gets its own plan after this one. Nothing here is in its way: the
conversions it writes are links, and links open blocks. If a reference that hasn't been converted
yet should open a box too, only `opensBlock` needs to change.
