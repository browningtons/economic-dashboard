import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Upload, Info, ExternalLink, Activity, CheckSquare, Square, TrendingUp, BarChart2 } from 'lucide-react';

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

// --- Initial Data ---
const INITIAL_CSV_DATA = `observation_date,unemployment_rate,avg_weeks_unemployed,median_weeks_unemployed,job_openings,unemployed_27_weeks,unemployed_count,fed_rate,15 year mortgage,30 year mortgage,S&P 500,Labor Participation Rate,Labor Participation Core
1/1/00,4,13.1,5.8,,721,,5.45,7.8025,8.21,1425.59,67.3,84.4
6/1/00,4,12.3,5.7,,610,,6.53,8.084,8.288,1454.6,67.1,84.3
1/1/01,4.2,12.6,6.6,5232,658,,5.98,6.5875,7.0325,1342.9,67.2,84.3
6/1/01,4.5,12.8,7.1,4385,777,,3.97,6.678,7.16,1224.38,66.9,83.9
1/1/02,5.7,14.6,8.2,3363,1224,,1.73,6.335,6.9975,1130.2,66.6,83.8
6/1/02,5.8,16.6,9.5,3350,1651,,1.75,6.064,6.65,1014.43,66.6,83.8
1/1/03,5.8,18.4,9.4,3101,1780,,1.24,5.328,5.916,879.82,66.4,83.2
6/1/03,6.3,19.2,10.7,3014,1963,,1.22,4.6475,5.23,993.89,66.5,83.1
1/1/04,5.7,19.8,9.7,3148,1931,8555,1,5.08,5.756,1131.13,66.1,82.8
6/1/04,5.6,19.5,9.5,3341,1803,8315,1.03,5.6725,6.29,1132.13,66.1,82.8
1/1/05,5.3,19.3,9.3,3912,1633,7991,2.28,5.1975,5.7625,1181.28,65.8,82.6
6/1/05,5,17.4,8.5,4171,1426,7626,3.04,5.145,5.58,1202.69,66.1,82.9
1/1/06,4.7,16.8,8.2,4230,1236,7203,4.29,5.7275,6.1475,1285.04,66,82.9
6/1/06,4.6,16.2,7.7,4355,1176,7129,4.99,6.282,6.682,1249.12,66.2,83.1
1/1/07,4.6,16.2,7.9,4662,1118,7110,5.25,5.945,6.22,1438.24,66.4,83.4
6/1/07,4.6,16.8,8.1,4812,1188,7127,5.25,6.354,6.656,1503.35,66,83
1/1/08,5,17.5,8.8,4269,1341,7698,3.94,5.1675,5.755,1330.74,66.2,83.3
6/1/08,5.6,17.6,9.8,3779,1612,8620,2,5.8075,6.32,1323.22,66.1,83
1/1/09,7.8,19.8,10.3,2484,2641,12082,0.15,4.72,5.0475,825.44,65.7,82.6
6/1/09,9.5,24.1,17.7,2438,4350,14704,0.21,4.7625,5.4225,913.69,65.7,82.3
1/1/10,9.8,30.3,20.1,2735,6324,15064,0.11,4.4075,5.03,1109.12,64.8,81.2
6/1/10,9.4,35,25.3,3101,6598,14574,0.18,4.2375,4.735,1074.06,64.6,81.6
1/1/11,9.1,37.1,21.7,3141,6001,14087,0.17,4.24,4.755,1293.24,64.2,81.4
6/1/11,9.1,39.6,22.2,3935,6274,14081,0.09,3.6725,4.5125,1282.62,64,81.3
1/1/12,8.3,40.1,21.1,3873,5463,12885,0.08,3.175,3.9225,1312.41,63.7,81.4
6/1/12,8.2,39.7,19.4,4025,5320,12740,0.16,2.942,3.676,1313.63,63.8,81.4
1/1/13,8,35.4,16.2,3883,4758,12489,0.14,2.6725,3.41,1498.11,63.7,81.2
6/1/13,7.5,36.5,16.1,4166,4293,11765,0.09,3.17,4.07,1611.29,63.4,80.9
1/1/14,6.6,35.3,16.9,4311,3577,10243,0.07,3.522,4.432,1848.36,62.9,80.7
6/1/14,6.1,33.2,13.3,4892,3069,9494,0.1,3.25,4.1625,1960.23,62.8,80.7
1/1/15,5.7,32.7,13.3,5510,2770,8913,0.11,2.92,3.67,2020.58,62.9,81
6/1/15,5.3,28.2,11.3,5651,2101,8271,0.13,3.18,3.9825,2093.32,62.7,80.7
1/1/16,4.8,28.2,11.2,5978,2068,7670,0.34,3.205,3.9225,1922.28,62.7,81.2
6/1/16,4.9,27.7,11,6234,1885,7764,0.38,2.83,3.6,2075.54,62.7,81.3
1/1/17,4.7,24.9,10.6,6066,1834,7526,0.65,3.3525,4.1525,2290.01,62.9,81.7
6/1/17,4.3,24.6,10.2,6369,1657,6982,1.04,3.1825,3.9,2430.06,62.8,81.9
1/1/18,4,24.4,9.6,6545,1377,6518,1.41,3.49,4.0325,2823.81,62.7,81.9
6/1/18,4,23.3,9.5,7089,1484,6571,1.82,4.0375,4.57,2762.59,62.9,82.2
1/1/19,4,21.5,9.2,7487,1260,6535,2.4,3.812,4.464,2632.9,63.2,82.6
6/1/19,3.6,22.2,9.3,7147,1282,5968,2.38,3.245,3.8025,2888.26,62.9,82.5
1/1/20,3.6,21.7,9.1,6980,1217,5874,1.55,3.072,3.624,3225.52,63.3,83
6/1/20,11,15.6,13.9,6094,2772,17666,0.08,2.5875,3.1625,3109.96,61.4,80.6
1/1/21,6.4,26.4,15.9,7099,3986,10183,0.09,2.2075,2.735,3785.35,61.3,81
6/1/21,5.9,29.9,19.3,10185,3975,9536,0.08,2.27,2.975,4242.25,61.6,81.6
1/1/22,4,26.5,13.4,11283,2002,6525,0.08,2.6975,3.445,4515.55,62.2,82.3
6/1/22,3.6,22.3,9,11040,1315,5945,1.21,4.825,5.522,3901.99,62.2,82.4
1/1/23,3.4,20.2,9,10563,1134,5707,4.33,5.27,6.2725,3995.21,62.4,83.1
6/1/23,3.6,20.8,8.8,9165,1104,6001,5.08,6.0725,6.714,4386.25,62.6,83.5
12/1/23,3.8,22.2,9.6,8585,1273,6315,5.33,6.1375,6.815,4685.05,62.5,83.2
1/1/24,3.7,20.8,9.6,8468,1272,6149,5.33,5.87,6.6425,4804.49,62.5,83.3
2/1/24,3.9,20.9,9.3,8445,1213,6462,5.33,6.102,6.776,5011.96,62.6,83.5
3/1/24,3.9,21.6,9.5,8093,1254,6497,5.33,6.175,6.82,5170.57,62.7,83.4
4/1/24,3.9,20,8.9,7619,1253,6492,5.33,6.2625,6.9925,5095.46,62.7,83.5`;

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
        entry[header] = value;
      } else {
        const num = parseFloat(value);
        entry[header] = isNaN(num) ? null : num;
      }
    });
    return entry;
  }).filter(item => item !== null);
};

export default function App() {
  const [data, setData] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(new Set(["unemployment_rate"]));
  const [loading, setLoading] = useState(false);
  // 'absolute' or 'indexed' (normalized to 100)
  const [chartMode, setChartMode] = useState("absolute");

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

  // --- Data Transformation for "Indexed" Mode ---
  const processedData = useMemo(() => {
    if (chartMode === "absolute") return data;

    // Normalization Logic: Find the first valid value for each key and set it as base (100)
    const baselines = {};
    
    // Find baselines
    data.forEach(row => {
      Array.from(selectedKeys).forEach(key => {
        const configKey = INDICATOR_CONFIG[key].dataKey;
        if (!baselines[key] && row[configKey] !== null && row[configKey] !== undefined) {
          baselines[key] = row[configKey];
        }
      });
    });

    // Create new rows
    return data.map(row => {
      const newRow = { ...row };
      Array.from(selectedKeys).forEach(key => {
        const configKey = INDICATOR_CONFIG[key].dataKey;
        const val = row[configKey];
        if (val !== null && baselines[key]) {
          // Calculate percentage relative to baseline (Index = 100)
          newRow[configKey] = (val / baselines[key]) * 100;
        }
      });
      return newRow;
    });
  }, [data, selectedKeys, chartMode]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-lg z-50">
          <p className="font-bold text-gray-700 mb-2 border-b pb-1">{label}</p>
          {payload.map((entry, idx) => {
            // Find config for this entry
            const key = Object.keys(INDICATOR_CONFIG).find(k => INDICATOR_CONFIG[k].dataKey === entry.dataKey) || entry.name;
            const config = INDICATOR_CONFIG[key];
            const isIndexed = chartMode === "indexed";
            
            return (
              <div key={idx} className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke }}></div>
                <span className="text-sm font-medium text-gray-600">
                  {config ? config.label : entry.name}: 
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {isIndexed 
                    ? `${entry.value.toFixed(1)} (Index)` 
                    : `${entry.value.toLocaleString()}${config ? config.unit : ''}`}
                </span>
              </div>
            );
          })}
          {chartMode === "indexed" && (
            <p className="text-xs text-gray-400 mt-2 italic">Values indexed to start date = 100</p>
          )}
        </div>
      );
    }
    return null;
  };

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
            <p className="text-gray-500 text-sm mt-1">
              Analyze correlations between Fed Rate, Jobs, and Markets
            </p>
          </div>
          
          <div className="flex gap-3">
             {/* Mode Toggle */}
             <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setChartMode("absolute")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  chartMode === "absolute" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                Raw Values
              </button>
              <button
                onClick={() => setChartMode("indexed")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  chartMode === "indexed" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Relative Growth
              </button>
            </div>

            <div className="relative">
              <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors shadow-sm text-sm font-medium h-full">
                <Upload className="h-4 w-4" />
                Upload CSV
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Indicators
              </h2>
              <div className="space-y-1">
                {Object.keys(INDICATOR_CONFIG).map((key) => {
                  const config = INDICATOR_CONFIG[key];
                  const isSelected = selectedKeys.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleIndicator(key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 border ${
                        isSelected
                          ? "bg-blue-50 border-blue-200 text-blue-800 font-medium"
                          : "bg-transparent border-transparent hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      {isSelected 
                        ? <CheckSquare className="w-5 h-5 text-blue-600" /> 
                        : <Square className="w-5 h-5 text-gray-300" />}
                      <span className="flex-1 text-left">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Contextual Hint */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
               <p className="font-semibold mb-1 flex items-center gap-2">
                 <Info className="w-4 h-4" />
                 Pro Tip:
               </p>
               <p className="opacity-90">
                 Use <strong>Relative Growth</strong> mode when comparing items with very different scales (like Interest Rates vs. Stock Prices).
               </p>
            </div>
          </div>

          {/* Main Chart Area */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[500px] flex flex-col">
              <div className="mb-2 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  {chartMode === "indexed" ? "Relative Performance (Base = 100)" : "Historical Data"}
                </h3>
              </div>
              
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="observation_date" 
                      tick={{fill: '#9ca3af', fontSize: 12}}
                      tickLine={false}
                      axisLine={{stroke: '#e5e7eb'}}
                      minTickGap={60}
                    />
                    
                    {/* Y-Axis Logic */}
                    {chartMode === "indexed" ? (
                      // Single Axis for Indexed Mode
                      <YAxis 
                        tick={{fill: '#9ca3af', fontSize: 12}} 
                        tickLine={false} 
                        axisLine={false}
                        domain={['auto', 'auto']}
                      />
                    ) : (
                      // Dual Axis for Absolute Mode
                      <>
                        <YAxis 
                          yAxisId="left"
                          tick={{fill: '#9ca3af', fontSize: 12}} 
                          tickLine={false} 
                          axisLine={false}
                          orientation="left"
                        />
                         <YAxis 
                          yAxisId="right"
                          orientation="right"
                          tick={{fill: '#9ca3af', fontSize: 12}} 
                          tickLine={false} 
                          axisLine={false}
                        />
                      </>
                    )}

                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{paddingTop: '20px'}} />
                    
                    {Array.from(selectedKeys).map((key, index) => {
                      const config = INDICATOR_CONFIG[key];
                      // If absolute mode, map first item to left, others to right
                      const axisId = (chartMode === "absolute" && index > 0) ? "right" : "left";
                      
                      return (
                        <Line
                          key={key}
                          yAxisId={chartMode === "indexed" ? undefined : axisId}
                          type="monotone"
                          dataKey={config.dataKey}
                          name={config.label}
                          stroke={config.color}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                          connectNulls={true}
                          animationDuration={800}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Dynamic Definitions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from(selectedKeys).map(key => {
                const config = INDICATOR_CONFIG[key];
                return (
                  <div key={key} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start gap-3">
                    <div className="mt-1 w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                    <div>
                      <h4 className="font-semibold text-gray-900">{config.label}</h4>
                      <p className="text-sm text-gray-600 mt-1 mb-2 leading-relaxed">
                        {config.definition}
                      </p>
                      <a 
                        href={config.source} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        View Source <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}