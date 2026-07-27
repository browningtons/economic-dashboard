import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkFreshness } from './check-data-freshness.mjs';

const tempFiles = [];

function writeStatus(contents) {
  const file = path.join(os.tmpdir(), `data-status-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, typeof contents === 'string' ? contents : JSON.stringify(contents));
  tempFiles.push(file);
  return file;
}

afterEach(() => {
  while (tempFiles.length) {
    const file = tempFiles.pop();
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
});

describe('checkFreshness', () => {
  const now = new Date('2026-07-26T12:00:00.000Z');

  it('passes on a snapshot generated within the window', () => {
    const file = writeStatus({ generatedAt: '2026-07-25T13:20:00.000Z', status: 'PASS' });
    const result = checkFreshness(file, { now });
    expect(result.ok).toBe(true);
  });

  it('fails on a backdated snapshot older than the max age', () => {
    // The R1a scenario: 21-day-old data under a green PASS badge.
    const file = writeStatus({ generatedAt: '2026-07-05T13:20:00.000Z', status: 'PASS' });
    const result = checkFreshness(file, { now });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/stale/);
  });

  it('fails exactly past the boundary and passes just inside it', () => {
    const justInside = writeStatus({ generatedAt: '2026-07-22T12:00:01.000Z' });
    expect(checkFreshness(justInside, { now }).ok).toBe(true);

    const justOutside = writeStatus({ generatedAt: '2026-07-22T11:59:59.000Z' });
    expect(checkFreshness(justOutside, { now }).ok).toBe(false);
  });

  it('respects a custom maxAgeDays', () => {
    const file = writeStatus({ generatedAt: '2026-07-24T12:00:00.000Z' });
    expect(checkFreshness(file, { now, maxAgeDays: 1 }).ok).toBe(false);
    expect(checkFreshness(file, { now, maxAgeDays: 3 }).ok).toBe(true);
  });

  it('fails when the file is missing', () => {
    const result = checkFreshness('/nonexistent/data_status.json', { now });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/not found/);
  });

  it('fails when generatedAt is absent or unparseable', () => {
    const missing = writeStatus({ status: 'PASS' });
    expect(checkFreshness(missing, { now }).ok).toBe(false);

    const garbage = writeStatus({ generatedAt: 'not-a-date' });
    expect(checkFreshness(garbage, { now }).ok).toBe(false);
  });

  it('fails on invalid JSON', () => {
    const file = writeStatus('{nope');
    expect(checkFreshness(file, { now }).ok).toBe(false);
  });
});
