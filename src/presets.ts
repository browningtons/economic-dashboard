export interface DashboardPreset {
  id: string;
  name: string;
  tagline: string;
  metrics: string[];
  datePreset: '1Y' | '3Y' | '5Y' | '10Y' | 'MAX';
  viewMode?: 'raw' | 'relative';
}

export const DASHBOARD_PRESETS: DashboardPreset[] = [
  {
    id: 'great-disconnect',
    name: 'The Great Disconnect',
    tagline: 'Job openings and stocks moved together — until they didn\u2019t',
    metrics: ['Job Openings', 'S&P 500'],
    datePreset: 'MAX',
  },
  {
    id: 'rate-cascade',
    name: 'The Rate Cascade',
    tagline: 'How Fed policy flows through the yield curve to your mortgage',
    metrics: ['Fed Rate', '2Y Treasury', '10Y Treasury', '30 year mortgage'],
    datePreset: '5Y',
  },
  {
    id: 'inflation-vs-wages',
    name: 'Inflation vs Wages',
    tagline: 'Are workers keeping up with rising prices?',
    metrics: ['CPI', 'Avg Hourly Earnings', 'Fed Rate'],
    datePreset: '5Y',
    viewMode: 'relative',
  },
  {
    id: 'consumer-health',
    name: 'Consumer Health',
    tagline: 'How consumers feel, spend, and save',
    metrics: ['Consumer Sentiment', 'Retail Sales', 'Personal Savings Rate'],
    datePreset: '5Y',
  },
  {
    id: 'housing-pulse',
    name: 'Housing Pulse',
    tagline: 'Rates, permits, starts, and prices — the full housing cycle',
    metrics: ['Housing Starts', 'Building Permits', 'Housing Price Index', '30 year mortgage'],
    datePreset: '10Y',
  },
  {
    id: 'labor-deep-dive',
    name: 'Labor Market',
    tagline: 'Employment across cycles — openings, claims, and participation',
    metrics: ['Unemployment Rate', 'Job Openings', 'Initial Claims', 'Labor Participation Rate'],
    datePreset: 'MAX',
  },
  {
    id: 'market-vs-economy',
    name: 'Market vs Economy',
    tagline: 'Does the stock market reflect real economic output?',
    metrics: ['S&P 500', 'GDP', 'Industrial Production'],
    datePreset: 'MAX',
  },
];
