import React, { useState } from 'react';
import { CleaningConfig, ColumnOverride, NewFeature } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { Sparkles, Sliders, List, Plus, Trash2, Calculator } from 'lucide-react';

interface ConfigFormProps {
  config: CleaningConfig;
  setConfig: React.Dispatch<React.SetStateAction<CleaningConfig>>;
  onRun: () => void;
  isProcessing: boolean;
  onAutoConfig: () => void;
  isAutoConfiguring: boolean;
  columns?: string[];
}

const ConfigForm: React.FC<ConfigFormProps> = ({ 
    config, 
    setConfig, 
    onRun, 
    isProcessing,
    onAutoConfig,
    isAutoConfiguring,
    columns = []
}) => {
  const [activeTab, setActiveTab] = useState<'global' | 'columns' | 'features'>('global');
  
  // State for adding new rules
  const [newOverride, setNewOverride] = useState<Partial<ColumnOverride>>({ action: 'impute_mean' });
  const [newFeature, setNewFeature] = useState<Partial<NewFeature>>({ operation: 'add' });

  // Safety fallback for arrays
  const safeOverrides = config.columnOverrides || [];
  const safeFeatures = config.newFeatures || [];

  const handleChange = (key: keyof CleaningConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const addOverride = () => {
      if (newOverride.colName && newOverride.action) {
          setConfig(prev => ({
              ...prev,
              columnOverrides: [...safeOverrides, newOverride as ColumnOverride]
          }));
          setNewOverride({ action: 'impute_mean' }); // reset but keep action
      }
  };

  const removeOverride = (idx: number) => {
      setConfig(prev => ({
          ...prev,
          columnOverrides: safeOverrides.filter((_, i) => i !== idx)
      }));
  };

  const addFeature = () => {
      if (newFeature.name && newFeature.col1 && newFeature.col2 && newFeature.operation) {
          setConfig(prev => ({
              ...prev,
              newFeatures: [...safeFeatures, newFeature as NewFeature]
          }));
          setNewFeature({ operation: 'add' });
      }
  };

  const removeFeature = (idx: number) => {
      setConfig(prev => ({
          ...prev,
          newFeatures: safeFeatures.filter((_, i) => i !== idx)
      }));
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 mb-4">
        <button 
            onClick={() => setActiveTab('global')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'global' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <Sliders size={16} className="inline mr-2" /> Global Config
        </button>
        <button 
            onClick={() => setActiveTab('columns')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'columns' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <List size={16} className="inline mr-2" /> Granular Control
        </button>
        <button 
            onClick={() => setActiveTab('features')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'features' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <Calculator size={16} className="inline mr-2" /> Feature Builder
        </button>
      </div>

      <Card 
        title={activeTab === 'global' ? "Pipeline Configuration" : activeTab === 'columns' ? "Column-Specific Rules" : "Feature Engineering"}
        description={activeTab === 'global' ? "General rules applied to the entire dataset." : activeTab === 'columns' ? "Override global rules for specific columns." : "Create new variables using mathematical formulas."}
        action={
            <div className="flex space-x-3">
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onAutoConfig} 
                    isLoading={isAutoConfiguring}
                    className="text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                >
                    {!isAutoConfiguring && <Sparkles size={16} className="mr-2" />}
                    Auto-Optimize
                </Button>
                <Button size="sm" onClick={onRun} isLoading={isProcessing}>
                    Run Pipeline
                </Button>
            </div>
        }
      >
        {activeTab === 'global' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                {/* Missing Data */}
                <div className="space-y-4">
                    <h4 className="font-medium text-slate-900 border-b pb-2">Missing Data Handling</h4>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Imputation Strategy</label>
                        <select 
                            className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            value={config.imputationStrategy}
                            onChange={(e) => handleChange('imputationStrategy', e.target.value)}
                        >
                            <option value="mean">Mean (Numerical) / Mode (Categorical)</option>
                            <option value="median">Median (Numerical) / Mode (Categorical)</option>
                            <option value="mode">Most Frequent (All)</option>
                            <option value="drop">Drop Rows</option>
                        </select>
                    </div>
                </div>

                {/* Outliers */}
                <div className="space-y-4">
                    <h4 className="font-medium text-slate-900 border-b pb-2">Outlier Detection</h4>
                    <div className="flex items-center space-x-3 mb-2">
                        <input 
                            type="checkbox" 
                            id="handleOutliers"
                            checked={config.handleOutliers}
                            onChange={(e) => handleChange('handleOutliers', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="handleOutliers" className="text-sm text-slate-700">Detect & Handle Outliers</label>
                    </div>
                    {config.handleOutliers && (
                        <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Detection Method</label>
                        <select 
                            className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            value={config.outlierMethod}
                            onChange={(e) => handleChange('outlierMethod', e.target.value)}
                        >
                            <option value="zscore">Z-Score (Standard Deviation)</option>
                            <option value="iqr">IQR (Interquartile Range)</option>
                        </select>
                    </div>
                    )}
                </div>

                {/* Scaling/Encoding */}
                <div className="space-y-4">
                    <h4 className="font-medium text-slate-900 border-b pb-2">Scaling & Encoding</h4>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Scaling / Normalization</label>
                        <select 
                            className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            value={config.scaling}
                            onChange={(e) => handleChange('scaling', e.target.value)}
                        >
                            <option value="none">No Scaling</option>
                            <option value="standard">Standard Scaler (Z-Score)</option>
                            <option value="minmax">MinMax Scaler (0-1)</option>
                            <option value="robust">Robust Scaler (Outlier resilient)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Categorical Encoding</label>
                        <select 
                            className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            value={config.encoding}
                            onChange={(e) => handleChange('encoding', e.target.value)}
                        >
                            <option value="onehot">One-Hot Encoding</option>
                            <option value="label">Label Encoding</option>
                        </select>
                    </div>
                </div>

                {/* Toggles */}
                <div className="space-y-4">
                    <h4 className="font-medium text-slate-900 border-b pb-2">General Processing</h4>
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <input 
                                type="checkbox" 
                                checked={config.removeDuplicates}
                                onChange={(e) => handleChange('removeDuplicates', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                            />
                            <span className="text-sm text-slate-700">Remove Exact Duplicates</span>
                        </div>
                        <div className="flex items-center">
                            <input 
                                type="checkbox" 
                                checked={config.fixDataTypes}
                                onChange={(e) => handleChange('fixDataTypes', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                            />
                            <span className="text-sm text-slate-700">Auto-fix Data Types</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'columns' && (
            <div className="animate-in fade-in duration-300">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3">Add New Override Rule</h4>
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Column</label>
                            <select 
                                className="w-full border-slate-300 rounded-md text-sm p-2 border"
                                value={newOverride.colName || ''}
                                onChange={e => setNewOverride({ ...newOverride, colName: e.target.value })}
                            >
                                <option value="">Select Column...</option>
                                {columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Action</label>
                            <select 
                                className="w-full border-slate-300 rounded-md text-sm p-2 border"
                                value={newOverride.action}
                                onChange={e => setNewOverride({ ...newOverride, action: e.target.value as any })}
                            >
                                <option value="impute_mean">Impute Mean</option>
                                <option value="impute_median">Impute Median</option>
                                <option value="impute_mode">Impute Mode</option>
                                <option value="drop_rows">Drop Rows</option>
                                <option value="drop_col">Drop Column</option>
                            </select>
                        </div>
                        <Button onClick={addOverride} size="md" disabled={!newOverride.colName}>
                            <Plus size={16} className="mr-1" /> Add Rule
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-700">Active Rules</h4>
                    {safeOverrides.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No column-specific rules defined.</p>
                    ) : (
                        <div className="grid gap-2">
                            {safeOverrides.map((rule, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded-md shadow-sm">
                                    <div className="flex items-center">
                                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 mr-3">{rule.colName}</span>
                                        <span className="text-sm text-slate-800 font-medium capitalize">{rule.action.replace('_', ' ')}</span>
                                    </div>
                                    <button onClick={() => removeOverride(idx)} className="text-red-400 hover:text-red-600">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'features' && (
            <div className="animate-in fade-in duration-300">
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3">Create New Feature</h4>
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                        <div className="w-full md:w-1/4">
                            <label className="block text-xs font-medium text-slate-500 mb-1">New Feature Name</label>
                            <input 
                                type="text"
                                className="w-full border-slate-300 rounded-md text-sm p-2 border"
                                placeholder="e.g. Total_Spend"
                                value={newFeature.name || ''}
                                onChange={e => setNewFeature({ ...newFeature, name: e.target.value })}
                            />
                        </div>
                        <div className="w-full md:w-1/4">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Column A</label>
                            <select 
                                className="w-full border-slate-300 rounded-md text-sm p-2 border"
                                value={newFeature.col1 || ''}
                                onChange={e => setNewFeature({ ...newFeature, col1: e.target.value })}
                            >
                                <option value="">Select...</option>
                                {columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="w-[100px]">
                             <label className="block text-xs font-medium text-slate-500 mb-1">Op</label>
                             <select 
                                className="w-full border-slate-300 rounded-md text-sm p-2 border font-mono"
                                value={newFeature.operation}
                                onChange={e => setNewFeature({ ...newFeature, operation: e.target.value as any })}
                            >
                                <option value="add">+</option>
                                <option value="sub">-</option>
                                <option value="mul">×</option>
                                <option value="div">÷</option>
                            </select>
                        </div>
                        <div className="w-full md:w-1/4">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Column B</label>
                            <select 
                                className="w-full border-slate-300 rounded-md text-sm p-2 border"
                                value={newFeature.col2 || ''}
                                onChange={e => setNewFeature({ ...newFeature, col2: e.target.value })}
                            >
                                <option value="">Select...</option>
                                {columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <Button onClick={addFeature} size="md" disabled={!newFeature.name || !newFeature.col1 || !newFeature.col2}>
                            <Plus size={16} className="mr-1" /> Add
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-700">Created Features</h4>
                     {safeFeatures.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No custom features defined.</p>
                    ) : (
                        <div className="grid gap-2">
                             {safeFeatures.map((feat, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded-md shadow-sm">
                                    <div className="flex items-center text-sm">
                                        <span className="font-bold text-slate-800 mr-2">{feat.name}</span>
                                        <span className="text-slate-400 mr-2">=</span>
                                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{feat.col1}</span>
                                        <span className="mx-2 font-bold text-slate-400">
                                            {feat.operation === 'add' ? '+' : feat.operation === 'sub' ? '-' : feat.operation === 'mul' ? '×' : '÷'}
                                        </span>
                                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{feat.col2}</span>
                                    </div>
                                    <button onClick={() => removeFeature(idx)} className="text-red-400 hover:text-red-600">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                     )}
                </div>
            </div>
        )}
      </Card>
    </div>
  );
};

export default ConfigForm;