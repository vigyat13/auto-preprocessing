import React from 'react';
import { Dataset, DataProfile } from '../types';
import { AlertTriangle, CheckCircle, Info, ArrowRight, BarChart3, Settings, Play } from 'lucide-react';
import Card from './ui/Card';

interface DashboardGuideProps {
  dataset: Dataset;
  hasRun: boolean;
}

const DashboardGuide: React.FC<DashboardGuideProps> = ({ dataset, hasRun }) => {
  const { profile } = dataset;
  
  if (!profile) return null;

  // 1. Analyze Dataset Health
  const columnsWithMissing = profile.columns.filter(c => c.missing > 0);
  const healthScore = Math.max(0, 100 - (columnsWithMissing.length * 10) - (profile.duplicateRows > 0 ? 10 : 0));
  
  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const steps = [
    {
      id: 1,
      title: "Data Profiling",
      icon: BarChart3,
      desc: "We scan every column to detect types, missing values, and outliers.",
      status: 'completed'
    },
    {
      id: 2,
      title: "Configuration",
      icon: Settings,
      desc: "You choose how to handle the issues detected during profiling.",
      status: hasRun ? 'completed' : 'active'
    },
    {
      id: 3,
      title: "Pipeline Execution",
      icon: Play,
      desc: "We generate Python code and an AI summary of the transformation.",
      status: hasRun ? 'completed' : 'pending'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Dynamic Dataset Narrative */}
        <div className={`col-span-1 rounded-xl border p-5 ${getHealthColor(healthScore)}`}>
          <div className="flex items-center space-x-2 mb-3">
             {healthScore < 90 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
             <h3 className="font-bold text-lg">Dataset Health: {healthScore}/100</h3>
          </div>
          
          <div className="text-sm space-y-2 leading-relaxed opacity-90">
            <p>
              We successfully ingested <strong>{dataset.name}</strong> containing <strong>{dataset.rowCount.toLocaleString()} rows</strong> and <strong>{dataset.colCount} columns</strong>.
            </p>
            
            {columnsWithMissing.length > 0 ? (
              <p>
                ⚠️ <strong>Attention Needed:</strong> We detected missing values in {columnsWithMissing.length} columns 
                (mostly in <em>{columnsWithMissing[0].name}</em>). You should select an imputation strategy below.
              </p>
            ) : (
              <p>✅ Your data is complete with no missing values.</p>
            )}

            {profile.duplicateRows > 0 && (
               <p>
                 ⚠️ <strong>Duplicates:</strong> There are {profile.duplicateRows} exact duplicate rows that should likely be removed.
               </p>
            )}

            {healthScore === 100 && <p>Your data looks pristine! You can likely proceed with standard scaling and encoding.</p>}
          </div>
        </div>

        {/* Right Col: Workflow Explanation */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
           <div className="flex items-center space-x-2 mb-4 border-b border-slate-100 pb-2">
              <Info size={18} className="text-blue-500" />
              <h3 className="font-semibold text-slate-800">Pipeline Roadmap</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = step.status === 'active';
                const isCompleted = step.status === 'completed';
                
                return (
                  <div key={step.id} className={`relative p-3 rounded-lg border transition-all ${isActive ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50 opacity-80'}`}>
                     <div className="flex items-center justify-between mb-2">
                        <div className={`p-1.5 rounded-md ${isActive ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                           <Icon size={16} />
                        </div>
                        <span className="text-xs font-bold text-slate-400">0{step.id}</span>
                     </div>
                     <h4 className={`font-semibold text-sm mb-1 ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>{step.title}</h4>
                     <p className="text-xs text-slate-500 leading-snug">{step.desc}</p>
                     
                     {/* Connector Arrow (except last) */}
                     {idx < steps.length - 1 && (
                        <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-300">
                           <ArrowRight size={16} />
                        </div>
                     )}
                  </div>
                );
              })}
           </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardGuide;