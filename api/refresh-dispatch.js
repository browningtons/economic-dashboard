/*
  Secure refresh relay endpoint for serverless runtimes (e.g., Vercel).
  It dispatches GitHub Actions workflow runs without exposing GitHub tokens to the browser.
*/

function parseJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function unauthorized(res, message) {
  res.status(401).json({ ok: false, error: message });
}

async function dispatchWorkflow({ owner, repo, workflowId, ref, token, inputs }) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref, inputs }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub dispatch failed: HTTP ${response.status} ${text}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const allowedOrigin = process.env.REFRESH_ALLOWED_ORIGIN?.trim();
  const origin = req.headers.origin;
  if (allowedOrigin && origin && origin !== allowedOrigin) {
    return unauthorized(res, 'Origin not allowed');
  }

  const expectedBearer = process.env.REFRESH_WEBHOOK_BEARER?.trim();
  if (expectedBearer) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
    if (token !== expectedBearer) {
      return unauthorized(res, 'Invalid bearer token');
    }
  }

  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const token = process.env.GITHUB_TRIGGER_TOKEN;
  const workflowId = process.env.GITHUB_WORKFLOW_ID || 'update-data.yml';
  const ref = process.env.GITHUB_WORKFLOW_REF || 'main';

  if (!owner || !repo || !token) {
    return res.status(500).json({ ok: false, error: 'Server is missing GitHub dispatch configuration' });
  }

  const payload = parseJsonBody(req);
  const requestedAt = typeof payload.requestedAt === 'string' ? payload.requestedAt : new Date().toISOString();
  const requestedBy = typeof payload.source === 'string' ? payload.source : 'dashboard';

  try {
    await dispatchWorkflow({
      owner,
      repo,
      workflowId,
      ref,
      token,
      inputs: {
        requested_by: requestedBy,
        requested_at: requestedAt,
      },
    });

    return res.status(202).json({ ok: true, status: 'queued', requestedAt });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
