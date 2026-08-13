import { describe, expect, it } from 'vitest';
import {
  fallbackWarning,
  isFallbackSource,
  pipelineFreshnessAppliesTo,
  type CsvSource,
} from './dataSource';

const LIVE_SOURCES: CsvSource[] = ['sheet', 'local'];

describe('isFallbackSource', () => {
  it('flags only the bundled literal', () => {
    expect(isFallbackSource('embedded')).toBe(true);
    for (const source of LIVE_SOURCES) {
      expect(isFallbackSource(source)).toBe(false);
    }
  });
});

describe('pipelineFreshnessAppliesTo', () => {
  // The regression this guards: data_status.json can be fresh and PASS while
  // the CSV fetch failed, so the header would otherwise date year-old rows
  // with today's pipeline run.
  it('refuses to attribute pipeline freshness to the embedded snapshot', () => {
    expect(pipelineFreshnessAppliesTo('embedded')).toBe(false);
  });

  it('trusts pipeline freshness for live fetches', () => {
    for (const source of LIVE_SOURCES) {
      expect(pipelineFreshnessAppliesTo(source)).toBe(true);
    }
  });
});

describe('fallbackWarning', () => {
  it('is silent when the data is live', () => {
    for (const source of LIVE_SOURCES) {
      expect(fallbackWarning(source, 'September 2025')).toBeNull();
    }
  });

  it('names the end of the snapshot so the gap is concrete', () => {
    const warning = fallbackWarning('embedded', 'September 2025');
    expect(warning).toContain('Live data could not be loaded');
    expect(warning).toContain('September 2025');
  });

  it('still warns when the last observation is unknown', () => {
    for (const label of [null, undefined, '']) {
      const warning = fallbackWarning('embedded', label);
      expect(warning).toContain('Live data could not be loaded');
      expect(warning).not.toContain('It ends at');
    }
  });
});
