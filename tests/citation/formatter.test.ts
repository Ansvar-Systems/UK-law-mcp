import { describe, expect, it } from 'vitest';
import { formatCitation } from '../../src/citation/formatter.js';
import { parseCitation } from '../../src/citation/parser.js';

describe('formatCitation', () => {
  it('formats full citation', () => {
    const parsed = parseCitation('Data Protection Act 2018, s. 3');
    expect(parsed.valid).toBe(true);
    expect(formatCitation(parsed, 'full')).toBe('Section 3, Data Protection Act 2018');
  });

  it('formats pinpoint citation', () => {
    const parsed = parseCitation('s. 1(1)(a) Data Protection Act 2018');
    expect(parsed.valid).toBe(true);
    expect(formatCitation(parsed, 'pinpoint')).toBe('s. 1(1)(a)');
  });

  it('returns empty string for invalid parsed citation', () => {
    const parsed = parseCitation('invalid');
    expect(parsed.valid).toBe(false);
    expect(formatCitation(parsed, 'full')).toBe('');
  });
});
