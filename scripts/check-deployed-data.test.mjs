import { describe, expect, it } from 'vitest';
import { checkDeployedData } from './check-deployed-data.mjs';

function fakeFetch({ status = 200, body = '' } = {}) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  });
}

const HEADER = 'Observed Date,Unemployment Rate\n';

describe('checkDeployedData', () => {
  const now = new Date('2026-08-26T12:00:00.000Z');

  it('passes when the last row is within the freshness window', async () => {
    const body = `${HEADER}8/1/26,4.1\n`;
    const result = await checkDeployedData('https://example.test/data.csv', {
      now,
      fetch: fakeFetch({ body }),
    });
    expect(result.ok).toBe(true);
  });

  it('fails when the last row is older than the max age', async () => {
    // The blind spot this closes: the committed snapshot is fresh but the
    // CDN is serving a stale or stuck artifact.
    const body = `${HEADER}1/1/26,4.1\n`;
    const result = await checkDeployedData('https://example.test/data.csv', {
      now,
      fetch: fakeFetch({ body }),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/days old/);
  });

  it('fails on a non-200 response', async () => {
    const result = await checkDeployedData('https://example.test/data.csv', {
      now,
      fetch: fakeFetch({ status: 404, body: 'Not Found' }),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/404/);
  });

  it('fails when the response has no data rows', async () => {
    const result = await checkDeployedData('https://example.test/data.csv', {
      now,
      fetch: fakeFetch({ body: HEADER }),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/no data rows/);
  });

  it('fails when the last row is empty entirely', async () => {
    const body = `${HEADER}\n\n`;
    const result = await checkDeployedData('https://example.test/data.csv', {
      now,
      fetch: fakeFetch({ body }),
    });
    expect(result.ok).toBe(false);
  });

  it('fails when the fetch itself throws (network error)', async () => {
    const result = await checkDeployedData('https://example.test/data.csv', {
      now,
      fetch: async () => {
        throw new Error('getaddrinfo ENOTFOUND');
      },
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Fetch failed/);
  });

  it('respects a custom maxAgeDays', async () => {
    const body = `${HEADER}8/20/26,4.1\n`;
    expect(
      (await checkDeployedData('https://example.test/data.csv', { now, maxAgeDays: 3, fetch: fakeFetch({ body }) })).ok,
    ).toBe(false);
    expect(
      (await checkDeployedData('https://example.test/data.csv', { now, maxAgeDays: 10, fetch: fakeFetch({ body }) })).ok,
    ).toBe(true);
  });
});
