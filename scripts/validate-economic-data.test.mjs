import { describe, expect, it } from 'vitest';
import {
  SERIES_CONFIG,
  STOCK_MARKET_COLUMN,
  addMonths,
  monthDiff,
  expectedReleaseWindow,
  compareMonthKeys,
  expandQuarterlyMonths,
  multiplierForUnits,
  parseCsvRow,
  parseCsvNumber,
  computeBuffettRatio,
} from './validate-economic-data.mjs';

// These tests cover the trust-path logic the FRED dashboard relies on:
// month arithmetic (forward-fill / lag), the release-calendar window, the
// quarterly carve-out for the two noisy series, and CSV parsing.

describe('month arithmetic (forward-fill + lag math)', () => {
  it('addMonths walks forward across a year boundary', () => {
    expect(addMonths('2026-01', 2)).toBe('2026-03');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-03', -2)).toBe('2026-01');
  });

  it('monthDiff is the inverse used to compute lag / forward-fill', () => {
    expect(monthDiff('2026-01', '2026-03')).toBe(2);
    expect(monthDiff('2026-03', '2026-01')).toBe(-2);
    // forward-fill is max(0, monthDiff(sourceLatest, csvLatest)); at the boundary
    // sourceLatest === csvLatest yields exactly 0 (no forward-fill).
    expect(monthDiff('2026-05', '2026-05')).toBe(0);
  });
});

describe('release-calendar window — pass vs breach', () => {
  const config = { releaseLagMinMonths: 1, releaseLagMaxMonths: 2 };

  it('derives the expected window from the lag config', () => {
    const w = expectedReleaseWindow(config, '2026-06');
    expect(w.earliestExpected).toBe('2026-04'); // now - maxLag
    expect(w.latestExpected).toBe('2026-05'); // now - minLag
    expect(w.minLag).toBe(1);
    expect(w.maxLag).toBe(2);
  });

  it('flags a breach only when the latest CSV month is before the earliest expected', () => {
    const w = expectedReleaseWindow(config, '2026-06');
    const isBreach = (csvLatest) => compareMonthKeys(csvLatest, w.earliestExpected) < 0;
    expect(isBreach('2026-03')).toBe(true); // stale → breach
    expect(isBreach('2026-04')).toBe(false); // exactly at the edge → pass
    expect(isBreach('2026-05')).toBe(false); // fresh → pass
  });
});

describe('quarterly carve-out for the noisy series', () => {
  const stock = SERIES_CONFIG.find((c) => c.column === STOCK_MARKET_COLUMN);
  const debt = SERIES_CONFIG.find((c) => c.column === 'National Debt (b)');

  it('Stock Market (b) is a quarterly series that only warns on a stale release window', () => {
    expect(stock.cadence).toBe('quarterly');
    expect(stock.maxForwardFillMonths).toBe(2);
    expect(stock.releaseWindowSeverity).toBe('warn');
  });

  it('National Debt (b) is quarterly with a 2-month forward-fill allowance', () => {
    expect(debt.cadence).toBe('quarterly');
    expect(debt.maxForwardFillMonths).toBe(2);
  });

  it('expandQuarterlyMonths forward-fills the two months after each quarterly print', () => {
    const expanded = expandQuarterlyMonths(new Map([['2026-01', 42]]));
    expect(expanded.get('2026-01')).toBe(42);
    expect(expanded.get('2026-02')).toBe(42);
    expect(expanded.get('2026-03')).toBe(42);
    expect(expanded.has('2026-04')).toBe(false);
  });
});

describe('CSV parsing primitives', () => {
  it('parseCsvRow respects quoted fields containing commas', () => {
    expect(parseCsvRow('a,"b,c",d')).toEqual(['a', 'b,c', 'd']);
  });

  it('parseCsvNumber treats blank cells as missing, not zero', () => {
    expect(parseCsvNumber('')).toBeNull();
    expect(parseCsvNumber('   ')).toBeNull();
    expect(parseCsvNumber('3.5')).toBe(3.5);
  });

  it('multiplierForUnits scales billions/millions/trillions correctly', () => {
    expect(multiplierForUnits('billions')).toBe(1);
    expect(multiplierForUnits('millions')).toBe(0.001);
    expect(multiplierForUnits('trillions')).toBe(1000);
  });
});

describe('Buffett ratio — a missing input must never publish as 0', () => {
  it('returns null when the stock-market cell is blank (the misleading-0 bug)', () => {
    // parseCsvNumber('') is null, not Number('') === 0. Guard against a blank
    // stock cell surfacing as a real-looking 0% market-cap-to-GDP ratio.
    expect(computeBuffettRatio(31865.721, parseCsvNumber(''))).toBeNull();
    expect(computeBuffettRatio(31865.721, null)).toBeNull();
  });

  it('returns null when GDP is missing or non-positive', () => {
    expect(computeBuffettRatio(null, 69511.628)).toBeNull();
    expect(computeBuffettRatio(0, 69511.628)).toBeNull();
    expect(computeBuffettRatio(-1, 69511.628)).toBeNull();
  });

  it('computes the ratio as a percentage, rounded to 4 dp, when both are present', () => {
    expect(computeBuffettRatio(100, 200)).toBe(200);
    expect(computeBuffettRatio(31865.721, 69511.628)).toBe(218.1392);
  });
});
