import React, { useState } from 'react';
import { DataProfile } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import Card from './ui/Card';
import CorrelationHeatmap from './CorrelationHeatmap';
import { Activity, LayoutGrid, BarChart2 } from 'lucide-react';

interface DataProfileProps {
  profile: DataProfile;
}

const DataProfileView: React.FC<DataProfileProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'distributions' | 'correlations'>('overview');
  
  // Get all analyzable columns (numeric + categorical)
  const distColumns = profile.columns.filter(c => c.type === 'numeric' || c.type === 'categorical' || c.type === 'text');
  
  const [selectedDistCol, setSelectedDistCol] = useState<string>(
      distColumns[0]?.name || ''
  );

  const missingData = profile.columns.map(c => ({
    name: c.name,
    missing: c.missing,
    type: c.type
  })).sort((a, b) => b.missing - a.missing);

  // Calculate actual row count derived from total cells and columns
  const rowCount = profile.columns.length > 0 
    ? Math.ceil(profile.totalCells / profile.columns.length) 
    : 0;

  // Filter only columns with missing values for the chart, or show top 10 if none missing to show "clean" state
  const chartData = missingData.filter(d => d.missing > 0);
  const displayData = chartData.length > 0 ? chartData : missingData.slice(0, 10);
  
  const chartHeight = Math.max(300, displayData.length * 50);

  // Distribution Data Prep
  const activeColStats = profile.columns.find(c => c.name === selectedDistCol);
  const isNumericDist = activeColStats?.type === 'numeric';
  
  // Prepare chart data based on type
  const distChartData = isNumericDist 
    ? (activeColStats?.histogram || [])
    : (activeColStats?.topValues || []);

  return (
    <div className="space-y-6">
        {/* Top Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-medium uppercase">Total Rows</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{rowCount.toLocaleString()}</div>
            </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-medium uppercase">Columns</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{profile.columns.length}</div>
            </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-medium uppercase">Missing Cells</div>
                <div className={`text-2xl font-bold mt-1 ${profile.missingCells > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                    {profile.missingCells.toLocaleString()}
                </div>
            </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-medium uppercase">Duplicates</div>
                <div className={`text-2xl font-bold mt-1 ${profile.duplicateRows > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {profile.duplicateRows.toLocaleString()}
                </div>
            </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 space-x-6">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`pb-3 text-sm font-medium border-b-2 flex items-center ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <LayoutGrid size={16} className="mr-2" /> Overview & Types
            </button>
            <button 
                onClick={() => setActiveTab('distributions')}
                className={`pb-3 text-sm font-medium border-b-2 flex items-center ${activeTab === 'distributions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <BarChart2 size={16} className="mr-2" /> Distributions
            </button>
            <button 
                onClick={() => setActiveTab('correlations')}
                className={`pb-3 text-sm font-medium border-b-2 flex items-center ${activeTab === 'correlations' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Activity size={16} className="mr-2" /> Correlation Matrix
            </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
                <Card title="Missing Values per Column" className="flex flex-col">
                    <div className="w-full overflow-y-auto max-h-[400px] pr-2">
                        <div style={{ height: chartHeight }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={displayData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        width={150} 
                                        tick={{fontSize: 12, fill: '#64748b'}} 
                                        interval={0}
                                    />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: number) => [`${value} missing`, 'Count']}
                                    />
                                    <Bar dataKey="missing" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={24}>
                                        {displayData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.missing > 0 ? (entry.missing > rowCount * 0.5 ? '#ef4444' : '#f59e0b') : '#22c55e'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {chartData.length === 0 && (
                        <div className="text-center py-4 text-green-600 font-medium text-sm border-t border-slate-100 mt-2">
                            ✓ No missing values detected in dataset
                        </div>
                    )}
                </Card>

                <div className="space-y-6">
                    <Card title="Data Types Distribution" className="h-[200px]">
                        <div className="space-y-6 pt-4">
                            {['numeric', 'categorical', 'datetime', 'text'].map(type => {
                                const count = profile.columns.filter(c => c.type === type).length;
                                if (count === 0) return null;
                                return (
                                    <div key={type}>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="capitalize font-medium text-slate-700">{type}</span>
                                            <span className="text-slate-500">{count} columns</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3">
                                            <div 
                                                className={`h-3 rounded-full transition-all duration-500 ${type === 'numeric' ? 'bg-blue-500' : type === 'categorical' ? 'bg-purple-500' : 'bg-green-500'}`} 
                                                style={{ width: `${(count / profile.columns.length) * 100}%`}}
                                            ></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>

                    <Card title="Sample Data" className="overflow-hidden h-[300px] overflow-y-auto">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        {profile.columns.map(col => (
                                            <th key={col.name} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                <div className="flex items-center space-x-1">
                                                    <span>{col.name}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${col.type === 'numeric' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                                                        {col.type.substr(0,3)}
                                                    </span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {profile.samples.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            {profile.columns.map(col => (
                                                <td key={`${idx}-${col.name}`} className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    {row[col.name] !== undefined && row[col.name] !== null ? String(row[col.name]) : <span className="text-red-300 italic">null</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'distributions' && (
            <div className="animate-in fade-in duration-500">
                {distColumns.length > 0 ? (
                    <Card 
                        title={`Feature Distributions (${isNumericDist ? 'Histogram' : 'Categorical Counts'})`} 
                        description="Explore the shape of your data. For numeric: data spread. For categorical: top 5 values."
                    >
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Left: Column Selector */}
                            <div className="w-full md:w-1/4 border-r border-slate-100 pr-4">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Select Column</h4>
                                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                                    {distColumns.map(col => (
                                        <button
                                            key={col.name}
                                            onClick={() => setSelectedDistCol(col.name)}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                                                selectedDistCol === col.name 
                                                ? 'bg-blue-50 text-blue-700 font-medium' 
                                                : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="truncate">{col.name}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ml-2 ${col.type === 'numeric' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                                                {col.type.substr(0,1).toUpperCase()}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Chart */}
                            <div className="w-full md:w-3/4 h-[400px]">
                                {distChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        {isNumericDist ? (
                                            <AreaChart data={distChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis 
                                                    dataKey="bin" 
                                                    tick={{fontSize: 10}} 
                                                    interval={0} 
                                                    angle={-45} 
                                                    textAnchor="end" 
                                                    height={60}
                                                />
                                                <YAxis />
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="count" 
                                                    stroke="#3b82f6" 
                                                    fillOpacity={1} 
                                                    fill="url(#colorCount)" 
                                                    name="Frequency"
                                                />
                                            </AreaChart>
                                        ) : (
                                            <BarChart data={distChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis 
                                                    dataKey="value" 
                                                    tick={{fontSize: 11}} 
                                                    interval={0} 
                                                    angle={-45} 
                                                    textAnchor="end"
                                                />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip 
                                                    cursor={{fill: 'transparent'}}
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Bar 
                                                    dataKey="count" 
                                                    fill="#8b5cf6" 
                                                    radius={[4, 4, 0, 0]} 
                                                    name="Count"
                                                    barSize={60}
                                                />
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 italic">
                                        No distribution data available for this column.
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                        No analyzable columns available for distribution analysis.
                    </div>
                )}
            </div>
        )}

        {activeTab === 'correlations' && (
            <div className="animate-in fade-in duration-500">
                <Card 
                    title="Correlation Matrix (Pearson)" 
                    description="Identify relationships between variables. Strong positive (Blue) or negative (Red) correlations may indicate redundancy."
                >
                    {profile.correlations ? (
                        <CorrelationHeatmap data={profile.correlations} />
                    ) : (
                        <div className="p-12 text-center text-slate-500">
                            Insufficient data to generate correlations.
                        </div>
                    )}
                </Card>
            </div>
        )}
    </div>
  );
};

export default DataProfileView;