import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  ComposedChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  ReferenceArea,
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  DollarSign, 
  Home, 
  Percent, 
  BarChart3, 
  Clock, 
  Briefcase, 
  TrendingDown, 
  Building, 
  HelpCircle,
  Info,
  Users,
  AlertCircle,
  Globe,
  Coins
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import appLogo from './assets/golden_data_icon_small.png';

// --- Types & Interfaces ---

interface DataPoint {
  date: string;
  year: number;
  timestamp: number;
  [key: string]: string | number | undefined;
}

interface MetricConfig {
  id: string;
  label: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  desc: string;
  isMacro: boolean; // TRUE for large numbers (S&P, GDP, Debt), FALSE for small (Rates, Counts)
  format: (val: number) => string;
  isPercentage: boolean;
  category: 'Labor Market' | 'Monetary Policy' | 'Housing' | 'Macro & Markets';
}

type ReferenceLabelPosition = 'insideTopLeft' | 'insideTop' | 'insideBottom';

interface ReferenceZone {
  label: string;
  start: string;
  end: string;
  color: string;
  opacity: number;
  labelPos: ReferenceLabelPosition;
}

type CsvEntry = Partial<DataPoint> & Record<string, string | number | undefined>;

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, string | number | undefined>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number | string;
  isRelative: boolean;
  mode?: 'Dashboard' | 'Buffett';
}

interface DataSourceInfo {
  provider: string;
  seriesId: string;
  url: string;
  note?: string;
}

interface MetricExtrema {
  minValue: number;
  maxValue: number;
  minTimestamp: number;
  maxTimestamp: number;
}

interface ExtremaDotProps {
  cx?: number;
  cy?: number;
  value?: number | string;
  payload?: {
    timestamp?: number | string;
  };
}

// --- Data ---
const RAW_CSV_DATA = `Observed Date,Unemployment Rate,Avg Weeks Unemployeed,Median Weeks Unemployeed,Job Openings,Unemployed 27 weeks,Unemployeed Count,Fed Rate,15 year mortgage,30 year mortgage,S&P 500,Labor Participation Rate,Labor Participation Core,Housing Price Index,CPI,GDP,Stock Market (b),National Debt (b)
1/1/2020,3.60,21.9,10,7124,1176,5869,1.55,3.072,3.624,3278.2,63.3,83.1,212.4,337.8,21751,32838.19,24535.1
2/1/2020,3.50,20.6,9.4,6966,1110,5753,1.58,2.97,3.465,3277.3,63.3,82.9,213.2,338.6,21140,30125.07,25136.5
3/1/2020,4.40,17,6,5894,1140,7206,0.65,2.885,3.45,2652.4,62.6,82.4,215.2,339.5,20569,25899.93,25887.4
4/1/2020,14.80,7.2,2.2,4606,910,23084,0.05,2.804,3.306,2762,60.1,79.8,217.2,340.1,19958,29365.49,27198.4
5/1/2020,13.20,10.5,7.7,5612,1147,20929,0.05,2.693,3.233,2919.6,60.8,80.6,218.5,340.8,20534,30927.04,27919.7
6/1/2020,11.00,14.4,13.4,6129,1355,17652,0.08,2.603,3.163,3104.7,61.5,81.4,219.8,341.3,21129,31630.51,28646.5
7/1/2020,10.20,17,14.7,6530,1544,16352,0.09,2.52,3.016,3207.6,61.5,81.2,221.5,342,21704,33393.39,28923.7
8/1/2020,8.40,19.9,16.2,6429,1632,13461,0.1,2.475,2.935,3391.7,61.7,81.3,224,342.4,21833,35807.66,28872.7
9/1/2020,7.80,21.5,17.5,6511,2445,12554,0.09,2.385,2.89,3365.5,61.4,80.9,226.8,342.9,21962,34480.27,29077.8
10/1/2020,6.90,22,19,6798,3591,11072,0.09,2.346,2.834,3418.7,61.7,81.3,229.8,343.6,22087,33724.81,29044.9
11/1/2020,6.70,23.3,18.3,6820,3924,10694,0.09,2.305,2.765,3549,61.5,81,232.3,344,22287,37839.65,29424.8
12/1/2020,6.70,23.2,16.8,6773,3967,10770,0.09,2.218,2.684,3695.3,61.5,81.1,234.3,344.5,22481,39456.66,29655.1
1/1/2021,6.40,25.9,16.1,7204,4032,10236,0.09,2.2,2.735,3793.8,61.4,81.1,236.4,344.8,22681,39396.17,29514
2/1/2021,6.20,27.5,18.4,7752,4143,9995,0.08,2.238,2.81,3883.4,61.4,81.1,239.2,345.2,22937,40508.68,29159
3/1/2021,6.10,29.6,20.3,8470,4171,9756,0.07,2.393,3.083,3910.5,61.5,81.3,244.2,345.7,23169,41741.87,29066.1
4/1/2021,6.10,28.4,20.3,9356,4082,9762,0.07,2.364,3.06,4141.2,61.6,81.3,249.8,346.3,23426,43870.09,29233.5
5/1/2021,5.80,29.6,19.5,9905,3707,9266,0.06,2.28,2.963,4167.9,61.6,81.3,255.4,347,23609,43966.36,29292.2
6/1/2021,5.90,32,19.8,10298,3988,9462,0.08,2.27,2.975,4238.5,61.7,81.6,261.1,347.8,23799,45113.86,29722.7
7/1/2021,5.40,29.8,14.7,11049,3477,8731,0.1,2.18,2.868,4363.7,61.8,81.8,265.5,348.5,23982,45708,29933.1
8/1/2021,5.10,29.5,14.2,10956,3189,8276,0.09,2.145,2.843,4454.2,61.7,81.7,268.7,349.7,24262,46979.63,29811.2
9/1/2021,4.70,28.5,13.2,10879,2714,7652,0.08,2.184,2.9,4445.5,61.7,81.6,271.4,351.3,24543,44850.03,29595.5
10/1/2021,4.50,26.8,12.4,11341,2371,7279,0.08,2.308,3.068,4460.7,61.8,81.8,273.6,352.9,24814,47795.09,30048.2
11/1/2021,4.20,28.9,12.3,11119,2181,6751,0.08,2.358,3.068,4667.4,61.9,82,276,354.5,24961,46936.08,30147.9
12/1/2021,3.90,28,11.5,11417,1993,6398,0.08,2.348,3.098,4674.8,62,82,278.5,355.9,25103,48461.16,30718.8
1/1/2022,4.00,24.5,10,11238,1656,6512,0.08,2.66,3.445,4573.8,62.2,82.1,281.9,357.7,25250,45416.47,30648.6
2/1/2022,3.80,26.3,10.1,11661,1689,6301,0.08,2.998,3.763,4436,62.2,82.2,287.1,359.6,25461,44259.21,30781.6
3/1/2022,3.70,24.2,8.8,12134,1380,6014,0.2,3.39,4.172,4391.3,62.3,82.5,294.9,361.1,25651,45606.67,30167.3
4/1/2022,3.70,24.8,8.6,11881,1386,6002,0.33,4.215,4.983,4391.3,62.2,82.4,301.5,363,25861,41343.97,29364.9
5/1/2022,3.60,22.4,9,11483,1294,5983,0.77,4.435,5.23,4040.4,62.3,82.6,306.3,365.1,26018,41084.9,29479.9
6/1/2022,3.60,22.3,8,11256,1355,5951,1.21,4.652,5.522,3899,62.2,82.3,308.1,367.9,26180,37564.23,29217.6
7/1/2022,3.50,22.2,8.3,11610,1120,5768,1.68,4.613,5.413,3911.7,62.1,82.3,306.9,370.4,26336,41119.58,29623.7
8/1/2022,3.60,22.4,8.6,10148,1231,5919,2.33,4.563,5.223,4158.6,62.3,82.8,303.5,373.3,26483,39560.86,29294.6
9/1/2022,3.50,20.2,8.1,10812,1118,5792,2.56,5.35,6.112,3850.5,62.3,82.6,300.3,376.6,26629,35836.92,28432.8
10/1/2022,3.60,20.8,8,10488,1214,5964,3.08,6.145,6.9,3726.1,62.2,82.6,298.6,379.4,26771,38702.5,28464
11/1/2022,3.60,21.5,8.2,10619,1244,5943,3.78,6.138,6.805,3917.5,62.1,82.4,296.8,382.6,26921,40552.42,29192.6
12/1/2022,3.50,19.4,8.2,10876,1073,5766,4.1,5.668,6.364,3912.4,62.3,82.6,294.2,385.6,27066,38073.94,28944.8
1/1/2023,3.50,20.3,9.7,10393,1087,5747,4.33,5.425,6.273,3960.7,62.4,82.8,292.7,388.4,27216,40724.96,29508.8
2/1/2023,3.60,19.3,8.9,9846,1056,5962,4.57,5.415,6.258,4079.7,62.5,83,293.5,391.1,27324,39704.38,29023.4
3/1/2023,3.50,19.5,8.4,9572,1061,5839,4.65,5.796,6.544,3968.6,62.6,83.1,297.5,392.9,27422,40708.41,29613.8
4/1/2023,3.40,20.9,8.8,9992,1079,5751,4.83,5.663,6.343,4121.5,62.6,83.3,301.6,394.9,27530,41064.05,29639.7
5/1/2023,3.60,21.2,9,9310,1142,6089,5.06,5.808,6.425,4146.2,62.6,83.4,305.4,396.7,27710,42053.18,29302.2
6/1/2023,3.60,20.7,8.7,9191,1121,5958,5.08,6.088,6.714,4345.4,62.6,83.4,308.4,398.6,27895,44883.61,29957.7
7/1/2023,3.50,20.6,9,8606,1196,5920,5.12,6.178,6.84,4508.1,62.6,83.4,310.3,400.2,28075,46450.22,30146.4
8/1/2023,3.70,20.4,8.8,9287,1369,6284,5.33,6.43,7.072,4426.2,62.8,83.5,311.7,402.2,28193,45468.43,30321.8
9/1/2023,3.80,21.4,9,9279,1242,6326,5.33,6.573,7.2,4409.1,62.7,83.5,312.5,404.5,28311,43249.3,30084.9
10/1/2023,3.90,21.5,8.5,8550,1331,6479,5.33,6.905,7.62,4259,62.7,83.4,312.9,406.7,28425,42059.95,30282.6
11/1/2023,3.70,19.4,8.8,8663,1170,6254,5.33,6.766,7.442,4460.1,62.8,83.4,312.1,408.8,28520,45900.9,31168.6
12/1/2023,3.80,22.2,9.6,8585,1273,6315,5.33,6.138,6.815,4685.1,62.5,83.2,310.9,410.6,28613,48295.38,31907
1/1/2024,3.70,20.8,9.6,8468,1272,6149,5.33,5.87,6.643,4804.5,62.5,83.3,310.8,412,28708,48769.87,32095.2
2/1/2024,3.90,20.9,9.3,8445,1213,6462,5.33,6.102,6.776,5012,62.6,83.5,312.7,413.7,28858,51321.23,32010.7
3/1/2024,3.90,21.6,9.5,8093,1254,6497,5.33,6.175,6.82,5170.6,62.7,83.4,316.9,415.2,28998,52915.82,32204.7
4/1/2024,3.90,20,8.9,7619,1253,6492,5.33,6.263,6.993,5095.5,62.7,83.5,320.9,416.4,29147,50572.38,31706.8
5/1/2024,4.00,21.2,9,7901,1348,6635,5.33,6.346,7.06,5235.2,62.6,83.6,323.8,417.8,29267,52875.52,31999.2
6/1/2024,4.10,20.7,9.8,7412,1533,6849,5.33,6.188,6.918,5415.1,62.6,83.7,325.3,418.8,29391,54470.66,32284.4
7/1/2024,4.20,20.6,9.5,7504,1543,7097,5.33,6.135,6.848,5542.9,62.7,83.9,325.7,420.6,29512,55429.84,33070
8/1/2024,4.20,21,9.5,7649,1545,7071,5.33,5.682,6.5,5502.2,62.7,83.9,325.1,422.2,29617,56554.44,33437.6
9/1/2024,4.10,22.6,9.9,7103,1614,6901,5.13,5.263,6.18,5626.1,62.7,83.8,324.7,423.8,29723,57636.94,33882.5
10/1/2024,4.10,22.9,10.1,7615,1608,6972,4.83,5.598,6.428,5792.3,62.5,83.5,324.1,425.4,29825,57178.68,33749.5
11/1/2024,4.20,23.6,10.5,8031,1654,7121,4.64,6.028,6.805,5929.9,62.5,83.5,323.8,426.7,29898,60880.74,34025.8
12/1/2024,4.10,23.7,10.4,7508,1551,6886,4.48,5.93,6.715,6010.9,62.5,83.4,323.4,428.2,29969,58970.02,33736.3
1/1/2025,4.00,22,10.4,7762,1443,6849,4.33,6.164,6.958,5979.5,62.6,83.5,323.7,429.5,30042,60775.2,33847.4
2/1/2025,4.10,21.3,10,7480,1455,7052,4.33,6.03,6.843,6038.7,62.4,83.5,325.1,430.6,30195,59524.47,34275.3
3/1/2025,4.20,22.8,9.8,7200,1495,7083,4.33,5.828,6.65,5684,62.5,83.3,327.7,431.8,30333,55933.39,34289.1
4/1/2025,4.20,23.2,10.4,7395,1675,7166,4.33,5.903,6.725,5369.5,62.6,83.6,329.9,433,30486,55521.83,34335.3
5/1/2025,4.20,21.8,9.5,7712,1457,7237,4.33,5.954,6.816,5810.9,62.4,83.4,331.5,433.7,30486,58996.79,34007.2
6/1/2025,4.10,23,10.1,7357,1647,7015,4.33,5.953,6.818,6030,62.3,83.5,331.7,434.6,30486,61940.59,34273
7/1/2025,4.20,24.1,10.2,7208,1826,7236,4.33,5.86,6.72,6296.5,62.2,83.4,331,435.5,30486,63290.9,34788.5
8/1/2025,4.30,24.5,9.8,7227,1930,7384,4.33,5.71,6.588,6409,62.3,83.7,329.8,437,30486,64683.39,35348.2
9/1/2025,4.40,24.1,9.8,7227,1930,7603,4.22,5.55,6.34,6415,62.3,83.7,328.9,438.2,30486,66847.84,35877.2`;

// --- Configuration ---

// --- REFERENCE ZONES ---
const REFERENCE_ZONES: ReferenceZone[] = [
  { label: "Dot Com", start: "2001-03-01", end: "2001-11-01", color: "#9ca3af", opacity: 0.3, labelPos: 'insideTopLeft' },
  { label: "Great Recession", start: "2007-12-01", end: "2009-06-01", color: "#9ca3af", opacity: 0.3, labelPos: 'insideTopLeft' },
  { label: "COVID-19", start: "2020-02-01", end: "2020-04-01", color: "#9ca3af", opacity: 0.3, labelPos: 'insideTop' },
  { label: "ChatGPT Launch", start: "2022-11-01", end: "2023-01-01", color: "#9ca3af", opacity: 0.3, labelPos: 'insideBottom' },
];
const GOOGLE_SHEET_URL = (
  import.meta.env.VITE_GOOGLE_SHEET_URL?.trim() ||
  import.meta.env.VITE_ECON_DATA_URL?.trim()
);
const LOCAL_DATA_URL = `${import.meta.env.BASE_URL}data/economic_indicators.csv`;
const REQUIRED_COLUMNS = [
  'Observed Date',
  'Unemployment Rate',
  'Avg Weeks Unemployeed',
  'Unemployeed Count',
  'Job Openings',
  'Fed Rate',
  '15 year mortgage',
  '30 year mortgage',
  'S&P 500',
  'Labor Participation Rate',
  'Housing Price Index',
  'CPI',
  'GDP',
  'Stock Market (b)',
  'National Debt (b)',
];

const METRIC_SOURCES: Record<string, DataSourceInfo> = {
  'Unemployment Rate': { provider: 'FRED', seriesId: 'UNRATE', url: 'https://fred.stlouisfed.org/series/UNRATE' },
  'Avg Weeks Unemployeed': { provider: 'FRED', seriesId: 'UEMPMEAN', url: 'https://fred.stlouisfed.org/series/UEMPMEAN' },
  'Median Weeks Unemployeed': { provider: 'FRED', seriesId: 'UEMPMED', url: 'https://fred.stlouisfed.org/series/UEMPMED' },
  'Job Openings': { provider: 'FRED', seriesId: 'JTSJOL', url: 'https://fred.stlouisfed.org/series/JTSJOL' },
  'Unemployed 27 weeks': { provider: 'FRED', seriesId: 'UEMP27OV', url: 'https://fred.stlouisfed.org/series/UEMP27OV' },
  'Unemployeed Count': { provider: 'FRED', seriesId: 'UNEMPLOY', url: 'https://fred.stlouisfed.org/series/UNEMPLOY' },
  'Fed Rate': { provider: 'FRED', seriesId: 'FEDFUNDS', url: 'https://fred.stlouisfed.org/series/FEDFUNDS' },
  '15 year mortgage': { provider: 'FRED', seriesId: 'MORTGAGE15US', url: 'https://fred.stlouisfed.org/series/MORTGAGE15US' },
  '30 year mortgage': { provider: 'FRED', seriesId: 'MORTGAGE30US', url: 'https://fred.stlouisfed.org/series/MORTGAGE30US' },
  'S&P 500': { provider: 'FRED', seriesId: 'SP500', url: 'https://fred.stlouisfed.org/series/SP500' },
  'Labor Participation Rate': { provider: 'FRED', seriesId: 'CIVPART', url: 'https://fred.stlouisfed.org/series/CIVPART' },
  'Labor Participation Core': { provider: 'FRED', seriesId: 'LNS11300060', url: 'https://fred.stlouisfed.org/series/LNS11300060' },
  'Housing Price Index': { provider: 'FRED', seriesId: 'CSUSHPINSA', url: 'https://fred.stlouisfed.org/series/CSUSHPINSA' },
  'CPI': { provider: 'FRED', seriesId: 'CPIAUCSL', url: 'https://fred.stlouisfed.org/series/CPIAUCSL' },
  'GDP': { provider: 'FRED', seriesId: 'GDP', url: 'https://fred.stlouisfed.org/series/GDP' },
  'Stock Market (b)': { provider: 'FRED', seriesId: 'NCBCEL', url: 'https://fred.stlouisfed.org/series/NCBCEL' },
  'National Debt (b)': { provider: 'FRED', seriesId: 'GFDEBTN', url: 'https://fred.stlouisfed.org/series/GFDEBTN' },
};

const METRICS: MetricConfig[] = [
  // --- LABOR MARKET ---
  { 
    id: 'Unemployment Rate', 
    label: 'Unemployment Rate', 
    icon: Percent, 
    color: '#D65D5D', // Terra Cotta
    desc: 'Percentage of labor force jobless.',
    isMacro: false,
    format: (v) => `${v}%`,
    isPercentage: true,
    category: 'Labor Market'
  },
  { 
    id: 'Unemployeed Count', 
    label: 'Unemployment Count', 
    icon: Users, 
    color: '#E6A35C', // Sunset Gold
    desc: 'Total number of unemployed persons.',
    isMacro: true, // Counts are often large (Millions)
    isPercentage: false,
    format: (v) => `${(v/1000).toFixed(1)}M`,
    category: 'Labor Market'
  },
  { 
    id: 'Avg Weeks Unemployeed', 
    label: 'Avg Weeks Unemployed', 
    icon: Clock, 
    color: '#6DA36D', // Fern Green
    desc: 'Average duration of unemployment.',
    isMacro: false, // Small count (Weeks)
    isPercentage: false,
    format: (v) => `${v.toLocaleString()} wks`,
    category: 'Labor Market'
  },
  { 
    id: 'Unemployed 27 weeks', 
    label: 'Unemployed 27+ Weeks', 
    icon: AlertCircle, 
    color: '#5D8AA8', // Giverny Blue
    desc: 'Long-term unemployed (27 weeks+).',
    isMacro: true, // Counts are often large (Millions)
    isPercentage: false,
    format: (v) => `${(v/1000).toFixed(1)}M`,
    category: 'Labor Market'
  },
  { 
    id: 'Job Openings', 
    label: 'Job Openings', 
    sub: 'Total non-farm', 
    icon: Briefcase, 
    color: '#818CF8', // Iris
    desc: 'Measure of labor demand (JOLTS).',
    isMacro: true, // Counts are often large (Millions)
    isPercentage: false,
    format: (v) => `${(v/1000).toFixed(1)}M`,
    category: 'Labor Market'
  },
  { 
    id: 'Labor Participation Rate', 
    label: 'Labor Participation', 
    icon: Activity, 
    color: '#F472B6', // Rose
    desc: 'Active workforce percentage.',
    isMacro: false, // Percentage
    isPercentage: true,
    format: (v) => `${v}%`,
    category: 'Labor Market'
  },

  // --- MONETARY POLICY ---
  { 
    id: 'Fed Rate', 
    label: 'Fed Funds Rate', 
    icon: DollarSign, 
    color: '#D9534F', 
    desc: 'Interest rate for lending balances.',
    isMacro: false, // Percentage
    isPercentage: true,
    format: (v) => `${v}%`,
    category: 'Monetary Policy'
  },
  { 
    id: '30 year mortgage', 
    label: '30Y Mortgage', 
    icon: Building, 
    color: '#4EA8DE', 
    desc: 'Average 30-year fixed mortgage rate.',
    isMacro: false, // Percentage
    isPercentage: true,
    format: (v) => `${v}%`,
    category: 'Monetary Policy'
  },
  { 
    id: '15 year mortgage', 
    label: '15Y Mortgage', 
    icon: Building, 
    color: '#2563eb', 
    desc: 'Average 15-year fixed mortgage rate.',
    isMacro: false, // Percentage
    isPercentage: true,
    format: (v) => `${v}%`,
    category: 'Monetary Policy'
  },
  // --- HOUSING ---
  { 
    id: 'Housing Price Index', 
    label: 'Housing Price Index', 
    icon: Home, 
    color: '#2C6E49', 
    desc: 'US National Home Price Index.',
    isMacro: true, // Large Index Number
    isPercentage: false,
    format: (v) => `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
    category: 'Housing'
  },
  // --- MACRO & MARKETS ---
  { 
    id: 'S&P 500', 
    label: 'S&P 500', 
    icon: TrendingUp, 
    color: '#4C956C', 
    desc: 'Market cap index of 500 leading US companies.',
    isMacro: true, // Large Index Number
    isPercentage: false,
    format: (v) => `$${v?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    category: 'Macro & Markets'
  },
  { 
    id: 'CPI', 
    label: 'CPI (Inflation)', 
    icon: BarChart3, 
    color: '#9B5DE5', 
    desc: 'Consumer Price Index.',
    isMacro: true, // Large Index Number
    isPercentage: false,
    format: (v) => `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
    category: 'Macro & Markets'
  },
  { 
    id: 'National Debt (b)', 
    label: 'National Debt', 
    icon: TrendingDown, 
    color: '#6C757D', 
    desc: 'Total US National Debt (Billions).',
    isMacro: true, // Large Billions/Trillions
    isPercentage: false,
    format: (v) => `$${(v/1000).toFixed(1)}T`,
    category: 'Macro & Markets'
  },
  { 
    id: 'GDP', 
    label: 'US GDP', 
    icon: Globe, 
    color: '#E6A35C', // Sunset Gold
    desc: 'Gross Domestic Product.',
    isMacro: true, // Large Billions/Trillions
    isPercentage: false,
    format: (v) => `$${(v/1000).toFixed(1)}T`,
    category: 'Macro & Markets'
  },
  { 
    id: 'Stock Market (b)', 
    label: 'Stock Market Value', 
    icon: Coins, 
    color: '#5D8AA8', // Giverny Blue
    desc: 'Total value of US Stock Market.',
    isMacro: true, // Large Billions/Trillions
    isPercentage: false,
    format: (v) => `$${(v/1000).toFixed(1)}T`,
    category: 'Macro & Markets'
  }
];

// --- Math Helpers ---
const calculateRSquared = (data: DataPoint[], key1: string, key2: string): string | null => {
  const n = data.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  let count = 0;

  for (const point of data) {
    const x = Number(point[key1]);
    const y = Number(point[key2]);

    if (!isNaN(x) && !isNaN(y)) {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
      count++;
    }
  }

  if (count < 2) return "0.00"; 

  const numerator = count * sumXY - sumX * sumY;
  const denominator = Math.sqrt((count * sumX2 - sumX * sumX) * (count * sumY2 - sumY * sumY));

  if (denominator === 0) return "0.00"; 

  const r = numerator / denominator;
  return (r * r).toFixed(2);
};

// --- Parsing Helper ---
const parseLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // Handle escaped quotes inside quoted fields ("")
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

const toGoogleCsvUrl = (url: string): string => {
  if (url.includes('/gviz/tq?tqx=out:csv') || url.includes('/export?format=csv')) {
    return url;
  }

  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return url;

  const gidMatch = url.match(/[?&]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : null;
  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
};

// --- Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = "", style }) => (
  <div className={`bg-secondary border border-theme rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`} style={style}>
    {children}
  </div>
);

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, isRelative, mode = 'Dashboard' }) => {
  if (active && payload && payload.length && label !== undefined) {
    if (mode === 'Buffett') {
      const point = payload[0]?.payload;
      if (!point) return null;
      const stockSource = METRIC_SOURCES['Stock Market (b)'];
      const gdpSource = METRIC_SOURCES.GDP;

      const buffettValue = Number(point.buffettValue);
      let status = 'Fair Value';
      let statusColor = '#6DA36D';

      if (buffettValue > 150) {
        status = 'Significantly Overvalued';
        statusColor = '#D65D5D';
      } else if (buffettValue > 127) {
        status = 'Overvalued';
        statusColor = '#E6A35C';
      } else if (buffettValue < 83) {
        status = 'Undervalued';
        statusColor = '#5D8AA8';
      }

      return (
        <div className="bg-secondary border border-theme p-3 rounded shadow-xl z-50">
          <p className="text-main text-xs mb-2 font-mono border-b border-subtle pb-1">
            {new Date(label).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-6 text-sm">
              <span className="text-muted font-medium">Buffett Indicator</span>
              <span className="text-main font-bold font-mono">{buffettValue.toFixed(1)}%</span>
            </div>

            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-muted">Valuation:</span>
              <span
                className="font-bold px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide text-white"
                style={{ backgroundColor: statusColor }}
              >
                {status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted pt-2 border-t border-subtle mt-1">
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-muted">Total Market Cap</span>
                <span className="font-mono text-main">${(Number(point['Stock Market (b)']) / 1000).toFixed(1)}T</span>
                {stockSource && (
                  <a
                    href={stockSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[10px] underline mt-0.5 text-muted hover:text-main"
                  >
                    Source
                  </a>
                )}
              </div>
              <div className="text-right">
                <span className="block text-[9px] uppercase tracking-wider text-muted">US GDP</span>
                <span className="font-mono text-main">${(Number(point.GDP) / 1000).toFixed(1)}T</span>
                {gdpSource && (
                  <a
                    href={gdpSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[10px] underline mt-0.5 text-muted hover:text-main"
                  >
                    Source
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    
    // Standard Dashboard Tooltip
    return (
      <div className="bg-secondary border border-theme p-3 rounded shadow-xl z-50">
        <p className="text-main text-xs mb-2 font-mono border-b border-subtle pb-1">
          {new Date(label).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </p>
        <div className="space-y-1">
          {payload.filter((p) => p.name !== 'Baseline').map((entry, index) => {
             const originalValue = entry.payload?.[`original_${entry.dataKey}`];
             const rawData = entry.payload;
             const showCount = entry.name === 'Unemployment Rate' && rawData?.['Unemployeed Count'] !== undefined;
             const metricKey = typeof entry.dataKey === 'string' ? entry.dataKey : '';
             const source = metricKey ? METRIC_SOURCES[metricKey] : undefined;
             return (
              <div key={index} className="flex flex-col gap-0.5 mb-2 last:mb-0">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full border border-subtle" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted font-medium">{entry.name}:</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-main font-mono font-semibold">
                      {isRelative 
                        ? `${Number(entry.value).toFixed(1)}%` 
                        : (Number(entry.value) >= 1000 ? Number(entry.value).toLocaleString() : entry.value)}
                    </span>
                    {isRelative && originalValue !== undefined && originalValue !== null && (
                      <span className="text-[10px] text-muted">
                        ({Number(originalValue).toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>
                {showCount && (
                  <div className="flex justify-end text-[10px] text-muted -mt-1 mb-1 font-mono">
                    Count: {(Number(rawData?.['Unemployeed Count']) / 1000).toFixed(1)}M
                  </div>
                )}
                {source && (
                  <div className="flex justify-end text-[10px]">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted underline hover:text-main"
                    >
                      Source: {source.provider} ({source.seriesId})
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

// --- Custom Dual Range Slider Component ---
const DateRangeSlider: React.FC<{
  min: number;
  max: number;
  value: [number, number];
  onChange: (val: [number, number]) => void;
  data: DataPoint[];
}> = ({ min, max, value, onChange, data }) => {
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const range = max - min;

  const getPercentage = (val: number) => {
    if (range <= 0) return 0;
    return ((val - min) / range) * 100;
  };

  const getLabel = (index: number) => {
    const row = data[index];
    if (!row?.date) return 'N/A';
    return new Date(row.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  };

  const handleMouseDown = (type: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(type);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (range <= 0) return;
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const clickValue = Math.round(min + percent * (max - min));
    
    // Determine which handle is closer
    const distMin = Math.abs(clickValue - value[0]);
    const distMax = Math.abs(clickValue - value[1]);
    
    if (distMin < distMax) {
      if (clickValue < value[1]) onChange([clickValue, value[1]]);
    } else {
      if (clickValue > value[0]) onChange([value[0], clickValue]);
    }
  };

  const handleGlobalMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (range <= 0) return;
    if (!isDragging || !sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newValue = Math.round(min + percent * (max - min));

    if (isDragging === 'min') {
      const clamped = Math.min(newValue, value[1] - 1);
      if (clamped >= min) onChange([clamped, value[1]]);
    } else {
      const clamped = Math.max(newValue, value[0] + 1);
      if (clamped <= max) onChange([value[0], clamped]);
    }
  }, [isDragging, min, max, onChange, range, value]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleGlobalMouseMove, handleGlobalMouseUp]);

  return (
    <div className="pt-6 pb-2 px-2">
      <div 
        ref={sliderRef}
        className="relative h-2 bg-muted-surface rounded-full cursor-pointer group"
        onClick={handleTrackClick}
      >
        {/* Active Range Track */}
        <div 
          className="absolute h-full brand-secondary rounded-full opacity-50 group-hover:opacity-70 transition-colors"
          style={{ 
            left: `${getPercentage(value[0])}%`, 
            right: `${100 - getPercentage(value[1])}%` 
          }}
        />

        {/* Min Handle */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-secondary border-2 border-theme rounded-full shadow cursor-grab active:cursor-grabbing active:scale-110 active:border-[color:var(--color-brand-primary)] transition-all z-10"
          style={{ left: `${getPercentage(value[0])}%` }}
          onMouseDown={handleMouseDown('min')}
        >
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-muted bg-secondary opacity-90 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
            {getLabel(value[0])}
          </div>
        </div>

        {/* Max Handle */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-secondary border-2 border-theme rounded-full shadow cursor-grab active:cursor-grabbing active:scale-110 active:border-[color:var(--color-brand-primary)] transition-all z-10"
          style={{ left: `${getPercentage(value[1])}%` }}
          onMouseDown={handleMouseDown('max')}
        >
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-muted bg-secondary opacity-90 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
            {getLabel(value[1])}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for Reference Area Label
interface RenderLabelProps {
  viewBox: { x: number; y: number; width: number; height: number };
  label: string;
  labelPos: ReferenceLabelPosition;
}

const RenderLabel = ({ viewBox, label, labelPos }: RenderLabelProps) => {
  const { x, y, width, height } = viewBox;
  
  let textX = x + 10;
  let textY = y + 20;
  let textAnchor: 'start' | 'middle' | 'end' = 'start';

  if (labelPos === 'insideTop') {
    textX = x + width / 2;
    textY = y + 20;
    textAnchor = "middle";
  } else if (labelPos === 'insideBottom') {
    textX = x + width / 2;
    textY = y + height - 10;
    textAnchor = "middle";
  }

  return (
    <text x={textX} y={textY} fill="#6b7280" fontSize={10} fontWeight="bold" textAnchor={textAnchor} className="uppercase tracking-wide">
      {label}
    </text>
  );
};

export default function App() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Buffett'>('Dashboard');
  const [shareMode, setShareMode] = useState(false);
  const [viewMode, setViewMode] = useState<'raw' | 'relative'>('raw');
  // Set default selected metrics to S&P 500 and Job Openings
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['S&P 500', 'Job Openings']);
  
  // Date Range State (Indices) - Initialized to a safe empty array state
  const [dateRange, setDateRange] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    let cancelled = false;

    const getCsvData = async (): Promise<string> => {
      if (GOOGLE_SHEET_URL) {
        const csvUrl = toGoogleCsvUrl(GOOGLE_SHEET_URL);
        try {
          const response = await fetch(csvUrl, { cache: 'no-store' });
          if (response.ok) return await response.text();
          console.warn(`Failed to fetch Google Sheet URL (status ${response.status}). Falling back.`);
        } catch (error) {
          console.warn('Failed to fetch Google Sheet URL. Falling back.', error);
        }
      }

      try {
        const response = await fetch(LOCAL_DATA_URL, { cache: 'no-store' });
        if (response.ok) return await response.text();
      } catch (error) {
        console.warn('Failed to fetch local CSV fallback. Falling back to embedded CSV.', error);
      }

      return RAW_CSV_DATA;
    };

    const loadData = async () => {
      setDataError(null);
      setIsLoading(true);

      try {
        const csvData = await getCsvData();
        if (cancelled) return;

        const lines = csvData.split('\n');
        if (lines.length < 2) {
          setDataError('CSV appears empty. Expected header + at least one row.');
          return;
        }
        
        const headers = parseLine(lines[0]);
        const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
        if (missingColumns.length > 0) {
          setDataError(`Missing required columns: ${missingColumns.join(', ')}`);
          return;
        }
        
        const parsedData: DataPoint[] = [];
        let badRowCount = 0;

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = parseLine(lines[i]);
          if (values.length !== headers.length) {
            badRowCount++;
            continue;
          }

          const entry: CsvEntry = {};
          
          headers.forEach((header, index) => {
            let value = values[index]?.replace(/^,|,$/g, '') || ''; 
            
            if (value) {
              value = value.replace(/"/g, '').replace(/,/g, ''); 
            }
            
            if (header === 'Observed Date' && value) {
              const parsedDate = new Date(value);
              if (!Number.isNaN(parsedDate.getTime())) {
                entry.date = value;
                entry.timestamp = parsedDate.getTime();
                entry.year = parsedDate.getFullYear();
              }
            } else if (!isNaN(Number(value)) && value !== '') {
              entry[header] = Number(value);
            } else {
              entry[header] = undefined;
            }
          });

          if (!entry.date || entry.timestamp === undefined || entry.year === undefined) {
            badRowCount++;
            continue;
          }

          const missingRequiredValue = REQUIRED_COLUMNS.some((column) => {
            if (column === 'Observed Date') return false;
            return entry[column] === undefined;
          });
          if (missingRequiredValue) {
            badRowCount++;
            continue;
          }

          if (entry['Stock Market (b)'] !== undefined && entry['GDP'] !== undefined) {
            entry.buffettValue = (Number(entry['Stock Market (b)']) / Number(entry['GDP'])) * 100;
          }

          parsedData.push(entry as DataPoint);
        }
        
        if (badRowCount > 0) {
          setDataError(`CSV validation failed: ${badRowCount} row(s) are malformed or missing required values.`);
          return;
        }

        // Sort data chronologically just in case
        parsedData.sort((a, b) => a.timestamp - b.timestamp);
        if (cancelled) return;
        
        if (parsedData.length === 0) {
          setDataError('CSV validation failed: no valid rows were found.');
          return;
        }
        
        setData(parsedData);
        setDateRange([0, parsedData.length - 1]);
      } catch (error) {
        setDataError(`Data load failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeMetrics = useMemo(() => 
    METRICS.filter(m => selectedMetrics.includes(m.id)), 
  [selectedMetrics]);

  // Filter Data based on Slider Range
  const filteredData = useMemo(() => {
    if (data.length === 0) return [];
    return data.slice(dateRange[0], dateRange[1] + 1);
  }, [data, dateRange]);

  // --- Dynamic Axis Assignment Logic ---
  const chartConfig = useMemo(() => {
    const assignments: { id: string; axis: 'left' | 'right' }[] = [];
    const metricsToAssign = [...activeMetrics];
    
    if (metricsToAssign.length === 0) {
      return { assignments: [], useRightAxis: false };
    }
    
    // 1. Assign the first selected metric to the LEFT axis
    const leftMetric = metricsToAssign.shift()!;
    assignments.push({ id: leftMetric.id, axis: 'left' });
    
    // 2. If there's a second metric, assign it and all subsequent metrics to the RIGHT axis
    let useRightAxis = false;
    if (metricsToAssign.length > 0) {
        metricsToAssign.forEach(m => {
            assignments.push({ id: m.id, axis: 'right' });
        });
        useRightAxis = true;
    }
    
    // Enforcement: If two or more metrics are selected in RAW mode, force two axes.
    if (activeMetrics.length >= 2 && viewMode === 'raw') {
        return { assignments, useRightAxis: true };
    }

    return { assignments, useRightAxis: false };

  }, [activeMetrics, viewMode]);
  
  const getAxisId = useCallback((metricId: string): 'left' | 'right' => {
      if (viewMode === 'relative') return 'left'; // All on one scale in relative mode

      const assignment = chartConfig.assignments.find(a => a.id === metricId);
      return assignment ? assignment.axis : 'left';
  }, [chartConfig, viewMode]);


  const chartData = useMemo(() => {
    if (viewMode === 'raw' || filteredData.length === 0) return filteredData;

    const baseValues: Record<string, number> = {};
    
    // Use the first visible data point as the base (100%)
    activeMetrics.forEach(m => {
      const firstPoint = filteredData.find(d => d[m.id] !== undefined && d[m.id] !== null && d[m.id] !== '');
      if (firstPoint) {
        baseValues[m.id] = Number(firstPoint[m.id]);
      }
    });

    return filteredData.map(point => {
      const newPoint: DataPoint = { ...point };
      activeMetrics.forEach(m => {
        const val = Number(point[m.id]);
        const base = baseValues[m.id];
        newPoint[`original_${m.id}`] = val;
        if (base && !isNaN(val)) {
          newPoint[m.id] = (val / base) * 100;
        } else {
          // Keep original undefined or non-numeric state if base is missing or val is bad
          newPoint[m.id] = undefined; 
        }
      });
      return newPoint;
    });
  }, [filteredData, viewMode, activeMetrics]);

  const buffettData = useMemo(
    () => filteredData.filter((point) => point.buffettValue !== undefined),
    [filteredData]
  );

  const metricExtrema = useMemo(() => {
    const extrema: Record<string, MetricExtrema> = {};

    activeMetrics.forEach((metric) => {
      let minValue = Infinity;
      let maxValue = -Infinity;
      let minTimestamp: number | null = null;
      let maxTimestamp: number | null = null;

      chartData.forEach((point) => {
        const value = Number(point[metric.id]);
        const timestamp = Number(point.timestamp);
        if (!Number.isFinite(value) || !Number.isFinite(timestamp)) return;

        if (value < minValue) {
          minValue = value;
          minTimestamp = timestamp;
        }
        if (value > maxValue) {
          maxValue = value;
          maxTimestamp = timestamp;
        }
      });

      if (minTimestamp !== null && maxTimestamp !== null) {
        extrema[metric.id] = { minValue, maxValue, minTimestamp, maxTimestamp };
      }
    });

    return extrema;
  }, [activeMetrics, chartData]);

  const formatExtremaValue = useCallback((metric: MetricConfig, value: number): string => {
    if (viewMode === 'relative') return `${value.toFixed(1)}%`;
    return metric.format(value);
  }, [viewMode]);

  const renderExtremaDot = useCallback((metric: MetricConfig, dotProps: ExtremaDotProps) => {
    const extrema = metricExtrema[metric.id];
    if (!extrema) return null;

    const timestamp = Number(dotProps?.payload?.timestamp);
    const value = Number(dotProps?.value);
    if (!Number.isFinite(timestamp) || !Number.isFinite(value)) return null;

    const isMin = timestamp === extrema.minTimestamp && value === extrema.minValue;
    const isMax = timestamp === extrema.maxTimestamp && value === extrema.maxValue;
    if (!isMin && !isMax) return null;

    const cx = Number(dotProps.cx);
    const cy = Number(dotProps.cy);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

    let label = '';
    let labelDy = -12;
    if (isMin && isMax) {
      label = formatExtremaValue(metric, value);
      labelDy = -12;
    } else if (isMax) {
      label = formatExtremaValue(metric, extrema.maxValue);
      labelDy = -12;
    } else {
      label = formatExtremaValue(metric, extrema.minValue);
      labelDy = 16;
    }

    return (
      <g>
        <circle cx={cx} cy={cy} r={3.5} fill={metric.color} stroke="var(--color-chart-bg)" strokeWidth={1.5} />
        <text
          x={cx}
          y={cy + labelDy}
          textAnchor="middle"
          className="fill-main"
          fontSize={10}
          fontWeight={600}
        >
          {label}
        </text>
      </g>
    );
  }, [formatExtremaValue, metricExtrema]);

  const toggleMetric = (id: string) => {
    if (selectedMetrics.includes(id)) {
      if (selectedMetrics.length > 1) setSelectedMetrics(prev => prev.filter(m => m !== id));
    } else {
      if (selectedMetrics.length < 5) setSelectedMetrics(prev => [...prev, id]);
    }
  };
  
  // Calculate R-Squared based on FILTERED Data
  const rSquared = useMemo(() => {
    if (activeMetrics.length < 2) return null;
    return calculateRSquared(filteredData, activeMetrics[0].id, activeMetrics[1].id);
  }, [filteredData, activeMetrics]);

  const chartMetricTitle = useMemo(() => {
    if (activeMetrics.length <= 1) return '';
    if (activeMetrics.length === 2) return `${activeMetrics[0].label} vs ${activeMetrics[1].label}`;
    return `${activeMetrics[0].label}, ${activeMetrics[1].label} +${activeMetrics.length - 2} more`;
  }, [activeMetrics]);

  const leftAxisMetrics = useMemo(() => {
    if (viewMode === 'relative') return activeMetrics;

    const leftIds = chartConfig.assignments.filter((a) => a.axis === 'left').map((a) => a.id);
    return activeMetrics.filter((m) => leftIds.includes(m.id));
  }, [activeMetrics, chartConfig.assignments, viewMode]);

  const rightAxisMetrics = useMemo(() => {
    if (viewMode === 'relative') return [];

    const rightIds = chartConfig.assignments.filter((a) => a.axis === 'right').map((a) => a.id);
    return activeMetrics.filter((m) => rightIds.includes(m.id));
  }, [activeMetrics, chartConfig.assignments, viewMode]);

  const leftAxisTitle = useMemo(() => {
    if (viewMode === 'relative') return 'Index (Base=100)';
    if (leftAxisMetrics.length === 0) return 'Value';
    if (leftAxisMetrics.length === 1) return leftAxisMetrics[0].label;
    return `${leftAxisMetrics[0].label} +${leftAxisMetrics.length - 1}`;
  }, [leftAxisMetrics, viewMode]);

  const rightAxisTitle = useMemo(() => {
    if (rightAxisMetrics.length === 0) return '';
    if (rightAxisMetrics.length === 1) return rightAxisMetrics[0].label;
    return `${rightAxisMetrics[0].label} +${rightAxisMetrics.length - 1}`;
  }, [rightAxisMetrics]);

  // Group metrics by category for sidebar
  const metricsByCategory = useMemo(() => {
    const groups: Record<string, MetricConfig[]> = {};
    METRICS.forEach(m => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, []);

  const lastUpdatedText = useMemo(() => {
    if (data.length === 0) return 'N/A';
    const lastPoint = data[data.length - 1];
    return new Date(lastPoint.timestamp).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center text-muted">
        Loading data... Please verify your CSV source is reachable and formatted correctly.
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-secondary border border-theme rounded-xl p-6">
          <h2 className="text-lg font-bold text-main mb-2">Data Validation Error</h2>
          <p className="text-sm text-muted">{dataError}</p>
        </div>
      </div>
    );
  }

  // --- RENDERING ONLY THE DASHBOARD VIEW ---
  return (
    <div className="min-h-screen bg-primary text-main font-sans p-4 md:p-8 lg:p-10">
      <div className={`mx-auto ${shareMode ? 'max-w-[1700px]' : 'max-w-[1600px]'}`}>
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-secondary p-6 rounded-2xl shadow-sm border border-theme">
        <div className="flex items-center gap-4">
          <img src={appLogo} alt="Economic Dashboard logo" className="w-14 h-14 object-contain shrink-0" />
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-main tracking-tight">Economic Indicators</h1>
            <p className="text-sm text-muted mt-1">Last updated: {lastUpdatedText}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {shareMode && (
            <button
              onClick={() => setShareMode(false)}
              className="px-3 py-1.5 text-sm font-medium rounded-md border bg-muted-surface text-main border-theme"
            >
              Back to Metric Selector
            </button>
          )}
          <div className="flex bg-muted-surface p-1 rounded-lg border border-theme">
            {(['Dashboard', 'Buffett'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-secondary text-main shadow-sm border border-theme'
                    : 'text-muted hover:text-main'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </header>
      
      {/* STANDARD DASHBOARD VIEW (Always visible now) */}
      <div className={`${activeTab === 'Dashboard' && !shareMode ? 'grid grid-cols-1 lg:grid-cols-[32fr_68fr] gap-6' : 'grid grid-cols-1 gap-6'}`}>
        
        {/* Sidebar Settings */}
        {activeTab === 'Dashboard' && !shareMode && (
        <div className="space-y-6">
          
          <Card
            className="h-full"
            style={{ backgroundColor: 'color-mix(in oklab, var(--color-surface-muted) 28%, var(--color-bg-secondary))' }}
          >
            <div className="mb-8">
              <div className="flex text-xs font-medium border border-theme rounded p-1">
                <button 
                  onClick={() => setViewMode('raw')}
                  className={`flex-1 py-1.5 rounded transition-all ${viewMode === 'raw' ? 'bg-muted-surface text-main font-semibold' : 'text-muted hover:text-main'}`}
                >
                  Raw Values
                </button>
                <button 
                  onClick={() => setViewMode('relative')}
                  className={`flex-1 py-1.5 rounded transition-all ${viewMode === 'relative' ? 'bg-muted-surface text-main font-semibold' : 'text-muted hover:text-main'}`}
                >
                  Relative Index
                </button>
              </div>
              <button
                onClick={() => setShareMode((prev) => !prev)}
                className={`w-full mt-3 text-left text-sm font-medium border border-theme rounded-lg px-3 py-2 transition ${
                  shareMode ? 'bg-secondary text-main' : 'bg-muted-surface text-muted hover:text-main'
                }`}
              >
                {shareMode ? 'Exit Share Mode' : 'Share Mode'}
              </button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Metrics</h3>
                <span className="text-xs text-muted">
                  {selectedMetrics.length} Selected
                </span>
              </div>
              <div className="mt-4 space-y-6 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(metricsByCategory).map(([category, catMetrics]) => (
                  <div key={category}>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 pl-1 border-b border-subtle pb-1">{category}</h4>
                    <div className="space-y-1.5">
                      {catMetrics.map((m) => {
                        const isSelected = selectedMetrics.includes(m.id);
                        
                        return (
                          <div 
                            key={m.id}
                            onClick={() => toggleMetric(m.id)}
                            className={`
                              group relative p-2.5 rounded-md border cursor-pointer transition-all duration-200
                              ${isSelected 
                                ? 'bg-muted-surface border-theme' 
                                : 'bg-transparent border-transparent hover:bg-muted-surface'}
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className={`
                                  w-6 h-6 flex items-center justify-center transition-all duration-300
                                `}
                              >
                                <m.icon className={`w-4 h-4 ${isSelected ? 'text-main' : 'text-muted'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium truncate transition-colors ${isSelected ? 'text-main' : 'text-muted group-hover:text-main'}`}>
                                  {m.label}
                                </div>
                              </div>
                              
                              <div className={`
                                w-3 h-3 rounded-full border flex items-center justify-center transition-all duration-200
                                ${isSelected 
                                  ? 'bg-main border-main' 
                                  : 'border-theme'}
                              `}>
                                 {isSelected && <div className="w-1 h-1 bg-secondary rounded-full" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-col gap-6">
          
          {/* Chart Section */}
          {activeTab === 'Dashboard' && (
          <Card className={`flex-1 flex flex-col relative overflow-hidden ${shareMode ? 'min-h-[760px]' : 'min-h-[500px]'}`}>
             {/* --- CORRELATION INDICATOR --- */}
             {activeMetrics.length === 2 && rSquared && (
              <div className="group absolute top-4 right-4 z-20 flex items-center gap-2 cursor-help bg-secondary backdrop-blur-sm p-2 rounded-lg shadow-sm border border-theme">
                <span className="text-sm font-bold text-main">
                  R<sup>2</sup> = {rSquared}
                </span>
                <HelpCircle className="w-4 h-4 text-muted hover:text-[color:var(--color-brand-primary)] transition-colors" />
                <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-main text-inverse text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none transform translate-y-1 group-hover:translate-y-0">
                  <div className="font-bold text-sm mb-2 text-blue-400">Coefficient of Determination</div>
                  <p className="mb-3 text-inverse-muted leading-relaxed">Measures the strength of the relationship between the two selected indicators.</p>
                  <div className="space-y-2">
                    <div>
                      <span className="text-blue-300 font-semibold block mb-0.5">Why it's interesting:</span>
                      <span className="text-inverse-muted">It reveals if one economic metric effectively predicts or mirrors another.</span>
                    </div>
                    <div>
                      <span className="text-emerald-300 font-semibold block mb-0.5">Why care?</span>
                      <span className="text-inverse-muted">High correlations (near 1.0) suggest a reliable trend; sudden divergences can signal market shifts.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* ----------------------------- */}

            <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center ${shareMode ? 'mb-5 gap-3' : 'mb-8 gap-4'} z-10`}>
              <div>
                <h2 className="text-2xl font-semibold text-main flex items-center gap-2">
                  {viewMode === 'relative' ? 'Relative Performance Index' : 'Economic Trends'}
                </h2>
                {chartMetricTitle && (
                  <p className="text-sm text-muted mt-1 font-medium">
                    {chartMetricTitle}
                  </p>
                )}
                <p className="text-sm text-muted mt-1">
                   {viewMode === 'relative' 
                     ? 'Comparing percentage growth relative to start date (Base = 100)' 
                     : 'Historical absolute values over time'}
                </p>
              </div>
            </div>

            {/* Range Slider */}
            {data.length > 1 && (
              <DateRangeSlider 
                min={0}
                max={data.length - 1}
                value={dateRange}
                onChange={setDateRange}
                data={data}
              />
            )}

            <div className={`flex-1 w-full ${shareMode ? 'min-h-[560px]' : 'min-h-[450px]'} -ml-2`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
                  
                  <XAxis 
                    dataKey="timestamp" 
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    stroke="var(--color-chart-axis)" 
                    fontSize={11} 
                    tickFormatter={(val) => {
                       const d = new Date(val);
                       return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
                    }}
                    tickMargin={15}
                    minTickGap={40}
                    axisLine={false}
                    tickLine={false}
                  />
                  
                  {/* Primary Left Axis */}
                  <YAxis 
                    yAxisId="left" 
                    stroke="var(--color-chart-axis)" 
                    fontSize={11} 
                    orientation="left"
                    label={{ value: leftAxisTitle, angle: -90, position: 'insideLeft', offset: 2, style: { fill: 'var(--color-chart-axis)', fontSize: 13, fontWeight: 700 } }}
                    tickFormatter={(val) => viewMode === 'relative' ? `${val}%` : Number(val).toLocaleString()}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    width={64}
                  />
                  
                  {/* Secondary Right Axis (Always active in Raw mode when 2+ metrics selected) */}
                  {chartConfig.useRightAxis && viewMode === 'raw' && (
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="var(--color-chart-axis)" 
                      fontSize={11}
                      label={{ value: rightAxisTitle, angle: 90, position: 'insideRight', offset: 2, style: { fill: 'var(--color-chart-axis)', fontSize: 13, fontWeight: 700 } }}
                      tickFormatter={(val) => Number(val).toLocaleString()}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      width={64}
                    />
                  )}

                  <Tooltip content={<CustomTooltip isRelative={viewMode === 'relative'} />} />
                  <Legend verticalAlign="top" height={36} content={() => null} />

                  {/* Reference Zones */}
                  {REFERENCE_ZONES.map((zone, index) => (
                    <ReferenceArea 
                      key={index}
                      x1={new Date(zone.start).getTime()}
                      x2={new Date(zone.end).getTime()}
                      yAxisId="left"
                      fill={zone.color}
                      fillOpacity={zone.opacity}
                      label={(props) => <RenderLabel {...props} label={zone.label} labelPos={zone.labelPos} />}
                    />
                  ))}

                  {activeMetrics.map((m) => {
                    // Get the axis ID based on mode (Relative is always 'left') and dynamic assignment
                    const axisId = getAxisId(m.id);
                    
                    return (
                      <Line 
                        key={m.id}
                        yAxisId={axisId}
                        type="monotone" 
                        dataKey={m.id} 
                        name={m.label}
                        stroke={m.color} 
                        strokeWidth={4} 
                        dot={(dotProps) => renderExtremaDot(m, dotProps)}
                        activeDot={{ r: 4, strokeWidth: 0, fill: m.color }}
                        animationDuration={1000}
                        connectNulls
                      />
                    );
                  })}
                  
                  {/* Baseline for Relative Mode */}
                  {viewMode === 'relative' && (
                    <Line 
                      yAxisId="left"
                      dataKey={() => 100} 
                      stroke="var(--color-chart-baseline)" 
                      strokeDasharray="4 4" 
                      strokeWidth={1}
                      dot={false} 
                      name="Baseline"
                    />
                  )}

                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* NEW BOTTOM LEGEND SECTION */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-subtle pt-4">
               {activeMetrics.map(m => (
                 <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-muted-surface rounded-full border border-theme">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                   <span className={`${shareMode ? 'text-[22px]' : 'text-[19px]'} font-medium text-main`}>
                     {m.label}
                   </span>
                 </div>
               ))}
            </div>
          </Card>
          )}

          {activeTab === 'Buffett' && (
          <Card className="min-h-[760px] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
              <div>
                <h2 className="text-xl font-semibold text-main">The Buffett Indicator</h2>
                <p className="text-sm text-muted mt-1">Ratio of total US stock market value to GDP.</p>
              </div>
              <div className="flex items-center gap-2 bg-muted-surface border border-theme px-3 py-1 rounded">
                <span className="text-main text-sm font-mono">
                  Current: {buffettData.length > 0 ? `${Number(buffettData[buffettData.length - 1].buffettValue).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[620px] -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={buffettData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    stroke="var(--color-chart-axis)"
                    fontSize={11}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
                    }}
                    tickMargin={15}
                    minTickGap={40}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--color-chart-axis)"
                    fontSize={11}
                    orientation="left"
                    tickFormatter={(val) => `${val}%`}
                    axisLine={false}
                    tickLine={false}
                    domain={[80, 'auto']}
                  />
                  <Tooltip content={<CustomTooltip isRelative={false} mode="Buffett" />} />

                  <ReferenceArea y1={150} y2={200} fill="#D65D5D" fillOpacity={0.4} />
                  <ReferenceArea y1={127} y2={150} fill="#E6A35C" fillOpacity={0.4} />
                  <ReferenceArea y1={105} y2={127} fill="#6DA36D" fillOpacity={0.4} />
                  <ReferenceArea y1={83} y2={105} fill="#5D8AA8" fillOpacity={0.4} />

                  <Line
                    type="monotone"
                    dataKey="buffettValue"
                    name="Buffett Indicator"
                    stroke="#0F172A"
                    strokeWidth={4.2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#F04A00' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
          )}

          {/* Metric Details Grid */}
          {activeTab === 'Dashboard' && !shareMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeMetrics.map(m => {
              const source = METRIC_SOURCES[m.id];
              // Get last valid value
              const validPoints = data.filter(d => d[m.id] !== undefined);
              const lastPoint = validPoints[validPoints.length - 1];
              const lastValue = lastPoint ? Number(lastPoint[m.id]) : 0;
              
              // Get previous value for trend
              const prevPoint = validPoints[validPoints.length - 2];
              const prevValue = prevPoint ? Number(prevPoint[m.id]) : 0;
              
              // Calculate Change
              let changeValue: number | null = 0;
              let isPercentagePoint = false;

              if (m.isPercentage) {
                // Percentage Point Change (e.g. 5.2% -> 5.4% is +0.2pp)
                changeValue = lastValue - prevValue;
                isPercentagePoint = true;
              } else {
                // Percent Change (e.g. 100 -> 110 is +10%)
                if (prevValue > 0) {
                  changeValue = ((lastValue - prevValue) / prevValue) * 100;
                } else {
                  changeValue = null;
                }
              }

              if (changeValue !== null && !Number.isFinite(changeValue)) {
                changeValue = null;
              }

              const isPositive = changeValue !== null && changeValue >= 0;
              const cardBackground = `color-mix(in oklab, ${m.color} 10%, var(--color-bg-secondary))`;
              const cardBorder = `color-mix(in oklab, ${m.color} 24%, var(--color-border))`;

              return (
                <Card
                  key={m.id}
                  className="group transition-all duration-300"
                  style={{ backgroundColor: cardBackground, borderColor: cardBorder }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-main">{m.label}</h4>
                      {source && (
                        <div className="relative group/source">
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center w-4 h-4 text-muted hover:text-main"
                            title={`Open source: ${source.seriesId}`}
                          >
                            <Info className="w-3.5 h-3.5" />
                          </a>
                          <div className="absolute left-0 top-full mt-1 w-56 bg-main text-inverse text-[11px] rounded-md px-2 py-2 opacity-0 group-hover/source:opacity-100 transition pointer-events-auto z-20">
                            <div className="font-semibold">{source.provider}</div>
                            <div>Series: {source.seriesId}</div>
                            {source.note && <div className="text-inverse-muted mt-0.5">{source.note}</div>}
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block mt-1 underline text-inverse-muted hover:text-inverse"
                            >
                              Open source link
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                    <m.icon className="w-4 h-4 text-muted group-hover:text-main transition-colors" />
                  </div>
                  <p className="text-xs text-muted leading-relaxed min-h-[1.5em]">{m.desc}</p>
                  
                  <div className="mt-4">
                     <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-mono text-main font-semibold">
                         {m.format(lastValue)}
                       </span>
                       {changeValue === null ? (
                         <span className="text-xs font-medium text-muted">N/A</span>
                       ) : (
                         <span className={`text-xs font-medium flex items-center ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                           {isPositive ? '+' : ''}{changeValue.toFixed(1)}{isPercentagePoint ? 'pp' : '%'}
                         </span>
                       )}
                     </div>
                     <div className="text-[10px] text-muted mt-1">
                       Last observed: {lastPoint?.date}
                     </div>
                  </div>
                </Card>
              );
            })}
          </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
