import { describe, expect, it } from 'vitest';

import { convertText, DEFAULT_CONVERSION_OPTIONS } from './convert-text';

describe('live conversion timing', () => {
	it('converts one typed line of a 10,000-line note quickly', () => {
		const lines = Array.from({ length: 10_000 }, (_, index) =>
			index % 3 === 2
				? ''
				: index % 9 === 0
					? 'Thinking about [[John 3 16|John 3:16]] and Ps 23 today.'
					: 'An ordinary line of journal writing.',
		);
		const text = lines.join('\n');
		const typed = [{ from: text.length - 30, to: text.length - 20 }];
		convertText(text, DEFAULT_CONVERSION_OPTIONS, typed);

		const runs = 10;
		const started = performance.now();
		for (let run = 0; run < runs; run++) convertText(text, DEFAULT_CONVERSION_OPTIONS, typed);
		const each = (performance.now() - started) / runs;

		// A guard against getting much slower, not the target. Runs once per line
		// left, not per keystroke; searching the whole note took ~200 ms here.
		expect(each).toBeLessThan(10);
	});
});
