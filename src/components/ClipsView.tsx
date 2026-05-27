import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bookmark, Filter, ChevronRight, X as XIcon, Tag } from 'lucide-react';
import Card from './Card';
import ClipCard from './ClipCard';
import ClipRemixer from './ClipRemixer';
import type { Clip, ClipsFile } from '../types/clips';

const CLIPS_DATA_URL = `${import.meta.env.BASE_URL}data/clips.json`;

type SortKey = 'newest' | 'oldest';

const getDeepLinkClipId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const hint = document.querySelector('meta[name="clip-id"]')?.getAttribute('content');
  if (hint) return hint;
  return window.location.pathname.match(/\/clips\/([^/]+)\/?$/)?.[1] ?? null;
};

const getInitialTagFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const tag = params.get('tag');
  return tag ? tag.toLowerCase() : null;
};

const updateTagInUrl = (tag: string | null) => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (tag) url.searchParams.set('tag', tag);
  else url.searchParams.delete('tag');
  window.history.replaceState({}, '', url.toString());
};

const ClipsView = React.memo(function ClipsView() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [activeTag, setActiveTagState] = useState<string | null>(() => getInitialTagFromUrl());
  const [remixerOpen, setRemixerOpen] = useState(false);
  const [deepLinkClipId] = useState<string | null>(() => getDeepLinkClipId());

  const setActiveTag = useCallback((tag: string | null) => {
    setActiveTagState(tag);
    updateTagInUrl(tag);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setActiveTagState((current) => {
      const next = current === tag ? null : tag;
      updateTagInUrl(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!deepLinkClipId || isLoading) return;
    const node = document.getElementById(`clip-${deepLinkClipId}`);
    if (!node) return;
    const id = window.setTimeout(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(id);
  }, [deepLinkClipId, isLoading]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(CLIPS_DATA_URL, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Could not load clips (status ${response.status}).`);
        }
        const payload = (await response.json()) as ClipsFile;
        if (cancelled) return;
        setClips(Array.isArray(payload.clips) ? payload.clips : []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error loading clips.');
          setClips([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const platformOptions = useMemo(() => {
    const set = new Set<string>();
    clips.forEach((c) => set.add(c.source.platform));
    return ['all', ...Array.from(set)];
  }, [clips]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const clip of clips) {
      for (const tag of clip.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) =>
      b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0]),
    );
  }, [clips]);

  const visibleClips = useMemo(() => {
    let result = clips;
    if (platformFilter !== 'all') {
      result = result.filter((c) => c.source.platform === platformFilter);
    }
    if (activeTag) {
      result = result.filter((c) => c.tags?.includes(activeTag));
    }
    const sorted = [...result].sort((a, b) => {
      const aTime = new Date(a.observedDate).getTime();
      const bTime = new Date(b.observedDate).getTime();
      return sortKey === 'newest' ? bTime - aTime : aTime - bTime;
    });
    return sorted;
  }, [clips, sortKey, platformFilter, activeTag]);

  return (
    <div className="flex flex-col gap-6">
      {/* Section header */}
      <Card className="p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-theme"
              style={{
                backgroundColor:
                  'color-mix(in oklab, var(--color-brand-primary) 10%, var(--color-bg-secondary))',
                color: 'var(--color-brand-primary)',
              }}
            >
              <Bookmark size={20} aria-hidden />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-main tracking-tight">Clips</h2>
              <p className="mt-1 text-sm text-muted">
                A running list of interesting data clips collected from Twitter / X and elsewhere —
                remixed to match the dashboard's look.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-lg border border-theme bg-muted-surface p-1 text-xs">
              <Filter size={12} className="ml-1 text-muted" aria-hidden />
              <select
                aria-label="Filter by platform"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="bg-transparent px-2 py-1 text-xs font-medium text-main focus:outline-none"
              >
                {platformOptions.map((p) => (
                  <option key={p} value={p}>
                    {p === 'all' ? 'All platforms' : p}
                  </option>
                ))}
              </select>
              <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />
              <select
                aria-label="Sort clips"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="bg-transparent px-2 py-1 text-xs font-medium text-main focus:outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setRemixerOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                color: 'var(--color-brand-primary)',
                borderColor: 'color-mix(in oklab, var(--color-brand-primary) 40%, transparent)',
                backgroundColor:
                  'color-mix(in oklab, var(--color-brand-primary) 12%, var(--color-bg-secondary))',
              }}
              aria-expanded={remixerOpen}
            >
              <ChevronRight
                size={14}
                aria-hidden
                style={{ transform: remixerOpen ? 'rotate(90deg)' : 'rotate(0)' }}
              />
              {remixerOpen ? 'Hide remixer' : 'Remix a new clip'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 border-t border-subtle pt-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: 'var(--color-brand-primary)' }}
            />
            {clips.length} clip{clips.length === 1 ? '' : 's'} total
          </span>
          {clips.length > 0 && (
            <span>
              Latest:{' '}
              {new Date(
                clips.reduce(
                  (max, c) => Math.max(max, new Date(c.observedDate).getTime() || 0),
                  0,
                ),
              ).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
      </Card>

      {tagCounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Filter by tag">
          <Tag size={12} className="text-muted" aria-hidden />
          <span className="mr-1 text-[11px] uppercase tracking-wider text-muted">
            Filter by tag
          </span>
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-secondary"
            style={
              activeTag === null
                ? {
                    color: 'var(--color-brand-primary)',
                    borderColor:
                      'color-mix(in oklab, var(--color-brand-primary) 40%, transparent)',
                    backgroundColor:
                      'color-mix(in oklab, var(--color-brand-primary) 12%, var(--color-bg-secondary))',
                  }
                : {
                    color: 'var(--color-text-muted)',
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)',
                  }
            }
          >
            All ({clips.length})
          </button>
          {tagCounts.map(([tag, count]) => {
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-secondary"
                style={
                  isActive
                    ? {
                        color: 'var(--color-brand-primary)',
                        borderColor:
                          'color-mix(in oklab, var(--color-brand-primary) 40%, transparent)',
                        backgroundColor:
                          'color-mix(in oklab, var(--color-brand-primary) 12%, var(--color-bg-secondary))',
                      }
                    : {
                        color: 'var(--color-text-muted)',
                        borderColor: 'var(--color-border)',
                        backgroundColor: 'var(--color-bg-secondary)',
                      }
                }
              >
                #{tag} <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
          {activeTag && (
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="inline-flex items-center gap-1 rounded-full border border-theme bg-muted-surface px-2 py-0.5 text-[11px] font-medium text-muted hover:text-main"
              title="Clear tag filter"
            >
              <XIcon size={10} aria-hidden />
              Clear
            </button>
          )}
        </div>
      )}

      {remixerOpen && <ClipRemixer />}

      {/* Clip list */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-secondary border border-theme/70 rounded-xl p-7 shadow-sm space-y-3"
            >
              <div className="skeleton h-5 w-32" />
              <div className="skeleton h-7 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-64 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Card className="p-7">
          <h3 className="text-base font-semibold text-main">Couldn't load clips</h3>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </Card>
      ) : visibleClips.length === 0 ? (
        <Card className="p-7">
          <h3 className="text-base font-semibold text-main">No clips match these filters</h3>
          <p className="mt-1 text-sm text-muted">
            Try a different platform or clear the filter. Or open the remixer above to add the first
            clip.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {visibleClips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              highlighted={clip.id === deepLinkClipId}
              activeTag={activeTag}
              onTagClick={toggleTag}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default ClipsView;
