import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './refresh-dispatch.js';

const ENV_KEYS = [
  'REFRESH_ALLOWED_ORIGIN',
  'REFRESH_WEBHOOK_BEARER',
  'GITHUB_REPO_OWNER',
  'GITHUB_REPO_NAME',
  'GITHUB_TRIGGER_TOKEN',
  'GITHUB_WORKFLOW_ID',
  'GITHUB_WORKFLOW_REF',
];
const savedEnv = {};

function makeRes() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
}

function makeReq({ method = 'POST', headers = {}, body = {} } = {}) {
  return { method, headers, body };
}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  process.env.GITHUB_REPO_OWNER = 'browningtons';
  process.env.GITHUB_REPO_NAME = 'economic-dashboard';
  process.env.GITHUB_TRIGGER_TOKEN = 'server-token';
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  vi.unstubAllGlobals();
});

describe('refresh-dispatch auth', () => {
  it('fails closed with 500 when REFRESH_WEBHOOK_BEARER is not configured, even with no caller credentials at all', async () => {
    const res = makeRes();
    await handler(makeReq({ headers: {} }), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/REFRESH_WEBHOOK_BEARER/);
  });

  it('rejects a request with the wrong bearer once configured', async () => {
    process.env.REFRESH_WEBHOOK_BEARER = 'expected-token';
    const res = makeRes();
    await handler(makeReq({ headers: { authorization: 'Bearer wrong-token' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('dispatches once the correct bearer is presented', async () => {
    process.env.REFRESH_WEBHOOK_BEARER = 'expected-token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const res = makeRes();
    await handler(makeReq({ headers: { authorization: 'Bearer expected-token' } }), res);
    expect(res.statusCode).toBe(202);
    expect(res.body.ok).toBe(true);
  });
});
