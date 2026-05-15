# Data Sources

This document maps dashboard fields to source series and basic transform notes.

| Dashboard Field | Source | Series ID | URL | Frequency | Units | Transform Notes |
|---|---|---|---|---|---|---|
| Unemployment Rate | FRED | `UNRATE` | https://fred.stlouisfed.org/series/UNRATE | Monthly | Percent | Use last observation in month; scale `1` |
| Avg Weeks Unemployeed | FRED | `UEMPMEAN` | https://fred.stlouisfed.org/series/UEMPMEAN | Monthly | Weeks | Use last observation in month; scale `1` |
| Job Openings | FRED | `JTSJOL` | https://fred.stlouisfed.org/series/JTSJOL | Monthly | Thousands | Use last observation in month; scale `1`; may carry forward up to 2 months |
| Unemployed 27 weeks | FRED | `UEMP27OV` | https://fred.stlouisfed.org/series/UEMP27OV | Monthly | Thousands | Use last observation in month; scale `1` |
| Unemployeed Count | FRED | `UNEMPLOY` | https://fred.stlouisfed.org/series/UNEMPLOY | Monthly | Thousands | Use last observation in month; scale `1` |
| Fed Rate | FRED | `FEDFUNDS` | https://fred.stlouisfed.org/series/FEDFUNDS | Monthly | Percent | Use last observation in month; scale `1` |
| 15 year mortgage | FRED | `MORTGAGE15US` | https://fred.stlouisfed.org/series/MORTGAGE15US | Weekly | Percent | Use last observation in month; scale `1` |
| 30 year mortgage | FRED | `MORTGAGE30US` | https://fred.stlouisfed.org/series/MORTGAGE30US | Weekly | Percent | Use last observation in month; scale `1` |
| S&P 500 | FRED | `SP500` | https://fred.stlouisfed.org/series/SP500 | Daily | Index | Use last observation in month; scale `1` |
| Labor Participation Rate | FRED | `CIVPART` | https://fred.stlouisfed.org/series/CIVPART | Monthly | Percent | Use last observation in month; scale `1` |
| Housing Price Index | FRED | `CSUSHPINSA` | https://fred.stlouisfed.org/series/CSUSHPINSA | Monthly | Index | Use last observation in month; scale `1`; may carry forward up to 2 months |
| CPI | FRED | `CPIAUCSL` | https://fred.stlouisfed.org/series/CPIAUCSL | Monthly | Index | Use last observation in month; scale `1` |
| GDP | FRED | `GDP` | https://fred.stlouisfed.org/series/GDP | Quarterly | Billions USD | Use last observation in quarter, expand value across the following 2 months; scale `1` |
| Stock Market (b) | Monthly CSV override (preferred) or FRED fallback | `MARKET_CAP_MONTHLY_*` or `NCBCEL` | https://fred.stlouisfed.org/series/NCBCEL | Monthly (override) / Quarterly (fallback) | Configurable (override) / Millions USD (FRED) | Monthly override expects date + market-cap columns; fallback uses `NCBCEL`, expands quarterly value across the following 2 months, and scales by `0.001` for billions |
| National Debt (b) | FRED | `GFDEBTN` | https://fred.stlouisfed.org/series/GFDEBTN | Quarterly | Millions USD | Use last observation in quarter, expand value across the following 2 months, and scale by `0.001` for billions |
| 10Y Treasury | FRED | `DGS10` | https://fred.stlouisfed.org/series/DGS10 | Daily | Percent | Use last observation in month; scale `1` |
| 2Y Treasury | FRED | `DGS2` | https://fred.stlouisfed.org/series/DGS2 | Daily | Percent | Use last observation in month; scale `1` |
| Yield Spread | Derived | `DGS10 - DGS2` | https://fred.stlouisfed.org/series/DGS10 | Daily-derived | Percentage points | Calculated in the app as `10Y Treasury - 2Y Treasury`; not written as a CSV column |
| Consumer Sentiment | FRED | `UMCSENT` | https://fred.stlouisfed.org/series/UMCSENT | Monthly | Index | Use last observation in month; scale `1` |
| Retail Sales | FRED | `RSAFS` | https://fred.stlouisfed.org/series/RSAFS | Monthly | Millions USD | Use last observation in month; scale `1` |
| Personal Savings Rate | FRED | `PSAVERT` | https://fred.stlouisfed.org/series/PSAVERT | Monthly | Percent | Use last observation in month; scale `1` |
| PCE Price Index | FRED | `PCEPI` | https://fred.stlouisfed.org/series/PCEPI | Monthly | Index | Use last observation in month; scale `1` |
| Avg Hourly Earnings | FRED | `CES0500000003` | https://fred.stlouisfed.org/series/CES0500000003 | Monthly | Dollars per hour | Use last observation in month; scale `1` |
| Initial Claims | FRED | `ICSA` | https://fred.stlouisfed.org/series/ICSA | Weekly | Number | Use last observation in month; scale `1` |
| Housing Starts | FRED | `HOUST` | https://fred.stlouisfed.org/series/HOUST | Monthly | Thousands of units | Use last observation in month; scale `1` |
| Building Permits | FRED | `PERMIT` | https://fred.stlouisfed.org/series/PERMIT | Monthly | Thousands of units | Use last observation in month; scale `1` |
| Existing Home Sales | FRED | `EXHOSLUSM495S` | https://fred.stlouisfed.org/series/EXHOSLUSM495S | Monthly | Number | Use last observation in month; scale `1` |
| Industrial Production | FRED | `INDPRO` | https://fred.stlouisfed.org/series/INDPRO | Monthly | Index | Use last observation in month; scale `1` |

## Notes

- Keep `Observed Date` monthly in the CSV (`M/D/YY` or `M/D/YYYY`).
- For mixed-frequency series (daily/weekly/quarterly), normalize to monthly before writing to `public/data/economic_indicators.csv`. Daily and weekly series use the last valid observation in each month; quarterly series are expanded across the quarter month plus the following 2 months.
- `Yield Spread` is derived at app load time as `10Y Treasury - 2Y Treasury`, so it is documented here but intentionally absent from `public/data/economic_indicators.csv`.
- The app currently enforces required numeric values per row for key columns and will show a validation error if values are missing.
- For monthly market cap, set `MARKET_CAP_MONTHLY_CSV_URL` (or `MARKET_CAP_MONTHLY_CSV_PATH`) plus optional column/unit env vars.
