import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  ReferenceArea, ComposedChart, ScatterChart, Scatter, ZAxis, AreaChart, Area
} from 'recharts';
import { 
  Upload, Info, ExternalLink, Activity, CheckSquare, Square, TrendingUp, 
  BarChart2, ArrowRightLeft, Minus, Calculator, Home, Briefcase, 
  AlertTriangle, Frown, DollarSign, TrendingDown
} from 'lucide-react';
import { INITIAL_CSV_DATA } from './data';

// --- Configuration & Metadata ---
const INDICATOR_CONFIG = {
  unemployment_rate: {
    label: "Unemployment Rate",
    definition: "The unemployment rate represents the number of unemployed as a percentage of the labor force.",
    source: "https://fred.stlouisfed.org/series/UNRATE",
    color: "#8884d8", // Purple
    unit: "%",
    dataKey: "unemployment_rate"
  },
  "S&P 500": {
    label: "S&P 500 Index",
    definition: "The Standard & Poor's 500 Index is a market-capitalization-weighted index of 500 leading publicly traded companies in the U.S.",
    source: "https://fred.stlouisfed.org/series/SP500",
    color: "#2ca02c", // Green
    unit: "",
    dataKey: "S&P 500"
  },
  job_openings: {
    label: "Job Openings",
    definition: "Total Nonfarm Job Openings are a measure of all jobs that are not filled on the last business day of the month.",
    source: "https://fred.stlouisfed.org/series/JTSJOL",
    color: "#ffc658", // Orange
    unit: "",
    dataKey: "job_openings"
  },
  fed_rate: {
    label: "Fed Rate",
    definition: "The federal funds rate is the interest rate at which depository institutions trade federal funds with each other overnight.",
    source: "https://fred.stlouisfed.org/series/FEDFUNDS",
    color: "#EA4228", // Red
    unit: "%",
    dataKey: "fed_rate"
  },
  "30 year mortgage": {
    label: "30-Year Mortgage Rate",
    definition: "Contract interest rate on commitments for fixed-rate first mortgages.",
    source: "https://fred.stlouisfed.org/series/MORTGAGE30US",
    color: "#d62728", // Brick Red
    unit: "%",
    dataKey: "30 year mortgage"
  },
  "Housing Price Index": {
    label: "Housing Price Index",
    definition: "A broad measure of the movement of single-family house prices in the United States.",
    source: "https://fred.stlouisfed.org/series/USSTHPI",
    color: "#8d6e63", // Brown
    unit: "",
    dataKey: "Housing Price Index"
  },
  CPI: {
    label: "CPI (Inflation)",
    definition: "The Consumer Price Index measures the average change over time in the prices paid by urban consumers for a market basket of consumer goods and services.",
    source: "https://fred.stlouisfed.org/series/CPIAUCSL",
    color: "#db2777", // Pink
    unit: "",
    dataKey: "CPI"
  },
  avg_weeks_unemployed: {
    label: "Avg Weeks Unemployed",
    definition: "The average number of weeks people have been unemployed.",
    source: "https://fred.stlouisfed.org/series/UEMPMEAN",
    color: "#82ca9d", // Light Green
    unit: " wks",
    dataKey: "avg_weeks_unemployed"
  },
  unemployed_count: {
    label: "Unemployed Count",
    definition: "The aggregate measure of people currently unemployed in the US.",
    source: "https://fred.stlouisfed.org/series/UNEMPLOY",
    color: "#0088FE", // Blue
    unit: " ppl",
    dataKey: "unemployed_count"
  },
};

// --- Economic Events (Recessions & AI) ---
const REFERENCE_ZONES = [
  { label: "Dot Com", start: "2001-03-01", end: "2001-11-01", color: "#e5e7eb", opacity: 0.5, labelPos: 'insideTopLeft' },
  { label: "Great Recession", start: "2007-12-01", end: "2009-06-01", color: "#e5e7eb", opacity: 0.5, labelPos: 'insideTopLeft' },
  { label: "COVID-19", start: "2020-02-01", end: "2020-04-01", color: "#e5e7eb", opacity: 0.8, labelPos: 'insideTop' },
  { label: "ChatGPT", start: "2022-11-01", end: "2023-01-01", color: "#dbeafe", opacity: 0.6, labelPos: 'insideBottom' } 
];

// --- Utility: Date Normalization ---
const normalizeDate = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  if (d.getFullYear() < 1980) {
    d.setFullYear(d.getFullYear() + 100);
  }
  return d.toISOString().split('T')[0];
};

const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const values = line.split(',');
    const entry = {};
    headers.forEach((header, index) => {
      let value = values[index] ? values[index].trim() : "";
      if (header === 'observation_date') {
        entry[header] = normalizeDate(value);
      } else {
        const num = parseFloat(value);
        if ((header === 'unemployed_count' || header === 'Housing Price Index') && num === 0) {
           entry[header] = null;
        } else {
           entry[header] = isNaN(num) ? null : num;
        }
      }
    });
    return entry;
  }).filter(item => item !== null);
};

// --- Advanced Calculations ---

// 1. Sahm Rule (Recession Indicator)
const calculateSahmRule = (data) => {
  return data.map((row, index) => {
    // Need current + previous 2 months for 3-month average
    if (index < 12) return null; // Need 12 months history for the "low" comparison
    
    // Calculate 3-month average
    const current = row['unemployment_rate'];
    const prev1 = data[index - 1]['unemployment_rate'];
    const prev2 = data[index - 2]['unemployment_rate'];
    
    if (current == null || prev1 == null || prev2 == null) return null;
    
    const threeMonthAvg = (current + prev1 + prev2) / 3;
    
    // Find the lowest 3-month average in the previous 12 months
    let lowestAvg = threeMonthAvg;
    for (let i = 1; i <= 12; i++) {
        const pCurrent = data[index - i]['unemployment_rate'];
        const pPrev1 = data[index - i - 1]['unemployment_rate'];
        const pPrev2 = data[index - i - 2]['unemployment_rate'];
        if (pCurrent != null && pPrev1 != null && pPrev2 != null) {
            const avg = (pCurrent + pPrev1 + pPrev2) / 3;
            if (avg < lowestAvg) lowestAvg = avg;
        }
    }
    
    const sahmValue = threeMonthAvg - lowestAvg;
    
    return {
      date: row['observation_date'],
      sahmValue: sahmValue,
      threshold: 0.50,
      isRecession: sahmValue >= 0.50
    };
  }).filter(item => item !== null);
};

// 2. Misery Index (Unemployment + Inflation)
const calculateMiseryIndex = (data) => {
  return data.map((row, index) => {
    if (index < 12) return null;
    const prevCPI = data[index - 12]['CPI'];
    const currCPI = row['CPI'];
    const unemployment = row['unemployment_rate'];
    
    if (!prevCPI || !currCPI || unemployment == null) return null;
    
    const inflationRate = ((currCPI - prevCPI) / prevCPI) * 100;
    const miseryIndex = unemployment + inflationRate;
    
    return {
      date: row['observation_date'],
      miseryIndex: miseryIndex,
      inflation: inflationRate,
      unemployment: unemployment
    };
  }).filter(item => item !== null);
};

// 4. Real Wage Growth (Placeholder until data is added)
const calculateRealWages = (data) => {
  // Requires 'average_hourly_earnings' column which might not be in current CSV
  // Returning empty array effectively shows "No Data" state
  const hasWageData = data.some(d => d['average_hourly_earnings'] !== undefined);
  if (!hasWageData) return []; 
  
  return data.map((row, index) => {
      if (index < 12) return null;
      const prevWage = data[index - 12]['average_hourly_earnings'];
      const currWage = row['average_hourly_earnings'];
      const prevCPI = data[index - 12]['CPI'];
      const currCPI = row['CPI'];
      
      if (!prevWage || !currWage || !prevCPI || !currCPI) return null;
      
      const nominalGrowth = ((currWage - prevWage) / prevWage) * 100;
      const inflation = ((currCPI - prevCPI) / prevCPI) * 100;
      
      return {
          date: row['observation_date'],
          realGrowth: nominalGrowth - inflation
      };
  }).filter(d => d);
};

// 5. Buffett Indicator (Placeholder until GDP data is added)
const calculateBuffettIndicator = (data) => {
    // Requires 'gdp' (Gross Domestic Product) and a total market measure (using S&P500 as proxy)
    const hasGDP = data.some(d => d['gdp'] !== undefined);
    if (!hasGDP) return [];

    return data.map(row => {
        const gdp = row['gdp'];
        const sp500 = row['S&P 500']; // Using S&P as proxy for total market
        if (!gdp || !sp500) return null;
        
        // This is a proxy ratio. True Buffett uses Wilshire 5000 / GDP
        return {
            date: row['observation_date'],
            ratio: (sp500 / gdp) * 100 // Normalized ratio
        };
    }).filter(d => d);
};

// Existing Advanced Calculations
const calculatePhilipsData = (data) => {
  return data.map((row, index) => {
    if (index < 12) return null;
    const prevCPI = data[index - 12]['CPI'];
    const currCPI = row['CPI'];
    if (!prevCPI || !currCPI) return null;
    const inflationRate = ((currCPI - prevCPI) / prevCPI) * 100;
    return {
      x: row['unemployment_rate'],
      y: inflationRate,
      date: row['observation_date'],
      cpi: currCPI
    };
  }).filter(item => item !== null && item.x != null && item.y != null);
};

const calculateBeveridgeData = (data) => {
  return data.map(row => {
    if (!row['unemployment_rate'] || !row['job_openings']) return null;
    return {
      x: row['unemployment_rate'],
      y: row['job_openings'],
      date: row['observation_date']
    };
  }).filter(item => item !== null);
};

const calculateHousingAffordability = (data) => {
  const baseHPI = data.find(d => d['Housing Price Index'])?.['Housing Price Index'] || 100;
  const baseSP = data.find(d => d['S&P 500'])?.['S&P 500'] || 100;
  return data.map(row => {
    const hpi = row['Housing Price Index'];
    const rate = row['30 year mortgage'];
    const sp = row['S&P 500'];
    if (!hpi || !rate) return { ...row, affordability: null, assetPrice: null };
    return {
      ...row,
      paymentProxy: (hpi * (rate / 100)), 
      spIndexed: (sp / baseSP) * 100
    };
  });
};

// --- Main Component ---
export default function App() {
  const [data, setData] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(new Set(["job_openings", "S&P 500"]));
  const [viewMode, setViewMode] = useState("dashboard"); 
  const [loading, setLoading] = useState(false);
  const [chartMode, setChartMode] = useState("absolute");
  const [showSpread, setShowSpread] = useState(false);

  useEffect(() => {
    const parsed = parseCSV(INITIAL_CSV_DATA);
    setData(parsed);
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result);
        setData(parsed);
      } catch (err) {
        console.error("Failed to parse CSV", err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const toggleIndicator = (key) => {
    const newSet = new Set(selectedKeys);
    if (newSet.has(key)) {
      if (newSet.size > 1) newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedKeys(newSet);
  };

  // --- Derived Data Hooks ---
  const philipsData = useMemo(() => calculatePhilipsData(data), [data]);
  const beveridgeData = useMemo(() => calculateBeveridgeData(data), [data]);
  const housingData = useMemo(() => calculateHousingAffordability(data), [data]);
  const sahmData = useMemo(() => calculateSahmRule(data), [data]);
  const miseryData = useMemo(() => calculateMiseryIndex(data), [data]);
  const realWageData = useMemo(() => calculateRealWages(data), [data]);
  const buffettData = useMemo(() => calculateBuffettIndicator(data), [data]);

  const selectedKeysArray = Array.from(selectedKeys);
  const isComparisonEligible = chartMode === "indexed" && selectedKeys.size === 2;

  const processedData = useMemo(() => {
    if (chartMode === "absolute") return data;
    const baselines = {};
    data.forEach(row => {
      selectedKeysArray.forEach(key => {
        const configKey = INDICATOR_CONFIG[key].dataKey;
        if (!baselines[key] && row[configKey] !== null && row[configKey] !== undefined) {
          baselines[key] = row[configKey];
        }
      });
    });
    return data.map(row => {
      const newRow = { ...row };
      selectedKeysArray.forEach(key => {
        const configKey = INDICATOR_CONFIG[key].dataKey;
        const val = row[configKey];
        if (val !== null && baselines[key]) {
          newRow[configKey] = (val / baselines[key]) * 100;
        }
      });
      if (isComparisonEligible) {
        const key1 = selectedKeysArray[0];
        const key2 = selectedKeysArray[1];
        const val1 = newRow[INDICATOR_CONFIG[key1].dataKey];
        const val2 = newRow[INDICATOR_CONFIG[key2].dataKey];
        if (val1 && val2) {
          newRow.spread = Math.abs(val1 - val2);
        }
      }
      return newRow;
    });
  }, [data, selectedKeys, chartMode, isComparisonEligible]);

  // --- Views ---
  const renderDashboard = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[500px] flex flex-col relative">
      <div className="mb-2 flex justify-between items-center z-10">
        <h3 className="text-lg font-semibold text-gray-800">
          {chartMode === "indexed" ? "Relative Performance (Base = 100)" : "Historical Data"}
        </h3>
        {isComparisonEligible && showSpread && (
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded flex items-center gap-1">
              <Minus className="w-3 h-3" strokeDasharray="4 4" /> Difference (Spread)
            </span>
        )}
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="observation_date" tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={{stroke: '#e5e7eb'}} minTickGap={60} />
            {chartMode === "indexed" ? (
              <YAxis tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
            ) : (
              <>
                <YAxis yAxisId="left" tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={false} orientation="left" />
                <YAxis yAxisId="right" orientation="right" tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={false} />
              </>
            )}
            {REFERENCE_ZONES.map((zone, idx) => (
              <ReferenceArea key={idx} x1={zone.start} x2={zone.end} yAxisId={chartMode === "indexed" ? undefined : "left"} fill={zone.color} fillOpacity={zone.opacity} ifOverflow="extendDomain" label={{ value: zone.label, position: zone.labelPos || 'insideTop', fontSize: 10, fill: '#6b7280' }} />
            ))}
            <Tooltip contentStyle={{backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} itemStyle={{fontSize: '12px'}} labelStyle={{fontWeight: 'bold', color: '#374151', marginBottom: '4px'}} />
            <Legend wrapperStyle={{paddingTop: '20px'}} />
            {Array.from(selectedKeys).map((key, index) => {
              const config = INDICATOR_CONFIG[key];
              const axisId = (chartMode === "absolute" && index > 0) ? "right" : "left";
              return (
                <Line key={key} yAxisId={chartMode === "indexed" ? undefined : axisId} type="monotone" dataKey={config.dataKey} name={config.label} stroke={config.color} strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls={true} animationDuration={800} />
              );
            })}
            {isComparisonEligible && showSpread && (
              <Line type="monotone" dataKey="spread" name="Spread (Diff)" stroke="#4f46e5" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} opacity={0.6} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderSimpleChart = (title, data, dataKey, color, description, refLine = null) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[500px] flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(str) => str ? str.substring(0, 4) : ''} />
            <YAxis />
            <Tooltip />
            <Legend />
            {refLine !== null && <ReferenceArea y1={refLine} y2={100} fill="red" fillOpacity={0.1} label="Recession Signal" />}
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderSahmRule = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[500px] flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          The Sahm Rule Recession Indicator
        </h3>
        <p className="text-sm text-gray-500">A recession is signaled when the 3-month moving average of the unemployment rate rises by 0.50% or more relative to its low during the previous 12 months.</p>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sahmData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(str) => str.substring(0, 4)} />
          <YAxis />
          <Tooltip />
          <ReferenceArea y1={0.5} label="Recession Threshold (0.50)" stroke="red" strokeDasharray="3 3" />
          <Area type="monotone" dataKey="sahmValue" name="Sahm Indicator" stroke="#d62728" fill="#d62728" fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const renderMiseryIndex = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[500px] flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Frown className="w-5 h-5 text-indigo-600" />
          The Misery Index
        </h3>
        <p className="text-sm text-gray-500">Sum of the Inflation Rate and Unemployment Rate. High peaks indicate periods of economic distress (e.g. 1970s stagflation).</p>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={miseryData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(str) => str.substring(0, 4)} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="miseryIndex" name="Misery Index" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} strokeWidth={3} />
          <Line type="monotone" dataKey="inflation" name="Inflation" stroke="#db2777" strokeWidth={1} dot={false} strokeDasharray="5 5" />
          <Line type="monotone" dataKey="unemployment" name="Unemployment" stroke="#8884d8" strokeWidth={1} dot={false} strokeDasharray="5 5" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const renderScatter = (title, data, xKey, yKey, xName, yName, color, icon) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[500px] flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          {icon} {title}
        </h3>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey={xKey} name={xName} label={{ value: xName, position: 'insideBottom', offset: -10 }} />
          <YAxis type="number" dataKey={yKey} name={yName} label={{ value: yName, angle: -90, position: 'insideLeft' }} />
          <ZAxis type="category" dataKey="date" name="Date" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name={title} data={data} fill={color} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-600" />
              Economic Indicators Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">Explore correlations, inflation curves, and market health.</p>
          </div>
          
          <div className="flex gap-3 items-center">
             <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                <button onClick={() => setViewMode('dashboard')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'dashboard' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Timeline</button>
                <button onClick={() => setViewMode('sahm')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'sahm' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>Sahm Rule</button>
                <button onClick={() => setViewMode('misery')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'misery' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Misery Index</button>
                <button onClick={() => setViewMode('philips')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'philips' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}>Philips</button>
                <button onClick={() => setViewMode('buffett')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'buffett' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>Buffett</button>
             </div>

            <div className="relative h-full">
              <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors shadow-sm text-sm font-medium h-full">
                <Upload className="h-4 w-4" />
                Upload CSV
              </button>
            </div>
          </div>
        </div>

        {/* View Logic */}
        {viewMode === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                 <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Chart Mode</h3>
                 <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                  <button onClick={() => setChartMode("absolute")} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-all ${chartMode === "absolute" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><BarChart2 className="w-3 h-3" /> Raw</button>
                  <button onClick={() => setChartMode("indexed")} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-all ${chartMode === "indexed" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><TrendingUp className="w-3 h-3" /> Relative</button>
                </div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Indicators</h2>
                <div className="space-y-1">
                  {Object.keys(INDICATOR_CONFIG).map((key) => {
                    const config = INDICATOR_CONFIG[key];
                    const isSelected = selectedKeys.has(key);
                    return (
                      <button key={key} onClick={() => toggleIndicator(key)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 border ${isSelected ? "bg-blue-50 border-blue-200 text-blue-800 font-medium" : "bg-transparent border-transparent hover:bg-gray-50 text-gray-600"}`}>
                        {isSelected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-300" />}
                        <span className="flex-1 text-left truncate">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="lg:col-span-3 space-y-6">
              {renderDashboard()}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(selectedKeys).map(key => {
                  const config = INDICATOR_CONFIG[key];
                  return (
                    <div key={key} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start gap-3">
                      <div className="mt-1 w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                      <div>
                        <h4 className="font-semibold text-gray-900">{config.label}</h4>
                        <p className="text-sm text-gray-600 mt-1 mb-2 leading-relaxed">{config.definition}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Advanced Views Render */}
        {viewMode === 'sahm' && renderSahmRule()}
        {viewMode === 'misery' && renderMiseryIndex()}
        {viewMode === 'philips' && renderScatter("The Philips Curve", philipsData, "x", "y", "Unemployment %", "Inflation %", "#8884d8", <Activity className="w-5 h-5 text-purple-600"/>)}
        
        {viewMode === 'buffett' && (
            <div className="space-y-6">
                {buffettData.length > 0 ? (
                    renderSimpleChart("Buffett Indicator (Market Cap / GDP)", buffettData, "ratio", "#10b981", "Ratio of S&P 500 to GDP. Higher than 100% suggests overvaluation.")
                ) : (
                    <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                        <AlertTriangle className="w-12 h-12 mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-600">Missing GDP Data</h3>
                        <p className="text-center max-w-md mt-2">To view the Buffett Indicator, please upload a CSV that includes a <code>gdp</code> column.</p>
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
}