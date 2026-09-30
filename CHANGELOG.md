# Changelog

All notable changes to Scripture Thread are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- With **Transform dictated references** on, the whole-vault confirmation and the review screen
  now warn that links already made from dictated words will be rewritten too, with a way to
  cancel first.
## [1.4.0] - 2026-09-30

### Added
- **Recognize dictated references** setting, off by default: references the way phone dictation
  writes them — `revelation three verses five through seven`, `John three sixteen`, `first john
  four verse eight`, `Psalm 23 to 25` — are found and linked by every convert command and by
  convert as you type. The link keeps the spoken words as its visible text.
- **Transform dictated references** setting, shown while the one above is on: a dictated
  reference's link reads `Revelation 3:5-7` instead of the words as spoken, and links already
  converted from dictated words are rewritten the same way. References you typed keep your text.
  **Standardize references** only ever changes references you typed, never dictated words.
- The **folder** and **whole-vault** commands ask about the doubtful dictated references first
  (those that don't say `verse`, like `mark one`), all ticked to start with. Unticked ones stay
  plain text.

### Fixed
- A number word could match a name every JavaScript object has, so `John constructor` produced a
  garbled reference. Only real number words count now.

## [1.3.2] - 2026-09-29

### Fixed
- The plugin could fail to load on older iPhones and iPads: one pattern used a regular-expression
  feature their browser engine can't read.

### Changed
- Folder paths in settings are cleaned up the same way on every platform (a trailing `/` or
  doubled slashes no longer matter).
- Settings follow Obsidian's guidelines: the shared settings sit at the top without a heading, and
  headings are in sentence case.
- A new plugin description, and a Privacy section in the README: no network use, no telemetry, no
  account, nothing outside the vault.

## [1.3.1] - 2026-09-29

### Added
- Settings show up in Obsidian's settings search, on Obsidian 1.13 and later. Older versions keep
  the same settings tab as before.

### Changed
- **Convert as you type** also converts the line you were on when you switch to another note or
  close it. That conversion is written to the saved note, so it can't be undone in the editor, and
  it's skipped if the note is open in another pane.

## [1.3.0] - 2026-09-29

### Added
- **Convert as you type** setting, off by default: a reference you type or paste becomes a link
  when you leave its line, and its notes are created. Undo turns it back into plain text, which
  then stays plain. Uses the skipped-text settings and the whole-vault excluded folders.

## [1.2.0] - 2026-09-28

### Added
- **Verse blocks**: a grey rounded border round a paragraph that links to a verse or chapter, in
  Live Preview, Source mode and Reading view. Enter grows it to the new line; Enter again closes
  it with a short animation, and you carry on writing outside. A blank line is all that closes a
  block, so nothing extra is written into notes. Drawn in the theme's colours, and switched off
  with the new **Verse blocks** setting.

## [1.1.0] - 2026-09-26

### Added
- **Standardize references** setting: converted references show in one standard form (`Ps 23:1`
  → `Psalm 23:1`, `Jn 3.16` → `John 3:16`), and existing verse and chapter links are tidied the
  same way. Link targets never change, and link text that isn't a reference is kept.
- **Skipped text** settings: a switch for each built-in rule (frontmatter, code blocks, inline
  code, Obsidian `%%comments%%`, callouts, curly braces, `--John1:1`), plus your own start/end
  marker pairs. Existing links and Markdown links are always skipped.

## [1.0.0] - 2026-09-25

### Added
- A verse context side panel: with the cursor on (or in a paragraph with) a verse or chapter
  link, it lists every other note linking to that verse, with the paragraph around each link,
  plus notes linking to overlapping passages.
- Three commands that convert plain-text Bible references into alias wikilinks
  (`[[Psalms 23 3|Psalm 23:3]]`) in the current note, a folder, or the whole vault, creating any
  missing verse, chapter, book and testament notes.
- The whole-vault command asks for confirmation and shows progress, with a Stop button.
- Right-click a folder in the file explorer to convert it.
- Settings for where new notes go, splitting them by testament, which folder the folder command
  converts, and folders the whole-vault command skips.
