export interface Dataset {
  id: string;
  name: string;
  uploadDate: string;
  rowCount: number;
  colCount: number;
  status: 'raw' | 'profiled' | 'cleaned';
  profile?: DataProfile;
  rawContent?: string; // Storing small CSVs in memory for demo
}

export interface DataProfile {
  columns: ColumnStats[];
  missingCells: number;
  duplicateRows: number;
  totalCells: number;
  samples: Record<string, any>[];
  correlations?: Record<string, Record<string, number>>; // Pearson correlation matrix
}

export interface ColumnStats {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'text';
  missing: number;
  unique: number;
  mean?: number;
  min?: number;
  max?: number;
  std?: number;
  topValues?: { value: string; count: number }[];
  histogram?: { bin: string; count: number }[]; // For numeric distributions
}

export interface ColumnOverride {
    colName: string;
    action: 'impute_mean' | 'impute_median' | 'impute_mode' | 'drop_rows' | 'drop_col';
}

export interface NewFeature {
    name: string;
    col1: string;
    operation: 'add' | 'sub' | 'mul' | 'div';
    col2: string;
}

export interface CleaningConfig {
  imputationStrategy: 'mean' | 'median' | 'mode' | 'drop';
  handleOutliers: boolean;
  outlierMethod: 'zscore' | 'iqr';
  scaling: 'none' | 'standard' | 'minmax' | 'robust';
  encoding: 'onehot' | 'label';
  removeDuplicates: boolean;
  fixDataTypes: boolean;
  balanceClasses: boolean;
  featureSelection: boolean;
  columnOverrides: ColumnOverride[];
  newFeatures: NewFeature[];
}

export interface CleaningRun {
  id: string;
  datasetId: string;
  timestamp: string;
  config: CleaningConfig;
  status: 'completed' | 'failed';
  summary: string;
  pythonSnippet: string;
  aiSuggestions?: string;
}

export interface CleaningStats {
    rowsRetained: number;
    missingCells: number;
    duplicateRows: number;
    dataRetention: number; // percentage 0-100
    completionRate: number; // percentage of non-missing cells 0-100
    qualityScore: number; // calculated heuristic 0-100
}

export interface User {
  id: string;
  name: string;
  email: string;
}