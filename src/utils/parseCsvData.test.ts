import { describe, it, expect } from 'vitest';
import { parseCsvData, parseCsvLine } from './parseCsvData';

const REQUIRED_COLUMNS = ['Observed Date', 'GDP', 'Stock Market (b)'];

describe('parseCsvLine', () => {
  it('splits on commas outside quotes', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('keeps commas inside quoted fields together', () => {
    expect(parseCsvLine('"1,234",b')).toEqual(['1,234', 'b']);
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    expect(parseCsvLine('"say ""hi""",b')).toEqual(['say "hi"', 'b']);
  });
});

describe('parseCsvData', () => {
  it('parses rows into DataPoints and derives the Buffett ratio', () => {
    const csv = [
      'Observed Date,GDP,Stock Market (b)',
      '2024-01-01,25000,45000',
      '2024-02-01,25100,46000',
    ].join('\n');

    const result = parseCsvData(csv, REQUIRED_COLUMNS);

    expect(result.error).toBeNull();
    expect(result.badRowCount).toBe(0);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].date).toBe('2024-01-01');
    expect(result.data[0].buffettValue).toBeCloseTo((45000 / 25000) * 100);
  });

  it('sorts rows chronologically regardless of input order', () => {
    const csv = [
      'Observed Date,GDP,Stock Market (b)',
      '2024-03-01,25200,47000',
      '2024-01-01,25000,45000',
    ].join('\n');

    const result = parseCsvData(csv, REQUIRED_COLUMNS);

    expect(result.data.map((d) => d.date)).toEqual(['2024-01-01', '2024-03-01']);
  });

  it('skips malformed rows and counts them', () => {
    const csv = [
      'Observed Date,GDP,Stock Market (b)',
      '2024-01-01,25000,45000',
      'too,few,columns,here',
      '2024-02-01,25100,46000',
    ].join('\n');

    const result = parseCsvData(csv, REQUIRED_COLUMNS);

    expect(result.error).toBeNull();
    expect(result.badRowCount).toBe(1);
    expect(result.data).toHaveLength(2);
  });

  it('skips a row with an unparseable Observed Date', () => {
    const csv = [
      'Observed Date,GDP,Stock Market (b)',
      'not-a-date,25000,45000',
      '2024-02-01,25100,46000',
    ].join('\n');

    const result = parseCsvData(csv, REQUIRED_COLUMNS);

    expect(result.badRowCount).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it('errors when a required column is missing', () => {
    const csv = ['Observed Date,GDP', '2024-01-01,25000'].join('\n');

    const result = parseCsvData(csv, REQUIRED_COLUMNS);

    expect(result.error).toMatch(/Missing required columns/);
    expect(result.error).toContain('Stock Market (b)');
    expect(result.data).toHaveLength(0);
  });

  it('errors on an empty or header-only CSV', () => {
    const result = parseCsvData('Observed Date,GDP,Stock Market (b)', REQUIRED_COLUMNS);

    expect(result.error).toMatch(/CSV appears empty/);
  });

  it('errors when every row is malformed and nothing survives', () => {
    const csv = ['Observed Date,GDP,Stock Market (b)', 'nope'].join('\n');

    const result = parseCsvData(csv, REQUIRED_COLUMNS);

    expect(result.error).toMatch(/no valid rows were found/);
    expect(result.badRowCount).toBe(1);
  });
});
