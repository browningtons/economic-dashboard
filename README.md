# Economic Dashboard

## Automated Data Updates (Recommended)

You can fully automate your dataset refresh from FRED and stop manually entering values in Google Sheets.

### 1) Local one-command refresh

1. Create a FRED API key: https://fredaccount.stlouisfed.org/apikey
2. Export it in your shell:

```bash
export FRED_API_KEY="your_fred_api_key"
```

3. Run:

```bash
npm run update:data
```

This rebuilds `public/data/economic_indicators.csv` from API data.

### 2) Use a true monthly market-cap feed for Buffett (optional, recommended)

By default, `Stock Market (b)` uses FRED `NCBCEL` (quarterly, forward-filled monthly).
If you have a monthly market-cap CSV feed, set:

```bash
MARKET_CAP_MONTHLY_CSV_URL="https://example.com/us_market_cap_monthly.csv"
MARKET_CAP_MONTHLY_DATE_COLUMN="date"          # optional
MARKET_CAP_MONTHLY_VALUE_COLUMN="market_cap_b" # optional
MARKET_CAP_MONTHLY_UNITS="billions"            # billions|millions|trillions
```

You can also use a local file while testing:

```bash
MARKET_CAP_MONTHLY_CSV_PATH="./data/us_market_cap_monthly.csv"
```

Sample schema: `scripts/monthly-market-cap.sample.csv`

If no monthly source is configured, the scripts fall back to FRED `NCBCEL`.

Where to get monthly data:
- WFE monthly exchange market capitalization reports (aggregate US exchanges)
- CRSP market cap series (institutional/paid)
- Internal warehouse feed exported to CSV with month + market cap

### 3) Scheduled GitHub automation

This repo now includes `.github/workflows/update-data.yml`, which:
- runs on weekdays (13:15 UTC) and on manual dispatch,
- pulls fresh data from FRED,
- validates refreshed data against drift thresholds plus sanity checks (bounds, MoM spikes, Buffett ratio),
- opens a GitHub Issue automatically when validation fails,
- commits only if `public/data/economic_indicators.csv` changed and validation passes.

Required repo secret:
- `FRED_API_KEY`

Optional repo secrets for monthly market-cap override:
- `MARKET_CAP_MONTHLY_CSV_URL`
- `MARKET_CAP_MONTHLY_DATE_COLUMN`
- `MARKET_CAP_MONTHLY_VALUE_COLUMN`
- `MARKET_CAP_MONTHLY_UNITS`

Optional repo secrets for external alerts:
- `ALERT_WEBHOOK_URL` (Slack/Teams/custom webhook)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_TO_EMAIL` (comma-separated recipients)

After it commits, your existing deploy workflow will publish the updated dashboard automatically.

### 3b) Connect the dashboard "Refresh data" button to your pipeline (optional)

The button always reloads latest available CSV in the browser.
If you also want it to trigger your update pipeline, set:

```bash
VITE_REFRESH_WEBHOOK_URL="https://your-webhook-endpoint.example.com/refresh"
```

The app sends a `POST` to that URL when the button is clicked.

Important:
- Do not call GitHub with a personal access token directly from frontend code.
- Use a small serverless endpoint/webhook that securely triggers your GitHub workflow.
- This repo includes a relay template at `api/refresh-dispatch.js`.

Required env vars for `api/refresh-dispatch.js`:

```bash
GITHUB_REPO_OWNER="<owner>"
GITHUB_REPO_NAME="<repo>"
GITHUB_TRIGGER_TOKEN="<token_with_actions_write>"
GITHUB_WORKFLOW_ID="update-data.yml"   # optional
GITHUB_WORKFLOW_REF="main"             # optional
REFRESH_ALLOWED_ORIGIN="https://your-dashboard-domain"  # optional but recommended
REFRESH_WEBHOOK_BEARER="<shared_token>"                 # optional
```

### 3c) Send alerts outside GitHub Issues (optional)

When validation fails, workflow can also send:
- webhook payloads (`ALERT_WEBHOOK_URL`)
- email via Resend (`RESEND_*` secrets)

Manual test:

```bash
npm run alert:data
```

By default this reads `reports/data-validation-latest.md`.
It also reads `reports/data-status-latest.json` when available.

### 3d) Status JSON for ops visibility

Validation now writes:
- `reports/data-status-latest.json` (artifact/report use)
- `public/data/data_status.json` (dashboard UI use)

The Data Table view surfaces this health status and top alerts.

### 4) Optional: keep Google Sheets in sync automatically

If you still want Google Sheets as the source, use Apps Script to import the repo CSV on a schedule:

```javascript
function refreshEconomicSheetFromCsv() {
  const csvUrl = "https://raw.githubusercontent.com/<owner>/<repo>/main/public/data/economic_indicators.csv";
  const sheetName = "Sheet1";

  const csvText = UrlFetchApp.fetch(csvUrl).getContentText();
  const rows = Utilities.parseCsv(csvText);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}
```

Then add a time-based trigger (daily/weekly) in Apps Script. This removes manual row updates.

## Data Source Setup (Google Sheets, Optional)

By default, the app now loads `public/data/economic_indicators.csv` (auto-updated by workflow).
Google Sheets can still be used, but only when explicitly enabled.

1. Publish your sheet/tab so it can be read as CSV.
2. Create a `.env.local` file in the project root:

```bash
VITE_USE_GOOGLE_SHEET="true"
VITE_GOOGLE_SHEET_URL="https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit?gid=<TAB_GID>#gid=<TAB_GID>"
```

You can also provide a direct CSV export URL if you prefer.

If Google Sheets is enabled but unavailable or fails, the app falls back to:
- `public/data/economic_indicators.csv`
- Embedded CSV in `src/App.tsx` (last fallback)

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
