# Economic Dashboard

A public, source-backed macro dashboard for watching U.S. economic conditions in one place. It combines labor-market, inflation, rates, housing, GDP, market, debt, and Buffett Indicator data into a React dashboard that can be refreshed from FRED and published as a static site.

This is one of the public examples behind [Golden Data](https://goldendata.app/): take a messy decision surface, make the important signals obvious, and keep the data pipeline reproducible.

## What It Shows

- Dashboard presets for common economic readouts.
- Long-term trend charts across unemployment, CPI, GDP, mortgage rates, S&P 500, national debt, housing, labor participation, and related indicators.
- Buffett Indicator view with market-cap-to-GDP context.
- Data table with pipeline health, source status, and fallback visibility.
- Shareable clip pages generated during production builds.
- Optional refresh button that can call a secure workflow relay.

## Data Sources

By default, the app loads `public/data/economic_indicators.csv`.

The refresh scripts can rebuild that CSV from FRED. `Stock Market (b)` uses FRED `NCBCEL` as a quarterly fallback, forward-filled monthly. If you have a better monthly U.S. market-cap feed, you can provide it with environment variables.

The app can also read from a published Google Sheet when explicitly enabled, but the checked-in CSV is the default so the public dashboard still works without external credentials.

## Local Setup

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Useful Scripts

```bash
npm run dev            # start local Vite dev server
npm run build          # production build and clip-page generation
npm run preview        # preview the production build locally
npm test               # run Vitest checks
npm run update:data    # rebuild CSV data from FRED
npm run validate:data  # run data sanity/drift checks
npm run alert:data     # send validation alerts from latest report
```

## Refresh Data From FRED

1. Create a FRED API key: <https://fredaccount.stlouisfed.org/apikey>
2. Export it in your shell:

```bash
export FRED_API_KEY="your_fred_api_key"
```

3. Run:

```bash
npm run update:data
npm run validate:data
```

This updates `public/data/economic_indicators.csv` and writes status artifacts under `reports/` and `public/data/data_status.json`.

## Optional Monthly Market-Cap Feed

To replace the fallback market-cap series used by the Buffett Indicator, set either a remote CSV URL or a local CSV path:

```bash
MARKET_CAP_MONTHLY_CSV_URL="https://example.com/us_market_cap_monthly.csv"
MARKET_CAP_MONTHLY_CSV_PATH="./data/us_market_cap_monthly.csv"
MARKET_CAP_MONTHLY_DATE_COLUMN="date"
MARKET_CAP_MONTHLY_VALUE_COLUMN="market_cap_b"
MARKET_CAP_MONTHLY_UNITS="billions" # billions | millions | trillions
```

Sample schema: `scripts/monthly-market-cap.sample.csv`.

## GitHub Automation

The workflow at `.github/workflows/update-data.yml` can refresh data on a schedule, validate it, commit safe changes, and open a GitHub Issue when validation fails.

Required repo secret:

```bash
FRED_API_KEY
```

Optional secrets:

```bash
MARKET_CAP_MONTHLY_CSV_URL
MARKET_CAP_MONTHLY_DATE_COLUMN
MARKET_CAP_MONTHLY_VALUE_COLUMN
MARKET_CAP_MONTHLY_UNITS
ALERT_WEBHOOK_URL
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_TO_EMAIL
```

## Refresh Button Relay

The dashboard button always reloads the latest available browser data. To let it trigger the update workflow, point it at a secure webhook:

```bash
VITE_REFRESH_WEBHOOK_URL="https://your-webhook-endpoint.example.com/refresh"
```

Do not call GitHub with a personal access token from frontend code. Use the included relay template at `api/refresh-dispatch.js` or a similar serverless endpoint.

Relay environment variables:

```bash
GITHUB_REPO_OWNER="<owner>"
GITHUB_REPO_NAME="<repo>"
GITHUB_TRIGGER_TOKEN="<token_with_actions_write>"
GITHUB_WORKFLOW_ID="update-data.yml"
GITHUB_WORKFLOW_REF="main"
REFRESH_ALLOWED_ORIGIN="https://your-dashboard-domain"
REFRESH_WEBHOOK_BEARER="<shared_token>"
```

## Optional Google Sheets Source

Create `.env.local`:

```bash
VITE_USE_GOOGLE_SHEET="true"
VITE_GOOGLE_SHEET_URL="https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit?gid=<TAB_GID>#gid=<TAB_GID>"
```

If the sheet is unavailable, the app falls back to `public/data/economic_indicators.csv`, then to embedded CSV in `src/App.tsx`.

## Project Structure

```text
api/                         # optional refresh relay
public/data/                 # dashboard CSV and pipeline status JSON
reports/                     # latest validation/status artifacts
scripts/                     # refresh, validation, alerting, clip generation
src/components/              # dashboard views and UI
src/App.tsx                  # data loading, state, and top-level routing
src/presets.ts               # dashboard preset definitions
```

## Quality Checks

Before publishing a data or UI change:

```bash
npm test
npm run build
```
