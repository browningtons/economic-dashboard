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

## Radical bets

*(Filed by Learning Loop, 2026-W36 Pathfinder pass — Jobs-to-be-done lens. Proposals
for Paul to select, NOT auto-build. `economic-dashboard` is the last Tier-A repo to
get a Pathfinder pass — see `portfolio.md`'s Pathfinder log in `mission-control`.)*

**The job (as built):** the site is a "pick a lens, eyeball a chart" tool for a
visitor who already knows what they're looking for — `src/presets.ts` pairs 2-4 FRED
series per named narrative, `DashboardView.tsx` renders a dual-axis chart plus an R²
stat. That's closer to *"see if two macro series still move together"* than to
*"tell me if I should be worried about the economy,"* which is the job most visitors
actually walk in with.

1. **🌶 Give every chart a one-sentence plain-English verdict.** The site already
   computes the R² correlation; the missing piece isn't data, it's narration — an
   R² number means nothing to a lay reader, but *"Housing and mortgage rates have
   decoupled since 2023 — buyers stopped waiting for rates to drop"* does. Why now:
   this is the single biggest gap between what the app computes and what a visitor
   can use, and it's the cheapest to test — no backend change. Smallest slice:
   hand-write one static interpretive caption for each of the 5 existing presets,
   shown under the chart title (no LLM, no dynamic generation yet). Risk: medium —
   stale or wrong interpretive copy ages worse than a raw chart, and getting the
   tone wrong on public economic commentary is reputationally sensitive; needs a
   review cadence tied to data updates, not a one-time write.

2. **Give the site memory — a "since you last checked" diff.** The only
   `localStorage` use anywhere in `src/` today is `ClipRemixer.tsx`'s producer-side
   draft autosave; there's no visitor-facing bookmark, watchlist, or return-visit
   state at all, so every visit re-derives the same read from scratch. Smallest
   slice: a single home-page banner comparing the latest data point on the default
   preset to its value on the visitor's last recorded visit (timestamp in
   `localStorage`), browser-only, no auth/backend needed. Risk: low-medium — FRED
   revises historical values between visits, so a naive diff could show a "change"
   that's actually a data revision, not new information; needs to diff against the
   *as-of-last-visit* vintage, not just re-read today's series.

3. **Retire the pipeline-health badge as the UI's organizing metaphor.**
   `docs/launch-risk-register.md` R6 (resolved 2026-08-12) found the app could
   render an 11-month-stale embedded CSV under a fresh-looking green "PASS" badge —
   evidence the UX is built around *"did the pipeline succeed"* (the operator's
   question) rather than *"is this number current"* (the visitor's question), even
   after the specific bug closed. Smallest slice: restyle the existing freshness
   badge to speak the visitor's question directly ("Updated through July 2026 —
   normal"), driven by the same underlying check, instead of exposing internal
   pipeline state as the primary trust signal. Risk: low — presentation-only change
   over an already-correct check.

## Handoffs

- `[→ launch-shield]` **Nothing checks that the deployed site actually serves
  `data/economic_indicators.csv`.** R6 (see the register) fixed the *symptom* —
  the app now says so when it falls back to the bundled snapshot — but nothing
  detects the *trigger*. A post-deploy check that fetches
  `https://browningtons.github.io/economic-dashboard/data/economic_indicators.csv`
  and asserts HTTP 200 plus a last row within ~40 days would catch a missing or
  truncated data file before a visitor does. This is the same absence-shaped
  blind spot as R1a, one layer out: R1a asks whether the pipeline ran, this asks
  whether its output actually reached the CDN. Filed 2026-08-12 by User Journey.
- `[→ trust-ledger]` **Re-read the freshness surface after R6.** Your 2026-07-30
  review checked `isStatusStale` against the live site and correctly called it
  clean; R6 is the case that review could not see, because it only appears when
  the CSV and status fetches disagree. The header no longer dates bundled rows
  with the pipeline's run time — worth a look on your next visit to confirm the
  copy reads honestly in that state. Filed 2026-08-12 by User Journey.

- ~~`[→ paul]` Decide whether to re-enable the two disabled workflows (R1).~~
  **Closed 2026-07-24** — Paul authorized; both workflows re-enabled, refresh
  dispatched and passed, site republished on fresh data. See R1 under Resolved.
  The pipeline is live and running weekdays at 13:15 UTC. It was briefly live
  with R2 unfixed; R2 was closed the same day, so the refresh now fails closed.
- ~~`[→ learning-loop]` **Promote the absent-run blind spot to the pack.**~~
  **Claimed 2026-07-26 by Learning Loop.** Promoted to the canonical loop as
  [*Liveness: every check we own tests for failure, none tests for absence*](https://github.com/browningtons/mission-control/blob/main/docs/agent-operating-loop.md),
  into `agents/launch-shield.md` (the wolf that owns CI health) and
  `agents/learning-loop.md` (the ring-wide sweep), and filed as
  mission-control **A19** — give every wolf a `pipeline_runs` heartbeat, the way
  the business-arm routines already do, so a lane that stops is a one-line query.
  **The sweep paid off on its first outing:** `base-layer` re-entered the Tier-A
  ring on 07-24 with all four workflows — including `CI` — still
  `disabled_manually` from its archive period, and no run of any kind since
  2026-06-07. Filed as mission-control **A17**. This repo's own instance is the
  one that taught the pack to look.

## Ready Tasks — Priority Order

### 1. Add a data-freshness check that fails on absence (closes R1a)

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
- Verify: `generatedAt` backdated in a fixture → check fails; current file
  (`2026-07-25T04:22:34Z`) → passes.
- Note: R1 being resolved makes this *more* valuable, not less — the pipeline is
  running again, so this check now has a healthy baseline to protect rather than
  a known-broken state to flag.

### 2. Fix the live type error and add a typecheck gate (closes R3)

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

### 3. Gate the Pages deploy on tests (closes R4)

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

### 4. Add an ESLint flat config and a lint gate (closes R5)

- Domain: CI / build health
- Impact: 2 · Confidence: 4 · Risk reduction: 2 · Effort: 2
- Done criteria: `eslint.config.js` with `@eslint/js` + `typescript-eslint` +
  `eslint-plugin-react-hooks`; `"lint"` script; CI step; zero errors at the
  chosen rule set (warnings acceptable initially).
- Verify: `npm run lint` exits 0.
- Note: new dev dependencies — flag per the operating loop's hard rules. Land
  after task 3 so CI isn't red on two axes at once.

### 5. Add a smoke test for the dashboard render path

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

### 2026-08-12 — Make the embedded-CSV fallback visible (closes R6)

- First User Journey visit to this repo. No bark, no `[→ user-journey]` handoff,
  no open P0 — all four open risks (R1a, R3, R4, R5) are pipeline/CI work in
  other lanes — so this was a first-run walk of the deployed journey, traced in
  source.
- Found: the app silently falls back to a CSV literal compiled into the bundle
  (last observation **9/2025**, vs **8/2026** live) while the freshness label and
  PASS badge read from a *separate* `data_status.json` fetch that can succeed
  independently. Result: 11-month-old numbers under "Last updated: Aug 11, 2026"
  and a green PASS, with a `Loaded N data points` success toast. Full evidence in
  R6.
- Change: `src/utils/dataSource.ts` (new, pure) +
  `src/utils/dataSource.test.ts` (new, 8 cases) + `src/App.tsx` wiring.
  `getCsvData()` now reports which source answered; freshness is attributed to
  the source that produced the rows on screen; the long-dead `dataWarning`
  banner is finally set; the success toast becomes a warning; the `!response.ok`
  path gets a `console.warn`.
- Why a separate pure module rather than inline conditionals: `vitest.config.mjs`
  runs in a `node` environment and the repo has no jsdom or testing-library, so
  logic embedded in the component is untestable here. Extracting the two
  decisions follows the `src/utils/staleness.ts` precedent and makes them
  regression-tested. **Adding jsdom was out of scope for one session and would
  have been a new dev dependency** — flagged rather than taken.
- Verify: `npx vitest run` → 23 passed / 3 files. `npm run build` green.
  `grep -o "Live data could not be loaded" dist/assets/*.js` matches.
- Note: `npx tsc --noEmit` **could not be run** — TypeScript is not installed in
  this repo at all, which is consistent with R3 ("CI never typechecks") and means
  R3's recorded `DashboardView.tsx:458` error was not re-confirmed this session.
  The Vite build transpiles clean.
- Follow-ups filed: `[→ launch-shield]` (detect the trigger, not just the
  symptom) and `[→ trust-ledger]` (re-read the freshness copy in the fallback
  state) — both under Handoffs.

### 2026-07-24 — Gate the data commit on validation passing (closes R2)

- Change: `.github/workflows/update-data.yml`, commit step `if: always()` →
  `if: always() && steps.validate.outcome == 'success'`. Run-failure message now
  states the data was not committed or deployed.
- Why `outcome` and not `conclusion`: `continue-on-error: true` masks the
  validate step's *conclusion* to `success` even when it fails. `outcome` is the
  pre-mask result. Reading `conclusion` here would have silently no-oped the gate
  — verified in the failing run below, where conclusion=success, outcome=failure.
- `always()` retained so the condition is evaluated rather than short-circuited;
  a `skipped` validate (earlier step died) also fails closed.
- Verified on throwaway branch `tmp/r2-gate-test` (deleted after) with the push,
  deploy trigger, issue step, and Resend alert all neutered so a broken gate
  could not reach `main` and no mail could be sent:
  - validation fails → run `30146058767`: commit **skipped**, deploy **skipped**,
    run red, report artifact still uploaded.
  - validation passes → run `30146081329`: commit ran, deploy ran, run green.
- Follow-ups: **R1a is now the top risk** — the pipeline fails closed, but
  nothing detects it not running at all. That is task 1.

### 2026-07-24 — Onboard `economic-dashboard` to the pack (Launch Shield, first-wolf bootstrap)

- Files: `docs/agent-operating-loop.md`, `docs/launch-risk-register.md`,
  `docs/agent-backlog.md`, `docs/metrics.md` (all new).
- Verified this session: `npm ci` (clean), `npm test` (10 passed),
  `npm run build` (succeeds, 2,292 modules, clip pre-render OK),
  `npm audit --omit=dev` (0 vulnerabilities), `npx tsc --noEmit` (1 error — R3),
  `gh workflow list --all` (two workflows `disabled_manually` — R1).
- Follow-ups: tasks 1–2 are the next agent work.

### 2026-07-24 — Restart the data pipeline (R1, on Paul's authorization)

- Actions: `gh workflow enable` on both `Update Economic Data` and `Deploy Vite
  React App to GitHub Pages`; `gh workflow run update-data.yml`.
- Verified: run `30143901473` succeeded in 34s with validation **passing** (so the
  open R2 path was not exercised); data commit `c85841f` landed on `main` with
  June/July series advancing; `data_status.json generatedAt` moved 2026-07-03 →
  2026-07-25T04:22:34Z, `0/27` series failing; Pages deploy `30143917658`
  succeeded and republished the public site.
- No repo files changed by this action — it was workflow state plus a bot commit.
- Follow-ups: **R2 is now armed** (task 1, next scheduled run 2026-07-27T13:15Z)
  and **R1a is untouched** (task 2). Restarting the pipeline did not add the
  ability to notice it stopping again.
