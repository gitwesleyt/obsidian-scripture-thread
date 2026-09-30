## Detection
- Scans entry text *live*, as the user types, using a debounced approach (re-scan only after a short pause, e.g. 150–300ms, and only re-check the text that changed) — must stay lean and responsive
- Matches Bible verse references in various formats against a reference lookup — exact format-variation handling refined iteratively, not solved perfectly in v1

> **Reworked after Phase 10 (2026-08-07), and the reversal is the important part.** Phase 4 built the detector on the principle that *inventing* a reference is worse than *missing* one, because a false tag draws a grey border round unrelated paragraphs. The app owner's call is that it runs the other way round: this is a journal built around Bible verses, so a book name followed by a number is far more likely to be a reference than a coincidence; removing a wrong tag is one click and the app has had that affordance since Phase 4; and a reference the app silently ignored gives the writer nothing to click at all. Everything below follows from that.
>
> **The rule that was dropped:** a chapter-only reference used to be accepted only when the book name was capitalised, so that "he acts 3 times a week" was not tagged as Acts 3. It is gone. "matthew 5", "i sam 3" and "psalm 23" are now references — and so are "he acts 3 times", "I saw mark 2 of them" and "finished the job 4 days early". That is the stated cost, and `verse-rules.test.ts` holds it as a test rather than leaving it to be discovered.
>
> **The formats that were added**, each of which the detector previously ignored or half-read:
>
> | Written | Tagged as |
> |---|---|
> | `III John 1`, `II Chronicles 7:14`, `I Cor 13:4` | 3 John 1, 2 Chronicles 7:14, 1 Corinthians 13:4 — **Roman numerals are a spelling, never a tag.** The `verses` table stores the canonical "3 John" (Section 4), so a note written `III John` and one written `3 Jn` find each other |
> | `matthew 5`, `i sam 3` | Matthew 5, 1 Samuel 3 |
> | `Matthew 5-7` | Matthew 5, Matthew 6 and Matthew 7 — three chapter tags |
> | `Matthew 6:1-3,7` and `Matthew 6:1-3,7-9` | verses 1, 2, 3, 7 — and 1, 2, 3, 7, 8, 9. A space after the comma is accepted, because that is how people type it |
>
> **Two caps, for the same reason the verse-range cap already existed.** A chapter range longer than 20 chapters ("Psalm 1-150") is a note about the book rather than about 150 chapters, so only its opening chapter is tagged; the reference is still highlighted in full. A comma list is counted as a whole against the 20-verse cap, so a list cannot quietly get past a limit a single range could not.
>
> **One collision, and Isaiah wins it.** The Roman form of the abbreviation "1 Sa" is "I Sa", which with spaces closed up is indistinguishable from "Isa" — Isaiah. Isaiah keeps it, because "Isa 3" is a spelling people write and "I Sa 3" is not. "I Sam 3" and "1 Sa 3" are both unaffected.
>
> **Still not understood:** a range crossing chapters (`John 3:16-4:2`), and a comma list of *chapters* (`Matthew 5-7,9`). The second is deliberate rather than pending — a comma after a bare chapter number is far more often ordinary punctuation than a list, which is not true of a comma after "3:16".

## What else counts as a reference, and what stops counting (GitHub issues #34, #38, #39, #40)

Four changes to detection, all in `src/lib/verse-rules.ts` and so shared by the editor and the import alike — there is one scanner, and both call it.

### A numbered book written out as a word (#38)

`First Samuel 3`, `Second Corinthians 2` and `Third John 1` are references, stored under the canonical `1 Samuel`, `2 Corinthians` and `3 John` exactly as `I Samuel 3` and `III John 1` already were. **Generated as spellings of the digit form**, the same way the Roman numerals are, which is what makes the tag store the canonical name rather than inventing a book — and which brings every abbreviation along free, so `First Sam`, `First Sm` and `First Sa` work without anyone listing them.

- **No closed-up form.** `1John` and `IJohn` are generated because people write them; `FirstJohn` is not, and a spelling nobody uses is only a chance to collide with one somebody does.
- **No new collisions.** `register()` silently refuses a spelling another book owns, so a word form landing on somebody else's abbreviation would have gone missing with nothing to see. A test walks all seventeen numbered books and checks each word form resolves to the right book.

### A semicolon between two chapters of the same book (#40)

`Proverbs 17:7; 30:22` is one reference tagging **Proverbs 17:7 and Proverbs 30:22**, and it reads back in that form on the chip. Chains follow — `Proverbs 17:7; 30:22; 31:10` is three tags — and commas go on meaning what they meant, so `Matthew 6:1-3,7; 7:12` is four verses of Matthew 6 and one of Matthew 7.

- **After a semicolon the app requires `chapter:verse`, never a bare number.** A comma already means "another verse in this chapter", so accepting `Proverbs 17:7; 22` would give the two separators overlapping meanings. Anything else after the semicolon ends the reference where it was understood — which is also what makes `…as in Proverbs 17:7; and that is the point` behave, the same answer the comma rule has always given the same shape.
- **A new book name after a semicolon is left to its own match.** `Proverbs 17:7; John 3:16` is two references, because book names are found anywhere in the text.
- **The 20-verse cap still holds.** A chain is not a way past it.

### A comma list stops at a numbered book (TD-98)

`Jeremiah 7:1-2, 2 Corinthians 10:4` is two references: **Jeremiah 7:1–2 and 2 Corinthians 10:4**. A comma after a verse takes the next number as another verse of the list, and until TD-98 it took the `2` of `2 Corinthians` too — so the `2` belonged to two matches at once, Jeremiah 7:2 was counted twice, and the chip drawing split the overlap into three boxes.

- **A number that begins a book name ends the list.** `parseTail` asks `startsABookName` at every comma, and a book is left to its own match, exactly as a book name after a semicolon already was.
- **The name alone decides it, with no chapter asked after it.** `John 3:16, 2 Corinthians is where…` names a book rather than verse 2.
- **A number that only looks like the start of one is still a verse.** `John 3:16, 1 and more` is John 3:16 and 3:1, because `1 and` is not a book.

### Nothing inside a web address (#34)

A reference inside an `http://`, `https://` or `www.` address is not tagged. Pasting a link to a passage used to sprout a chip on the address itself — `https://bible.com/bible/1588/job.8.20.AMP` was read as Job 8 — which put a grey verse-group border round the paragraph and a wrong entry in Linked References.

- **The address, never the link text.** `[John 3:16](https://…)` still tags John 3:16: the label is what the writer wrote and what a reader sees. A link's destination never reaches the scanner anyway, being an attribute on the mark rather than text. What is caught is an address that is *also* the visible words, which is exactly what a pasted link is.
- **`[[Psalm 23]]` is untouched**, for the same reason: a wikilink is link text with no destination beside it, so its words are the writer's own. The overlap section below still describes what happens.

### A full stop or a space in place of the colon (Obsidian port)

`John 3.16` and `Romans 8 28` are references, read exactly as `John 3:16` and `Romans 8:28`. Both work after a semicolon too: `Proverbs 17 7; 30 22`. The space form is also how verse notes are named in an Obsidian vault (`Romans 8 28.md`).

- **A full stop counts only with a digit straight after it.** `Sat with Psalm 23. Then prayed.` is still a whole chapter, and `John 3.400` is refused outright, the same way the colon refuses `John 3:400`.
- **A space is the weaker signal.** The second number is read as a verse only if it could be one and does not begin a book name. Otherwise the chapter stands on its own: `John 3 400 people` is John 3, and `Genesis 1 2 Corinthians 5` is two references.
- **The stated cost:** `Luke 2 3 times` is Luke 2:3. `verse-rules.test.ts` holds this as a test.

## Dictated references, behind a setting

Ported from the Bible Journal app's item 11.2. Phone dictation writes `revelation three verses five
through seven` where a writer types `Revelation 3:5-7`. **With *Recognize dictated references* on,
those are references too.** Off — the default — detection is exactly the typed grammar above and the
dictated grammar never runs. Code: `src/spoken-verse-rules.ts`, number words in
`src/spoken-numbers.ts`, reached through `scanText(text, { spoken: true })`.

After a book name:

| Dictated | Read as |
|---|---|
| `John three`, `job two` | John 3, Job 2 — a chapter spoken as a word counts exactly as digits do |
| `Romans chapter 8 verse 28` | Romans 8:28 |
| `John 3 verses 16 to 18`, `…through 18`, `…thru 18` | John 3:16–18 |
| `Matthew 6 verses 1 to 3, 7 and 9` | Matthew 6:1–3, 7, 9 |
| `John three sixteen` | John 3:16 |
| `Psalm 23 to 25` | Psalms 23–25 |
| `first john four verse eight`, `1st John four verse eight` | 1 John 4:8 |
| `Psalm one hundred and nineteen`, `twenty-three` | 119, 23 — one to 176, a space or hyphen in a compound |

- **Only full book names.** `Ex`, `Phil`, `Dan` and every other abbreviation stay with the typed
  grammar, which wants digits. `Song of Songs` and `Revelations` count; `Song` alone does not. The
  Roman forms are left out too: `I John four` is a pronoun more often than a book.
- **`verse` leaves the chapter standing when no number follows**: `John 3 verses are…` is John 3.
- **`and` joins verses only in a list opened by `verses`**, so `John 3:16 and 17 people` is John 3:16.
- **A verse after a plain space only after a chapter spoken as a word**: `Psalm 23 one of my
  favourites` is Psalm 23, not 23:1.
- **A number word is read whole and greedily**: `onerous` holds no `one`, and `revelation three
  hundred` is chapter 300 of a 22-chapter book — nothing — rather than Revelation 3. A word that
  only exists on every JavaScript object (`constructor`) is not a number word.
- **How it meets the typed scan.** A dictated match replaces a typed one only when it starts no
  later, ends no earlier and is longer — the same reference read further, which is how
  `John 3 verses 16 to 18` becomes John 3:16–18 where the typed grammar alone saw John 3. Anything
  else that overlaps is dropped, and an equal reading keeps the typed one, so
  `Philippians 4:13 to me` is untouched.

### Doubtful, and what the plugin does with it

A dictated match is *doubtful* unless it says `verse` or `verses`, which stands in for the colon.
`mark one` and `psalm twenty three` are doubtful; `mark one verse two` is not. A match the typed
grammar also makes at exactly the same characters is never dictated, so `jn 3:16` is never doubtful.
The folder and whole-vault commands list the doubtful ones for review before writing; see
`CLAUDE.md`, Feature 4. Nothing dictated is ever rewritten in place: the link's visible text is the
spoken words, or the standard form with *Transform dictated references*. *Standardize references* never changes dictated words.
