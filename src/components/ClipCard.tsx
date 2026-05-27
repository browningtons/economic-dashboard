import React, { useCallback, useRef, useState } from 'react';
import { ExternalLink, Eye, Calendar, Globe, Twitter, Instagram, Download, Loader2, Check, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
import Card from './Card';
import ClipChart from './ClipChart';
import ClipChartDonut from './ClipChartDonut';
import ClipChartStat from './ClipChartStat';
import ClipChartTimeSeries from './ClipChartTimeSeries';
import type { Clip } from '../types/clips';

export type ClipViewMode = 'web' | 'twitter' | 'ig-square' | 'ig-portrait' | 'ig-story';

interface ClipCardProps {
  clip: Clip;
  defaultViewMode?: ClipViewMode;
  highlighted?: boolean;
}

const PLATFORM_LABEL: Record<string, string> = {
  twitter: 'Twitter',
  x: 'X',
  threads: 'Threads',
  bluesky: 'Bluesky',
  mastodon: 'Mastodon',
  reddit: 'Reddit',
  article: 'Article',
  other: 'Link',
};

const formatViews = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

const formatObservedDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const safeHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

interface FrameSpec {
  label: string;
  shortLabel: string;
  hint: string;
  exportWidth: number;
  exportHeight: number;
  previewWidth: number;
  previewHeight: number;
  padding: number;
  titleSize: number;
  subtitleSize: number;
  metaSize: number;
  rowHeight: number;
  labelWidth: number;
  valueWidth: number;
  fontScale: number;
  hideNotes: boolean;
  hideSubtitle: boolean;
  gap: number;
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
}

const FRAME_SPECS: Record<Exclude<ClipViewMode, 'web'>, FrameSpec> = {
  twitter: {
    label: 'Twitter / X',
    shortLabel: 'Twitter',
    hint: '1200 × 675 (16:9). Screenshot the frame to share.',
    exportWidth: 1200,
    exportHeight: 675,
    previewWidth: 600,
    previewHeight: 338,
    padding: 14,
    titleSize: 16,
    subtitleSize: 11,
    metaSize: 10,
    rowHeight: 18,
    labelWidth: 132,
    valueWidth: 62,
    fontScale: 0.72,
    hideNotes: true,
    hideSubtitle: true,
    gap: 6,
    icon: Twitter,
  },
  'ig-square': {
    label: 'Instagram Square',
    shortLabel: 'IG Square',
    hint: '1080 × 1080 (1:1). Screenshot the frame to share.',
    exportWidth: 1080,
    exportHeight: 1080,
    previewWidth: 480,
    previewHeight: 480,
    padding: 20,
    titleSize: 18,
    subtitleSize: 12,
    metaSize: 11,
    rowHeight: 22,
    labelWidth: 150,
    valueWidth: 72,
    fontScale: 0.84,
    hideNotes: true,
    hideSubtitle: false,
    gap: 8,
    icon: Instagram,
  },
  'ig-portrait': {
    label: 'Instagram Portrait',
    shortLabel: 'IG Portrait',
    hint: '1080 × 1350 (4:5). Screenshot the frame to share.',
    exportWidth: 1080,
    exportHeight: 1350,
    previewWidth: 432,
    previewHeight: 540,
    padding: 20,
    titleSize: 18,
    subtitleSize: 12,
    metaSize: 11,
    rowHeight: 24,
    labelWidth: 140,
    valueWidth: 72,
    fontScale: 0.86,
    hideNotes: true,
    hideSubtitle: false,
    gap: 10,
    icon: Instagram,
  },
  'ig-story': {
    label: 'Instagram Story',
    shortLabel: 'IG Story',
    hint: '1080 × 1920 (9:16). Screenshot the frame to share.',
    exportWidth: 1080,
    exportHeight: 1920,
    previewWidth: 360,
    previewHeight: 640,
    padding: 20,
    titleSize: 19,
    subtitleSize: 13,
    metaSize: 11,
    rowHeight: 30,
    labelWidth: 125,
    valueWidth: 70,
    fontScale: 0.86,
    hideNotes: true,
    hideSubtitle: false,
    gap: 12,
    icon: Instagram,
  },
};

interface ViewOption {
  mode: ClipViewMode;
  label: string;
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
}

const VIEW_OPTIONS: ViewOption[] = [
  { mode: 'web', label: 'Web', icon: Globe },
  { mode: 'twitter', label: 'Twitter', icon: Twitter },
  { mode: 'ig-square', label: 'IG 1:1', icon: Instagram },
  { mode: 'ig-portrait', label: 'IG 4:5', icon: Instagram },
  { mode: 'ig-story', label: 'IG 9:16', icon: Instagram },
];

interface FramedClipProps {
  clip: Clip;
  spec: FrameSpec;
  platformLabel: string;
}

const FramedClip = React.memo(
  React.forwardRef<HTMLDivElement, FramedClipProps>(function FramedClip(
    { clip, spec, platformLabel },
    ref,
  ) {
    return (
      <div
        ref={ref}
        data-clip-frame
        className="relative overflow-hidden rounded-2xl border border-theme bg-secondary shadow-lg"
        style={{
          width: spec.previewWidth,
          height: spec.previewHeight,
          padding: spec.padding,
        }}
      >
      <div className="flex h-full flex-col" style={{ gap: spec.gap }}>
        <header className="flex flex-col" style={{ gap: Math.max(4, spec.gap - 4) }}>
          <div
            className="flex flex-wrap items-center text-muted"
            style={{ fontSize: spec.metaSize, gap: 6 }}
          >
            <span
              className="rounded-full border font-semibold uppercase tracking-wider"
              style={{
                color: 'var(--color-brand-accent)',
                borderColor: 'color-mix(in oklab, var(--color-brand-accent) 35%, transparent)',
                backgroundColor:
                  'color-mix(in oklab, var(--color-brand-accent) 10%, var(--color-bg-secondary))',
                padding: '1px 6px',
                fontSize: spec.metaSize,
              }}
            >
              {platformLabel}
            </span>
            <span className="inline-flex items-center" style={{ gap: 4 }}>
              <Calendar size={Math.round(spec.metaSize * 1.1)} aria-hidden />
              {formatObservedDate(clip.observedDate)}
            </span>
            {typeof clip.views === 'number' && (
              <span className="inline-flex items-center" style={{ gap: 4 }}>
                <Eye size={Math.round(spec.metaSize * 1.1)} aria-hidden />
                {formatViews(clip.views)} views
              </span>
            )}
          </div>

          <h3
            className="font-semibold text-main tracking-tight"
            style={{ fontSize: spec.titleSize, lineHeight: 1.2 }}
          >
            {clip.title}
          </h3>
          {!spec.hideSubtitle && clip.subtitle && (
            <p
              className="text-muted"
              style={{ fontSize: spec.subtitleSize, lineHeight: 1.35 }}
            >
              {clip.subtitle}
            </p>
          )}
        </header>

        <div className="flex flex-1 overflow-hidden items-center justify-center">
          {clip.chartType === 'donut' ? (
            <ClipChartDonut
              items={clip.items}
              unitPrefix={clip.unitPrefix}
              unitSuffix={clip.unitSuffix}
              valuePrecision={clip.valuePrecision}
              fontScale={spec.fontScale}
              size={Math.round(spec.previewHeight * 0.42)}
              compact
            />
          ) : clip.chartType === 'stat' ? (
            <ClipChartStat
              items={clip.items}
              unitPrefix={clip.unitPrefix}
              unitSuffix={clip.unitSuffix}
              valuePrecision={clip.valuePrecision}
              fontScale={spec.fontScale}
              compact
            />
          ) : clip.chartType === 'timeSeries' ? (
            <ClipChartTimeSeries
              items={clip.items}
              unitPrefix={clip.unitPrefix}
              unitSuffix={clip.unitSuffix}
              valuePrecision={clip.valuePrecision}
              fontScale={spec.fontScale}
              width={spec.previewWidth - spec.padding * 2}
              height={Math.round(spec.previewHeight * 0.55)}
              compact
            />
          ) : (
            <ClipChart
              items={clip.items}
              unitPrefix={clip.unitPrefix}
              unitSuffix={clip.unitSuffix}
              valuePrecision={clip.valuePrecision}
              rowHeight={spec.rowHeight}
              labelWidth={spec.labelWidth}
              valueWidth={spec.valueWidth}
              fontScale={spec.fontScale}
            />
          )}
        </div>

        {!spec.hideNotes && clip.notes && (
          <p
            className="rounded-md border border-subtle bg-muted-surface/60 text-muted"
            style={{
              fontSize: spec.metaSize,
              lineHeight: 1.4,
              padding: `${Math.max(4, spec.gap - 6)}px ${Math.max(6, spec.gap - 4)}px`,
            }}
          >
            {clip.notes}
          </p>
        )}

        <footer
          className="flex flex-wrap items-center justify-between border-t border-subtle text-muted"
          style={{
            fontSize: spec.metaSize,
            paddingTop: Math.max(4, spec.gap - 6),
            gap: 8,
          }}
        >
          <div className="flex items-center" style={{ gap: 6 }}>
            <span className="font-semibold text-main">{clip.source.label}</span>
            {clip.source.handle && <span className="font-mono">{clip.source.handle}</span>}
          </div>
          {clip.source.url && (
            <span className="font-mono">{safeHostname(clip.source.url)}</span>
          )}
        </footer>
      </div>
    </div>
    );
  }),
);

type ExportState = 'idle' | 'exporting' | 'done' | 'error';
type LinkState = 'idle' | 'copied' | 'error';

const buildPermalink = (clipId: string): string => {
  if (typeof window === 'undefined') {
    return `https://browningtons.github.io/economic-dashboard/clips/${clipId}/`;
  }
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${window.location.origin}${base}clips/${clipId}/`;
};

const ClipCard = React.memo(function ClipCard({ clip, defaultViewMode = 'web', highlighted = false }: ClipCardProps) {
  const [viewMode, setViewMode] = useState<ClipViewMode>(defaultViewMode);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [linkState, setLinkState] = useState<LinkState>('idle');
  const frameRef = useRef<HTMLDivElement | null>(null);
  const platformLabel = PLATFORM_LABEL[clip.source.platform] ?? 'Source';
  const isFramed = viewMode !== 'web';
  const frameSpec = isFramed ? FRAME_SPECS[viewMode] : null;

  const handleCopyLink = useCallback(async () => {
    const url = buildPermalink(clip.id);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setLinkState('copied');
    } catch {
      setLinkState('error');
    }
    window.setTimeout(() => setLinkState('idle'), 1800);
  }, [clip.id]);

  const handleDownload = useCallback(async () => {
    if (!frameRef.current || !frameSpec) return;
    setExportState('exporting');
    try {
      const pixelRatio = frameSpec.exportWidth / frameSpec.previewWidth;
      const dataUrl = await toPng(frameRef.current, {
        pixelRatio,
        cacheBust: true,
        skipFonts: true,
        backgroundColor: '#FFFFFF',
        width: frameSpec.previewWidth,
        height: frameSpec.previewHeight,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${clip.id}-${viewMode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setExportState('done');
      window.setTimeout(() => setExportState('idle'), 1800);
    } catch (err) {
      console.error('Clip export failed:', err);
      setExportState('error');
      window.setTimeout(() => setExportState('idle'), 2500);
    }
  }, [frameSpec, clip.id, viewMode]);

  return (
    <div
      id={`clip-${clip.id}`}
      className={`scroll-mt-6 transition-shadow duration-500 ${
        highlighted ? 'rounded-2xl shadow-[0_0_0_3px_var(--color-brand-primary)]' : ''
      }`}
    >
    <Card className="p-7">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span
                className="rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wider"
                style={{
                  color: 'var(--color-brand-accent)',
                  borderColor: 'color-mix(in oklab, var(--color-brand-accent) 35%, transparent)',
                  backgroundColor:
                    'color-mix(in oklab, var(--color-brand-accent) 10%, var(--color-bg-secondary))',
                }}
              >
                {platformLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} aria-hidden />
                {formatObservedDate(clip.observedDate)}
              </span>
              {typeof clip.views === 'number' && (
                <span className="inline-flex items-center gap-1">
                  <Eye size={12} aria-hidden />
                  {formatViews(clip.views)} views
                </span>
              )}
            </div>

            <div
              className="inline-flex flex-wrap items-center rounded-lg border border-theme bg-muted-surface p-0.5"
              role="tablist"
              aria-label="View selection"
            >
              {VIEW_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = viewMode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setViewMode(opt.mode)}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      isActive
                        ? 'bg-secondary text-main shadow-sm border border-theme'
                        : 'text-muted hover:text-main'
                    }`}
                    title={opt.label}
                  >
                    <Icon size={11} aria-hidden />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <h3 className="text-lg md:text-xl font-semibold text-main tracking-tight">{clip.title}</h3>
          {clip.subtitle && (
            <p className="text-sm leading-relaxed text-muted">{clip.subtitle}</p>
          )}
        </header>

        {isFramed && frameSpec ? (
          <div className="flex flex-col gap-3">
            <div className="flex justify-center rounded-xl bg-muted-surface/40 py-6">
              <FramedClip ref={frameRef} clip={clip} spec={frameSpec} platformLabel={platformLabel} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={exportState === 'exporting'}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  color: 'var(--color-brand-primary)',
                  borderColor: 'color-mix(in oklab, var(--color-brand-primary) 40%, transparent)',
                  backgroundColor:
                    'color-mix(in oklab, var(--color-brand-primary) 12%, var(--color-bg-secondary))',
                }}
              >
                {exportState === 'exporting' && (
                  <>
                    <Loader2 size={12} aria-hidden className="animate-spin" />
                    Rendering…
                  </>
                )}
                {exportState === 'done' && (
                  <>
                    <Check size={12} aria-hidden />
                    Downloaded
                  </>
                )}
                {exportState === 'error' && (
                  <>
                    <AlertCircle size={12} aria-hidden />
                    Export failed — try again
                  </>
                )}
                {exportState === 'idle' && (
                  <>
                    <Download size={12} aria-hidden />
                    Download PNG · {frameSpec.exportWidth}×{frameSpec.exportHeight}
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-muted">
                <span className="font-semibold text-main">{frameSpec.label}</span> · {frameSpec.hint}
                {' · Preview shown at ½ scale; PNG exports at full target resolution.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {clip.chartType === 'donut' ? (
              <ClipChartDonut
                items={clip.items}
                unitPrefix={clip.unitPrefix}
                unitSuffix={clip.unitSuffix}
                valuePrecision={clip.valuePrecision}
              />
            ) : clip.chartType === 'stat' ? (
              <div className="py-6">
                <ClipChartStat
                  items={clip.items}
                  unitPrefix={clip.unitPrefix}
                  unitSuffix={clip.unitSuffix}
                  valuePrecision={clip.valuePrecision}
                />
              </div>
            ) : clip.chartType === 'timeSeries' ? (
              <ClipChartTimeSeries
                items={clip.items}
                unitPrefix={clip.unitPrefix}
                unitSuffix={clip.unitSuffix}
                valuePrecision={clip.valuePrecision}
              />
            ) : (
              <ClipChart
                items={clip.items}
                unitPrefix={clip.unitPrefix}
                unitSuffix={clip.unitSuffix}
                valuePrecision={clip.valuePrecision}
              />
            )}

            {clip.notes && (
              <p className="rounded-md border border-subtle bg-muted-surface/60 px-3 py-2 text-xs leading-relaxed text-muted">
                {clip.notes}
              </p>
            )}
          </>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-main">{clip.source.label}</span>
            {clip.source.handle && <span className="font-mono">{clip.source.handle}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 rounded-md border border-theme bg-muted-surface px-2 py-1 text-xs font-medium text-main hover:bg-secondary"
              title={`Copy permalink: ${buildPermalink(clip.id)}`}
            >
              {linkState === 'copied' ? (
                <>
                  <Check size={12} aria-hidden />
                  Link copied
                </>
              ) : linkState === 'error' ? (
                <>
                  <AlertCircle size={12} aria-hidden />
                  Copy failed
                </>
              ) : (
                <>
                  <LinkIcon size={12} aria-hidden />
                  Copy link
                </>
              )}
            </button>
            {clip.source.url && (
              <a
                href={clip.source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-theme bg-muted-surface px-2 py-1 text-xs font-medium text-link hover:underline"
              >
                View source
                <ExternalLink size={12} aria-hidden />
              </a>
            )}
          </div>
        </footer>
      </div>
    </Card>
    </div>
  );
});

export default ClipCard;
