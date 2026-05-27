import React from 'react';
import { ExternalLink, Eye, Calendar } from 'lucide-react';
import Card from './Card';
import ClipChart from './ClipChart';
import type { Clip } from '../types/clips';

interface ClipCardProps {
  clip: Clip;
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

const ClipCard = React.memo(function ClipCard({ clip }: ClipCardProps) {
  const platformLabel = PLATFORM_LABEL[clip.source.platform] ?? 'Source';

  return (
    <Card className="p-7">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-2">
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

          <h3 className="text-lg md:text-xl font-semibold text-main tracking-tight">{clip.title}</h3>
          {clip.subtitle && (
            <p className="text-sm leading-relaxed text-muted">{clip.subtitle}</p>
          )}
        </header>

        <ClipChart
          items={clip.items}
          unitPrefix={clip.unitPrefix}
          unitSuffix={clip.unitSuffix}
          valuePrecision={clip.valuePrecision}
        />

        {clip.notes && (
          <p className="rounded-md border border-subtle bg-muted-surface/60 px-3 py-2 text-xs leading-relaxed text-muted">
            {clip.notes}
          </p>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-main">{clip.source.label}</span>
            {clip.source.handle && <span className="font-mono">{clip.source.handle}</span>}
          </div>
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
        </footer>
      </div>
    </Card>
  );
});

export default ClipCard;
