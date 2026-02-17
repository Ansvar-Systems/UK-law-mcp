import { describe, expect, it } from 'vitest';
import { parseCitation } from '../../src/citation/parser.js';

describe('parseCitation', () => {
  it('parses section-first citations', () => {
    const parsed = parseCitation('Section 3, Data Protection Act 2018');
    expect(parsed.valid).toBe(true);
    expect(parsed.type).toBe('statute');
    expect(parsed.title).toBe('Data Protection Act');
    expect(parsed.year).toBe(2018);
    expect(parsed.section).toBe('3');
  });

  it('parses short citations with abbreviation', () => {
    const parsed = parseCitation('s. 1(1) DPA 2018');
    expect(parsed.valid).toBe(true);
    expect(parsed.title).toBe('DPA');
    expect(parsed.year).toBe(2018);
    expect(parsed.section).toBe('1');
    expect(parsed.subsection).toBe('1');
  });

  it('parses title-first citations', () => {
    const parsed = parseCitation('Data Protection Act 2018, s. 3');
    expect(parsed.valid).toBe(true);
    expect(parsed.title).toBe('Data Protection Act');
    expect(parsed.year).toBe(2018);
    expect(parsed.section).toBe('3');
  });

  it('returns invalid for unknown formats', () => {
    const parsed = parseCitation('not a legal citation');
    expect(parsed.valid).toBe(false);
    expect(parsed.error).toContain('Could not parse');
  });
});
