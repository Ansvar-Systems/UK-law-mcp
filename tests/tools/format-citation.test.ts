import { describe, expect, it } from 'vitest';
import { formatCitationTool } from '../../src/tools/format-citation.js';

describe('format_citation tool', () => {
  it('formats title-first citation input', async () => {
    const response = await formatCitationTool({
      citation: 'Data Protection Act 2018, s. 3',
      format: 'full',
    });
    expect(response.results.valid).toBe(true);
    expect(response.results.formatted).toBe('Section 3, Data Protection Act 2018');
  });

  it('returns invalid response for empty citation', async () => {
    const response = await formatCitationTool({ citation: '' });
    expect(response.results.valid).toBe(false);
    expect(response.results.error).toBe('Empty citation');
  });
});
