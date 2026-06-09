import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Trash2, Copy, Check, Sparkles, RotateCcw, Save, FileDown, BarChartHorizontal, PieChart, Hash, LineChart } from 'lucide-react';
import Card from './Card';
import ClipCard from './ClipCard';
import type { Clip, ClipItem, ClipChartType, ClipPlatform } from '../types/clips';

const DRAFT_KEY = 'economic-dashboard:clip-remix-draft:v1';

const PLATFORMS: { value: ClipPlatform; label: string }[] = [
  { value: 'x', label: 'X / Twitter' },
  { value: 'twitter', label: 'Twitter (legacy)' },
  { value: 'threads', label: 'Threads' },
  { value: 'bluesky', label: 'Bluesky' },
  { value: 'mastodon', label: 'Mastodon' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'article', label: 'Article / Blog' },
  { value: 'other', label: 'Other' },
];

interface DraftState {
  title: string;
  subtitle: string;
  sourceLabel: string;
  sourceHandle: string;
  sourceUrl: string;
  platform: ClipPlatform;
  observedDate: string;
  views: string;
  chartType: ClipChartType;
  unitPrefix: string;
  unitSuffix: string;
  valuePrecision: string;
  items: ClipItem[];
  notes: string;
}

const CHART_TYPES: { value: ClipChartType; label: string; description: string; icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }> }[] = [
  {
    value: 'horizontalBar',
    label: 'Horizontal bar',
    description: 'Ranked list (best for top-10 style clips)',
    icon: BarChartHorizontal,
  },
  {
    value: 'donut',
    label: 'Donut',
    description: 'Share of total / composition breakdown',
    icon: PieChart,
  },
  {
    value: 'stat',
    label: 'Stat card',
    description: 'One headline number with supporting context',
    icon: Hash,
  },
  {
    value: 'timeSeries',
    label: 'Time series',
    description: 'Line chart of a metric over time (label = date, value = metric)',
    icon: LineChart,
  },
];

const EMPTY_DRAFT: DraftState = {
  title: '',
  subtitle: '',
  sourceLabel: '',
  sourceHandle: '',
  sourceUrl: '',
  platform: 'x',
  observedDate: new Date().toISOString().slice(0, 10),
  views: '',
  chartType: 'horizontalBar',
  unitPrefix: '$',
  unitSuffix: 'T',
  valuePrecision: '1',
  items: [
    { label: '', value: 0, flag: '', highlight: false },
    { label: '', value: 0, flag: '', highlight: false },
  ],
  notes: '',
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const buildClipFromDraft = (draft: DraftState): Clip => {
  const today = new Date().toISOString().slice(0, 10);
  const titleSlug = slugify(draft.title || 'clip');
  const id = `${titleSlug}-${draft.observedDate || today}`;
  const precision = Math.max(0, Math.min(4, parseInt(draft.valuePrecision, 10) || 0));
  const items: ClipItem[] = draft.items
    .filter((it) => it.label.trim().length > 0)
    .map((it) => ({
      label: it.label.trim(),
      value: Number(it.value) || 0,
      flag: it.flag?.trim() || undefined,
      highlight: it.highlight || undefined,
    }));

  const viewsNum = parseInt(draft.views.replace(/[,_\s]/g, ''), 10);

  return {
    id,
    title: draft.title.trim() || '(untitled clip)',
    subtitle: draft.subtitle.trim() || undefined,
    source: {
      label: draft.sourceLabel.trim() || 'Unknown',
      handle: draft.sourceHandle.trim() || undefined,
      url: draft.sourceUrl.trim() || undefined,
      platform: draft.platform,
    },
    observedDate: draft.observedDate || today,
    views: Number.isFinite(viewsNum) && viewsNum > 0 ? viewsNum : undefined,
    chartType: draft.chartType ?? 'horizontalBar',
    unitPrefix: draft.unitPrefix || undefined,
    unitSuffix: draft.unitSuffix || undefined,
    valuePrecision: precision,
    items: items.length > 0 ? items : [{ label: 'Sample', value: 1 }],
    notes: draft.notes.trim() || undefined,
    addedAt: today,
  };
};

/**
 * Smart-paste: accept any of
 *   1. A full Clip JSON (from an AI tool that used CLIP_EXTRACTION_PROMPT)
 *   2. A bare items[] array
 *   3. Plain text (tweet, ranked list, story with numbers) — falls back to
 *      a regex parse that handles "1. USA: $78 trillion" / "USA — 78" lines
 *
 * Returns a partial DraftState patch on success, or { error } on failure.
 */
const parseSmartPaste = (
  raw: string,
): { patch: Partial<DraftState>; summary: string } | { error: string } => {
  const trimmed = raw.trim();
  if (!trimmed) return { error: 'Paste something first.' };

  // 1) Try JSON — either a full Clip object or an items[] array
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const fromClip = (c: Partial<Clip>): Partial<DraftState> => ({
        title: c.title ?? undefined,
        subtitle: c.subtitle ?? undefined,
        sourceLabel: c.source?.label ?? undefined,
        sourceHandle: c.source?.handle ?? undefined,
        sourceUrl: c.source?.url ?? undefined,
        platform: c.source?.platform ?? undefined,
        observedDate: c.observedDate ?? undefined,
        views: typeof c.views === 'number' ? String(c.views) : undefined,
        chartType: c.chartType ?? undefined,
        unitPrefix: c.unitPrefix ?? undefined,
        unitSuffix: c.unitSuffix ?? undefined,
        valuePrecision:
          typeof c.valuePrecision === 'number' ? String(c.valuePrecision) : undefined,
        items: Array.isArray(c.items) && c.items.length > 0 ? c.items : undefined,
        notes: c.notes ?? undefined,
      });
      // Strip undefined keys so the existing fields stay
      const cleanPatch = (p: Partial<DraftState>): Partial<DraftState> =>
        Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as Partial<DraftState>;

      if (Array.isArray(parsed)) {
        const items = parsed
          .filter((it) => it && typeof it === 'object' && 'label' in it && 'value' in it)
          .map((it: Partial<ClipItem>) => ({
            label: String(it.label ?? ''),
            value: Number(it.value) || 0,
            flag: it.flag,
            highlight: it.highlight,
            unitPrefix: it.unitPrefix,
            unitSuffix: it.unitSuffix,
            valuePrecision: it.valuePrecision,
          }));
        if (items.length === 0) return { error: 'JSON array contained no valid items.' };
        return {
          patch: { items },
          summary: `Loaded ${items.length} item${items.length === 1 ? '' : 's'} from JSON array.`,
        };
      }

      if (parsed && typeof parsed === 'object') {
        const patch = cleanPatch(fromClip(parsed));
        if (Object.keys(patch).length === 0) {
          return { error: 'JSON object didn\'t contain any recognised clip fields.' };
        }
        return {
          patch,
          summary: `Loaded ${Object.keys(patch).length} field${Object.keys(patch).length === 1 ? '' : 's'} from JSON.`,
        };
      }
    } catch (e) {
      return { error: `JSON parse failed: ${e instanceof Error ? e.message : 'unknown error'}.` };
    }
  }

  // 2) Fall back to the tweet/text regex parser
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { error: 'No lines to parse.' };

  let title = '';
  let subtitle = '';
  const items: ClipItem[] = [];
  // Require the number to be the *last* meaningful token on the line —
  // otherwise things like "12-Month Low" get mis-parsed as items.
  const itemPattern = /^(?:\d+\.\s*)?(?:([\p{Extended_Pictographic}\p{So}\p{Sk}]+)\s+)?(.+?)[:\s—–-]+\$?\s*([\d.,]+)\s*(?:trillion|billion|million|T|B|M)?\s*$/iu;

  for (const line of lines) {
    const m = line.match(itemPattern);
    if (m && Number.isFinite(parseFloat(m[3].replace(/,/g, '')))) {
      items.push({
        label: m[2].trim(),
        value: parseFloat(m[3].replace(/,/g, '')),
        flag: m[1]?.trim() || undefined,
        highlight: false,
      });
    } else if (!title) {
      title = line;
    } else if (!subtitle && !/^Top\b/i.test(line)) {
      subtitle = line;
    }
  }

  if (items.length === 0 && !title) {
    return { error: 'Couldn\'t find a title or any "Label: number" lines.' };
  }

  return {
    patch: {
      ...(title ? { title } : {}),
      ...(subtitle ? { subtitle } : {}),
      ...(items.length > 0 ? { items } : {}),
    },
    summary: `Parsed ${items.length} item${items.length === 1 ? '' : 's'}${title ? ' + title' : ''}${subtitle ? ' + subtitle' : ''}.`,
  };
};

const CLIP_EXTRACTION_PROMPT = `You're extracting a data visualization into JSON for the Golden Data Clip Remixer. I'll paste an image, a tweet, or a story with numbers. Return ONLY this JSON, no commentary, no markdown fences:

{
  "title": "headline, ≤60 chars",
  "subtitle": "optional context line",
  "source": {
    "label": "publisher, e.g. World of Statistics",
    "handle": "@username (optional)",
    "url": "https://... (optional)",
    "platform": "x | twitter | threads | bluesky | mastodon | reddit | article | other"
  },
  "observedDate": "YYYY-MM-DD",
  "chartType": "horizontalBar | donut | stat | timeSeries",
  "unitPrefix": "e.g. $ (optional)",
  "unitSuffix": "e.g. T, %, B (optional)",
  "valuePrecision": 0,
  "items": [
    {
      "label": "USA",
      "value": 78.0,
      "flag": "🇺🇸",
      "highlight": true,
      "unitPrefix": "+",
      "unitSuffix": "%",
      "valuePrecision": 0
    }
  ],
  "notes": "optional analyst take"
}

CHART TYPE GUIDANCE
- horizontalBar — ranked lists (top-N countries / companies)
- donut         — share of total / composition / "split of N"
- stat          — ONE big number with up to 3 supporting context numbers. Mark the headline item with "highlight": true. Mix units via per-item unitPrefix/unitSuffix overrides.
- timeSeries    — a single metric over time. items[].label is a date string (YYYY-MM-DD), items[].value is the number. Mark the most recent point with "highlight": true.

ITEMS
- Preserve order and ranking from the source.
- Mark exactly ONE item with "highlight": true — the "subject" of the chart (the one being featured).
- Per-item unit overrides let you mix units inside one chart (e.g. "$35T" headline + "+97%" supporting stat).
- Drop fields you don't need; only label + value are required.

Now, the input:
`;

const loadDraft = (): DraftState => {
  if (typeof window === 'undefined') return EMPTY_DRAFT;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<DraftState>;
    return { ...EMPTY_DRAFT, ...parsed, items: parsed.items?.length ? parsed.items : EMPTY_DRAFT.items };
  } catch {
    return EMPTY_DRAFT;
  }
};

const ClipRemixer = React.memo(function ClipRemixer() {
  const [draft, setDraft] = useState<DraftState>(() => loadDraft());
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [pasteStatus, setPasteStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  // Auto-save draft to localStorage (debounced via setTimeout in effect)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* ignore quota errors */
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [draft]);

  const previewClip = useMemo(() => buildClipFromDraft(draft), [draft]);

  const jsonOutput = useMemo(() => JSON.stringify(previewClip, null, 2), [previewClip]);

  const update = useCallback((patch: Partial<DraftState>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateItem = useCallback((idx: number, patch: Partial<ClipItem>) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  }, []);

  const addItem = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      items: [...prev.items, { label: '', value: 0, flag: '', highlight: false }],
    }));
  }, []);

  const removeItem = useCallback((idx: number) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== idx) : prev.items,
    }));
  }, []);

  const setHighlight = useCallback((idx: number) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => ({ ...it, highlight: i === idx ? !it.highlight : false })),
    }));
  }, []);

  const reset = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Discard the current draft? This cannot be undone.')
    ) {
      return;
    }
    setDraft(EMPTY_DRAFT);
    setSavedAt(null);
  }, []);

  const saveDraftNow = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setSavedAt(new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }));
    } catch {
      setSavedAt('save failed');
    }
  }, [draft]);

  const handleCopy = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(jsonOutput);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      /* ignore — fallback handled via the textarea */
    }
  }, [jsonOutput]);

  const handleDownload = useCallback(() => {
    if (typeof window === 'undefined') return;
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${previewClip.id || 'clip'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [jsonOutput, previewClip.id]);

  const handleApplyPaste = useCallback(() => {
    const result = parseSmartPaste(pasteText);
    if ('error' in result) {
      setPasteStatus({ kind: 'err', msg: result.error });
      return;
    }
    setDraft((prev) => ({ ...prev, ...result.patch }));
    setPasteStatus({ kind: 'ok', msg: result.summary });
    setPasteText('');
    window.setTimeout(() => setPasteStatus(null), 4000);
  }, [pasteText]);

  const handleCopyPrompt = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(CLIP_EXTRACTION_PROMPT);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 1500);
    } catch {
      /* fall through */
    }
  }, []);

  const fieldClass =
    'w-full rounded-md border border-theme bg-secondary px-3 py-1.5 text-sm text-main placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-link)]/40';
  const labelClass = 'block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1';

  return (
    <Card className="p-7">
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <Sparkles size={12} aria-hidden />
              Remix tool
            </div>
            <h3 className="mt-1 text-lg md:text-xl font-semibold text-main tracking-tight">
              Drop your data, get a branded chart
            </h3>
            <p className="mt-1 text-sm text-muted">
              Paste JSON from an AI tool, a tweet's text, or any "Label: number" list —
              the form below auto-fills, the live preview updates, and you can download
              a PNG sized for X / Instagram / Stories.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveDraftNow}
              className="inline-flex items-center gap-1.5 rounded-md border border-theme bg-muted-surface px-3 py-1.5 text-xs font-medium text-main hover:bg-secondary"
              title="Drafts auto-save, this just confirms a save"
            >
              <Save size={12} aria-hidden />
              {savedAt ? `Saved ${savedAt}` : 'Save draft'}
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-md border border-theme bg-muted-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-main"
            >
              <RotateCcw size={12} aria-hidden />
              Reset
            </button>
          </div>
        </header>

        {/* Smart paste — the front door */}
        <div
          className="flex flex-col gap-3 rounded-xl border p-4"
          style={{
            borderColor: 'color-mix(in oklab, var(--color-brand-primary) 30%, var(--color-border))',
            backgroundColor:
              'color-mix(in oklab, var(--color-brand-primary) 6%, var(--color-bg-secondary))',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-brand-primary)' }}>
              Smart paste
            </span>
            <button
              type="button"
              onClick={() => setShowAiPrompt((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-theme bg-secondary px-2 py-1 text-[11px] font-medium text-main hover:bg-muted-surface"
              aria-expanded={showAiPrompt}
            >
              <Sparkles size={11} aria-hidden />
              {showAiPrompt ? 'Hide AI prompt' : 'Use Claude / ChatGPT to extract'}
            </button>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder='Paste a Clip JSON, an items[] array, a tweet, or a list like "1. USA: $78 trillion" …'
            className="min-h-[96px] w-full resize-y rounded-md border border-theme bg-secondary p-3 font-mono text-[12px] leading-relaxed text-main placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-link)]/40"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-muted">
              {pasteStatus ? (
                <span
                  style={{
                    color:
                      pasteStatus.kind === 'ok'
                        ? 'var(--color-brand-primary)'
                        : 'var(--color-text-muted)',
                  }}
                >
                  {pasteStatus.msg}
                </span>
              ) : (
                <span>JSON or text — auto-detected. The patch merges into the form below.</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleApplyPaste}
              disabled={!pasteText.trim()}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                color: 'var(--color-brand-primary)',
                borderColor:
                  'color-mix(in oklab, var(--color-brand-primary) 40%, transparent)',
                backgroundColor:
                  'color-mix(in oklab, var(--color-brand-primary) 12%, var(--color-bg-secondary))',
              }}
            >
              <Sparkles size={12} aria-hidden />
              Apply
            </button>
          </div>
          {showAiPrompt && (
            <div className="flex flex-col gap-2 border-t border-subtle pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted">
                  Copy this into Claude or ChatGPT, attach your image / paste your story, and the
                  JSON it returns goes straight into the textarea above.
                </span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-theme bg-secondary px-2 py-1 text-[11px] font-medium text-main hover:bg-muted-surface"
                >
                  {promptCopied ? (
                    <>
                      <Check size={11} aria-hidden />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={11} aria-hidden />
                      Copy prompt
                    </>
                  )}
                </button>
              </div>
              <textarea
                readOnly
                value={CLIP_EXTRACTION_PROMPT}
                className="h-48 w-full resize-y rounded-md border border-theme bg-muted-surface/60 p-3 font-mono text-[11px] leading-relaxed text-main"
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT — form */}
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass} htmlFor="clip-title">
                Title
              </label>
              <input
                id="clip-title"
                className={fieldClass}
                value={draft.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Taiwan Just Became the World's 5th Largest Stock Market"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="clip-subtitle">
                Subtitle
              </label>
              <textarea
                id="clip-subtitle"
                className={`${fieldClass} min-h-[64px] resize-y`}
                value={draft.subtitle}
                onChange={(e) => update({ subtitle: e.target.value })}
                placeholder="Optional context line"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="clip-source">
                  Source
                </label>
                <input
                  id="clip-source"
                  className={fieldClass}
                  value={draft.sourceLabel}
                  onChange={(e) => update({ sourceLabel: e.target.value })}
                  placeholder="World of Statistics"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="clip-handle">
                  Handle
                </label>
                <input
                  id="clip-handle"
                  className={fieldClass}
                  value={draft.sourceHandle}
                  onChange={(e) => update({ sourceHandle: e.target.value })}
                  placeholder="@stats_feed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="clip-platform">
                  Platform
                </label>
                <select
                  id="clip-platform"
                  className={fieldClass}
                  value={draft.platform}
                  onChange={(e) => update({ platform: e.target.value as ClipPlatform })}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="clip-url">
                  Source URL
                </label>
                <input
                  id="clip-url"
                  className={fieldClass}
                  value={draft.sourceUrl}
                  onChange={(e) => update({ sourceUrl: e.target.value })}
                  placeholder="https://x.com/..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="clip-date">
                  Observed date
                </label>
                <input
                  id="clip-date"
                  type="date"
                  className={fieldClass}
                  value={draft.observedDate}
                  onChange={(e) => update({ observedDate: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="clip-views">
                  Views (optional)
                </label>
                <input
                  id="clip-views"
                  className={fieldClass}
                  value={draft.views}
                  onChange={(e) => update({ views: e.target.value })}
                  placeholder="62900"
                />
              </div>
            </div>

            <div>
              <span className={labelClass}>Chart type</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Chart type">
                {CHART_TYPES.map(({ value, label, description, icon: Icon }) => {
                  const isActive = draft.chartType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => update({ chartType: value })}
                      className="flex flex-col items-start gap-1 rounded-md border p-2 text-left transition-colors"
                      style={
                        isActive
                          ? {
                              borderColor: 'color-mix(in oklab, var(--color-brand-primary) 50%, transparent)',
                              backgroundColor: 'color-mix(in oklab, var(--color-brand-primary) 10%, var(--color-bg-secondary))',
                              color: 'var(--color-text-main)',
                            }
                          : {
                              borderColor: 'var(--color-border)',
                              backgroundColor: 'var(--color-bg-secondary)',
                              color: 'var(--color-text-muted)',
                            }
                      }
                      title={description}
                    >
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
                        <Icon size={12} aria-hidden />
                        {label}
                      </span>
                      <span className="text-[10px] leading-tight text-muted">{description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass} htmlFor="clip-prefix">
                  Unit prefix
                </label>
                <input
                  id="clip-prefix"
                  className={fieldClass}
                  value={draft.unitPrefix}
                  onChange={(e) => update({ unitPrefix: e.target.value })}
                  placeholder="$"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="clip-suffix">
                  Unit suffix
                </label>
                <input
                  id="clip-suffix"
                  className={fieldClass}
                  value={draft.unitSuffix}
                  onChange={(e) => update({ unitSuffix: e.target.value })}
                  placeholder="T"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="clip-precision">
                  Decimals
                </label>
                <input
                  id="clip-precision"
                  type="number"
                  min={0}
                  max={4}
                  className={fieldClass}
                  value={draft.valuePrecision}
                  onChange={(e) => update({ valuePrecision: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="clip-notes">
                Notes (optional)
              </label>
              <textarea
                id="clip-notes"
                className={`${fieldClass} min-h-[60px] resize-y`}
                value={draft.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Why is this interesting? Any caveats?"
              />
            </div>

            {/* Items editor */}
            <div className="rounded-lg border border-subtle bg-muted-surface/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className={labelClass} style={{ marginBottom: 0 }}>
                  Items ({draft.items.length})
                </span>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1 rounded-md border border-theme bg-secondary px-2 py-1 text-xs font-medium text-main hover:bg-muted-surface"
                >
                  <Plus size={12} aria-hidden />
                  Add row
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {draft.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-md border border-subtle bg-secondary px-2 py-1.5"
                  >
                    <span className="w-5 font-mono text-[11px] text-muted">{idx + 1}.</span>
                    <input
                      className="w-10 rounded border border-theme bg-secondary px-1 py-1 text-center text-base"
                      value={item.flag ?? ''}
                      onChange={(e) => updateItem(idx, { flag: e.target.value })}
                      placeholder="🇺🇸"
                      aria-label="Flag emoji"
                    />
                    <input
                      className="flex-1 rounded border border-theme bg-secondary px-2 py-1 text-sm text-main"
                      value={item.label}
                      onChange={(e) => updateItem(idx, { label: e.target.value })}
                      placeholder="USA"
                      aria-label="Item label"
                    />
                    <input
                      type="number"
                      step="any"
                      className="w-24 rounded border border-theme bg-secondary px-2 py-1 text-right font-mono text-sm text-main"
                      value={Number.isFinite(item.value) ? item.value : 0}
                      onChange={(e) => updateItem(idx, { value: parseFloat(e.target.value) || 0 })}
                      aria-label="Item value"
                    />
                    <button
                      type="button"
                      onClick={() => setHighlight(idx)}
                      className="rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider"
                      style={
                        item.highlight
                          ? {
                              color: 'var(--color-brand-primary)',
                              borderColor:
                                'color-mix(in oklab, var(--color-brand-primary) 40%, transparent)',
                              backgroundColor:
                                'color-mix(in oklab, var(--color-brand-primary) 14%, var(--color-bg-secondary))',
                            }
                          : {
                              color: 'var(--color-text-muted)',
                              borderColor: 'var(--color-border)',
                              backgroundColor: 'var(--color-bg-secondary)',
                            }
                      }
                      title="Toggle focus highlight"
                    >
                      Focus
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="rounded-md border border-theme bg-muted-surface px-1.5 py-1 text-muted hover:text-main"
                      title="Remove row"
                      disabled={draft.items.length <= 1}
                    >
                      <Trash2 size={12} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — live preview + JSON */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className={labelClass} style={{ marginBottom: 0 }}>
                  Live preview
                </span>
              </div>
              <ClipCard clip={previewClip} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className={labelClass} style={{ marginBottom: 0 }}>
                  JSON entry
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 rounded-md border border-theme bg-muted-surface px-2 py-1 text-xs font-medium text-main hover:bg-secondary"
                  >
                    <FileDown size={12} aria-hidden />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-md border border-theme bg-secondary px-2 py-1 text-xs font-medium text-main hover:bg-muted-surface"
                  >
                    {copyState === 'copied' ? (
                      <>
                        <Check size={12} aria-hidden />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={12} aria-hidden />
                        Copy JSON
                      </>
                    )}
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={jsonOutput}
                className="h-64 w-full resize-y rounded-md border border-theme bg-muted-surface/40 p-3 font-mono text-[11px] leading-relaxed text-main"
                onFocus={(e) => e.currentTarget.select()}
                aria-label="JSON output for the new clip"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                To persist this clip: open{' '}
                <code className="rounded bg-muted-surface px-1 py-0.5 font-mono">
                  public/data/clips.json
                </code>
                , append the JSON object to the{' '}
                <code className="rounded bg-muted-surface px-1 py-0.5 font-mono">clips</code> array,
                then commit. The dashboard reloads it on next visit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

export default ClipRemixer;
