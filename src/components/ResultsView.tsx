import React, { useEffect, useState } from 'react';
import { CleaningRun, DataProfile, CleaningStats, CleaningConfig } from '../types';
import Card from './ui/Card';
import {
  CheckCircle,
  AlertTriangle,
  Download,
  Lightbulb,
  FileText,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Star,
  Sparkles,
  PieChart,
  Bot,
  RotateCcw,
} from 'lucide-react';
import Button from './ui/Button';

// ✅ FIXED IMPORT PATHS
import {
  simulateCleaning,
  getHeuristicConfig,
  cleanDataAndExport,
} from '../services/mockDataService';

import { getRecommendedConfig } from '../services/geminiService';

import ReactMarkdown from 'react-markdown';

interface ResultsViewProps {
  run: CleaningRun;
  originalProfile?: DataProfile;
  rawContent?: string;
  onApplyAiConfig: (config: CleaningConfig) => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({
  run,
  originalProfile,
  rawContent,
  onApplyAiConfig,
}) => {
  const [stats, setStats] = useState<{
    raw: CleaningStats | null;
    user: CleaningStats | null;
    ai: CleaningStats | null;
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
        ai: aiStats,
      });

      // Try to fetch Gemini config for "True" AI optimization
      try {
        const geminiConfig = await getRecommendedConfig(originalProfile);
        if (geminiConfig) {
          const geminiStats = simulateCleaning(originalProfile, geminiConfig);
          setStats((prev) => ({ ...prev, ai: geminiStats }));
          setAiConfigUsed(geminiConfig);
        }
      } catch (e) {
        console.log('Using heuristic baseline');
      }
    };

    fetchComparison();
  }, [run, originalProfile]);

  const isUserOptimal =
    stats.user && stats.ai && stats.user.qualityScore >= stats.ai.qualityScore;
  const scoreDiff =
    (stats.ai?.qualityScore || 0) - (stats.user?.qualityScore || 0);

  const handleDownloadCSV = () => {
    if (!rawContent) {
      alert('Error: Original dataset content is missing.');
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
${run.aiSuggestions || 'No AI suggestions generated for this run.'}

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
          <h3 className="text-lg font-semibold text-green-900">
            Pipeline Execution Successful
          </h3>
          <p className="text-green-700 mt-1">
            Your data has been cleaned and processed. All specified rules for
            imputation, outlier handling, and encoding have been applied.
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
              {/* ... rest of your JSX stays EXACTLY the same ... */}
              {/* I am not rewriting the whole giant JSX; keep everything below unchanged */}
            </Card>
          )}

          {/* AI Suggestions, Code section, Sidebar etc. remain exactly as in your version */}
          {/* DO NOT change anything else in the JSX; only the imports needed fixing */}
        </div>

        {/* Sidebar Summary */}
        {/* ... unchanged ... */}
      </div>
    </div>
  );
};

export default ResultsView;
