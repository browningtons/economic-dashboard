// Curated bridge between the economic-dashboard CSV and the Clips Remixer.
// Each entry maps a column from public/data/economic_indicators.csv to a
// "ready-to-share" clip configuration: display label, unit prefix/suffix,
// precision, FRED source attribution, and an optional value divisor for
// rescaling raw CSV values (e.g. billions → trillions) before they hit a
// clip's items[] array.

import type { ClipSource } from './types/clips';

export type DashboardRange = '1Y' | '3Y' | '5Y' | 'MAX';
export type DashboardResolution = 'auto' | 'monthly' | 'quarterly' | 'yearly';

export interface DashboardDataSource {
  /** CSV column name as it appears in economic_indicators.csv */
  column: string;
  /** Stable slug used in generated clip ids */
  id: string;
  /** Human-readable display name for the metric dropdown */
  displayLabel: string;
  unitPrefix?: string;
  unitSuffix?: string;
  /** Decimal places to render. */
  valuePrecision: number;
  /** Raw CSV value is divided by this before being stored on the clip
   *  (e.g. 1000 to turn $B → $T). Default is 1. */
  valueDivisor?: number;
  /** Short blurb used as the clip's subtitle, e.g. "The Fed's target rate." */
  subtitle: string;
  /** Source attribution applied to the generated clip. */
  source: ClipSource;
}

export const DASHBOARD_METRICS: DashboardDataSource[] = [
  {
    column: 'Fed Rate',
    id: 'fed-funds-rate',
    displayLabel: 'Fed Funds Rate',
    unitSuffix: '%',
    valuePrecision: 2,
    subtitle: "The Federal Reserve's policy rate.",
    source: {
      label: 'FRED — Federal Reserve',
      handle: 'FEDFUNDS',
      url: 'https://fred.stlouisfed.org/series/FEDFUNDS',
      platform: 'article',
    },
  },
  {
    column: '30 year mortgage',
    id: '30y-mortgage',
    displayLabel: '30-Year Mortgage Rate',
    unitSuffix: '%',
    valuePrecision: 2,
    subtitle: 'Average 30-year fixed mortgage rate in the US.',
    source: {
      label: 'FRED — Federal Reserve',
      handle: 'MORTGAGE30US',
      url: 'https://fred.stlouisfed.org/series/MORTGAGE30US',
      platform: 'article',
    },
  },
  {
    column: 'S&P 500',
    id: 'sp500',
    displayLabel: 'S&P 500',
    valuePrecision: 0,
    subtitle: 'Market-cap index of 500 large US public companies.',
    source: {
      label: 'FRED — S&P Dow Jones Indices',
      handle: 'SP500',
      url: 'https://fred.stlouisfed.org/series/SP500',
      platform: 'article',
    },
  },
  {
    column: 'Unemployment Rate',
    id: 'unemployment-rate',
    displayLabel: 'US Unemployment Rate',
    unitSuffix: '%',
    valuePrecision: 1,
    subtitle: 'Percentage of the labor force without a job and actively looking.',
    source: {
      label: 'FRED — BLS',
      handle: 'UNRATE',
      url: 'https://fred.stlouisfed.org/series/UNRATE',
      platform: 'article',
    },
  },
  {
    column: 'Job Openings',
    id: 'job-openings',
    displayLabel: 'US Job Openings',
    unitSuffix: 'M',
    valuePrecision: 1,
    valueDivisor: 1000,
    subtitle: 'Total non-farm job openings (JOLTS), in millions.',
    source: {
      label: 'FRED — BLS JOLTS',
      handle: 'JTSJOL',
      url: 'https://fred.stlouisfed.org/series/JTSJOL',
      platform: 'article',
    },
  },
  {
    column: 'CPI',
    id: 'cpi',
    displayLabel: 'Consumer Price Index (CPI)',
    valuePrecision: 1,
    subtitle: 'The headline inflation gauge tracked by the BLS.',
    source: {
      label: 'FRED — BLS',
      handle: 'CPIAUCSL',
      url: 'https://fred.stlouisfed.org/series/CPIAUCSL',
      platform: 'article',
    },
  },
  {
    column: 'GDP',
    id: 'gdp',
    displayLabel: 'US GDP',
    unitPrefix: '$',
    unitSuffix: 'T',
    valuePrecision: 1,
    valueDivisor: 1000,
    subtitle: 'Gross Domestic Product, in trillions of US dollars.',
    source: {
      label: 'FRED — BEA',
      handle: 'GDP',
      url: 'https://fred.stlouisfed.org/series/GDP',
      platform: 'article',
    },
  },
  {
    column: 'National Debt (b)',
    id: 'national-debt',
    displayLabel: 'US National Debt',
    unitPrefix: '$',
    unitSuffix: 'T',
    valuePrecision: 1,
    valueDivisor: 1000,
    subtitle: 'Total US Federal debt outstanding, in trillions of dollars.',
    source: {
      label: 'FRED — US Treasury',
      handle: 'GFDEBTN',
      url: 'https://fred.stlouisfed.org/series/GFDEBTN',
      platform: 'article',
    },
  },
  {
    column: 'Stock Market (b)',
    id: 'us-stock-market',
    displayLabel: 'US Stock Market Total Value',
    unitPrefix: '$',
    unitSuffix: 'T',
    valuePrecision: 1,
    valueDivisor: 1000,
    subtitle: 'Total market capitalization of US-listed equities, in trillions.',
    source: {
      label: 'FRED — Federal Reserve / Monthly CSV',
      handle: 'NCBCEL',
      url: 'https://fred.stlouisfed.org/series/NCBCEL',
      platform: 'article',
    },
  },
  {
    column: '10Y Treasury',
    id: '10y-treasury',
    displayLabel: '10-Year Treasury Yield',
    unitSuffix: '%',
    valuePrecision: 2,
    subtitle: 'Constant-maturity yield on the 10-year US Treasury.',
    source: {
      label: 'FRED — US Treasury',
      handle: 'DGS10',
      url: 'https://fred.stlouisfed.org/series/DGS10',
      platform: 'article',
    },
  },
  {
    column: 'Consumer Sentiment',
    id: 'consumer-sentiment',
    displayLabel: 'Consumer Sentiment',
    valuePrecision: 1,
    subtitle: 'University of Michigan Consumer Sentiment Index.',
    source: {
      label: 'FRED — U. Michigan',
      handle: 'UMCSENT',
      url: 'https://fred.stlouisfed.org/series/UMCSENT',
      platform: 'article',
    },
  },
  {
    column: 'Housing Price Index',
    id: 'housing-price-index',
    displayLabel: 'US Home Price Index',
    valuePrecision: 1,
    subtitle: 'Case-Shiller US National Home Price Index.',
    source: {
      label: 'FRED — S&P CoreLogic',
      handle: 'CSUSHPINSA',
      url: 'https://fred.stlouisfed.org/series/CSUSHPINSA',
      platform: 'article',
    },
  },
];

export const RANGE_LABELS: Record<DashboardRange, string> = {
  '1Y': 'Last 12 Months',
  '3Y': 'Last 3 Years',
  '5Y': 'Last 5 Years',
  MAX: 'Since 2020',
};

export const RANGE_MONTHS: Record<DashboardRange, number | null> = {
  '1Y': 12,
  '3Y': 36,
  '5Y': 60,
  MAX: null,
};

interface DashboardCsvRow {
  date: Date;
  iso: string;
  values: Record<string, number | undefined>;
}

const DASHBOARD_CSV_URL = `${import.meta.env.BASE_URL}data/economic_indicators.csv`;

let cachedRowsPromise: Promise<DashboardCsvRow[]> | null = null;

const parseLine = (line: string): string[] => {
  // The dashboard CSV has no quoted fields with commas, but be safe.
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
};

const toIso = (date: Date): string => date.toISOString().slice(0, 10);

export async function fetchDashboardRows(): Promise<DashboardCsvRow[]> {
  if (cachedRowsPromise) return cachedRowsPromise;
  cachedRowsPromise = (async () => {
    const res = await fetch(DASHBOARD_CSV_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not load dashboard CSV (status ${res.status}).`);
    const text = await res.text();
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 2) throw new Error('Dashboard CSV is empty.');
    const headers = parseLine(lines[0]);
    const rows: DashboardCsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = parseLine(lines[i]);
      const rec: Record<string, number | undefined> = {};
      let rowDate: Date | null = null;
      for (let j = 0; j < headers.length; j++) {
        const h = headers[j];
        const raw = (fields[j] ?? '').replace(/^,|,$/g, '');
        if (h === 'Observed Date') {
          if (raw) {
            const d = new Date(raw);
            if (!Number.isNaN(d.getTime())) rowDate = d;
          }
        } else if (raw && !Number.isNaN(Number(raw))) {
          rec[h] = Number(raw);
        }
      }
      if (rowDate) {
        rows.push({ date: rowDate, iso: toIso(rowDate), values: rec });
      }
    }
    rows.sort((a, b) => a.date.getTime() - b.date.getTime());
    return rows;
  })().catch((err) => {
    cachedRowsPromise = null;
    throw err;
  });
  return cachedRowsPromise;
}

export interface GeneratedClipDraft {
  title: string;
  subtitle: string;
  sourceLabel: string;
  sourceHandle: string;
  sourceUrl: string;
  sourcePlatform: ClipSource['platform'];
  observedDate: string;
  chartType: 'timeSeries';
  unitPrefix: string;
  unitSuffix: string;
  valuePrecision: string;
  items: Array<{ label: string; value: number; flag?: string; highlight?: boolean }>;
  notes: string;
  metricId: string;
  range: DashboardRange;
}

const sampleByStride = <T,>(arr: T[], maxPoints: number): T[] => {
  if (arr.length <= maxPoints) return arr;
  const stride = Math.ceil(arr.length / maxPoints);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += stride) out.push(arr[i]);
  // Always include the last point for clean "to today" framing
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
};

const sampleByResolution = <T extends { date: Date }>(
  rows: T[],
  resolution: DashboardResolution,
): T[] => {
  if (resolution === 'auto') return sampleByStride(rows, 15);
  if (resolution === 'monthly') return rows;
  const period = resolution === 'quarterly' ? 3 : 12;
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const y = r.date.getUTCFullYear();
    const m = r.date.getUTCMonth();
    const key = resolution === 'yearly' ? `${y}` : `${y}-${Math.floor(m / period)}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  if (out[out.length - 1] !== rows[rows.length - 1]) out.push(rows[rows.length - 1]);
  return out;
};

export async function generateClipDraftFromDashboard(
  metric: DashboardDataSource,
  range: DashboardRange,
  resolution: DashboardResolution = 'auto',
): Promise<GeneratedClipDraft> {
  const rows = await fetchDashboardRows();
  const months = RANGE_MONTHS[range];

  let filtered = rows.filter((r) => Number.isFinite(r.values[metric.column]));
  if (months !== null) {
    const latest = filtered[filtered.length - 1];
    if (!latest) throw new Error(`No data found for ${metric.displayLabel}.`);
    const cutoff = new Date(latest.date);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - (months - 1));
    filtered = filtered.filter((r) => r.date >= cutoff);
  }

  if (filtered.length < 2) {
    throw new Error(`Not enough data points for ${metric.displayLabel} (${range}).`);
  }

  const sampled = sampleByResolution(filtered, resolution);
  const divisor = metric.valueDivisor ?? 1;

  const items = sampled.map((row, i) => {
    const raw = row.values[metric.column];
    const value = raw !== undefined ? raw / divisor : 0;
    return {
      label: row.iso,
      value,
      highlight: i === sampled.length - 1,
    };
  });

  const firstYear = sampled[0].date.getUTCFullYear();
  const lastDate = sampled[sampled.length - 1].iso;

  const rangeLabel = range === 'MAX' ? `Since ${firstYear}` : RANGE_LABELS[range];
  const title = `${metric.displayLabel} — ${rangeLabel}`;
  const startLabel = sampled[0].date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
  const endLabel = sampled[sampled.length - 1].date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
  const subtitle = `${metric.subtitle} ${startLabel} → ${endLabel}.`;

  return {
    title,
    subtitle,
    sourceLabel: metric.source.label,
    sourceHandle: metric.source.handle ?? '',
    sourceUrl: metric.source.url ?? '',
    sourcePlatform: metric.source.platform,
    observedDate: lastDate,
    chartType: 'timeSeries',
    unitPrefix: metric.unitPrefix ?? '',
    unitSuffix: metric.unitSuffix ?? '',
    valuePrecision: String(metric.valuePrecision),
    items,
    notes: `Auto-imported from the Economic Dashboard CSV (${metric.column}). ${items.length} sampled points.`,
    metricId: metric.id,
    range,
  };
}
