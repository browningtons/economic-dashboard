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

### R1 (P0) — The data-refresh and Pages-deploy workflows are both disabled; the site has served 21-day-stale data under a "PASS" health badge

Both scheduled/deploy workflows are in state `disabled_manually`. The refresh has
not run since 2026-07-03; today is 2026-07-24. The dashboard still renders
`data_status.json` — generated 2026-07-03, reading `"status": "PASS"`,
`"failureCount": 0`, `"nextScheduledRefreshUtc": "2026-07-06T13:15:00.000Z"` — so
a visitor sees a healthy-pipeline badge on three-week-old data. `2026-07` rows in
the CSV are mostly empty; June releases that have since published are missing.

- Domain: deploy readiness / pipeline health
- Evidence:
  ```
  $ gh workflow list --all
  CI                                       active              309130958
  Deploy Vite React App to GitHub Pages    disabled_manually   217902327
  Update Economic Data                     disabled_manually   238848286
  pages-build-deployment                   active              211008939

  $ git log -1 --date=iso -- public/data/economic_indicators.csv
  8810b38 2026-07-03 15:24:13 +0000 chore(data): auto-update economic indicators snapshot
  ```
  Last `schedule` run of *Update Economic Data*: 2026-07-03T15:23:41Z. No runs of
  any workflow at all since 2026-07-08.
- Why nobody noticed: **a disabled workflow produces no failed run.** The repo's
  own alerting (`send-validation-alert.mjs`, the auto-filed "Data validation
  alert" issue) only fires when validation *runs and fails*. The watchtower pack
  likewise barks on failing pipelines, not absent ones. This failure mode is
  invisible to every check that currently exists.
- Suspected trigger: the deploy workflow failed on 2026-07-02
  (`workflow_dispatch`, 10m45s, conclusion `failure`) and both workflows were
  switched off the following day — plausibly to stop the noise, then never
  switched back.
- Next mitigation, in order:
  1. **Paul's decision first** — confirm *why* they were disabled before
     re-enabling. Re-enabling resumes automated commits to `main` and republishes
     a public site.
     `gh workflow enable "Update Economic Data" && gh workflow enable "Deploy Vite React App to GitHub Pages"`
  2. Then run once by hand (`gh workflow run update-data.yml`) and confirm the
     CSV advances and the badge date moves.
  3. Then close the detection gap so this cannot recur silently — see R2's
     freshness-check note. A staleness check that fails CI when
     `data_status.json.generatedAt` is older than ~4 days catches *absence*,
     which nothing currently does.
- Verification: `gh workflow list --all` shows both `active`; a fresh commit to
  `public/data/economic_indicators.csv` lands; `generatedAt` is within 4 days.
- **Deliberately not fixed in the bootstrap session** — flipping repo state is
  outward-facing (publishes a public site), the original reason for disabling is
  unknown, and first-wolf bootstrap seeds rather than ships.

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
  designed to catch reaches the public dashboard anyway. This is latent right
  now only because the workflow is disabled (R1) — re-enabling R1 without fixing
  R2 arms it.
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
  Note this interacts with R1 — `deploy.yml` is currently disabled, and the
  active `pages-build-deployment` workflow plus the existing `gh-pages` branch
  suggest the Pages source may be branch-based rather than Actions-artifact
  based. **Confirm the real publish path before changing the deploy wiring.**
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
