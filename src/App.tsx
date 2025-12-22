import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  TooltipProps, 
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
  Sun,
  Users,
  AlertCircle,
  Landmark,
  Hammer,
  Globe,
  Coins
} from 'lucide-react';

// --- Types & Interfaces ---

interface DataPoint {
  date: string;
  year: number;
  timestamp: number;
  [key: string]: string | number;
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

// --- Data ---
const fetchCSV = async (path: string): Promise<string> => {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load CSV: ${res.status}`);
  }
  return res.text();
};


// --- Configuration ---

// --- ARTISTIC PALETTE (Monet Inspired) ---
const PALETTE = {
  weak:   '#D65D5D', // Terra Cotta Red
  avg:    '#6DA36D', // Fern Green
  fit:    '#5D8AA8', // Giverny Blue
  elite:  '#E6A35C', // Sunset Gold
  
  // Category Colors
  body:   '#2563eb', // Blue
  mind:   '#059669', // Green
  family: '#7c3aed', // Purple
  social: '#0d9488', // Teal
  
  slate:  '#64748b',
  
  // Additions for completeness
  iris:   '#818CF8', // Soft Indigo
  rose:   '#F472B6', // Soft Pink
};

// --- REFERENCE ZONES ---
const REFERENCE_ZONES = [
  { label: "Dot Com", start: "2001-03-01", end: "2001-11-01", color: "#9ca3af", opacity: 0.3, labelPos: 'insideTopLeft' },
  { label: "Great Recession", start: "2007-12-01", end: "2009-06-01", color: "#9ca3af", opacity: 0.3, labelPos: 'insideTopLeft' },
  { label: "COVID-19", start: "2020-02-01", end: "2020-04-01", color: "#9ca3af", opacity: 0.3, labelPos: 'insideTop' },
  { label: "ChatGPT Launch", start: "2022-11-01", end: "2023-01-01", color: "#9ca3af", opacity: 0.3, labelPos: 'insideBottom' },
];

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
    format: (v) => `${v} wks`,
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
  { 
    id: '10 year treasury', // Mocked ID
    label: '10Y Treasury', 
    icon: Landmark, 
    color: '#EAB308', 
    desc: 'Yield on 10-year US Treasury Note.',
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
    format: (v) => `${v}`,
    category: 'Housing'
  },
  { 
    id: 'Months Supply', // Mocked ID
    label: 'Months Supply', 
    icon: Home, 
    color: '#0d9488', 
    desc: 'Ratio of new houses for sale to sold.',
    isMacro: false, // Small count (single digits)
    isPercentage: false,
    format: (v) => `${v} mo`,
    category: 'Housing'
  },
  { 
    id: 'New Home Starts', // Mocked ID
    label: 'New Home Starts', 
    icon: Hammer, 
    color: '#7c3aed', 
    desc: 'New privately owned housing units started.',
    isMacro: true, // Large count (Thousands)
    isPercentage: false,
    format: (v) => `${v}K`,
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
    format: (v) => `${v}`,
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
const parseLine = (line: string) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
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

// --- Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = "", style }) => (
  <div className={`bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`} style={style}>
    {children}
  </div>
);

const CustomTooltip: React.FC<TooltipProps<number, string> & { isRelative: boolean }> = ({ active, payload, label, isRelative }) => {
  if (active && payload && payload.length) {
    
    // Standard Dashboard Tooltip
    return (
      <div className="bg-white border border-slate-200 p-3 rounded shadow-xl z-50">
        <p className="text-slate-900 text-xs mb-2 font-mono border-b border-slate-100 pb-1">
          {new Date(label).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </p>
        <div className="space-y-1">
          {payload.filter(p => p.name !== 'Baseline').map((entry, index) => {
             const originalValue = entry.payload[`original_${entry.dataKey}`];
             return (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full border border-slate-100" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-600 font-medium">{entry.name}:</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-slate-900 font-mono font-semibold">
                    {isRelative 
                      ? `${Number(entry.value).toFixed(1)}%` 
                      : (entry.value >= 1000 ? entry.value.toLocaleString() : entry.value)}
                  </span>
                  {isRelative && originalValue && (
                    <span className="text-[10px] text-slate-400">
                      ({Number(originalValue).toLocaleString()})
                    </span>
                  )}
                </div>
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

  const getPercentage = (val: number) => ((val - min) / (max - min)) * 100;

  const handleMouseDown = (type: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(type);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
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
  }, [isDragging, min, max, value, onChange]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const csvText = await fetchCSV(
          import.meta.env.BASE_URL + 'data/economic_indicators.csv'
        );

        const lines = csvText.split('\n');
        if (lines.length < 2) return;

        const headers = parseLine(lines[0]);
        const parsedData: DataPoint[] = [];

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const values = parseLine(lines[i]);
          if (values.length !== headers.length) continue;

          const entry: any = {};

          headers.forEach((header, index) => {
            let value = values[index]?.replace(/"/g, '').replace(/,/g, '');

            if (header === 'Observed Date') {
              entry.date = value;
              entry.timestamp = new Date(value).getTime();
              entry.year = new Date(value).getFullYear();
            } else if (!isNaN(Number(value)) && value !== '') {
              entry[header] = Number(value);
            } else {
              entry[header] = undefined;
            }
          });

          if (entry.date) parsedData.push(entry);
        }

        parsedData.sort((a, b) => a.timestamp - b.timestamp);

        if (isMounted) {
          setData(parsedData);
          setDateRange([0, parsedData.length - 1]);
        }
      } catch (err) {
        console.error('CSV load error:', err);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="pt-6 pb-2 px-2">
      <div 
        ref={sliderRef}
        className="relative h-2 bg-slate-100 rounded-full cursor-pointer group"
        onClick={handleTrackClick}
      >
        {/* Active Range Track */}
        <div 
          className="absolute h-full bg-slate-300 rounded-full group-hover:bg-slate-400 transition-colors"
          style={{ 
            left: `${getPercentage(value[0])}%`, 
            right: `${100 - getPercentage(value[1])}%` 
          }}
        />

        {/* Min Handle */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-slate-400 rounded-full shadow cursor-grab active:cursor-grabbing active:scale-110 active:border-blue-500 transition-all z-10"
          style={{ left: `${getPercentage(value[0])}%` }}
          onMouseDown={handleMouseDown('min')}
        >
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 bg-white/90 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
            {new Date(data[value[0]].date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
          </div>
        </div>

        {/* Max Handle */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-slate-400 rounded-full shadow cursor-grab active:cursor-grabbing active:scale-110 active:border-blue-500 transition-all z-10"
          style={{ left: `${getPercentage(value[1])}%` }}
          onMouseDown={handleMouseDown('max')}
        >
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 bg-white/90 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
            {new Date(data[value[1]].date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for Reference Area Label
const RenderLabel = (props: any) => {
  const { viewBox, label, labelPos } = props;
  const { x, y, width, height } = viewBox;
  
  let textX = x + 10;
  let textY = y + 20;
  let textAnchor = "start";

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
  const [viewMode, setViewMode] = useState<'raw' | 'relative'>('raw');
  // Set default selected metrics to S&P 500 and Job Openings
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['S&P 500', 'Job Openings']);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  
  // Date Range State (Indices) - Initialized to a safe empty array state
  const [dateRange, setDateRange] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const lines = RAW_CSV_DATA.split('\n');
    if (lines.length < 2) return; // Need headers and at least one data row
    
    const headers = parseLine(lines[0]);
    
    const parsedData: DataPoint[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = parseLine(lines[i]);
      // Skip row if column count doesn't match header count
      if (values.length !== headers.length) {
         console.warn(`Skipping row ${i+1}: Column count mismatch (${values.length} vs ${headers.length})`);
         continue;
      }

      const entry: any = {};
      
      headers.forEach((header, index) => {
        let value = values[index]?.replace(/^,|,$/g, '') || ''; 
        
        if (value) {
           value = value.replace(/"/g, '').replace(/,/g, ''); 
        }
        
        if (header === 'Observed Date' && value) {
          entry['date'] = value;
          entry['timestamp'] = new Date(value).getTime(); // Add numeric timestamp
          entry['year'] = new Date(value).getFullYear();
        } else if (!isNaN(Number(value)) && value !== '') {
          entry[header] = Number(value);
        } else {
          entry[header] = undefined; // Use undefined for missing values to ensure Recharts skips them
        }
      });

      // --- MOCK DATA GENERATION for Missing Metrics ---
      // 10-Year Treasury: Correlated with 30y mortgage but lower
      if (entry['30 year mortgage'] !== undefined) {
        entry['10 year treasury'] = Math.max(0.5, Number(entry['30 year mortgage']) - 1.5 + (Math.random() * 0.2)); 
      }
      
      // Months Supply: Low in 2020-2021, rising in 2022
      if (entry['year'] !== undefined) {
        if (entry['year'] === 2020) entry['Months Supply'] = 3.5 + Math.random();
        else if (entry['year'] === 2021) entry['Months Supply'] = 2.0 + Math.random();
        else if (entry['year'] >= 2022) entry['Months Supply'] = 3.0 + (entry['year'] - 2022) * 0.5 + Math.random();
      }
      
      // New Home Starts: Seasonally adjusted annual rate (mocked ~1.2M - 1.8M)
      entry['New Home Starts'] = 1200 + Math.random() * 600;

      if (entry['Stock Market (b)'] !== undefined && entry['GDP'] !== undefined) {
        entry.buffettValue = (entry['Stock Market (b)'] / entry['GDP']) * 100;
      }

      if (entry.date) parsedData.push(entry);
    }
    
    // Sort data chronologically just in case
    parsedData.sort((a, b) => a.timestamp - b.timestamp);
    
    setData(parsedData);
    
    // IMPORTANT: Only set date range if data is available
    if (parsedData.length > 0) {
      setDateRange([0, parsedData.length - 1]);
    }

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
      const newPoint: any = { ...point };
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

  // Group metrics by category for sidebar
  const metricsByCategory = useMemo(() => {
    const groups: Record<string, MetricConfig[]> = {};
    METRICS.forEach(m => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, []);

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center text-slate-500">
        Loading data... Please ensure RAW_CSV_DATA is properly formatted.
      </div>
    );
  }

  // --- RENDERING ONLY THE DASHBOARD VIEW ---
  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans p-4 md:p-6 lg:p-8">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            {/* Custom Blue Pulse Icon */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H6L9 3L13 21L17 14L21 14" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Economic Indicators</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Dashboard & Recession Signals
            </p>
          </div>
        </div>

        {/* Removed the tabs, keeping only the theme toggle placeholder */}
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <Sun className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      {/* STANDARD DASHBOARD VIEW (Always visible now) */}
      <div className="grid grid-cols-1 lg:grid-cols-[35fr_65fr] gap-6">
        
        {/* Sidebar Settings */}
        <div className="space-y-6">
          
          <Card className="h-full">
            <div className="mb-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Chart Mode</h3>
              <div className="flex text-xs font-medium border border-slate-200 rounded p-1">
                <button 
                  onClick={() => setViewMode('raw')}
                  className={`flex-1 py-1.5 rounded transition-all ${viewMode === 'raw' ? 'bg-slate-100 text-black font-semibold' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Raw Values
                </button>
                <button 
                  onClick={() => setViewMode('relative')}
                  className={`flex-1 py-1.5 rounded transition-all ${viewMode === 'relative' ? 'bg-slate-100 text-black font-semibold' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Relative Index
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metrics</h3>
                <span className="text-[10px] text-slate-400">
                  {selectedMetrics.length} Selected
                </span>
              </div>
              
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(metricsByCategory).map(([category, catMetrics]) => (
                  <div key={category}>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1 border-b border-slate-100 pb-1">{category}</h4>
                    <div className="space-y-1.5">
                      {catMetrics.map((m) => {
                        const isSelected = selectedMetrics.includes(m.id);
                        const isHovered = hoveredMetric === m.id;
                        
                        return (
                          <div 
                            key={m.id}
                            onClick={() => toggleMetric(m.id)}
                            onMouseEnter={() => setHoveredMetric(m.id)}
                            onMouseLeave={() => setHoveredMetric(null)}
                            className={`
                              group relative p-2.5 rounded-md border cursor-pointer transition-all duration-200
                              ${isSelected 
                                ? 'bg-slate-50 border-slate-200' 
                                : 'bg-transparent border-transparent hover:bg-slate-50'}
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className={`
                                  w-6 h-6 flex items-center justify-center transition-all duration-300
                                `}
                              >
                                <m.icon className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-slate-400'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium truncate transition-colors ${isSelected ? 'text-black' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                  {m.label}
                                </div>
                              </div>
                              
                              <div className={`
                                w-3 h-3 rounded-full border flex items-center justify-center transition-all duration-200
                                ${isSelected 
                                  ? 'bg-black border-black' 
                                  : 'border-slate-300'}
                              `}>
                                 {isSelected && <div className="w-1 h-1 bg-white rounded-full" />}
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

        {/* Main Content Area */}
        <div className="flex flex-col gap-6">
          
          {/* Chart Section */}
          <Card className="flex-1 min-h-[500px] flex flex-col relative overflow-hidden">
             {/* --- CORRELATION INDICATOR --- */}
             {activeMetrics.length === 2 && rSquared && (
              <div className="group absolute top-4 right-4 z-20 flex items-center gap-2 cursor-help bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-slate-200">
                <span className="text-sm font-bold text-slate-700">
                  R<sup>2</sup> = {rSquared}
                </span>
                <HelpCircle className="w-4 h-4 text-slate-400 hover:text-blue-500 transition-colors" />
                <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-slate-900 text-white text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none transform translate-y-1 group-hover:translate-y-0">
                  <div className="font-bold text-sm mb-2 text-blue-400">Coefficient of Determination</div>
                  <p className="mb-3 text-slate-300 leading-relaxed">Measures the strength of the relationship between the two selected indicators.</p>
                  <div className="space-y-2">
                    <div>
                      <span className="text-blue-300 font-semibold block mb-0.5">Why it's interesting:</span>
                      <span className="text-slate-400">It reveals if one economic metric effectively predicts or mirrors another.</span>
                    </div>
                    <div>
                      <span className="text-emerald-300 font-semibold block mb-0.5">Why care?</span>
                      <span className="text-slate-400">High correlations (near 1.0) suggest a reliable trend; sudden divergences can signal market shifts.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* ----------------------------- */}

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {viewMode === 'relative' ? 'Relative Performance Index' : 'Economic Trends'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                   {viewMode === 'relative' 
                     ? 'Comparing percentage growth relative to start date (Base = 100)' 
                     : 'Historical absolute values over time'}
                </p>
              </div>
            </div>

            {/* Range Slider */}
            {data.length > 0 && (
              <DateRangeSlider 
                min={0}
                max={data.length - 1}
                value={dateRange}
                onChange={setDateRange}
                data={data}
              />
            )}

            <div className="flex-1 w-full min-h-[450px] -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  
                  <XAxis 
                    dataKey="timestamp" 
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    stroke="#64748b" 
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
                    stroke="#64748b" 
                    fontSize={11} 
                    orientation="left"
                    tickFormatter={(val) => viewMode === 'relative' ? `${val}%` : val >= 1000 ? `${val/1000}k` : val}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    width={50}
                  />
                  
                  {/* Secondary Right Axis (Always active in Raw mode when 2+ metrics selected) */}
                  {chartConfig.useRightAxis && viewMode === 'raw' && (
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="#64748b" 
                      fontSize={11}
                      tickFormatter={(val) => `${val}`}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      width={40}
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
                        strokeWidth={2} 
                        dot={false}
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
                      stroke="#cbd5e1" 
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
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 pt-4">
               {activeMetrics.map(m => (
                 <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                   <span className="text-sm font-medium text-slate-700">{m.label}</span>
                 </div>
               ))}
            </div>
          </Card>

          {/* Metric Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeMetrics.map(m => {
              // Get last valid value
              const validPoints = data.filter(d => d[m.id] !== undefined);
              const lastPoint = validPoints[validPoints.length - 1];
              const lastValue = lastPoint ? Number(lastPoint[m.id]) : 0;
              
              // Get previous value for trend
              const prevPoint = validPoints[validPoints.length - 2];
              const prevValue = prevPoint ? Number(prevPoint[m.id]) : 0;
              
              // Calculate Change
              let changeValue = 0;
              let isPercentagePoint = false;

              if (m.isPercentage) {
                // Percentage Point Change (e.g. 5.2% -> 5.4% is +0.2pp)
                changeValue = lastValue - prevValue;
                isPercentagePoint = true;
              } else {
                // Percent Change (e.g. 100 -> 110 is +10%)
                changeValue = ((lastValue - prevValue) / prevValue) * 100;
              }
              
              const isPositive = changeValue >= 0;

              return (
                <Card key={m.id} className="group hover:bg-slate-50 transition-all duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900">{m.label}</h4>
                    <m.icon className="w-4 h-4 text-slate-400 group-hover:text-black transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed min-h-[1.5em]">{m.desc}</p>
                  
                  <div className="mt-4">
                     <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-mono text-slate-900 font-semibold">
                         {m.format(lastValue)}
                       </span>
                       <span className={`text-xs font-medium flex items-center ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                         {isPositive ? '+' : ''}{changeValue.toFixed(1)}{isPercentagePoint ? 'pp' : '%'}
                       </span>
                     </div>
                     <div className="text-[10px] text-slate-400 mt-1">
                       Last observed: {lastPoint?.date}
                     </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}