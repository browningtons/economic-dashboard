export type ClipPlatform = 'twitter' | 'x' | 'threads' | 'bluesky' | 'mastodon' | 'reddit' | 'article' | 'other';
export type ClipChartType = 'horizontalBar' | 'donut' | 'stat' | 'timeSeries';

export interface ClipSource {
  label: string;
  handle?: string;
  url?: string;
  platform: ClipPlatform;
}

export interface ClipItem {
  label: string;
  value: number;
  flag?: string;
  highlight?: boolean;
}

export interface Clip {
  id: string;
  title: string;
  subtitle?: string;
  source: ClipSource;
  observedDate: string;
  views?: number;
  chartType: ClipChartType;
  unitPrefix?: string;
  unitSuffix?: string;
  valuePrecision?: number;
  items: ClipItem[];
  notes?: string;
  tags?: string[];
  addedAt: string;
}

export interface ClipsFile {
  clips: Clip[];
}
