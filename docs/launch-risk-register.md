# Launch Risk Register

Known risks for the public Economic Dashboard, ranked. Recurring agent sessions
should reduce the highest risks first, then update this file with what changed or
what remains uncertain.

Seeded 2026-07-24 by Launch Shield (first-wolf bootstrap). Every item below was
observed directly — commands and outputs are recorded as evidence.

## Severity Scale

- **P0**: the public dashboard is currently wrong, stale, or undeployable.
- **P1**: likely to publish a wrong number or damage trust in the data.
- **P2**: meaningful build/quality/maintainability gap.
- **P3**: polish or longer-term improvement.

## Active Risks

### R1a (P1) — Nothing detects a pipeline that stops running

**This is the unresolved half of R1** (the outage itself is fixed — see Resolved).
The 21-day outage was invisible because every check in this repo and in the
watchtower pack keys on a run that *fails*. A workflow that is
`disabled_manually`, or a cron schedule that stops firing, produces no failed run
and therefore no signal. The dashboard kept rendering a `PASS` badge the whole
time.

Re-enabling the workflows restored the data but did **not** close this. The exact
same outage can recur tomorrow and would again go unnoticed for weeks.

- Domain: pipeline health / observability
- Evidence: between 2026-07-03 and 2026-07-24 the repo produced zero alerts, zero
  auto-filed issues, and zero watchtower barks while publicly serving stale data.
  `send-validation-alert.mjs` and the "Data validation alert" issue flow both hang
  off `steps.validate.outcome == 'failure'`, which requires the job to have run.
- Next mitigation: a wall-clock freshness check that runs *outside* the refresh
  job — fail CI when `data_status.json.generatedAt` is older than ~4 days, so any
  push surfaces it, and make the in-app health badge render stale-PASS as
  unhealthy. See backlog task 2.
- Verification: backdate `generatedAt` in a fixture → check fails.

### R3 (P2) — CI never typechecks, and a type error is already live on `main`

`npm run build` is `vite build`, which transpiles without typechecking. No
`tsc --noEmit` exists in any script or workflow. A real error is currently on
`main` and ships undetected.

- Domain: CI / build health
- Evidence:
  ```
  $ npx tsc --noEmit
  src/components/DashboardView.tsx(458,21): error TS2322:
    Type '(props: any) => ReactNode' is not assignable to type 'ImplicitLabelType | undefined'.
  ```
  `npm run build` exits 0 on the same tree.
- Impact: type regressions in a 2,292-module React app reach production silently.
  `tsconfig.json` already sets `noImplicitAny` and `strictNullChecks`, so the
  intent to typecheck exists — only the gate is missing.
- Next mitigation: fix the `DashboardView.tsx:458` label-renderer typing, add a
  `"typecheck": "tsc --noEmit"` script, and add it to `ci.yml`. Fix and gate in
  the same change, or CI goes red on merge.
- Verification: `npx tsc --noEmit` exits 0; CI shows a typecheck step.

### R4 (P2) — The Pages deploy is not gated on CI; failing tests do not stop a publish

`ci.yml` and `deploy.yml` both trigger on push to `main` and are independent —
no `needs`, no workflow_run dependency, no required-check gate between them.
A push whose tests fail still deploys, because `deploy.yml` only runs
`npm ci && npm run build`.

- Domain: deploy readiness
- Evidence: `.github/workflows/ci.yml` (`on: push: branches: [main]`, runs
  `npm test` + `npm run build`) and `.github/workflows/deploy.yml`
  (`on: push: branches: [main]`, runs `npm run build` only). Neither references
  the other.
- Impact: the only thing standing between a broken commit and the public site is
  whether the *build* fails; test failures are advisory.
- Next mitigation: either run `npm test` inside the deploy job before the build,
  or convert `deploy.yml` to `on: workflow_run` completing successfully for CI.
- Publish path **confirmed 2026-07-24**: `deploy.yml` is the real publisher.
  Run `30143917658` (triggered by the refresh job) succeeded and republished the
  site, so Pages source is the Actions artifact, not the stale `gh-pages` branch.
  The earlier ambiguity from the active `pages-build-deployment` workflow is
  resolved — this task no longer needs an investigation step.
- Verification: push a commit with a deliberately failing test to a scratch
  branch merged to `main` in a test repo, or inspect that the deploy job's run
  list shows the gate.

### R5 (P2) — No lint gate of any kind

There is no ESLint config in the repo and no `lint` script in `package.json`.
Sibling pack repos (`mission-control`) carry `eslint.config.js` and gate on it.

- Domain: CI / build health
- Evidence: no `eslint.config.*` / `.eslintrc*` present; `package.json` scripts
  are `dev`, `build`, `predeploy`, `update:data`, `validate:data`, `alert:data`,
  `test`.
- Impact: unused vars, bad hook deps, and accidental `any` accumulate with no
  signal. Lower severity than R3 because the typecheck catches the sharper class
  of bug.
- Next mitigation: add a flat ESLint config with
  `@eslint/js` + `typescript-eslint` + `eslint-plugin-react-hooks`, a `lint`
  script, and a CI step. Land it *after* R3 so CI isn't red on two axes at once.
  New dev dependencies — flag per the hard rules.
- Verification: `npm run lint` exits 0; CI shows a lint step.

## Resolved

### R2 (P1) — Validation failure did not block the commit, push, or deploy of bad data — RESOLVED 2026-07-24

In `.github/workflows/update-data.yml` the validation step is
`continue-on-error: true`, and the commit step that followed it was
`if: always()`. So when validation failed, the pipeline still committed the bad
CSV to `main`, pushed it, and triggered the Pages deploy — *then* opened an
issue, sent alerts, and marked the run failed. The gate reported the fire after
publishing it.

This was harmless only while the workflow was switched off. Resolving R1
re-armed it, which is why it was fixed the same day.

**Fix:** the commit step is now
`if: always() && steps.validate.outcome == 'success'`.

`outcome` is the *pre*-`continue-on-error` result, so it reads `failure` on a
real validation failure and `skipped` if an earlier step (e.g. the FRED pull)
died — neither is `success`, so both cases fail closed. `always()` is retained so
the gate is evaluated rather than short-circuited by upstream status. The
artifact upload, issue filing, and alerting stay on their own conditions, so a
failure is still fully diagnosable — only the *publish* is withheld. The
run-failure message now states explicitly that the data was not committed or
deployed.

**Verified on a throwaway branch** (`tmp/r2-gate-test`, since deleted) carrying
the identical gate with `git push origin main`, the deploy trigger, the issue
step, and the Resend alert step all neutered — so a broken gate could not reach
`main` and no mail could be sent:

| Case | `Commit and push` | `Trigger Pages deploy` | Run |
|---|---|---|---|
| Validation **fails** (run `30146058767`) | **skipped** | **skipped** | failure |
| Validation **passes** (run `30146081329`) | success | success | success |

`Upload validation report` succeeded in both. In the failing run the `Validate`
step's *conclusion* is `success` (masked by `continue-on-error`) while its
*outcome* is `failure` — confirming the gate reads the field that actually
reflects validation, not the masked one.

### R1 (P0) — Data-refresh and Pages-deploy workflows disabled; 21-day-stale data under a "PASS" badge — RESOLVED 2026-07-24

Both `Update Economic Data` and `Deploy Vite React App to GitHub Pages` were in
state `disabled_manually`, apparently switched off on 2026-07-03 after a deploy
failure on 07-02 and never switched back. The refresh had not run since
2026-07-03; the dashboard rendered a `"status": "PASS"` badge generated the same
day, so a visitor saw a healthy pipeline on three-week-old data. No alerts, no
issues, no barks — see R1a for why.

**Fixed 2026-07-24 on Paul's explicit authorization** (Launch Shield had left it
open as a `[→ paul]` handoff rather than flipping public-facing repo state
unilaterally):

```
$ gh workflow enable "Update Economic Data"
$ gh workflow enable "Deploy Vite React App to GitHub Pages"
$ gh workflow run update-data.yml -f requested_by=launch-shield-2026-07-24
```

Verified end to end:

- `gh workflow list --all` → all four workflows `active`.
- Run `30143901473` succeeded in 34s. `Validate refreshed data against
  thresholds` **passed**, so the unguarded R2 path was not exercised.
- Data advanced: commit `c85841f` on `main`. June 2026 filled in (population,
  housing starts 215000 → 217000, three previously-empty series); July mortgage
  rates moved 5.79/6.43 → 5.96/6.58.
- `data_status.json` now `generatedAt: 2026-07-25T04:22:34Z`, `status: PASS`,
  `failedSeriesCount: 0/27`, `releaseCalendarBreaches: 0`,
  `nextScheduledRefreshUtc: 2026-07-27T13:15:00Z`.
- Pages deploy `30143917658` succeeded — the public site is republished on fresh
  data.

**What this did not fix:** R1a (nothing detects a *stopped* pipeline) and, at the
time, R2 (validation failure did not block publish, and re-enabling armed it).
R2 was closed later the same day — see above. **R1a remains open and is now the
highest-severity item in the repo:** the pipeline is running and fail-closed, but
nothing would notice if it stopped running altogether.

## Trust-surface review — clean, 2026-07-30 (Trust Ledger)

First Trust Ledger visit. **No change shipped, because nothing in this lane is
wrong.** Recorded here so the next wolf doesn't re-derive it — and because a
clean visit that leaves no trace looks identical to a visit that never
happened.

The lane's test is: *does any public claim describe behavior the code does not
actually do?* Five surfaces checked against the **live site**, not the source:

- **Freshness honesty — correct, and this is the one that matters.** R1a's fix
  is live on `main`: `isStatusStale` (4-day window, mirroring
  `scripts/check-data-freshness.mjs`) means a frozen `PASS` renders as stale
  rather than healthy. That closes the exact trust hole R1 described — a green
  badge over three-week-old data. Live `data_status.json` at review time:
  `generatedAt: 2026-07-30T15:22Z`, `status: PASS`, `failedSeriesCount: 0/27`,
  `nextScheduledRefreshUtc: 2026-07-31T13:15Z`.
- **Stated cadence matches the actual schedule.** `update-data.yml` is
  `cron: '15 13 * * 1-5'`; the published next-refresh timestamp agrees.
- **No trackers, so no privacy gap.** The live page and all three JS bundles
  were grepped for GA/GTM/Plausible/PostHog/Hotjar/Clarity/Segment/Sentry —
  **zero hits.** The site collects nothing, so it owes no privacy policy. Worth
  re-checking whenever an analytics dependency is added.
- **Attribution is present and specific.** Every series links to its own FRED
  page in-app, and `sources.md` maps all 27 fields to series IDs, frequency,
  units, and transform notes.
- **README claims match the code**, including the subtle one: *"`Stock
  Market (b)` uses FRED `NCBCEL` as a quarterly fallback, forward-filled
  monthly"* is exactly what the data does.

**One near-miss worth recording, because the correction is the useful part.**
Live `data_status.json` reports `latestBuffettRatio: 0`, and the live CSV has
an empty `Stock Market (b)` for 2026-06 and 2026-07 — which reads at first
glance like the public Buffett Indicator chart plotting a false 0%, i.e. the
strongest possible undervaluation signal, on a dashboard whose entire purpose
is valuation. **It does not.** Two guards prevent it:

1. The CSV parser maps an empty cell to `undefined` (`!isNaN(Number(value)) &&
   value !== ''`), not to `Number('') === 0`.
2. `buffettValue` is only computed when both inputs are `!== undefined`, so
   those months carry no value and the chart simply ends at 2026-05.

And the empty months are *correct*: `NCBCEL` is quarterly with
`forwardFill: 2`, so `csvLatest: 2026-05` from `sourceLatest: 2026-03` is the
expected state, which is why validation passes it.

### R6 (P1) — The embedded-CSV fallback was silent, and could render 11-month-old data under a fresh PASS — RESOLVED 2026-08-12 (User Journey)

**This is R1's trust hole reached through a different pipe, and `isStatusStale`
could not catch it.** R1a's fix asks "is the *status file* stale?" The status
file was never the only way to show old numbers.

`getCsvData()` in `src/App.tsx` tries three sources in order — the opt-in Google
Sheet, the deployed `public/data/economic_indicators.csv`, then `RAW_CSV_DATA`,
a CSV literal compiled into the bundle — and returns whichever answers first,
recording nothing about which one did. The freshness label and the PASS badge
come from a **separate** fetch of `data_status.json`. Nothing tied the two
together.

- Domain: first-run clarity / data trust
- Evidence (read from `origin/main` at `28a8007`):
  - `RAW_CSV_DATA` ends at **9/1/2025**; `public/data/economic_indicators.csv`
    runs through **8/1/2026** — an **11-month** gap.
  - `data_status.json` at the time: `generatedAt: 2026-08-11T14:33:42Z`,
    `status: PASS`, `failedSeriesCount: 0/27`.
  - `dataWarning` state existed and was piped to `DashboardView` (rendered at
    `DashboardView.tsx:276`) but was only ever set for malformed rows — the
    fallback never set it.
  - `lastUpdatedText` preferred `pipelineStatus.generatedAt` unconditionally.
  - The `!response.ok` branch of the local-CSV fetch had no `console.warn` at
    all, so a 404 left no trace anywhere.
- Impact: if the CSV fetch failed while the status fetch succeeded — a flaky
  connection, a proxy or blocker that treats `.csv` differently from `.json`, a
  partial deploy — a first-time visitor saw a complete, confident dashboard of
  **September-2025 data** labelled *"Last updated: Aug 11, 2026, 8:33 AM"* under
  a green PASS, plus a `Loaded N data points` **success** toast. Nothing on
  screen distinguished it from live data.
- Fix: `getCsvData()` now returns a `CsvSource` discriminator
  (`'sheet' | 'local' | 'embedded'`). New pure helper `src/utils/dataSource.ts`
  owns the two decisions, so they are unit-testable without a DOM:
  - `pipelineFreshnessAppliesTo(source)` — `lastUpdatedText` now falls through to
    the last observation actually plotted instead of the pipeline's run time,
    and the PASS/stale toasts are suppressed, when the rows are the bundled
    snapshot. **The status file describes a run that never touched that data.**
  - `fallbackWarning(source, latestPointLabel)` — sets `dataWarning` (finally
    wiring up the banner that already existed) naming where the snapshot ends,
    and fires a warning toast instead of the success toast.
  - `!response.ok` on the local CSV now warns to the console with the status.
- Verification: `npx vitest run` → 23 passed / 3 files (8 new in
  `src/utils/dataSource.test.ts`, covering both decisions and the
  unknown-last-observation case). `npm run build` green; both new strings are
  present in `dist/assets/*.js`, so the path is compiled and reachable.
- **Not verified in a live browser** — this wolf cannot drive one, and the repo
  has no jsdom/testing-library, so the *wiring* (App state → banner) is argued
  from the source, not executed. The decision logic underneath it is tested.
  See the `[→ launch-shield]` handoff in the backlog for closing that gap.

**Follow-up 2026-08-26 (Trust Ledger) — the header was fixed; the Data Table
tab's own "Data Health" card was not, and made the identical false claim.**
Filed as a `[→ trust-ledger]` handoff by User Journey on 08-12 asking for a
re-read of the freshness surface after this fix. `DataTableView.tsx`'s Data
Health card (pipeline PASS/FAIL badge, "All data sources are up to date",
"Last checked <time>", per-series fresh/stale counts, "Latest month", and the
top-alerts list) is driven entirely by `pipelineStatus` with no `csvSource`
check — so on the exact fallback this risk describes, that card would still
render a green **"Healthy"** badge and a fresh "Last checked" timestamp for
data that is up to 11 months stale, even though the header right above it
(and the `dataWarning` banner) correctly say otherwise. Same trust hole,
different view, because the fix above only touched `lastUpdatedText` and the
toasts in `App.tsx`. Fix: `DataTableView` now takes a required
`pipelineStatusApplies` prop (`pipelineFreshnessAppliesTo(csvSource)`, passed
from `App.tsx`) and every pipeline-status-derived string/badge in the Data
Health card is gated on it — on the fallback it now reads "Not applicable —
showing the snapshot bundled with this build" instead of asserting health it
cannot know. Verification: `npm run build` green, `npm test` 26/26 passing
(no regression; this repo has no component-level tests to extend — see the
08-12 note above about the missing jsdom/testing-library gap, still open).

**Follow-up 2026-09-02 (Trust Ledger) — the same hole, a third time, on the
Dashboard tab's headline cards — the most-seen view in the app.** Found while
re-reading the 08-26 fix before landing it, not from a new handoff.
`App.tsx`'s `activeMetricConfidence` — the per-metric confidence badge and
"Current through <month>" text on the Dashboard tab's headline cards
(`DashboardView.tsx:517-554`) — read `pipelineStatus` directly with no
`csvSource` gate, even though the sibling `lastUpdatedText` memo four lines
above it in the same file already carries the comment explaining exactly why
that is unsafe. On the fallback this rendered a green **"Fresh"** badge and
`Current through <the live pipeline's month>` over headline values drawn from
up to 11-month-stale bundled data — the single most visible instance of this
bug yet, since the Dashboard is the default tab. Fix: `activeMetricConfidence`
now short-circuits to `level: 'unknown'`, `label: 'Unknown'`, `detail: 'Not
applicable — showing the snapshot bundled with this build.'` when
`!pipelineFreshnessAppliesTo(csvSource)`, matching the 08-26 fix's gate and
wording; `csvSource` added to the memo's dependency array. Verification:
`npm run build` green (incl. clip pre-render), `npm test` 26/26 passing (same
missing jsdom/testing-library gap, no component test to extend). Grepped the
rest of `src/` for other direct `pipelineStatus` reads afterward: only
`App.tsx` and `DataTableView.tsx` reference it, and every read in both is now
gated — no fourth instance found this visit.

## Watching (not yet Active)

- **`latestBuffettRatio: 0` conflates "zero" with "unavailable." — RESOLVED
  2026-08-12.** Was harmless because nothing renders that field — the dashboard
  computes the ratio from the CSV instead — but `0` is the most misleading
  possible placeholder for this metric, a live wrong number the moment anyone
  surfaces it in the UI or an alert. Filed by Trust Ledger 2026-07-30. **Fix:**
  the generator now routes the latest GDP/stock cells through `parseCsvNumber`
  (blank → `null`) and a `computeBuffettRatio` helper that returns `null` for any
  missing or non-positive input, so a blank `Stock Market (b)` cell can no longer
  coerce via `Number('') === 0` into a fake 0% ratio. `data_status.json` now
  emits `null`; regression-tested in `validate-economic-data.test.mjs`.
- **Dev-toolchain advisories — now gated automatically.** `npm audit
  --omit=dev` reports **0 vulnerabilities** — the production tree is clean. The
  full tree reports 4 (3 high, 1 moderate): `vite`, `postcss`, `esbuild`, and
  `nanoid` — all dev-server/build-time only, and this app ships as static files
  with no server. Remediation is a Vite major bump — breaking, and not worth
  doing ahead of R1–R4. As of 2026-08-12 the production-tree audit no longer
  depends on a manual re-check: `npm run audit:deps`
  (`npm audit --omit=dev --audit-level=low`) runs on every push/PR in `ci.yml`
  **and** daily via `dependency-audit.yml`, sharing one script so the two gates
  cannot drift. A new production advisory now fails CI or barks from the
  scheduled run within a day. The dev-only advisories above stay intentionally
  out of scope (`--omit=dev`).
- **Lockfile drift, already handled; superseded branches pruned 2026-08-12.**
  `package.json` carries `overrides` pinning `@emnapi/core`, `@emnapi/runtime`,
  `@emnapi/wasi-threads` — the pack's known mac-prunes-emnapi-from-lock failure
  that breaks `npm ci` on Linux CI. `npm ci` succeeds locally and in CI, so the
  override is holding. The two superseded local branches were confirmed contained
  on `main` and deleted: `fix/lockfile-sync` landed via merged PR #11 (its
  `package-lock.json` blob is identical to the #11 merge commit; `git cherry`
  shows a patch-id match on `main`), and `fix/lockfile-linux-emnapi` via merged
  PR #12 (its `package-lock.json` is byte-identical to current `main`, and the
  overrides are present). `fix/r1a-freshness-detection` was **kept**, not pruned:
  its R1a work landed via PR #17, but it still carries an un-landed "agent context
  layer" commit (`CLAUDE.md`, `docs/agent-notes.md`) that is absent from `main`.
- **`0.0.0` version, `private: true`.** No release identity. Cosmetic for a
  static public site; note only.
