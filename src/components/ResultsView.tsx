import React, { useEffect, useState } from 'react';
import { CleaningRun, DataProfile, CleaningStats, CleaningConfig } from '../types';
import Card from './ui/Card';
import { CheckCircle, AlertTriangle, Download, Lightbulb, FileText, BarChart3, TrendingUp, ShieldCheck, Star, Sparkles, PieChart, Bot, RotateCcw } from 'lucide-react';
import Button from './ui/Button';
import { simulateCleaning, getHeuristicConfig, cleanDataAndExport } from '../src/services/mockDataService';
import { getRecommendedConfig } from '../src/services/geminiService';
import ReactMarkdown, { Components } from 'react-markdown';

interface ResultsViewProps {
  run: CleaningRun;
  originalProfile?: DataProfile;
  rawContent?: string;
  onApplyAiConfig: (config: CleaningConfig) => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ run, originalProfile, rawContent, onApplyAiConfig }) => {
  const [stats, setStats] = useState<{
      raw: CleaningStats | null,
      user: CleaningStats | null,
      ai: CleaningStats | null
  }>({ raw: null, user: null, ai: null });

  const [aiConfigUsed, setAiConfigUsed] = useState<CleaningConfig | null>(null);
  const [editableCode, setEditableCode] = useState(run.pythonSnippet);

  useEffect(() => {
      setEditableCode(run.pythonSnippet);
  }, [run.pythonSnippet]);

  useEffect(() => {
    const fetchComparison = async () => {
        if (!originalProfile) return;

        // 1. Raw Stats (Simulate with null config)
        const rawStats = simulateCleaning(originalProfile, null);
        
        // 2. User Stats (Current Run)
        const userStats = simulateCleaning(originalProfile, run.config);

        // 3. AI Stats 
        // Start with Heuristic (Instant)
        const heuristicConfig = getHeuristicConfig(originalProfile);
        let aiStats = simulateCleaning(originalProfile, heuristicConfig);
        setAiConfigUsed(heuristicConfig);

        setStats({
            raw: rawStats,
            user: userStats,
            ai: aiStats
        });

        // Try to fetch Gemini config for "True" AI optimization
        try {
            const geminiConfig = await getRecommendedConfig(originalProfile);
            if (geminiConfig) {
                const geminiStats = simulateCleaning(originalProfile, geminiConfig);
                setStats(prev => ({ ...prev, ai: geminiStats }));
                setAiConfigUsed(geminiConfig);
            }
        } catch (e) {
            console.log("Using heuristic baseline");
        }
    };

    fetchComparison();
  }, [run, originalProfile]);

  const isUserOptimal = stats.user && stats.ai && stats.user.qualityScore >= stats.ai.qualityScore;
  const scoreDiff = (stats.ai?.qualityScore || 0) - (stats.user?.qualityScore || 0);

  const handleDownloadCSV = () => {
    if (!rawContent) {
        alert("Error: Original dataset content is missing.");
        return;
    }
    
    // Process the FULL dataset using the current config
    const cleanedContent = cleanDataAndExport(rawContent, run.config);
    
    const blob = new Blob([cleanedContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaned_dataset_${run.id}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadReport = () => {
    if (!stats.user) return;

    const reportContent = `
# AutoCleanML Report
Date: ${new Date(run.timestamp).toLocaleString()}
Run ID: ${run.id}

## 1. Cleaning Configuration
- Imputation: ${run.config.imputationStrategy}
- Outliers: ${run.config.handleOutliers ? run.config.outlierMethod : 'None'}
- Scaling: ${run.config.scaling}
- Encoding: ${run.config.encoding}
- Duplicates Removed: ${run.config.removeDuplicates ? 'Yes' : 'No'}

## 2. Performance Metrics
- Quality Score: ${stats.user.qualityScore}/100
- Rows Retained: ${stats.user.rowsRetained}
- Data Retention: ${stats.user.dataRetention.toFixed(1)}%
- Completeness: ${stats.user.completionRate.toFixed(1)}%

## 3. AI Suggestions
${run.aiSuggestions || "No AI suggestions generated for this run."}

## 4. Reproducibility (Python)
\`\`\`python
${editableCode}
\`\`\`
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaning_report_${run.id}.md`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Status Banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-start space-x-4 shadow-sm">
        <CheckCircle className="text-green-600 mt-1 shrink-0" size={24} />
        <div>
            <h3 className="text-lg font-semibold text-green-900">Pipeline Execution Successful</h3>
            <p className="text-green-700 mt-1">
                Your data has been cleaned and processed. All specified rules for imputation, outlier handling, and encoding have been applied.
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Efficiency Benchmark Card */}
            {stats.raw && stats.user && stats.ai && (
                <Card 
                    title="Efficiency Benchmark" 
                    description="Real-time quality scoring. AI assesses config depth (scaling, outliers) alongside data shape."
                    className="overflow-hidden"
                >
                    <div className="mb-8 grid grid-cols-3 gap-6 text-center">
                        {/* Raw Data */}
                        <div className="flex flex-col items-center">
                            <div className="relative h-24 w-24 flex items-center justify-center">
                                <svg className="h-full w-full" viewBox="0 0 36 36">
                                    <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className="text-slate-400" strokeDasharray={`${stats.raw.qualityScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-xl font-bold text-slate-600">{stats.raw.qualityScore}</span>
                                    <span className="text-[10px] text-slate-400 uppercase">Score</span>
                                </div>
                            </div>
                            <div className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Raw Data</div>
                        </div>
                        
                        {/* User Run */}
                        <div className="flex flex-col items-center">
                            <div className="relative h-28 w-28 flex items-center justify-center">
                                <svg className="h-full w-full" viewBox="0 0 36 36">
                                    <path className={`text-slate-100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className={isUserOptimal ? 'text-green-500' : 'text-blue-500'} strokeDasharray={`${stats.user.qualityScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className={`text-2xl font-bold ${isUserOptimal ? 'text-green-600' : 'text-blue-600'}`}>{stats.user.qualityScore}</span>
                                    <span className="text-[10px] text-slate-400 uppercase">Score</span>
                                </div>
                                {isUserOptimal && (
                                     <div className="absolute -top-2 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center border border-green-200">
                                        <Star size={8} className="mr-1 fill-current" /> OPTIMAL
                                    </div>
                                )}
                            </div>
                             <div className={`mt-2 text-xs font-semibold uppercase tracking-wide ${isUserOptimal ? 'text-green-700' : 'text-blue-600'}`}>Your Run</div>
                        </div>
                        
                        {/* AI Baseline */}
                        <div className="flex flex-col items-center">
                            <div className="relative h-24 w-24 flex items-center justify-center">
                                <svg className="h-full w-full" viewBox="0 0 36 36">
                                    <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className="text-purple-400" strokeDasharray={`${stats.ai.qualityScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-xl font-bold text-purple-600">{stats.ai.qualityScore}</span>
                                    <span className="text-[10px] text-slate-400 uppercase">Score</span>
                                </div>
                            </div>
                             <div className="mt-2 text-xs font-semibold text-purple-600 uppercase tracking-wide">AI Baseline</div>
                             {!isUserOptimal && scoreDiff > 0 && (
                                <div className="text-[10px] text-purple-500 mt-1 font-medium">+{scoreDiff} pts available</div>
                            )}
                        </div>
                    </div>

                    {/* Detailed Metrics Table */}
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Metric</th>
                                    <th className="px-4 py-3 font-medium text-slate-600">Raw Data</th>
                                    <th className="px-4 py-3 font-medium text-blue-700 bg-blue-50/50">Your Run</th>
                                    <th className="px-4 py-3 font-medium text-purple-700">AI / Best Practice</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700 flex items-center">
                                        <TrendingUp size={14} className="mr-2 text-slate-400"/> Completion Rate
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{stats.raw.completionRate.toFixed(0)}%</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900 bg-blue-50/30">{stats.user.completionRate.toFixed(0)}%</td>
                                    <td className="px-4 py-3 text-slate-600">{stats.ai.completionRate.toFixed(0)}%</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700 flex items-center">
                                        <ShieldCheck size={14} className="mr-2 text-slate-400"/> Data Retention
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">100%</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900 bg-blue-50/30">{stats.user.dataRetention.toFixed(0)}%</td>
                                    <td className="px-4 py-3 text-slate-600">{stats.ai.dataRetention.toFixed(0)}%</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700 flex items-center">
                                        <AlertTriangle size={14} className="mr-2 text-slate-400"/> Duplicates Remaining
                                    </td>
                                    <td className="px-4 py-3 text-red-500">{stats.raw.duplicateRows}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900 bg-blue-50/30">{stats.user.duplicateRows}</td>
                                    <td className="px-4 py-3 text-slate-600">{stats.ai.duplicateRows}</td>
                                </tr>
                                 <tr>
                                    <td className="px-4 py-3 font-medium text-slate-700 flex items-center">
                                        <BarChart3 size={14} className="mr-2 text-slate-400"/> Final Row Count
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{stats.raw.rowsRetained}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900 bg-blue-50/30">{stats.user.rowsRetained}</td>
                                    <td className="px-4 py-3 text-slate-600">{stats.ai.rowsRetained}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {!isUserOptimal && aiConfigUsed && (
                        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-purple-50 p-4 rounded-lg gap-4 border border-purple-100 shadow-sm">
                            <div className="flex items-center text-sm text-purple-800">
                                <Sparkles size={18} className="mr-2 text-purple-600" />
                                <span><span className="font-semibold">Optimize your pipeline:</span> The AI applies advanced scaling & outlier handling.</span>
                            </div>
                            <Button 
                                onClick={() => onApplyAiConfig(aiConfigUsed)} 
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white border-transparent shadow-sm whitespace-nowrap"
                            >
                                Apply AI Strategy
                            </Button>
                        </div>
                    )}

                    {/* Strategy Breakdown */}
                     <div className="mt-6 bg-slate-50 p-4 rounded-lg text-xs text-slate-600 border border-slate-200">
                        <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                            Strategy Breakdown
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                             <div className="flex justify-between border-b border-slate-200 pb-1">
                                <span>Imputation:</span>
                                <span>{run.config.imputationStrategy} vs {aiConfigUsed?.imputationStrategy || 'N/A'} (AI)</span>
                             </div>
                             <div className="flex justify-between border-b border-slate-200 pb-1">
                                <span>Scaling:</span>
                                <span className={run.config.scaling !== 'none' ? 'text-green-600 font-medium' : ''}>
                                    {run.config.scaling} vs {aiConfigUsed?.scaling || 'N/A'} (AI)
                                </span>
                             </div>
                             <div className="flex justify-between border-b border-slate-200 pb-1">
                                <span>Outliers:</span>
                                <span className={run.config.handleOutliers ? 'text-green-600 font-medium' : ''}>
                                    {run.config.handleOutliers ? 'Yes' : 'No'} vs {aiConfigUsed?.handleOutliers ? 'Yes' : 'No'} (AI)
                                </span>
                             </div>
                             <div className="flex justify-between border-b border-slate-200 pb-1">
                                <span>Encoding:</span>
                                <span>{run.config.encoding}</span>
                             </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* AI Suggestions - ENHANCED VISUALS */}
            <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                {/* Enhanced Header */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white rounded-lg border border-indigo-100 shadow-sm text-indigo-600">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Engineering Intelligence</h3>
                            <p className="text-xs text-indigo-600 font-medium">Powered by Gemini 2.5 Flash</p>
                        </div>
                        </div>
                        <div className="hidden sm:block">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <Lightbulb size={12} className="mr-1" />
                            Executive Summary
                        </span>
                        </div>
                </div>
                
                {/* Markdown Content */}
                <div className="p-6 md:p-8 min-h-[100px]">
                        {run.aiSuggestions ? (
                            <ReactMarkdown 
                                key={run.id}
                                components={{
                                    h1: ({node, ...props}) => <h2 className="text-xl font-bold text-indigo-950 mt-6 mb-4 pb-2 border-b border-indigo-100 flex items-center" {...props} />,
                                    h2: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3" {...props} />,
                                    h3: ({node, ...props}) => <h4 className="text-base font-semibold text-slate-700 mt-4 mb-2" {...props} />,
                                    p: ({node, ...props}) => <p className="text-slate-600 leading-relaxed mb-4 text-sm md:text-base" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 space-y-2 mb-6 text-slate-600 marker:text-indigo-500" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 space-y-2 mb-6 text-slate-600 marker:text-indigo-500" {...props} />,
                                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-semibold text-slate-900 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100" {...props} />,
                                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-slate-50 text-slate-700 italic rounded-r" {...props} />,
                                    code: ({node, inline, className, children, ...props}: any) => {
                                        if (inline) {
                                            return <code className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-200" {...props}>{children}</code>;
                                        }
                                        return (
                                            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed my-4 shadow-inner">
                                                <code {...props}>{children}</code>
                                            </pre>
                                        );
                                    }
                                }}
                            >
                                {run.aiSuggestions}
                            </ReactMarkdown>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 italic">
                                <div className="animate-pulse mr-2">●</div> Generative insights...
                            </div>
                        )}
                </div>
            </div>

            {/* Reproducibility Code - EDITABLE */}
            <Card title="Reproducibility Code" description="Python snippet using Scikit-Learn pipelines. Editable view.">
                <div className="relative group">
                    <div className="absolute top-2 right-2 flex space-x-2 z-10">
                        <button 
                             className="p-1.5 bg-slate-700/80 hover:bg-slate-600 text-white rounded shadow text-xs flex items-center backdrop-blur-sm"
                             onClick={() => setEditableCode(run.pythonSnippet)}
                             title="Reset to Original"
                        >
                            <RotateCcw size={14} />
                        </button>
                        <button 
                            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded shadow text-xs flex items-center backdrop-blur-sm"
                            onClick={() => { navigator.clipboard.writeText(editableCode); alert('Copied to clipboard'); }}
                        >
                            Copy Code
                        </button>
                    </div>
                    <textarea 
                        className="w-full h-[400px] bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                        value={editableCode}
                        onChange={(e) => setEditableCode(e.target.value)}
                        spellCheck={false}
                    />
                </div>
            </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
            <Card title="Transformation Summary">
                <ul className="space-y-3">
                    <li className="flex items-center text-sm text-slate-700">
                        <CheckCircle size={16} className="text-green-500 mr-2 shrink-0" />
                        <span>Imputation: <strong>{run.config.imputationStrategy}</strong></span>
                    </li>
                    <li className="flex items-center text-sm text-slate-700">
                        <CheckCircle size={16} className="text-green-500 mr-2 shrink-0" />
                        <span>Scaling: <strong>{run.config.scaling}</strong></span>
                    </li>
                     <li className="flex items-center text-sm text-slate-700">
                        <CheckCircle size={16} className="text-green-500 mr-2 shrink-0" />
                        <span>Encoding: <strong>{run.config.encoding}</strong></span>
                    </li>
                    {run.config.handleOutliers && (
                        <li className="flex items-center text-sm text-slate-700">
                            <CheckCircle size={16} className="text-green-500 mr-2 shrink-0" />
                            <span>Outliers: <strong>{run.config.outlierMethod}</strong></span>
                        </li>
                    )}
                    {run.config.columnOverrides.length > 0 && (
                        <li className="flex items-center text-sm text-slate-700">
                             <CheckCircle size={16} className="text-blue-500 mr-2 shrink-0" />
                             <span>Overrides: <strong>{run.config.columnOverrides.length} columns</strong></span>
                        </li>
                    )}
                    {run.config.newFeatures.length > 0 && (
                        <li className="flex items-center text-sm text-slate-700">
                             <CheckCircle size={16} className="text-purple-500 mr-2 shrink-0" />
                             <span>New Features: <strong>{run.config.newFeatures.length} created</strong></span>
                        </li>
                    )}
                </ul>
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                     <Button variant="outline" className="w-full justify-start" onClick={handleDownloadReport}>
                        <FileText size={16} className="mr-2" />
                        Download Report
                     </Button>
                     <Button className="w-full justify-start" onClick={handleDownloadCSV}>
                        <Download size={16} className="mr-2" />
                        Download Cleaned CSV
                     </Button>
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;