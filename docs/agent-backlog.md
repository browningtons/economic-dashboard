# Agent Backlog

Small, concrete tasks for recurring 30-minute agent sessions. Keep each item
finishable or splittable in one session.

Seeded 2026-07-24 by Launch Shield (first-wolf bootstrap).

## How To Use This Backlog

At the start of a session:

1. Read [docs/launch-risk-register.md](launch-risk-register.md).
2. Check for items tagged `[→ <your-lane>]` below — a peer wolf's handoff in your
   domain outranks your own theme pick (below barks and P0s). Claim it by doing
   it and deleting the line.
3. Pick the highest-scoring task that fits in 30 minutes.
4. If a task is too large, split it and complete the smallest useful part.
5. After finishing, move the item to "Completed" with the date and verification
   command.

Use this score:

```text
Score = Impact + Confidence + Risk Reduction - Effort
```

## Handoffs

- `[→ paul]` **Decide whether to re-enable the two disabled workflows** (R1). Not
  an agent call — re-enabling resumes automated commits to `main` and republishes
  a public site, and the reason they were disabled on 2026-07-03 is unrecorded.
  See R1 for the exact commands and the ordering (decide → enable → dispatch once
  → then close the detection gap).
- `[→ learning-loop]` **Promote the absent-run blind spot to the pack.** The
  watchtower barks on *failing* pipelines; it cannot see a workflow that is
  `disabled_manually` or a schedule that stopped firing. `economic-dashboard`
  sat 21 days in exactly that state with a green public health badge and never
  produced a bark. Worth a cross-repo sweep (`gh workflow list --all` per Tier-A
  repo) and a standing watchtower check for "no run in N days" alongside the
  existing failure check.

## Ready Tasks — Priority Order

### 1. Gate the data commit on validation passing (closes R2)

- Domain: deploy safety
- Impact: 5 — stops bad data reaching the public dashboard
- Confidence: 5 — a one-line `if:` change on a step that already has an id
- Risk reduction: 5 — closes the P1
- Effort: 1 (10 min)
- Done criteria:
  1. In `.github/workflows/update-data.yml`, the `Commit and push if data
     changed` step becomes `if: always() && steps.validate.outcome == 'success'`.
  2. The artifact upload, issue filing, and alert steps still run on failure.
  3. A comment records *why* the commit is gated.
- Verify: tighten a validation threshold on a scratch branch, dispatch the
  workflow, confirm no commit lands on `main` and the alert issue still opens.
- Note: do this **before** R1 is re-enabled, not after.

### 2. Add a data-freshness check that fails on absence (closes the R1 detection gap)

- Domain: pipeline health
- Impact: 5 — makes a stopped pipeline visible; this is the thing that failed
- Confidence: 4 — straightforward, but the threshold needs judgment around
  weekday-only scheduling and holidays
- Risk reduction: 5 — converts a silent 21-day outage into a red check
- Effort: 2 (25 min)
- Done criteria:
  1. A script (or a vitest case alongside
     `scripts/validate-economic-data.test.mjs`) reads
     `public/data/data_status.json` and fails when `generatedAt` is older than a
     configurable max age (~4 days covers a weekend plus one missed weekday).
  2. It runs in `ci.yml`, so it fails on *any* push — not only inside the
     refresh job that might not fire.
  3. The UI's health badge reflects staleness too: a `PASS` older than the
     threshold should not render as healthy. (If the badge change is more than a
     trivial edit, split it out and file it `[→ user-journey]`.)
- Verify: `generatedAt` backdated in a fixture → check fails; current file →
  passes once R1 is resolved.

### 3. Fix the live type error and add a typecheck gate (closes R3)

- Domain: CI / build health
- Impact: 4 — type regressions currently ship silently
- Confidence: 4 — the error is a Recharts label-renderer signature mismatch;
  the fix is narrowing the return type, not a redesign
- Risk reduction: 4
- Effort: 2 (25 min)
- Done criteria:
  1. `src/components/DashboardView.tsx:458` typechecks — the custom label
     renderer returns a `ReactElement`, not `ReactNode`.
  2. `"typecheck": "tsc --noEmit"` added to `package.json` scripts.
  3. `ci.yml` runs it, and `docs/agent-operating-loop.md`'s gate line is updated
     to fold it into the standard local gate.
- Verify: `npx tsc --noEmit` exits 0; CI shows the step.

### 4. Gate the Pages deploy on tests (closes R4)

- Domain: deploy readiness
- Impact: 4
- Confidence: 2 — **investigate first.** `deploy.yml` is disabled while
  `pages-build-deployment` is active and a `gh-pages` branch exists, so the
  actual publish path is ambiguous. Confirm whether Pages source is "GitHub
  Actions" or "deploy from branch" before rewiring.
- Risk reduction: 3
- Effort: 2
- Done criteria: the publish path is documented in this repo, and whichever
  workflow actually publishes runs `npm test` before building.
- Verify: a failing test blocks a publish.

### 5. Add an ESLint flat config and a lint gate (closes R5)

- Domain: CI / build health
- Impact: 2 · Confidence: 4 · Risk reduction: 2 · Effort: 2
- Done criteria: `eslint.config.js` with `@eslint/js` + `typescript-eslint` +
  `eslint-plugin-react-hooks`; `"lint"` script; CI step; zero errors at the
  chosen rule set (warnings acceptable initially).
- Verify: `npm run lint` exits 0.
- Note: new dev dependencies — flag per the operating loop's hard rules. Land
  after task 3 so CI isn't red on two axes at once.

### 6. Add a smoke test for the dashboard render path

- Domain: test coverage
- Impact: 3 · Confidence: 3 · Risk reduction: 2 · Effort: 3
- Context: the only test file in the repo is
  `scripts/validate-economic-data.test.mjs` (10 cases, all data-validator). All
  of `src/` is untested, including CSV parsing and preset selection.
  `vitest.config.mjs` already includes `src/**/*.test.{ts,tsx,mjs}`, so the
  wiring exists — but `environment: 'node'` means a DOM test needs jsdom.
- Done criteria: one test that parses a small fixture CSV through the app's real
  parsing path and asserts the derived series, *without* adding jsdom if it can
  be avoided. Prefer testing the pure data layer over rendering.
- Verify: `npm test` shows the new case.

## Completed

### 2026-07-24 — Onboard `economic-dashboard` to the pack (Launch Shield, first-wolf bootstrap)

- Files: `docs/agent-operating-loop.md`, `docs/launch-risk-register.md`,
  `docs/agent-backlog.md`, `docs/metrics.md` (all new).
- Verified this session: `npm ci` (clean), `npm test` (10 passed),
  `npm run build` (succeeds, 2,292 modules, clip pre-render OK),
  `npm audit --omit=dev` (0 vulnerabilities), `npx tsc --noEmit` (1 error — R3),
  `gh workflow list --all` (two workflows `disabled_manually` — R1).
- Follow-ups: R1 needs Paul's decision; tasks 1–2 are the next agent work.
