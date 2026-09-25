# Changelog

All notable changes to Scripture Thread are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
