# Data Sources

This document maps dashboard fields to source series and basic transform notes.

| Dashboard Field | Source | Series ID | URL | Frequency | Units | Transform Notes |
|---|---|---|---|---|---|---|
| Unemployment Rate | FRED | `UNRATE` | https://fred.stlouisfed.org/series/UNRATE | Monthly | Percent | Use as-is |
| Avg Weeks Unemployeed | FRED | `UEMPMEAN` | https://fred.stlouisfed.org/series/UEMPMEAN | Monthly | Weeks | Use as-is |
| Median Weeks Unemployeed | FRED | `UEMPMED` | https://fred.stlouisfed.org/series/UEMPMED | Monthly | Weeks | Use as-is |
| Job Openings | FRED | `JTSJOL` | https://fred.stlouisfed.org/series/JTSJOL | Monthly | Thousands | Use as-is (dashboard displays in millions) |
| Unemployed 27 weeks | FRED | `UEMP27OV` | https://fred.stlouisfed.org/series/UEMP27OV | Monthly | Thousands | Use as-is (dashboard displays in millions) |
| Unemployeed Count | FRED | `UNEMPLOY` | https://fred.stlouisfed.org/series/UNEMPLOY | Monthly | Thousands | Use as-is (dashboard displays in millions) |
| Fed Rate | FRED | `FEDFUNDS` | https://fred.stlouisfed.org/series/FEDFUNDS | Monthly | Percent | Use as-is |
| 15 year mortgage | FRED | `MORTGAGE15US` | https://fred.stlouisfed.org/series/MORTGAGE15US | Weekly | Percent | Convert to monthly (period average or end-of-month) |
| 30 year mortgage | FRED | `MORTGAGE30US` | https://fred.stlouisfed.org/series/MORTGAGE30US | Weekly | Percent | Convert to monthly (period average or end-of-month) |
| S&P 500 | FRED | `SP500` | https://fred.stlouisfed.org/series/SP500 | Daily | Index | Convert to monthly (period average or end-of-month close) |
| Labor Participation Rate | FRED | `CIVPART` | https://fred.stlouisfed.org/series/CIVPART | Monthly | Percent | Use as-is |
| Labor Participation Core | FRED | `LNS11300060` | https://fred.stlouisfed.org/series/LNS11300060 | Monthly | Percent | Use as-is |
| Housing Price Index | FRED | `CSUSHPINSA` | https://fred.stlouisfed.org/series/CSUSHPINSA | Monthly | Index | Use as-is |
| CPI | FRED | `CPIAUCSL` | https://fred.stlouisfed.org/series/CPIAUCSL | Monthly | Index | Use as-is |
| GDP | FRED | `GDP` | https://fred.stlouisfed.org/series/GDP | Quarterly | Billions USD | Forward-fill or interpolate to monthly for chart alignment |
| National Debt (b) | FRED | `GFDEBTN` | https://fred.stlouisfed.org/series/GFDEBTN | Quarterly | Millions USD | Divide by `1000` to store/display in billions |
| Stock Market (b) | Monthly CSV override (preferred) or FRED fallback | `MARKET_CAP_MONTHLY_*` or `NCBCEL` | https://fred.stlouisfed.org/series/NCBCEL | Monthly (override) / Quarterly (fallback) | Configurable (override) / Millions USD (FRED) | Monthly override expects date + market-cap columns; fallback divides `NCBCEL` by `1000` for billions |

## Notes

- Keep `Observed Date` monthly in the CSV (`M/D/YY` or `M/D/YYYY`).
- For mixed-frequency series (daily/weekly/quarterly), normalize to monthly before writing to `public/data/economic_indicators.csv`.
- The app currently enforces required numeric values per row for key columns and will show a validation error if values are missing.
- For monthly market cap, set `MARKET_CAP_MONTHLY_CSV_URL` (or `MARKET_CAP_MONTHLY_CSV_PATH`) plus optional column/unit env vars.
