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

export type ReferenceLabelPosition = 'insideTopLeft' | 'insideTop' | 'insideBottom';

export interface ReferenceZone {
  label: string;
  start: string;
  end: string;
  color: string;
  opacity: number;
  labelPos: ReferenceLabelPosition;
}

export interface MetricExtrema {
  minValue: number;
  maxValue: number;
  minTimestamp: number;
  maxTimestamp: number;
}

export interface BuffettLabelPoint {
  key: string;
  timestamp: number;
  value: number;
  label: string;
  color: string;
  position: 'top' | 'bottom' | 'left';
}

export interface BuffettZone {
  label: 'Undervalued' | 'Fair Value' | 'Overvalued' | 'Significantly Overvalued';
  min: number;
  max: number;
  color: string;
  legendRange: string;
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

export interface PipelineReleaseCalendarBreach {
  column: string;
  latestCsvMonth: string | null;
  expectedEarliest: string;
  expectedLatest: string;
  lagMonthsBeyondWindow: number;
  severity?: 'WARN' | 'FAIL' | string;
}

export interface PipelineSeriesStatus {
  column: string;
  seriesId: string;
  status: 'PASS' | 'FAIL' | string;
  csvLatest: string;
  sourceLatest: string;
  lag: number | 'n/a';
  forwardFill: number;
  threshold: number;
  maxAbsDiff: string;
  mismatchCount: number;
  expectedReleaseWindow: string;
  releaseWindowStatus: 'PASS' | 'FAIL' | string;
  releaseWindowGapMonths: number;
}

export interface PipelineStatus {
  generatedAt?: string;
  evaluatedMonth?: string;
  nextScheduledRefreshUtc?: string;
  status?: 'PASS' | 'FAIL' | string;
  failureCount?: number;
  warningCount?: number;
  failedSeriesCount?: number;
  totalSeriesCount?: number;
  latestDataMonth?: string | null;
  latestBuffettRatio?: number | null;
  failures?: string[];
  warnings?: string[];
  topAlerts?: PipelineStatusAlert[];
  releaseCalendarBreaches?: PipelineReleaseCalendarBreach[];
  series?: PipelineSeriesStatus[];
}
