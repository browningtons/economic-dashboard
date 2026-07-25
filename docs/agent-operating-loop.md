# Agent Operating Loop — Economic Dashboard

How Claude works on this repo. Adapted from the canonical loop in
`mission-control/docs/agent-operating-loop.md` (copied 2026-07-24 during the
Launch Shield first-wolf bootstrap).

## What this repo is

A public, source-backed U.S. macro dashboard (React + Vite, deployed to GitHub
Pages at <https://browningtons.github.io/economic-dashboard/>). It is one of the
public examples behind [Golden Data](https://goldendata.app/). There is no auth,
no payments, and no user data.

That shapes the standing mission. This app's equivalent of a "money path" is the
**data path** — the chain that turns FRED observations into a number a stranger
reads and believes:

1. `scripts/update-economic-data.mjs` pulls FRED into
   `public/data/economic_indicators.csv` (`npm run update:data`).
2. `scripts/validate-economic-data.mjs` checks the refreshed CSV against
   drift/lag/release-window thresholds and writes
   `public/data/data_status.json` (`npm run validate:data`).
3. `.github/workflows/update-data.yml` runs 1 and 2 on a weekday schedule,
   commits the CSV to `main`, and kicks the Pages deploy.
4. `.github/workflows/deploy.yml` builds and publishes the static site.
5. The app renders `data_status.json` as a visible pipeline-health readout.

**Every change in this repo should ask: does this make the data path more honest
or less honest?** A dashboard that shows a confidently-wrong or silently-stale
number is worse than one that is visibly down — the public health badge is part
of the product, not decoration.

## The loop

1. Read [docs/agent-backlog.md](agent-backlog.md). The highest-scoring **Active**
   item is the next thing to ship unless Paul says otherwise.
2. Read [docs/launch-risk-register.md](launch-risk-register.md). If a top risk
   has shifted, update the register before picking work.
3. Ship the chosen item in one focused change:
   - Make the edit.
   - Add or update tests so the change is covered.
   - Run the local gate: `npm test && npm run build`. There is no `npm run
     verify` aggregate in this repo yet, and **no lint or typecheck step at
     all** — see R3/R5. Add `npx tsc --noEmit` by hand until R3 is closed.
   - Update any doc the change invalidates (README, [metrics.md](metrics.md),
     `sources.md`).
4. Move the backlog item to **Completed** with a dated entry: files touched,
   verification command, follow-ups.
5. Move the corresponding risk register item out of **Active** if the change
   closed it; or update its mitigation note if it only reduced it.
6. Stage only the files relevant to this change, commit on a focused branch, and
   open or update its pull request.
7. Surface the next 2–3 ranked backlog options.
8. Teach the next session — if the loop itself caused friction, improve this file.

## Scoring rubric

`Impact + Confidence + Risk Reduction − Effort`, each 1–5.

- **Impact**: how much does this matter to a stranger reading the public
  dashboard and trusting the number?
- **Confidence**: how sure are we the change will work as intended?
- **Risk Reduction**: how much does this shrink the launch-risk register?
- **Effort**: how big is the change? (subtracted, so smaller is better)

Ties broken by: closes a top-3 risk > smaller diff > less new dependency.

## Bug rule

When a session finds a bug (not just ships a feature), ask: **what would have
caught this earlier?** Then add one of: a unit test, a CI check, a validation
threshold, a metric, a clearer doc, or a safer default.

**A green heartbeat is not evidence of a working system** (inherited from the
canonical loop, and this repo is the sharpest example the pack has found). On
2026-07-24 the dashboard was publicly serving 21-day-old data under a
`"status": "PASS"` badge, because the refresh workflow had been *disabled* rather
than failing. Nothing in the repo, and nothing in the watchtower, can see the
absence of a run — only a failed one. When you add or review a scheduled job,
ask what it reports on the day it stops doing its job, and make that state
distinguishable from success.

**Absence is the hard failure mode here.** Prefer freshness checks that are
driven by wall-clock age of the artifact (`generatedAt` in `data_status.json`)
over checks that only run inside the job that might not fire.

## Hard rules

- **Never push directly to `main`.** Use a focused branch and pull request.
- **Recurring agents are single writers.** Follow the
  [pack automation PR contract](https://github.com/browningtons/mission-control/blob/main/docs/pack-automation-contract.md):
  one stable `pack/<lane>` branch, update its open PR, no-op when unchanged.
- **Do not re-enable a disabled workflow as a side effect of unrelated work.**
  Someone turned `update-data.yml` and `deploy.yml` off deliberately on
  2026-07-03; re-enabling resumes automated commits to `main` and republishes a
  public site. That is Paul's call — see R1.
- **`public/data/*` is generated.** Don't hand-edit the CSV or
  `data_status.json`; change the script and regenerate.
- **If a public claim and the code disagree, fix one or the other in the same
  change.** The health badge is a public claim.
- **No new top-level dependencies without flagging it as a backlog item first.**
- **Resolve repository identity from `origin` before reporting it missing or
  stale.** This checkout is `browningtons/economic-dashboard`.

## Stop conditions

- The Active backlog is empty of items that don't require repo-admin access or
  production credentials.
- The Active risk register has only items that need Paul's decision.

When both hold: say so plainly and hand back. Don't manufacture work.
