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
- [ ] `README.md`: replace the template README with install steps (including that Obsidian only
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
- [ ] In Obsidian: each of the three commands finds references in its scope `DW1`, rewrites
      them to alias form `DW2`, and creates the missing chain `DW3`; only the vault command
      confirms first and shows progress `DW4`

## Verification
- [x] `npm test` 131/131, `npm run build` 0 type errors, `npm run lint` 0 errors. The 10
      warnings are: sentence-case on proper nouns (Bible, Old Testament, Scripture Thread), the
      Obsidian 1.13 `getSettingDefinitions()` suggestion, and one `TFile` cast in a test fake
- [ ] Manual, in a scratch vault, with a fixture note covering every format and every ignored region:
  - Current-note command, then Ctrl+Z restores the note
  - A second run changes nothing
  - Folder command, via settings and via right-click
  - Vault command: confirm, progress, Stop, excluded folder untouched
  - Created notes have the right names, folders and parent links
  - An existing `Psalms 23 1.md` is reused, not duplicated
