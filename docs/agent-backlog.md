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

- `[→ paul]` **P0 — flip GitHub Pages' Source to "GitHub Actions" (Settings → Pages → Build and
  deployment → Source).** It is currently "Deploy from a branch: main," so GitHub's own legacy
  builder republishes the raw unbuilt `index.html` on every push and clobbers `deploy.yml`'s
  real artifact — the live site is provably not the built app right now (see R7 in the risk
  register for the curl evidence). The pack's token gets a 403 trying to change this via the
  API; it needs a human in the browser. No workflow edit needed afterward — `deploy.yml` already
  does the right thing, it just isn't being listened to. Filed to Meseeks as high-priority
  2026-09-11.
- ~~`[→ launch-shield]` **Nothing checks that the deployed site actually serves
  `data/economic_indicators.csv`.**~~ **Closed 2026-08-26 by Launch Shield.**
  `scripts/check-deployed-data.mjs` fetches the live CSV, asserts HTTP 200, and
  fails when the last row is older than 40 days. See Completed for why it
  isn't wired into `deploy.yml` yet — `[→ paul]` below.
- ~~`[→ paul]` **Wire `npm run check:deployed` into `deploy.yml` — the pack's PAT
  can't push workflow-file edits.**~~ **Closed 2026-09-13 — already done.**
  `deploy.yml`'s `verify` job (`needs: deploy`, runs `npm run check:deployed`)
  was live on `main` by this visit, applied by hand at some unrecorded point
  after the 08-26 filing. Filed 2026-08-26.
- ~~`[→ paul]` **Gate the Pages deploy on tests (R4) — same PAT blocker, confirmed
  again.**~~ **Closed 2026-09-13 by Launch Shield.** `deploy.yml`'s `npm test`
  step was already live on `main` (applied by hand, unrecorded); this visit
  added the missing `npm run typecheck` step alongside it, closing R4 in full
  (`pack/launch-shield` @ `2823710`, CI green). **The PAT `workflow`-scope
  block is gone as of this run** — the edit pushed on the first try, no
  `refusing to allow...without workflow scope` error. See R4 in the risk
  register. Filed 2026-09-06.
- ~~`[→ paul]` **Wire `npm run typecheck` into `ci.yml` — same PAT `workflow`
  scope blocker as above.**~~ **Closed 2026-09-13 — already done.** `ci.yml`
  runs `npm run typecheck` between `npm test` and `npm run build`; live on
  `main` by this visit (landed via #22/#25, never reconciled here). Filed to
  Meseeks 2026-08-30.
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

> Task 1 (data-freshness check, closes R1a) shipped 2026-07-26 via
> [#17](https://github.com/browningtons/economic-dashboard/pull/17)
> (`scripts/check-data-freshness.mjs` + `ci.yml`'s daily cron), including its
> UI-badge done-criterion (`src/utils/staleness.ts`'s `isStatusStale`, wired
> into `App.tsx`/`DataTableView.tsx`, confirmed live by Trust Ledger
> 2026-07-30). It was never moved out of Ready or into Completed, and R1a was
> never moved to Resolved in the register — both fixed this visit; see
> Completed and the register's R1a entry.

### 1. Add an ESLint flat config and a lint gate (closes R5)

- Domain: CI / build health
- Impact: 2 · Confidence: 4 · Risk reduction: 2 · Effort: 2
- Done criteria: `eslint.config.js` with `@eslint/js` + `typescript-eslint` +
  `eslint-plugin-react-hooks`; `"lint"` script; CI step; zero errors at the
  chosen rule set (warnings acceptable initially).
- Verify: `npm run lint` exits 0.
- Note: new dev dependencies — flag per the operating loop's hard rules.

## Completed

### 2026-09-13 — Gate the Pages deploy on typecheck too, not just tests; reconcile three stale `[→ paul]` handoffs (Launch Shield)

- Liveness check (`gh workflow list` / `gh run list`) was clean: all five
  workflows active, most recent runs (CI, Dependency audit) green same-day.
  R7 (P0, Pages Source misconfigured) re-verified still live via curl + `gh
  api .../pages` — unchanged, still blocked on Paul, PR #26 already covers it
  and remains open/mergeable/CI-green, so no new work there this visit.
- While reading the backlog, found three `[→ paul]` handoffs whose blocker —
  "PAT lacks `workflow` scope, can't push `.github/workflows/*.yml` edits" —
  no longer matched reality: `deploy.yml`'s `npm test` step and `verify` job,
  and `ci.yml`'s `typecheck` step, were all already live on `main`, just never
  reconciled in these docs. Task 1 ("Gate the Pages deploy on tests") was
  still listed Ready for the same reason.
- Tested the premise before trusting three-visit-old text: added
  `deploy.yml`'s missing `npm run typecheck` step (the one piece of task 1
  actually not yet done) and pushed straight to `pack/launch-shield` —
  succeeded on the first try, no `workflow`-scope rejection
  (`pack/launch-shield` @ `2823710f`, CI green). The PAT restriction that
  produced three separate handoffs is gone.
- Closed R4 in the risk register, closed all three stale `[→ paul]` handoffs
  above, removed task 1 (now fully done) from Ready Tasks.
- Verify: `gh run list -R browningtons/economic-dashboard --branch
  pack/launch-shield` shows CI `success` on `2823710f`; `deploy.yml` on that
  branch runs `typecheck` → `test` → `build` in the `build` job.

### 2026-09-11 — Retry the post-deploy verify against CDN propagation delay; found the real outage underneath it (Launch Shield)

- Picked up via the liveness check (`gh run list`): `Deploy Vite React App to
  GitHub Pages` had failed on 09-07 (×2), 09-08, and again minutes before this
  visit (09-11) — all on the same `check:deployed` 404. Started as a flaky-CI
  fix and found something bigger underneath.
- Shipped: `scripts/check-deployed-data.mjs` now retries a transient failure
  (unreachable / non-2xx) up to 6 times, 15s apart, before failing — `deploy-
  pages@v4` can report success before every CDN edge node serves the new
  path, and one immediate check can't tell that apart from a real outage. A
  genuinely stale CSV does **not** retry — waiting can't fix old data, so that
  failure mode still fails on the first attempt. New exported
  `checkDeployedDataWithRetry()`, 3 new test cases (retries-then-succeeds,
  exhausts-then-fails, stale-does-not-retry).
- **Ran the fixed check against the real live URL to confirm it actually
  helps — it didn't.** Six retries over 90s, still 404. That's not
  propagation lag, so this run kept going instead of shipping a fix that
  wouldn't fix anything: **filed R7 — GitHub Pages' Source is set to "Deploy
  from a branch," not "GitHub Actions," so the live site is the raw unbuilt
  `index.html`/`main.tsx`, not `deploy.yml`'s artifact, and never has been
  since whatever flipped it.** See R7 in the risk register for the full
  evidence and the `[→ paul]` handoff above for the fix (needs repo-admin
  access the pack's token doesn't have — confirmed via a 403 on `gh api -X PUT
  .../pages`). Filed to Meseeks as high-priority.
- The retry fix ships anyway: it's a real, tested improvement to a check that
  will matter again the moment R7 is fixed and genuine CDN propagation lag
  becomes the only failure mode left.
- Verify: `npx vitest run scripts/check-deployed-data.test.mjs` → 10 passed
  (was 7). `npm test` → 46 passed / 5 files. `npx tsc --noEmit` → 0 errors.
  `npm run build` → green.

### 2026-09-06 — Add a smoke test for the dashboard render path (Launch Shield)

- Extracted the CSV-to-`DataPoint` parsing App.tsx's `loadData` ran inline
  (header validation, quoted-field splitting, Buffett-ratio and Yield-Spread
  derivation, malformed-row skipping, chronological sort) into a new pure
  module, `src/utils/parseCsvData.ts`, following the `dataSource.ts`/
  `staleness.ts` precedent of moving DOM-adjacent logic somewhere `vitest`'s
  `node` environment can reach it. `App.tsx` now calls `parseCsvData()` instead
  of duplicating the logic; net -99/+6 lines there.
- New `src/utils/parseCsvData.test.ts`, 8 cases: quoted/escaped CSV fields,
  Buffett-ratio derivation, chronological sort on out-of-order input, malformed
  row skipping (wrong column count, unparseable date), missing-required-column
  error, empty/header-only CSV error, and the all-rows-malformed error path.
- Verify: `npm test` → 43 passed / 5 files (was 35/4). `npx tsc --noEmit` → 0
  errors. `npm run build` → green, 2,295 modules. `npm run audit:deps` → 0
  vulnerabilities. Built `dist/` before and after the refactor and diffed it:
  only the content-hashed JS filename changed (expected — the bundle's bytes
  moved), every literal error string (`CSV appears empty`, `Missing required
  columns`, `no valid rows were found`) is present in both bundles — the
  extraction is behavior-preserving, not just green-on-paper.
- Also confirmed, while checking whether R4/R5's remaining mitigations were
  pushable: **R4's `npm test` step hits the identical PAT-workflow-scope
  rejection R5 and the `check:deployed` wiring already hit** — pushing a
  `deploy.yml` edit was rejected with the same *"refusing to allow a Personal
  Access Token to create or update workflow ... without `workflow` scope"*
  error. Reverted the local commit (never left the machine) and filed
  `[→ paul]` above rather than re-describing R4 as merely "not yet attempted."

### 2026-08-30 — Fix the live type error and add a typecheck gate (closes R3)

- Change: narrowed `renderReferenceLabel`'s prop type in
  `src/components/DashboardView.tsx` from `React.ReactNode` to
  `React.ReactElement` — every real caller (`App.tsx`) always returns a
  `<RenderLabel>` element, so the broader `ReactNode` (which also admits
  `bigint`, `string`, etc.) was wrong, not the Recharts `label` prop's
  narrower `ImplicitLabelType`. Added `typescript` as a dev dependency and
  `"typecheck": "tsc --noEmit"` in `package.json`, and folded it into
  `docs/agent-operating-loop.md`'s local gate line.
- **Not wired into `ci.yml` in this change** — same PAT `workflow`-scope
  blocker as the `check:deployed` handoff above; `git push` rejected the
  workflow-file edit. Filed `[→ paul]` above with the exact one-line diff;
  the script ships and runs manually (`npm run typecheck`) in the meantime.
- Verify: `npx tsc --noEmit` exits 0. `npx vitest run` → 33 passed / 4 files
  (unchanged). `npm run build` green. `npm audit --omit=dev` → 0
  vulnerabilities.
- Note: this repo had no `typescript` package at all despite `.tsx` sources
  and a `tsconfig.json` — Vite's build only transpiles, never typechecks, so
  the gap was invisible to every existing check. The typecheck task was
  already documented in Ready Tasks (the operating loop's "flag a new
  dependency in the backlog first" rule), so adding the dependency here
  fulfills that flag rather than skipping it.
- Follow-up: task 1 (deploy gate, closes R4) now references this gate.

### 2026-08-26 — Detect the CDN not serving current data (closes the `[→ launch-shield]` handoff)

- Claimed the `[→ launch-shield]` handoff User Journey filed 2026-08-12: R1a's
  freshness check (`check-data-freshness.mjs`) only reads the *committed*
  `data_status.json` on the wall clock, so it catches a stopped refresh
  pipeline but not a refresh that ran and committed fine while its output
  never reached the CDN (a bad Pages deploy, a caching layer serving a stale
  artifact, a truncated upload).
- Change: `scripts/check-deployed-data.mjs` (new, pure `checkDeployedData()` +
  CLI wrapper, mirrors `check-data-freshness.mjs`'s shape) fetches the live
  `https://browningtons.github.io/economic-dashboard/data/economic_indicators.csv`,
  asserts HTTP 200, and fails when the last row's Observed Date is older than
  40 days. `scripts/check-deployed-data.test.mjs` (7 cases, fetch mocked —
  200/404/network-error/empty-body/custom-threshold). New `npm run
  check:deployed` script.
- **Not wired into CI in this change.** A `verify` job on `deploy.yml`,
  `needs: deploy`, was written and tested locally, but `git push` was rejected:
  *"refusing to allow a Personal Access Token to create or update workflow
  `.github/workflows/deploy.yml` without `workflow` scope"* — the pack's PAT
  cannot push workflow-file edits at all, the same blocker `appkit` A8 and
  `mission-control`'s Actions checkout already hit. Filed `[→ paul]` above
  with the exact job to add by hand; the check itself ships and can be run
  manually (`npm run check:deployed`) in the meantime.
- Also reconciled two stale-documentation findings hit while reading the
  register and backlog against the actual repo state (task 1 and task 2 in
  Ready Tasks, R1a in the register) — see those entries for detail. Both were
  real work already shipped (PR #17, and R4's investigation) that nobody
  updated the docs to reflect, not new mission work.
- Verify: `npx vitest run` → 33 passed / 4 files (was 26/3). `npm run build`
  green. `node scripts/check-deployed-data.mjs` against the real live URL →
  `Deployed CSV is fresh: last row is 25.6 days old (max 40).`, exit 0.

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
