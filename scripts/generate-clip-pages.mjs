#!/usr/bin/env node
// Pre-renders per-clip share pages and Open Graph PNGs after `vite build`.
//
// For every entry in public/data/clips.json this script writes:
//   dist/clips/{id}/index.html     — copy of dist/index.html with clip-specific
//                                    <title>, OG / Twitter card meta tags, and
//                                    a <meta name="clip-id"> hint so the SPA
//                                    can deep-link on load.
//   dist/clips/{id}/og.png         — 1200×630 PNG that social crawlers fetch.
//
// The SPA itself is unchanged; the per-clip HTML files load the same bundle and
// the React entry detects `location.pathname` to open the right clip on mount.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CLIPS_JSON = path.join(ROOT, 'public', 'data', 'clips.json');
const TEMPLATE = path.join(DIST, 'index.html');

const SITE_BASE = 'https://browningtons.github.io/economic-dashboard';
const BASE_PATH = '/economic-dashboard';

// --- palette (mirrors src/index.css) ---
const COLOR = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#EAF1F5',
  border: '#C8D6DE',
  borderSubtle: '#E3ECF1',
  textMain: '#0F172A',
  textMuted: '#0F3D57',
  brandPrimary: '#F04A00',
  brandPrimaryEdge: '#FF7A33',
  brandSecondary: '#0F3D57',
  brandSecondaryEdge: '#4C6F86',
  brandAccent: '#2CB6C0',
};

const PLATFORM_LABEL = {
  twitter: 'Twitter',
  x: 'X',
  threads: 'Threads',
  bluesky: 'Bluesky',
  mastodon: 'Mastodon',
  reddit: 'Reddit',
  article: 'Article',
  other: 'Link',
};

const escapeXml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const escapeHtmlAttr = escapeXml;

const formatValue = (value, precision = 1, prefix = '', suffix = '') =>
  `${prefix}${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })}${suffix}`;

const formatObservedDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const truncate = (s, max) => {
  const str = String(s ?? '');
  return str.length > max ? `${str.slice(0, max - 1).trimEnd()}…` : str;
};

// Heuristic char width for the Inter-ish system fallback at a given font-size.
const measure = (text, fontSize) => String(text).length * fontSize * 0.55;

const wrapTitle = (title, maxWidth, fontSize, maxLines = 2) => {
  const words = String(title).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, fontSize) > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) {
        // last line — append the rest joined
        const rest = words.slice(words.indexOf(word) + 1).join(' ');
        const tail = rest ? `${word} ${rest}` : word;
        lines.push(truncate(tail, Math.floor(maxWidth / (fontSize * 0.55))));
        return lines;
      }
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
};

// Resvg ships with a fallback sans-serif (NotoSansCJK / Roboto-ish) when no
// system fonts are provided; emoji glyphs are NOT rendered. To keep the OG
// PNG looking clean, we drop the flag emoji and use the row index + label.

const SLICE_PALETTE = [
  '#0F3D57',
  '#2CB6C0',
  '#F04A00',
  '#4C6F86',
  '#0E7C86',
  '#FF7A33',
  '#B53300',
  '#082535',
];

function donutArcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const sweep = endAngle - startAngle;
  if (sweep <= 0) return '';
  const largeArc = sweep > Math.PI ? 1 : 0;
  const polar = (r, a) => ({
    x: cx + r * Math.cos(a - Math.PI / 2),
    y: cy + r * Math.sin(a - Math.PI / 2),
  });
  const so = polar(rOuter, startAngle);
  const eo = polar(rOuter, endAngle);
  const si = polar(rInner, endAngle);
  const ei = polar(rInner, startAngle);
  return [
    `M ${so.x} ${so.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${eo.x} ${eo.y}`,
    `L ${si.x} ${si.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${ei.x} ${ei.y}`,
    'Z',
  ].join(' ');
}

function generateClipSvg(clip) {
  const W = 1200;
  const H = 630;
  const PAD = 56;
  // Most chart types want the full series; horizontalBar trims to 10 itself.
  const items = clip.items ?? [];
  const platformLabel = PLATFORM_LABEL[clip.source?.platform] ?? 'Source';
  const dateStr = formatObservedDate(clip.observedDate);
  const sourceText = `${clip.source?.label ?? 'Unknown source'}${
    clip.source?.handle ? ` · ${clip.source.handle}` : ''
  }`;

  const titleFontSize = 44;
  const subtitleFontSize = 22;
  const titleLineHeight = titleFontSize * 1.15;

  const titleLines = wrapTitle(clip.title, W - PAD * 2, titleFontSize, 2);
  const subtitleLines = clip.subtitle
    ? wrapTitle(clip.subtitle, W - PAD * 2, subtitleFontSize, 2)
    : [];

  const headerY = PAD;
  const titleY = headerY + 30; // below platform/date strip
  const subtitleY = titleY + titleLines.length * titleLineHeight + 10;
  const chartTop = subtitleY + (subtitleLines.length ? subtitleLines.length * 28 + 24 : 24);
  const footerHeight = 56;
  const chartBottom = H - PAD - footerHeight - 14;
  const chartHeight = Math.max(220, chartBottom - chartTop);

  // ---- SVG pieces ----
  const headerStrip = `
    <rect x="${PAD}" y="${headerY}" width="${platformLabel.length * 11 + 24}" height="26"
          rx="13" ry="13"
          fill="${COLOR.brandAccent}22" stroke="${COLOR.brandAccent}" stroke-width="1"/>
    <text x="${PAD + 12}" y="${headerY + 18}" font-family="Inter, system-ui, sans-serif"
          font-size="13" font-weight="700" fill="${COLOR.brandAccent}"
          letter-spacing="1">${escapeXml(platformLabel.toUpperCase())}</text>
    <text x="${PAD + platformLabel.length * 11 + 24 + 14}" y="${headerY + 18}"
          font-family="Inter, system-ui, sans-serif" font-size="14"
          fill="${COLOR.textMuted}">${escapeXml(dateStr)}${
            typeof clip.views === 'number'
              ? `  ·  ${(clip.views >= 1000 ? `${(clip.views / 1000).toFixed(1)}K` : `${clip.views}`)} views`
              : ''
          }</text>
  `;

  const titleText = titleLines
    .map(
      (line, i) =>
        `<text x="${PAD}" y="${titleY + (i + 1) * titleLineHeight - 8}" font-family="Inter, system-ui, sans-serif" font-size="${titleFontSize}" font-weight="700" fill="${
          COLOR.textMain
        }">${escapeXml(line)}</text>`,
    )
    .join('\n');

  const subtitleText = subtitleLines
    .map(
      (line, i) =>
        `<text x="${PAD}" y="${subtitleY + i * 28}" font-family="Inter, system-ui, sans-serif" font-size="${subtitleFontSize}" fill="${
          COLOR.textMuted
        }">${escapeXml(line)}</text>`,
    )
    .join('\n');

  const gradients = `
    <defs>
      <linearGradient id="g-primary" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="${COLOR.brandPrimary}"/>
        <stop offset="100%" stop-color="${COLOR.brandPrimaryEdge}"/>
      </linearGradient>
      <linearGradient id="g-secondary" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="${COLOR.brandSecondary}"/>
        <stop offset="100%" stop-color="${COLOR.brandSecondaryEdge}"/>
      </linearGradient>
    </defs>
  `;

  const chartBody = renderChartSvg({ clip, items, W, PAD, chartTop, chartHeight });

  const footerY = H - PAD - 12;
  const footer = `
    <line x1="${PAD}" y1="${footerY - 18}" x2="${W - PAD}" y2="${footerY - 18}"
          stroke="${COLOR.borderSubtle}" stroke-width="1"/>
    <text x="${PAD}" y="${footerY + 6}" font-family="Inter, system-ui, sans-serif"
          font-size="16" font-weight="700" fill="${COLOR.textMain}">${escapeXml(sourceText)}</text>
    <text x="${W - PAD}" y="${footerY + 6}" text-anchor="end"
          font-family="Inter, system-ui, sans-serif" font-size="14"
          fill="${COLOR.textMuted}">browningtons.github.io/economic-dashboard</text>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${gradients}
  <rect width="${W}" height="${H}" fill="${COLOR.bg}"/>
  ${headerStrip}
  ${titleText}
  ${subtitleText}
  ${chartBody}
  ${footer}
</svg>`;
}

function renderChartSvg({ clip, items, W, PAD, chartTop, chartHeight }) {
  if (clip.chartType === 'stat') return renderStatSvg({ clip, items, W, PAD, chartTop, chartHeight });
  if (clip.chartType === 'donut') return renderDonutSvg({ clip, items, W, PAD, chartTop, chartHeight });
  if (clip.chartType === 'timeSeries') return renderTimeSeriesSvg({ clip, items, W, PAD, chartTop, chartHeight });
  return renderHorizontalBarsSvg({ clip, items, W, PAD, chartTop, chartHeight });
}

function formatTickLabelMjs(label) {
  const d = new Date(label);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return String(label ?? '').slice(0, 10);
}

function renderTimeSeriesSvg({ clip, items, W, PAD, chartTop, chartHeight }) {
  const points = items
    .map((it, i) => ({ item: it, index: i, value: Number(it.value) }))
    .filter((p) => Number.isFinite(p.value));
  if (points.length < 2) return '';

  const PRECISION = clip.valuePrecision ?? 1;
  const UNIT_PREFIX = clip.unitPrefix ?? '';
  const UNIT_SUFFIX = clip.unitSuffix ?? '';

  const headlineH = 78;
  const innerTop = chartTop + headlineH;
  const innerH = Math.max(160, chartHeight - headlineH - 4);
  const padL = PAD + 80;
  const padR = PAD + 16;
  const innerL = padL;
  const innerR = W - padR;
  const innerW = innerR - innerL;

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || Math.abs(rawMax) || 1;
  const yMin = rawMin - span * 0.08;
  const yMax = rawMax + span * 0.08;
  const yRange = yMax - yMin || 1;

  const xFor = (i) => innerL + (i / (points.length - 1)) * innerW;
  const yFor = (v) => innerTop + innerH - ((v - yMin) / yRange) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(2)} ${yFor(p.value).toFixed(2)}`)
    .join(' ');
  const areaPath =
    `${linePath} L ${xFor(points.length - 1).toFixed(2)} ${(innerTop + innerH).toFixed(2)} ` +
    `L ${xFor(0).toFixed(2)} ${(innerTop + innerH).toFixed(2)} Z`;

  const yTicks = [rawMin, (rawMin + rawMax) / 2, rawMax];

  const highlight = points.find((p) => p.item.highlight) ?? points[points.length - 1];
  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.value - first.value;
  const deltaPct = first.value !== 0 ? (delta / Math.abs(first.value)) * 100 : 0;
  const deltaSign = delta >= 0 ? '+' : '';
  const deltaColor = delta >= 0 ? COLOR.brandPrimary : COLOR.brandAccent;

  const headlineLabelUpper = String(highlight.item.label || '').length
    ? formatTickLabelMjs(highlight.item.label).toUpperCase()
    : 'LATEST';
  const headlineValueText = formatValue(highlight.value, PRECISION, UNIT_PREFIX, UNIT_SUFFIX);
  const deltaLabelUpper = `Δ VS ${formatTickLabelMjs(first.item.label).toUpperCase()}`;
  const deltaValueText = `${deltaSign}${formatValue(delta, PRECISION, UNIT_PREFIX, UNIT_SUFFIX)}  (${deltaSign}${deltaPct.toFixed(1)}%)`;

  const headlineEls = `
    <text x="${PAD}" y="${chartTop + 14}" font-family="Inter, system-ui, sans-serif"
          font-size="13" font-weight="700" letter-spacing="2"
          fill="${COLOR.textMuted}">${escapeXml(headlineLabelUpper)}</text>
    <text x="${PAD}" y="${chartTop + 56}" font-family="ui-monospace, Menlo, monospace"
          font-size="42" font-weight="800" letter-spacing="-1"
          fill="${COLOR.brandPrimary}">${escapeXml(headlineValueText)}</text>
    <text x="${W - PAD}" y="${chartTop + 14}" text-anchor="end"
          font-family="Inter, system-ui, sans-serif"
          font-size="13" font-weight="700" letter-spacing="2"
          fill="${COLOR.textMuted}">${escapeXml(deltaLabelUpper)}</text>
    <text x="${W - PAD}" y="${chartTop + 48}" text-anchor="end"
          font-family="ui-monospace, Menlo, monospace"
          font-size="22" font-weight="700"
          fill="${deltaColor}">${escapeXml(deltaValueText)}</text>
  `;

  const gradId = 'g-line-area';
  const lineGradient = `
    <linearGradient id="${gradId}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${COLOR.brandSecondary}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${COLOR.brandSecondary}" stop-opacity="0"/>
    </linearGradient>
  `;

  const gridEls = yTicks
    .map((t, i) => {
      const y = yFor(t);
      const dashed = i === 0 || i === yTicks.length - 1 ? '' : 'stroke-dasharray="3 3"';
      return `
        <line x1="${innerL}" x2="${innerR}" y1="${y}" y2="${y}"
              stroke="${COLOR.borderSubtle}" stroke-width="1" ${dashed}/>
        <text x="${innerL - 8}" y="${y + 4}" text-anchor="end"
              font-family="ui-monospace, Menlo, monospace" font-size="14"
              fill="${COLOR.textMuted}">${escapeXml(formatValue(t, PRECISION, UNIT_PREFIX, UNIT_SUFFIX))}</text>
      `;
    })
    .join('\n');

  const dotEls = points
    .map((p, i) => {
      const isHL = p === highlight;
      const cx = xFor(i);
      const cy = yFor(p.value);
      return `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${isHL ? 6 : 3}"
                       fill="${isHL ? COLOR.brandPrimary : COLOR.surface}"
                       stroke="${isHL ? COLOR.brandPrimary : COLOR.brandSecondary}"
                       stroke-width="${isHL ? 2.5 : 1.5}"/>`;
    })
    .join('\n');

  const xIdxs = Array.from(new Set([0, Math.floor(points.length / 2), points.length - 1]));
  const xLabelEls = xIdxs
    .map((idx) => {
      const anchor = idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle';
      return `<text x="${xFor(idx).toFixed(2)}" y="${(innerTop + innerH + 22).toFixed(2)}"
                     text-anchor="${anchor}"
                     font-family="Inter, system-ui, sans-serif" font-size="14"
                     fill="${COLOR.textMuted}">${escapeXml(formatTickLabelMjs(points[idx].item.label))}</text>`;
    })
    .join('\n');

  return `
    <defs>${lineGradient}</defs>
    ${headlineEls}
    ${gridEls}
    <path d="${areaPath}" fill="url(#${gradId})"/>
    <path d="${linePath}" fill="none" stroke="${COLOR.brandSecondary}" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round"/>
    ${dotEls}
    ${xLabelEls}
  `;
}

function renderHorizontalBarsSvg({ clip, items: rawItems, W, PAD, chartTop, chartHeight }) {
  const items = rawItems.slice(0, 10);
  const rowGap = 6;
  const rowHeight = Math.min(
    38,
    Math.floor((chartHeight - rowGap * (Math.max(items.length, 1) - 1)) / Math.max(items.length, 1)),
  );
  const labelColX = PAD;
  const labelColW = 250;
  const valueColW = 130;
  const valueColX = W - PAD - valueColW;
  const barX = labelColX + labelColW + 14;
  const barW = valueColX - barX - 14;
  const maxValue = items.reduce((m, it) => Math.max(m, Number(it.value) || 0), 0) || 1;

  return items
    .map((item, i) => {
      const y = chartTop + i * (rowHeight + rowGap);
      const barFillId = item.highlight ? 'g-primary' : 'g-secondary';
      const valueColor = item.highlight ? COLOR.brandPrimary : COLOR.brandSecondary;
      const widthPx = Math.max(2, (Number(item.value) / maxValue) * barW);
      const labelText = truncate(item.label, 22);
      const numText = `${i + 1}.`;
      const valueText = formatValue(
        item.value,
        clip.valuePrecision ?? 1,
        clip.unitPrefix ?? '',
        clip.unitSuffix ?? '',
      );
      const focusBadge = item.highlight
        ? `<rect x="${labelColX + 30 + measure(labelText, 20) + 12}" y="${y + (rowHeight - 22) / 2}"
                width="60" height="22" rx="11" ry="11"
                fill="${COLOR.brandPrimary}1F" stroke="${COLOR.brandPrimary}"
                stroke-width="1"/>
           <text x="${labelColX + 30 + measure(labelText, 20) + 42}" y="${y + rowHeight / 2 + 5}"
                 text-anchor="middle" font-family="Inter, system-ui, sans-serif"
                 font-size="11" font-weight="700" letter-spacing="1"
                 fill="${COLOR.brandPrimary}">FOCUS</text>`
        : '';
      return `
        <text x="${labelColX}" y="${y + rowHeight / 2 + 6}"
              font-family="Inter, system-ui, sans-serif"
              font-size="14" fill="${COLOR.textMuted}">${escapeXml(numText)}</text>
        <text x="${labelColX + 30}" y="${y + rowHeight / 2 + 7}"
              font-family="Inter, system-ui, sans-serif"
              font-size="20" font-weight="600" fill="${COLOR.textMain}">${escapeXml(labelText)}</text>
        ${focusBadge}
        <rect x="${barX}" y="${y + (rowHeight - 14) / 2}" width="${barW}" height="14"
              rx="7" ry="7" fill="${COLOR.surfaceMuted}" stroke="${COLOR.borderSubtle}" stroke-width="1"/>
        <rect x="${barX}" y="${y + (rowHeight - 14) / 2}" width="${widthPx}" height="14"
              rx="7" ry="7" fill="url(#${barFillId})"/>
        <text x="${W - PAD}" y="${y + rowHeight / 2 + 7}" text-anchor="end"
              font-family="ui-monospace, Menlo, monospace" font-size="20" font-weight="700"
              fill="${valueColor}">${escapeXml(valueText)}</text>
      `;
    })
    .join('\n');
}

function renderStatSvg({ clip, items, W, PAD, chartTop, chartHeight }) {
  if (!items.length) return '';
  const highlightIdx = items.findIndex((it) => it.highlight);
  const headlineIdx = highlightIdx >= 0 ? highlightIdx : 0;
  const headline = items[headlineIdx];
  const supporting = items.filter((_, i) => i !== headlineIdx).slice(0, 3);

  const cx = W / 2;
  const innerTop = chartTop + 4;
  const labelSize = 22;
  const headlineSize = supporting.length ? 132 : 168;
  const supportLabelSize = 14;
  const supportValueSize = 36;
  const supportingGap = 60;

  const headlineText = formatValue(
    headline.value,
    clip.valuePrecision ?? 1,
    clip.unitPrefix ?? '',
    clip.unitSuffix ?? '',
  );

  const labelEl = `
    <text x="${cx}" y="${innerTop + labelSize}" text-anchor="middle"
          font-family="Inter, system-ui, sans-serif"
          font-size="${labelSize}" font-weight="700" letter-spacing="3"
          fill="${COLOR.textMuted}">${escapeXml(headline.label.toUpperCase())}</text>
  `;

  const headlineY = innerTop + labelSize + 30 + headlineSize - 24;
  const headlineEl = `
    <text x="${cx}" y="${headlineY}" text-anchor="middle"
          font-family="Inter, system-ui, sans-serif"
          font-size="${headlineSize}" font-weight="800" letter-spacing="-2"
          fill="${COLOR.brandPrimary}">${escapeXml(headlineText)}</text>
  `;

  let supportingEls = '';
  if (supporting.length) {
    const supportingTop = headlineY + 40;
    const availableW = W - PAD * 2;
    const colW = availableW / supporting.length;
    const ruleY = supportingTop;
    supportingEls = `
      <line x1="${PAD + 80}" y1="${ruleY}" x2="${W - PAD - 80}" y2="${ruleY}"
            stroke="${COLOR.borderSubtle}" stroke-width="1"/>
    `;
    supporting.forEach((item, i) => {
      const colCx = PAD + colW / 2 + i * colW;
      const labelY = ruleY + supportLabelSize + 18;
      const valueY = labelY + supportValueSize + 6;
      const color = item.highlight ? COLOR.brandPrimary : COLOR.brandSecondary;
      const valueText = formatValue(
        item.value,
        clip.valuePrecision ?? 1,
        clip.unitPrefix ?? '',
        clip.unitSuffix ?? '',
      );
      supportingEls += `
        <text x="${colCx}" y="${labelY}" text-anchor="middle"
              font-family="Inter, system-ui, sans-serif"
              font-size="${supportLabelSize}" font-weight="700" letter-spacing="2"
              fill="${COLOR.textMuted}">${escapeXml(item.label.toUpperCase())}</text>
        <text x="${colCx}" y="${valueY}" text-anchor="middle"
              font-family="ui-monospace, Menlo, monospace"
              font-size="${supportValueSize}" font-weight="700"
              fill="${color}">${escapeXml(valueText)}</text>
      `;
    });
  }

  // Suppress unused warning for chartHeight
  void chartHeight;

  return labelEl + headlineEl + supportingEls;
}

function renderDonutSvg({ clip, items, W, PAD, chartTop, chartHeight }) {
  const visible = items.slice(0, 8);
  const total = visible.reduce((s, it) => s + Math.max(0, Number(it.value) || 0), 0);
  if (total <= 0) return '';

  const donutSize = Math.min(chartHeight - 8, 360);
  const cx = PAD + donutSize / 2;
  const cy = chartTop + donutSize / 2;
  const rOuter = donutSize / 2 - 4;
  const rInner = rOuter * 0.62;
  let cumulative = 0;
  const TAU = Math.PI * 2;

  const arcs = visible
    .map((item, i) => {
      const value = Math.max(0, Number(item.value) || 0);
      const fraction = value / total;
      const start = cumulative * TAU;
      cumulative += fraction;
      const end = cumulative * TAU;
      const color = SLICE_PALETTE[i % SLICE_PALETTE.length];
      return `<path d="${donutArcPath(cx, cy, rOuter, rInner, start, end)}"
                    fill="${color}" stroke="${COLOR.surface}" stroke-width="2"/>`;
    })
    .join('\n');

  const totalText = formatValue(
    total,
    clip.valuePrecision ?? 1,
    clip.unitPrefix ?? '',
    clip.unitSuffix ?? '',
  );

  const centerLabel = `
    <text x="${cx}" y="${cy - 10}" text-anchor="middle"
          font-family="Inter, system-ui, sans-serif" font-size="14"
          font-weight="700" letter-spacing="3" fill="${COLOR.textMuted}">TOTAL</text>
    <text x="${cx}" y="${cy + 24}" text-anchor="middle"
          font-family="ui-monospace, Menlo, monospace" font-size="34"
          font-weight="800" fill="${COLOR.textMain}">${escapeXml(totalText)}</text>
  `;

  // Legend
  const legendX = cx + rOuter + 56;
  const legendW = W - PAD - legendX;
  const rowH = Math.min(46, (chartHeight - 12) / Math.max(visible.length, 1));
  let legendEls = '';
  visible.forEach((item, i) => {
    const value = Math.max(0, Number(item.value) || 0);
    const fraction = value / total;
    const pct = `${(fraction * 100).toFixed(fraction < 0.1 ? 1 : 0)}%`;
    const color = SLICE_PALETTE[i % SLICE_PALETTE.length];
    const y = chartTop + i * rowH;
    const swatchY = y + rowH / 2 - 8;
    const labelY = y + rowH / 2 + 6;
    const valueColor = item.highlight ? COLOR.brandPrimary : COLOR.brandSecondary;
    const valueText = formatValue(value, clip.valuePrecision ?? 1, clip.unitPrefix ?? '', clip.unitSuffix ?? '');
    legendEls += `
      <rect x="${legendX}" y="${swatchY}" width="16" height="16" rx="3" fill="${color}"
            stroke="${item.highlight ? COLOR.brandPrimary : 'none'}" stroke-width="${item.highlight ? 2 : 0}"/>
      <text x="${legendX + 26}" y="${labelY}" font-family="Inter, system-ui, sans-serif"
            font-size="18" font-weight="${item.highlight ? 700 : 600}"
            fill="${COLOR.textMain}">${escapeXml(truncate(item.label, 22))}</text>
      <text x="${legendX + 26 + measure(truncate(item.label, 22), 18) + 12}" y="${labelY}"
            font-family="Inter, system-ui, sans-serif" font-size="15"
            fill="${COLOR.textMuted}">${escapeXml(pct)}</text>
      <text x="${legendX + legendW}" y="${labelY}" text-anchor="end"
            font-family="ui-monospace, Menlo, monospace" font-size="18" font-weight="700"
            fill="${valueColor}">${escapeXml(valueText)}</text>
    `;
  });

  return arcs + centerLabel + legendEls;
}

async function renderPng(svg) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { loadSystemFonts: true, defaultFontFamily: 'Inter' },
    background: 'rgba(255,255,255,1)',
  });
  return resvg.render().asPng();
}

function injectClipMeta(template, clip, ogImageUrl, canonicalUrl) {
  const title = clip.title.length > 60 ? `${clip.title.slice(0, 57)}…` : clip.title;
  const description =
    clip.subtitle?.trim() ||
    clip.notes?.trim() ||
    `A data clip from ${clip.source?.label ?? 'an interesting source'} — collected on the Economic Dashboard.`;

  // Helper that swaps every meta tag whose attribute & value matches; falls back
  // to inserting a fresh tag before </head> if the meta isn't there yet.
  const replaceOrInsert = (html, attr, attrValue, contentValue) => {
    const re = new RegExp(
      `<meta\\s+${attr}="${attrValue}"[^>]*>`,
      'i',
    );
    const tag = `<meta ${attr}="${attrValue}" content="${escapeHtmlAttr(contentValue)}" />`;
    if (re.test(html)) return html.replace(re, tag);
    return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
  };

  let out = template;
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeXml(title)} — Golden Data</title>`);
  out = replaceOrInsert(out, 'name', 'description', description);
  out = replaceOrInsert(out, 'property', 'og:title', `${title} — Golden Data`);
  out = replaceOrInsert(out, 'property', 'og:description', description);
  out = replaceOrInsert(out, 'property', 'og:url', canonicalUrl);
  out = replaceOrInsert(out, 'property', 'og:image', ogImageUrl);
  out = replaceOrInsert(out, 'property', 'og:image:alt', `${title} — chart by Golden Data`);
  out = replaceOrInsert(out, 'name', 'twitter:title', `${title} — Golden Data`);
  out = replaceOrInsert(out, 'name', 'twitter:description', description);
  out = replaceOrInsert(out, 'name', 'twitter:image', ogImageUrl);
  out = replaceOrInsert(out, 'name', 'twitter:image:alt', `${title} — chart by Golden Data`);

  // Canonical link
  const canonicalRe = /<link\s+rel="canonical"[^>]*>/i;
  const canonicalTag = `<link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />`;
  if (canonicalRe.test(out)) out = out.replace(canonicalRe, canonicalTag);
  else out = out.replace(/<\/head>/i, `    ${canonicalTag}\n  </head>`);

  // Hint for the SPA so it can deep-link without parsing the URL on every load
  const clipHint = `<meta name="clip-id" content="${escapeHtmlAttr(clip.id)}" />`;
  if (/<meta\s+name="clip-id"/i.test(out)) {
    out = out.replace(/<meta\s+name="clip-id"[^>]*>/i, clipHint);
  } else {
    out = out.replace(/<\/head>/i, `    ${clipHint}\n  </head>`);
  }

  return out;
}

async function main() {
  if (!existsSync(TEMPLATE)) {
    console.error(`✗ ${TEMPLATE} not found. Run \`vite build\` first.`);
    process.exit(1);
  }
  if (!existsSync(CLIPS_JSON)) {
    console.warn(`! ${CLIPS_JSON} not found; nothing to pre-render.`);
    return;
  }

  const [template, clipsRaw] = await Promise.all([
    readFile(TEMPLATE, 'utf-8'),
    readFile(CLIPS_JSON, 'utf-8'),
  ]);
  const { clips = [] } = JSON.parse(clipsRaw);

  if (!clips.length) {
    console.log('! clips.json contains no clips; nothing to pre-render.');
    return;
  }

  console.log(`→ Pre-rendering ${clips.length} clip page${clips.length === 1 ? '' : 's'}…`);
  for (const clip of clips) {
    const outDir = path.join(DIST, 'clips', clip.id);
    await mkdir(outDir, { recursive: true });

    const canonicalUrl = `${SITE_BASE}/clips/${clip.id}/`;
    const ogImageUrl = `${SITE_BASE}/clips/${clip.id}/og.png`;

    const svg = generateClipSvg(clip);
    const png = await renderPng(svg);
    await writeFile(path.join(outDir, 'og.png'), png);

    const html = injectClipMeta(template, clip, ogImageUrl, canonicalUrl);
    await writeFile(path.join(outDir, 'index.html'), html);

    console.log(`  ✓ ${BASE_PATH}/clips/${clip.id}/  (og.png ${png.length}B)`);
  }
  console.log(`✓ Pre-render complete (dist/clips/).`);

  // ---- Atom feed for syndication ----
  const feedXml = generateAtomFeed(clips);
  await writeFile(path.join(DIST, 'clips.xml'), feedXml);
  console.log(`✓ Atom feed written (dist/clips.xml, ${clips.length} entries).`);

  // ---- Sitemap for search engines ----
  const sitemap = generateSitemap(clips);
  await writeFile(path.join(DIST, 'sitemap.xml'), sitemap);
  console.log(`✓ Sitemap written (dist/sitemap.xml, ${clips.length + 1} URLs).`);

  // ---- robots.txt pointer to sitemap ----
  const robots = `User-agent: *\nAllow: /\nSitemap: ${SITE_BASE}/sitemap.xml\n`;
  await writeFile(path.join(DIST, 'robots.txt'), robots);
  console.log('✓ robots.txt written.');
}

function toIsoOrNow(date) {
  if (!date) return new Date().toISOString();
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function generateAtomFeed(clips) {
  const sorted = [...clips].sort((a, b) => {
    const aT = new Date(a.addedAt || a.observedDate).getTime() || 0;
    const bT = new Date(b.addedAt || b.observedDate).getTime() || 0;
    return bT - aT;
  });
  const latest = sorted[0]
    ? toIsoOrNow(sorted[0].addedAt || sorted[0].observedDate)
    : new Date().toISOString();

  const entries = sorted
    .map((clip) => {
      const url = `${SITE_BASE}/clips/${clip.id}/`;
      const ogImage = `${SITE_BASE}/clips/${clip.id}/og.png`;
      const updated = toIsoOrNow(clip.addedAt || clip.observedDate);
      const published = toIsoOrNow(clip.observedDate || clip.addedAt);
      const summary = clip.subtitle?.trim() || clip.notes?.trim() || clip.title;
      const sourceLine = clip.source?.label
        ? `${clip.source.label}${clip.source.handle ? ` (${clip.source.handle})` : ''}`
        : '';
      const contentHtml = [
        clip.subtitle ? `<p>${escapeXml(clip.subtitle)}</p>` : '',
        `<p><img src="${escapeXml(ogImage)}" alt="${escapeXml(clip.title)}" /></p>`,
        clip.notes ? `<p><em>${escapeXml(clip.notes)}</em></p>` : '',
        sourceLine ? `<p>Source: ${escapeXml(sourceLine)}</p>` : '',
      ]
        .filter(Boolean)
        .join('');
      return `  <entry>
    <id>${escapeXml(url)}</id>
    <title>${escapeXml(clip.title)}</title>
    <link rel="alternate" type="text/html" href="${escapeXml(url)}"/>
    <link rel="enclosure" type="image/png" href="${escapeXml(ogImage)}"/>
    <updated>${updated}</updated>
    <published>${published}</published>
    <summary>${escapeXml(summary)}</summary>
    <content type="html"><![CDATA[${contentHtml}]]></content>
    <author><name>${escapeXml(clip.source?.label ?? 'Golden Data')}</name></author>
  </entry>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Economic Dashboard — Clips</title>
  <subtitle>A running list of interesting data clips, by Golden Data.</subtitle>
  <link rel="self" type="application/atom+xml" href="${SITE_BASE}/clips.xml"/>
  <link rel="alternate" type="text/html" href="${SITE_BASE}/"/>
  <id>${SITE_BASE}/clips.xml</id>
  <updated>${latest}</updated>
  <generator uri="${SITE_BASE}/">Golden Data Clips Generator</generator>
${entries}
</feed>
`;
}

function generateSitemap(clips) {
  const urls = [
    {
      loc: `${SITE_BASE}/`,
      lastmod: clips.reduce((max, c) => {
        const t = new Date(c.addedAt || c.observedDate).getTime();
        return Number.isFinite(t) && t > max ? t : max;
      }, 0),
      priority: '1.0',
    },
    ...clips.map((c) => ({
      loc: `${SITE_BASE}/clips/${c.id}/`,
      lastmod: new Date(c.addedAt || c.observedDate).getTime() || Date.now(),
      priority: '0.8',
    })),
  ];

  const entries = urls
    .map((u) => {
      const lastmod = new Date(u.lastmod || Date.now()).toISOString().slice(0, 10);
      return `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${u.priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap-0.9">
${entries}
</urlset>
`;
}

main().catch((err) => {
  console.error('✗ Clip pre-render failed:', err);
  process.exit(1);
});
