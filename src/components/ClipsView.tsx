import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Card from './Card';
import ClipCard from './ClipCard';
import ClipRemixer from './ClipRemixer';
import type { Clip, ClipsFile } from '../types/clips';

const CLIPS_DATA_URL = `${import.meta.env.BASE_URL}data/clips.json`;

const getDeepLinkClipId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const hint = document.querySelector('meta[name="clip-id"]')?.getAttribute('content');
  if (hint) return hint;
  return window.location.pathname.match(/\/clips\/([^/]+)\/?$/)?.[1] ?? null;
};

const ClipsView = React.memo(function ClipsView() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deepLinkClipId] = useState<string | null>(() => getDeepLinkClipId());

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
          throw new Error(`Could not load saved clips (status ${response.status}).`);
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

  const recentClips = [...clips]
    .sort((a, b) => new Date(b.observedDate).getTime() - new Date(a.observedDate).getTime())
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      {/* Compact header — the page title sits above the Remixer, not a chrome panel */}
      <Card className="p-7">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-theme"
            style={{
              backgroundColor:
                'color-mix(in oklab, var(--color-brand-primary) 10%, var(--color-bg-secondary))',
              color: 'var(--color-brand-primary)',
            }}
          >
            <Sparkles size={20} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-semibold text-main tracking-tight">
              Clip Remix
            </h2>
            <p className="mt-1 text-sm text-muted">
              Paste a data screenshot, a tweet, a story with numbers, or a ready-made JSON —
              and get a chart in the dashboard's look. Download as PNG sized for X / Instagram /
              Stories.
            </p>
          </div>
        </div>
      </Card>

      {/* The Remixer is the front door — always open, no toggle. */}
      <ClipRemixer />

      {/* Small "Recent" strip below — saved examples from public/data/clips.json. */}
      {!isLoading && !error && recentClips.length > 0 && (
        <>
          <div className="flex items-baseline justify-between border-t border-subtle pt-6">
            <h3 className="text-base font-semibold text-main">Recent remixes</h3>
            <span className="text-[11px] text-muted">{clips.length} saved</span>
          </div>
          <div className="flex flex-col gap-6">
            {recentClips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                highlighted={clip.id === deepLinkClipId}
              />
            ))}
          </div>
        </>
      )}

      {error && (
        <Card className="p-7">
          <h3 className="text-base font-semibold text-main">Couldn't load saved clips</h3>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </Card>
      )}
    </div>
  );
});

export default ClipsView;
