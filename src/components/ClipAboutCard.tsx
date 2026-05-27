import React, { useCallback, useEffect, useState } from 'react';
import { Compass, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { CLIPS_ABOUT } from '../clipsAboutContent';

const COLLAPSED_KEY = 'economic-dashboard:clips-about-collapsed:v1';

const readInitialCollapsed = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
};

const ClipAboutCard = React.memo(function ClipAboutCard() {
  const [collapsed, setCollapsed] = useState<boolean>(() => readInitialCollapsed());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore quota errors */
    }
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <div
      className="rounded-xl border"
      style={{
        borderColor: 'color-mix(in oklab, var(--color-brand-accent) 30%, var(--color-border))',
        backgroundColor:
          'color-mix(in oklab, var(--color-brand-accent) 6%, var(--color-bg-secondary))',
      }}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'color-mix(in oklab, var(--color-brand-accent) 20%, transparent)',
              color: 'var(--color-brand-accent)',
            }}
          >
            <Compass size={16} aria-hidden />
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              About Clips
            </span>
            <span className="text-sm font-semibold text-main">{CLIPS_ABOUT.tagline}</span>
          </div>
        </div>
        <span
          className="inline-flex h-7 items-center gap-1 rounded-md border border-theme bg-muted-surface px-2 text-[11px] font-medium text-muted"
          aria-hidden
        >
          {collapsed ? (
            <>
              <ChevronDown size={12} />
              Read
            </>
          ) : (
            <>
              <ChevronUp size={12} />
              Hide
            </>
          )}
        </span>
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 pt-1">
          <div className="flex flex-col gap-3 border-t border-subtle pt-4 text-sm leading-relaxed text-muted">
            {CLIPS_ABOUT.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {CLIPS_ABOUT.links && CLIPS_ABOUT.links.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Subscribe / explore:
                </span>
                {CLIPS_ABOUT.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-theme bg-muted-surface px-2 py-1 text-xs font-medium text-link hover:underline"
                  >
                    {link.label}
                    <ExternalLink size={11} aria-hidden />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default ClipAboutCard;
