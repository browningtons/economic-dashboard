import type { ElementType } from 'react';

export type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface DataPoint {
  date: string;
  year: number;
  timestamp: number;
  [key: string]: string | number | undefined;
}

export interface MetricConfig {
  id: string;
  label: string;
  sub?: string;
  icon: ElementType;
  color: string;
  desc: string;
  isMacro: boolean;
  format: (val: number) => string;
  isPercentage: boolean;
  category: 'Labor Market' | 'Monetary Policy' | 'Housing' | 'Macro & Markets';
}

export interface DataSourceInfo {
  provider: string;
  seriesId: string;
  url: string;
  note?: string;
  cadence?: Cadence;
}

export interface PipelineStatusAlert {
  type: string;
  column: string;
  month: string;
  details: string;
}

export interface PipelineStatus {
  generatedAt?: string;
  nextScheduledRefreshUtc?: string;
  status?: 'PASS' | 'FAIL' | string;
  failureCount?: number;
  failedSeriesCount?: number;
  totalSeriesCount?: number;
  latestDataMonth?: string | null;
  latestBuffettRatio?: number | null;
  failures?: string[];
  topAlerts?: PipelineStatusAlert[];
}
