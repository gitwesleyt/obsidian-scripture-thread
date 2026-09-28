import { describe, expect, it } from 'vitest';
import { verseLinkOpener } from './opens-block';

const opens = verseLinkOpener('Journal/2026-09-28.md');

describe('verseLinkOpener', () => {
	it('opens on a verse, range or chapter link, with or without an alias', () => {
		expect(opens('[[John 3 16|John 3:16]] is the one.')).toBe(true);
		expect(opens('see [[John 3 16-18]]')).toBe(true);
		expect(opens('[[Psalms 23]]')).toBe(true);
		expect(opens('[[Matthew 5-7|Sermon]]')).toBe(true);
		expect(opens('[[John 3 16#Notes]]')).toBe(true);
	});

	it('does not open on book or testament links, other notes, or plain text', () => {
		expect(opens('[[Psalms]] and [[Old Testament]]')).toBe(false);
		expect(opens('[[Shopping list]]')).toBe(false);
		expect(opens('John 3:16, not yet converted')).toBe(false);
	});

	it('does not open on an embed', () => {
		expect(opens('![[John 3 16]]')).toBe(false);
		expect(opens('![[John 3 16]] and [[John 3 17]]')).toBe(true);
	});

	it('does not open on the parent link inside a verse note', () => {
		const inVerseNote = verseLinkOpener('Bible/New Testament/John 3 16.md');
		expect(inVerseNote('[[John 3]]')).toBe(false);
		expect(inVerseNote('[[Romans 8 28]] belongs with this one')).toBe(true);
		expect(inVerseNote('[[Romans 8]]')).toBe(true);
	});
});
