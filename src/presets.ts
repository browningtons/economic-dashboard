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
    id: 'consumer-health',
    name: 'Consumer Health',
    tagline: 'How consumers feel, spend, and save',
    metrics: ['Consumer Sentiment', 'Retail Sales'],
    datePreset: '5Y',
  },
  {
    id: 'housing-pulse',
    name: 'Housing Pulse',
    tagline: 'How rates shape new construction activity',
    metrics: ['Housing Starts', '30 year mortgage'],
    datePreset: '10Y',
  },
  {
    id: 'labor-deep-dive',
    name: 'Labor Market',
    tagline: 'Employment across cycles — openings, claims, and participation',
    metrics: ['Job Openings', 'Avg Weeks Unemployeed'],
    datePreset: 'MAX',
  },
];
