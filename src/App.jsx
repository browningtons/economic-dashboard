import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  ReferenceArea, ComposedChart, ScatterChart, Scatter, ZAxis, AreaChart, Area
} from 'recharts';
import { 
  Upload, Activity, CheckSquare, Square, TrendingUp, 
  BarChart2, Minus, AlertTriangle, Frown, Sun, Moon
} from 'lucide-react';

// --- INITIAL DATA ---
const INITIAL_CSV_DATA = `observation_date,unemployment_rate,S&P 500,job_openings,fed_rate,30 year mortgage,Housing Price Index,CPI,avg_weeks_unemployed,unemployed_count
2019-01-01,4.0,2650,7500,2.40,4.46,204.5,252.67,21.4,6500
2019-04-01,3.6,2900,7400,2.42,4.14,206.8,255.16,22.0,5900
2019-07-01,3.7,2980,7300,2.40,3.77,209.1,256.09,21.5,6000
2019-10-01,3.6,3000,7200,1.83,3.69,211.5,257.23,21.8,5900
2020-01-01,3.5,3225,7100,1.55,3.62,214.2,258.68,20.5,5800
2020-02-01,3.5,3250,7000,1.58,3.47,215.1,259.05,20.8,5750
2020-03-01,4.4,2584,6000,0.65,3.45,216.5,258.48,18.5,7200
2020-04-01,14.7,2797,4500,0.05,3.31,217.4,256.09,19.0,23000
2020-05-01,13.2,2950,5200,0.05,3.23,218.1,255.94,22.0,20500
2020-06-01,11.0,3100,5800,0.08,3.16,219.0,257.21,25.0,17500
2020-09-01,7.8,3360,6500,0.09,2.89,225.2,260.15,26.5,12500
2021-01-01,6.3,3750,7100,0.09,2.74,235.5,262.20,27.0,10000
2021-06-01,5.9,4250,9800,0.08,2.98,255.0,270.96,28.5,9500
2021-12-01,3.9,4700,11000,0.08,3.10,280.1,278.69,25.0,6300
2022-03-01,3.6,4400,11500,0.20,4.17,295.2,287.47,22.5,5950
2022-06-01,3.6,3900,10800,1.21,5.52,305.5,294.73,20.0,5900
2022-09-01,3.5,3600,10500,2.56,6.11,302.1,296.54,20.5,5750
2022-12-01,3.5,3950,11000,4.10,6.42,299.8,298.65,20.8,5700
2023-01-01,3.4,4000,10800,4.33,6.27,298.5,300.35,21.0,5650
2023-03-01,3.5,4050,9800,4.65,6.54,300.2,301.81,21.2,5800
2023-06-01,3.6,4300,9200,5.08,6.71,304.5,304.00,20.9,5950
2023-09-01,3.8,4400,9400,5.33,7.31,308.2,307.48,21.5,6300
2023-12-01,3.7,4700,8900,5.33,6.82,310.1,308.74,21.8,6200
2024-01-01,3.7,4850,8800,5.33,6.64,312.0,309.68,21.4,6100`;

// --- THEME & PALETTE ---
const COLORS = {
  purple: "#8884d8",
  green: "#10b981", // Emerald 500
  orange: "#f59e0b", // Amber 500
  red: "#ef4444",    // Red 500
  brick: "#b91c1c",  // Red 700
  brown: "#78350f",  // Amber 900
  pink: "#ec4899",   // Pink 500
  lightGreen: "#86efac",
  blue: "#3b82f6",   // Blue 500
  darkBg: "#1f2937", // Gray 800
  lightBg: "#ffffff",
  gridLight: "#e5e7eb",
  gridDark: "#374151"
};

const INDICATOR_CONFIG = {
  unemployment_rate: { label: "Unemployment Rate", definition: "Unemployed as % of labor force.", color: COLORS.purple, unit: "%", dataKey: "unemployment_rate" },
  "S&P 500": { label: "S&P 500", definition: "Market cap index of 500 leading US companies.", color: COLORS.green, unit: "", dataKey: "S&P 500" },
  job_openings: { label: "Job Openings", definition: "Unfilled jobs on last business day of month.", color: COLORS.orange, unit: "", dataKey: "job_openings" },
  fed_rate: { label: "Fed Rate", definition: "Overnight federal funds interest rate.", color: COLORS.red, unit: "%", dataKey: "fed_rate" },
  "30 year mortgage": { label: "30Y Mortgage", definition: "Fixed rate for 30-year mortgages.", color: COLORS.brick, unit: "%", dataKey: "30 year mortgage" },
  "Housing Price Index": { label: "Housing Index", definition: "Single-family house price movement.", color: COLORS.brown, unit: "", dataKey: "Housing Price Index" },
  CPI: { label: "CPI (Inflation)", definition: "Consumer Price Index (inflation measure).", color: COLORS.pink, unit: "", dataKey: "CPI" },
  avg_weeks_unemployed: { label: "Avg Weeks Unemployed", definition: "Average duration of unemployment.", color: COLORS.lightGreen, unit: " wks", dataKey: "avg_weeks_unemployed" },
  unemployed_count: { label: "Unemployed Count", definition: "Total number of unemployed people.", color: COLORS.blue, unit: " ppl", dataKey: "unemployed_count" },
};

const REFERENCE_ZONES = [
  { label: "COVID-19", start: "2020-02-01", end: "2020-04-01", color: "#9ca3af", opacity: 0.3, labelPos: 'insideTop' },
  { label: "ChatGPT", start: "2022-11-01", end: "2023-01-01", color: "#60a5fa", opacity: 0.2, labelPos: 'insideBottom' } 
];

// --- UTILS ---
const normalizeDate = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
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
        entry[header] = isNaN(num) ? null : num;
      }
    });
    return entry;
  }).filter(item => item !== null);
};

// --- CALCULATIONS (FIXED) ---
const calculateSahmRule = (data) => {
  return data.map((row, index) => {
    // FIX: Ensure we have enough history (12 months lookback + 2 months for current avg)
    if (index < 14) return null; 
    
    // FIX: Optional chaining (?.) prevents "Cannot read properties of undefined"
    const current = row['unemployment_rate'];
    const prev1 = data[index - 1]?.['unemployment_rate'];
    const prev2 = data[index - 2]?.['unemployment_rate'];
    
    if (current == null || prev1 == null || prev2 == null) return null;
    
    const threeMonthAvg = (current + prev1 + prev2) / 3;
    let lowestAvg = threeMonthAvg;

    for (let i = 1; i <= 12; i++) {
        const pRow = data[index - i];
        const pRow1 = data[index - i - 1];
        const pRow2 = data[index - i - 2];
        
        if (!pRow || !pRow1 || !pRow2) continue;

        const pCurrent = pRow['unemployment_rate'];
        const pPrev1 = pRow1['unemployment_rate'];
        const pPrev2 = pRow2['unemployment_rate'];
        
        if (pCurrent != null && pPrev1 != null && pPrev2 != null) {
            const avg = (pCurrent + pPrev1 + pPrev2) / 3;
            if (avg < lowestAvg) lowestAvg = avg;
        }
    }
    
    const sahmValue = threeMonthAvg - lowestAvg;
    return {
      date: row['observation_date'],
      sahmValue,
      threshold: 0.50,
      isRecession: sahmValue >= 0.50
    };
  }).filter(item => item !== null);
};

const calculateMiseryIndex = (data) => {
  return data.map((row, index) => {
    if (index < 12) return null;
    const prevCPI = data[index - 12]?.['CPI'];
    const currCPI = row['CPI'];
    const unemployment = row['unemployment_rate'];
    if (prevCPI == null || currCPI == null || unemployment == null) return null;
    const inflation = ((currCPI - prevCPI) / prevCPI) * 100;
    return { date: row['observation_date'], miseryIndex: unemployment + inflation, inflation, unemployment };
  }).filter(item => item !== null);
};

const calculatePhilipsData = (data) => {
  return data.map((row, index) => {
    if (index < 12) return null;
    const prevCPI = data[index - 12]?.['CPI'];
    const currCPI = row['CPI'];
    if (prevCPI == null || currCPI == null) return null;
    return {
      x: row['unemployment_rate'],
      y: ((currCPI - prevCPI) / prevCPI) * 100,
      date: row['observation_date']
    };
  }).filter(item => item && item.x != null && item.y != null);
};

const calculateBuffettIndicator = (data) => {
    const hasGDP = data.some(d => d['gdp'] !== undefined);
    if (!hasGDP) return [];
    return data.map(row => {
        const gdp = row['gdp'];
        const sp500 = row['S&P 500'];
        if (!gdp || !sp500) return null;
        return { date: row['observation_date'], ratio: (sp500 / gdp) * 100 };
    }).filter(d => d);
};

// --- COMPONENT ---
export default function App() {
  const [data, setData] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(new Set(["job_openings", "S&P 500"]));
  const [viewMode, setViewMode] = useState("dashboard"); 
  const [chartMode, setChartMode] = useState("absolute");
  const [showSpread, setShowSpread] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Initialize Data
  useEffect(() => {
    setData(parseCSV(INITIAL_CSV_DATA));
  }, []);

  // Handle Theme Toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setData(parseCSV(evt.target.result));
    reader.readAsText(file);
  };

  const toggleIndicator = (key) => {
    const newSet = new Set(selectedKeys);
    if (newSet.has(key)) { if (newSet.size > 1) newSet.delete(key); } 
    else { newSet.add(key); }
    setSelectedKeys(newSet);
  };

  // derived data
  const sahmData = useMemo(() => calculateSahmRule(data), [data]);
  const miseryData = useMemo(() => calculateMiseryIndex(data), [data]);
  const philipsData = useMemo(() => calculatePhilipsData(data), [data]);
  const buffettData = useMemo(() => calculateBuffettIndicator(data), [data]);

  const processedData = useMemo(() => {
    if (chartMode === "absolute") return data;
    const baselines = {};
    Array.from(selectedKeys).forEach(key => {
      const dKey = INDICATOR_CONFIG[key].dataKey;
      const firstValid = data.find(d => d[dKey] != null);
      if (firstValid) baselines[key] = firstValid[dKey];
    });

    return data.map(row => {
      const newRow = { ...row };
      Array.from(selectedKeys).forEach(key => {
        const dKey = INDICATOR_CONFIG[key].dataKey;
        if (row[dKey] != null && baselines[key]) {
          newRow[dKey] = (row[dKey] / baselines[key]) * 100;
        }
      });
      // Spread calc for 2 items
      if (chartMode === "indexed" && selectedKeys.size === 2) {
        const keys = Array.from(selectedKeys);
        const val1 = newRow[INDICATOR_CONFIG[keys[0]].dataKey];
        const val2 = newRow[INDICATOR_CONFIG[keys[1]].dataKey];
        if (val1 && val2) newRow.spread = Math.abs(val1 - val2);
      }
      return newRow;
    });
  }, [data, selectedKeys, chartMode]);

  // Chart Styles
  const tooltipStyle = {
    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
    borderColor: darkMode ? '#374151' : '#e5e7eb',
    color: darkMode ? '#f3f4f6' : '#111827',
    borderRadius: '8px'
  };

  // --- Render Helpers ---
  const renderDashboard = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-[500px] flex flex-col">
      <div className="mb-2 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {chartMode === "indexed" ? "Relative Performance (Base = 100)" : "Historical Data"}
        </h3>
        {chartMode === "indexed" && selectedKeys.size === 2 && showSpread && (
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded flex items-center gap-1">
              <Minus className="w-3 h-3" strokeDasharray="4 4" /> Spread
            </span>
        )}
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? COLORS.gridDark : COLORS.gridLight} />
            <XAxis dataKey="observation_date" tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={{stroke: '#e5e7eb'}} minTickGap={60} />
            <YAxis tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={false} />
            {REFERENCE_ZONES.map((zone, idx) => (
              <ReferenceArea key={idx} x1={zone.start} x2={zone.end} fill={zone.color} fillOpacity={zone.opacity} />
            ))}
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{paddingTop: '20px'}} />
            {Array.from(selectedKeys).map((key) => {
              const config = INDICATOR_CONFIG[key];
              return (
                <Line key={key} type="monotone" dataKey={config.dataKey} name={config.label} stroke={config.color} strokeWidth={2.5} dot={false} connectNulls={true} />
              );
            })}
            {chartMode === "indexed" && selectedKeys.size === 2 && showSpread && (
              <Line type="monotone" dataKey="spread" name="Spread" stroke={COLORS.blue} strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.6} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderSimpleChart = (title, data, dataKey, color, description, RefLine = null) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-[500px] flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? COLORS.gridDark : COLORS.gridLight} />
            <XAxis dataKey="date" tickFormatter={(str) => str ? str.substring(0, 4) : ''} stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            {RefLine}
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Economic Indicators
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Live Dashboard & Recession Signals</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {/* View Selectors */}
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
               {['dashboard', 'sahm', 'misery', 'philips', 'buffett'].map(mode => (
                 <button 
                   key={mode}
                   onClick={() => setViewMode(mode)} 
                   className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                     viewMode === mode 
                       ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' 
                       : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                   }`}
                 >
                   {mode}
                 </button>
               ))}
            </div>

            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium cursor-pointer">
              <Upload className="h-4 w-4" />
              Upload CSV
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Views */}
        {viewMode === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                 <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Settings</h3>
                 
                 {/* Chart Mode Toggle */}
                 <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
                  <button onClick={() => setChartMode("absolute")} className={`flex-1 py-1.5 rounded text-xs font-medium ${chartMode === "absolute" ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300" : "text-gray-500 dark:text-gray-400"}`}>Raw</button>
                  <button onClick={() => setChartMode("indexed")} className={`flex-1 py-1.5 rounded text-xs font-medium ${chartMode === "indexed" ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300" : "text-gray-500 dark:text-gray-400"}`}>Relative</button>
                </div>
                {chartMode === 'indexed' && selectedKeys.size === 2 && (
                  <button onClick={() => setShowSpread(!showSpread)} className="w-full mb-4 flex items-center justify-between px-3 py-2 text-xs font-medium rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">
                    <span>Show Spread</span>
                    {showSpread ? <CheckSquare className="w-4 h-4"/> : <Square className="w-4 h-4"/>}
                  </button>
                )}

                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Metrics</h2>
                <div className="space-y-1">
                  {Object.keys(INDICATOR_CONFIG).map((key) => {
                    const config = INDICATOR_CONFIG[key];
                    const isSelected = selectedKeys.has(key);
                    return (
                      <button key={key} onClick={() => toggleIndicator(key)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all border ${isSelected ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200" : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                        {isSelected ? <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <Square className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
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
                {Array.from(selectedKeys).map(key => (
                  <div key={key} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-3">
                    <div className="mt-1 w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: INDICATOR_CONFIG[key].color }} />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{INDICATOR_CONFIG[key].label}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{INDICATOR_CONFIG[key].definition}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'sahm' && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-[500px] flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" /> Sahm Rule Indicator
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Signals recession when 3-month moving average of unemployment rises 0.50% above the previous 12-month low.</p>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sahmData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? COLORS.gridDark : COLORS.gridLight} />
                  <XAxis dataKey="date" tickFormatter={(str) => str.substring(0, 4)} stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceArea y1={0.5} label="Threshold (0.50)" stroke="red" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="sahmValue" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {viewMode === 'misery' && renderSimpleChart(
          "Misery Index", miseryData, "miseryIndex", COLORS.purple, 
          "Sum of Inflation Rate + Unemployment Rate.", 
          <Line type="monotone" dataKey="inflation" stroke={COLORS.pink} strokeDasharray="3 3" name="Inflation" dot={false} strokeWidth={1} />
        )}
        
        {viewMode === 'philips' && (
           <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-[500px] flex flex-col">
             <div className="mb-4">
               <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Philips Curve</h3>
               <p className="text-sm text-gray-500 dark:text-gray-400">Relationship between Unemployment (X) and Inflation (Y).</p>
             </div>
             <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? COLORS.gridDark : COLORS.gridLight} />
                  <XAxis type="number" dataKey="x" name="Unemployment" unit="%" stroke="#9ca3af" />
                  <YAxis type="number" dataKey="y" name="Inflation" unit="%" stroke="#9ca3af" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
                  <Scatter name="Philips" data={philipsData} fill={COLORS.purple} />
                </ScatterChart>
              </ResponsiveContainer>
             </div>
           </div>
        )}

        {viewMode === 'buffett' && (
           buffettData.length > 0 ? renderSimpleChart("Buffett Indicator", buffettData, "ratio", COLORS.green, "Market Cap / GDP Ratio") 
           : <div className="p-12 text-center text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">Missing GDP Data for Buffett Indicator</div>
        )}

      </div>
    </div>
  );
}