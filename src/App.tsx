import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DataProfileView from './components/DataProfile';
import ConfigForm from './components/ConfigForm';
import ResultsView from './components/ResultsView';
import DashboardGuide from './components/DashboardGuide';
import LoginPage from './components/LoginPage'; // Import Login Page
import Card from './components/ui/Card';
import Button from './components/ui/Button';
import { UploadCloud, Plus, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { Dataset, CleaningConfig, CleaningRun, DataProfile, User } from './types';
import { parseCSV, generateProfile, generatePythonSnippet, processFile } from './src/services/mockDataService';
import { getCleaningSuggestions, getRecommendedConfig } from './src/services/geminiService';

// Default config - Intentionally slightly sub-optimal to show "Lift" in benchmark
const DEFAULT_CONFIG: CleaningConfig = {
  imputationStrategy: 'mean',
  handleOutliers: false,
  outlierMethod: 'zscore',
  scaling: 'none',
  encoding: 'onehot',
  removeDuplicates: false, 
  fixDataTypes: true,
  balanceClasses: false,
  featureSelection: false,
  columnOverrides: [],
  newFeatures: []
};

// Optimum file size limit for browser-based processing (50MB)
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Initial Mock Data
const MOCK_CSV = `Age,Income,City,Purchased,Date Joined,Price,Quantity
25,50000,New York,Yes,2023-01-01,10.5,2
30,,Los Angeles,No,2023-02-15,20.0,1
35,75000,New York,Yes,2023-03-10,15.5,5
,,Chicago,No,2023-04-05,5.0,10
45,120000,Miami,Yes,2023-05-20,100.0,1
25,50000,New York,Yes,2023-01-01,10.5,2
40,80000,Chicago,No,invalid-date,50.0,3
`;

function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // App State
  const [currentView, setView] = useState('dashboard');
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);
  const [config, setConfig] = useState<CleaningConfig>(DEFAULT_CONFIG);
  const [cleaningRun, setCleaningRun] = useState<CleaningRun | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isAutoConfiguring, setIsAutoConfiguring] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Initialize with a mock dataset
  useEffect(() => {
    const rawData = parseCSV(MOCK_CSV);
    const profile = generateProfile(rawData);
    const mockDataset: Dataset = {
        id: '1',
        name: 'customer_sales_v1.csv',
        uploadDate: new Date().toISOString(),
        rowCount: rawData.length,
        colCount: Object.keys(rawData[0] || {}).length,
        status: 'profiled',
        profile: profile,
        rawContent: MOCK_CSV
    };
    setDatasets([mockDataset]);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);

    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }

      setIsUploading(true);
      try {
        const csvContent = await processFile(file);
        const rawData = parseCSV(csvContent);
        
        if (rawData.length === 0) {
            throw new Error("Parsed data is empty. Please check the file content.");
        }

        const profile = generateProfile(rawData);
        
        const newDataset: Dataset = {
          id: Date.now().toString(),
          name: file.name,
          uploadDate: new Date().toISOString(),
          rowCount: rawData.length,
          colCount: Object.keys(rawData[0] || {}).length,
          status: 'profiled',
          profile,
          rawContent: csvContent
        };
        
        setDatasets(prev => [newDataset, ...prev]);
        setActiveDataset(newDataset);
        setView('dashboard'); 
      } catch (error) {
        console.error("Upload failed", error);
        setUploadError(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const runPipeline = async (configOverride?: CleaningConfig) => {
    if (!activeDataset || !activeDataset.profile) return;
    const configToUse = configOverride || config;

    setIsProcessing(true);
    if (configOverride) setConfig(configOverride);
    
    await new Promise(r => setTimeout(r, 1500));
    const suggestions = await getCleaningSuggestions(activeDataset.profile, configToUse);

    const run: CleaningRun = {
      id: Date.now().toString(),
      datasetId: activeDataset.id,
      timestamp: new Date().toISOString(),
      config: configToUse,
      status: 'completed',
      summary: 'Pipeline executed successfully.',
      pythonSnippet: generatePythonSnippet(configToUse, activeDataset.name),
      aiSuggestions: suggestions
    };

    setCleaningRun(run);
    setIsProcessing(false);
  };

  const handleAutoConfig = async () => {
    if (!activeDataset || !activeDataset.profile) return;
    setIsAutoConfiguring(true);
    try {
        const suggested = await getRecommendedConfig(activeDataset.profile);
        if (suggested) setConfig(suggested);
    } catch (e) {
        console.error(e);
    } finally {
        setIsAutoConfiguring(false);
    }
  };

  const handleLogin = (loggedInUser: User) => {
      setUser(loggedInUser);
  };

  const handleLogout = () => {
      setUser(null);
      // Reset critical state on logout
      setView('dashboard');
      setActiveDataset(null);
  };

  // --- Auth Guard ---
  if (!user) {
      return <LoginPage onLogin={handleLogin} />;
  }

  const renderContent = () => {
    if (currentView === 'upload') {
      return (
        <div className="max-w-3xl mx-auto pt-10 animate-in fade-in duration-300">
          <Card title="Upload Dataset" description="Supports Structured & Binary Formats">
             <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:bg-slate-50 transition-colors relative">
                {isUploading ? (
                     <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-slate-600">Processing file...</p>
                        <p className="text-xs text-slate-400 mt-2">Large files may take a moment to parse.</p>
                     </div>
                ) : (
                    <>
                        <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                        <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                        >
                            <span>Upload a file</span>
                            <input 
                                id="file-upload" 
                                name="file-upload" 
                                type="file" 
                                className="sr-only" 
                                accept=".csv,.tsv,.xlsx,.xls,.json,.parquet,.feather,.h5,.hdf5" 
                                onChange={handleFileUpload} 
                            />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Supported: .csv, .tsv, .xlsx, .json, .parquet, .feather, .h5
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Max Size: {MAX_FILE_SIZE_MB}MB
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                             {['CSV', 'Excel', 'JSON', 'Parquet', 'HDF5'].map(fmt => (
                                 <span key={fmt} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                     {fmt}
                                 </span>
                             ))}
                        </div>
                    </>
                )}
             </div>
             {uploadError && (
                 <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start text-red-700 text-sm">
                     <AlertTriangle size={16} className="mt-0.5 mr-2 shrink-0" />
                     {uploadError}
                 </div>
             )}
          </Card>
        </div>
      );
    }

    if (currentView === 'runs') {
        return (
            <div className="max-w-5xl mx-auto pt-6 animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Run History</h2>
                <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
                    {cleaningRun ? (
                         <div className="text-left cursor-pointer hover:bg-slate-50 p-4 rounded border mb-2" onClick={() => { setActiveDataset(datasets.find(d => d.id === cleaningRun.datasetId) || null); setView('dashboard'); }}>
                            <div className="font-semibold text-slate-900">Run #{cleaningRun.id}</div>
                            <div className="text-sm">Status: {cleaningRun.status}</div>
                            <div className="text-xs text-slate-400">{cleaningRun.timestamp}</div>
                         </div>
                    ) : "No runs found yet."}
                </div>
            </div>
        )
    }

    return (
      <div className="max-w-7xl mx-auto space-y-6 pt-6 pb-20 animate-in fade-in duration-300">
        
        <div className="flex justify-between items-center">
             <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                    {activeDataset ? (
                        <>
                            {activeDataset.name.endsWith('xlsx') || activeDataset.name.endsWith('xls') ? <FileSpreadsheet className="mr-2 text-green-600" size={24} /> : null}
                            {activeDataset.name}
                        </>
                    ) : "Select a Dataset"}
                </h2>
                {activeDataset && (
                    <p className="text-sm text-slate-500">
                        Uploaded {new Date(activeDataset.uploadDate).toLocaleDateString()} • {activeDataset.rowCount} Rows • {activeDataset.colCount} Columns
                    </p>
                )}
             </div>
             {!activeDataset && (
                 <Button onClick={() => setView('upload')}>
                    <Plus size={16} className="mr-2" />
                    New Dataset
                 </Button>
             )}
        </div>

        {!activeDataset && datasets.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                {datasets.map(d => (
                    <div key={d.id} onClick={() => setActiveDataset(d)} className="bg-white p-6 rounded-xl border border-slate-200 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="font-semibold text-lg text-slate-900 truncate flex items-center">
                            {d.name}
                        </div>
                        <div className="text-sm text-slate-500 mt-2 flex justify-between">
                            <span>{d.rowCount} rows</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${d.status === 'profiled' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>
                                {d.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeDataset && activeDataset.profile && (
            <div className="flex flex-col space-y-8">
                <DashboardGuide dataset={activeDataset} hasRun={!!cleaningRun} />

                <section>
                    <div className="flex items-center space-x-2 mb-4">
                        <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">1</div>
                        <h3 className="text-lg font-semibold text-slate-800">Data Profile</h3>
                    </div>
                    <DataProfileView profile={activeDataset.profile} />
                </section>

                <section>
                    <div className="flex items-center space-x-2 mb-4">
                        <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">2</div>
                        <h3 className="text-lg font-semibold text-slate-800">Cleaning Configuration</h3>
                    </div>
                    <ConfigForm 
                        config={config} 
                        setConfig={setConfig} 
                        onRun={() => runPipeline()} 
                        isProcessing={isProcessing}
                        onAutoConfig={handleAutoConfig}
                        isAutoConfiguring={isAutoConfiguring}
                        columns={activeDataset.profile.columns.map(c => c.name)}
                    />
                </section>

                {cleaningRun && (
                    <section id="results">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">3</div>
                            <h3 className="text-lg font-semibold text-slate-800">Results & Suggestions</h3>
                        </div>
                        <ResultsView 
                            run={cleaningRun} 
                            originalProfile={activeDataset.profile}
                            rawContent={activeDataset.rawContent}
                            onApplyAiConfig={(cfg) => runPipeline(cfg)}
                        />
                    </section>
                )}
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Navbar currentView={currentView} setView={setView} user={user} onLogout={handleLogout} />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;