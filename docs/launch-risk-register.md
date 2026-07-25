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

### R2 (P1) — Validation failure does not block the commit, push, or deploy of bad data

In `.github/workflows/update-data.yml` the validation step is
`continue-on-error: true`, and the commit step that follows is `if: always()`.
So when validation fails, the pipeline still commits the bad CSV to `main`,
pushes it, and triggers the Pages deploy — *then* opens an issue, sends alerts,
and marks the run failed. The gate reports the fire after publishing it.

- Domain: deploy safety / data honesty
- Evidence: `.github/workflows/update-data.yml` step order —
  `Validate refreshed data against thresholds` (id `validate`,
  `continue-on-error: true`) → `Open issue if validation fails` → `Commit and
  push if data changed` (id `commit`, `if: always()`, runs
  `git push origin main`) → `Trigger Pages deploy` (`if: steps.commit.outputs.pushed == 'true'`)
  → `Mark run failed when validation fails`.
- Impact: any FRED drift, format change, or bad series that validation is
  designed to catch reaches the public dashboard anyway.
- **Status changed 2026-07-24: this is now LIVE, not latent.** It was previously
  harmless only because the workflow was switched off. Paul authorized re-enabling
  and the pipeline is running again on the weekday 13:15 UTC schedule (next run
  2026-07-27T13:15Z), so the unguarded path is armed. The 2026-07-24 manual run
  passed validation, so nothing bad has shipped — but the next failure publishes
  before it alerts. **This is the top-priority fix in the repo.**
- Next mitigation: gate the commit on validation —
  `if: always() && steps.validate.outcome == 'success'` — or split into a
  fail-closed path that still uploads the report and opens the issue but does not
  push. Keep the artifact upload and issue-filing on `always()` so a failure is
  still diagnosable.
- Verification: force a validation failure (e.g. tighten a threshold in a
  scratch branch), dispatch the workflow, confirm no commit lands on `main` and
  the issue is still filed.

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

**What this did not fix:** R1a (nothing detects a *stopped* pipeline) and R2
(validation failure still doesn't block publish, and is now armed). Resolving R1
without those two means the outage can silently recur, and the next validation
failure ships before it alerts.

## Watching (not yet Active)

- **Dev-toolchain advisories.** `npm audit --omit=dev` reports **0
  vulnerabilities** — the production tree is clean. The full tree reports 3 (2
  high, 1 moderate): `vite` (path traversal in optimized-deps `.map` handling,
  `server.fs.deny` bypass on Windows), `postcss` (source-map path traversal),
  `esbuild` (dev-server request forwarding). All are dev-server/build-time only
  and this app ships as static files with no server. Remediation is a Vite major
  bump — breaking, and not worth doing ahead of R1–R4. Re-check each visit.
- **Lockfile drift, apparently already handled.** `package.json` carries
  `overrides` pinning `@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`
  — the pack's known mac-prunes-emnapi-from-lock failure that breaks `npm ci` on
  Linux CI. `npm ci` succeeds locally and CI passed on 2026-07-08, so the
  override is holding. Two **unpushed local branches** (`fix/lockfile-sync`,
  `fix/lockfile-linux-emnapi`) still exist in Paul's checkout and appear
  superseded — confirm before pruning.
- **`0.0.0` version, `private: true`.** No release identity. Cosmetic for a
  static public site; note only.
