import { Dataset, DataProfile, ColumnStats, CleaningConfig, CleaningRun, CleaningStats, ColumnOverride, NewFeature } from '../../types';
import * as XLSX from 'xlsx';

// Helper to simulate parsing a CSV
export const parseCSV = (content: string, delimiter = ','): Record<string, any>[] => {
  if (!content) return []; // Safety check
  const lines = content.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  // Handle simple CSV parsing logic (doesn't handle quoted newlines perfectly, sufficient for demo)
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    // Basic split handling quotes somewhat
    const values: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === delimiter && !inQuote) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);

    const row: Record<string, any> = {};
    headers.forEach((header, index) => {
      let val = values[index]?.trim().replace(/^"|"$/g, '');
      // Basic type inference for demo
      if (val && !isNaN(Number(val)) && val.length > 0) {
        row[header] = Number(val);
      } else if (val && (val.toLowerCase() === 'true' || val.toLowerCase() === 'false')) {
        row[header] = val.toLowerCase() === 'true';
      } else {
        row[header] = val === undefined || val === '' ? null : val;
      }
    });
    return row;
  });
};

// Main entry point for file processing
export const processFile = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
        return await readFileAsText(file);
    } 
    else if (extension === 'tsv') {
        const text = await readFileAsText(file);
        // Basic conversion of TSV to CSV for internal consistency
        const rows = parseCSV(text, '\t');
        return convertRowsToCSV(rows);
    }
    else if (extension === 'json') {
        const text = await readFileAsText(file);
        try {
            const jsonData = JSON.parse(text);
            const rows = Array.isArray(jsonData) ? jsonData : [jsonData];
            return convertRowsToCSV(rows);
        } catch (e) {
            throw new Error("Invalid JSON format");
        }
    }
    else if (extension === 'xlsx' || extension === 'xls') {
        return await parseExcelFile(file);
    }
    else if (['parquet', 'feather', 'h5', 'hdf5'].includes(extension || '')) {
        // Binary formats require backend processing (Pandas/PyArrow).
        // For this frontend demo, we will simulate the ingestion of a complex dataset.
        console.warn("Binary format detected. Simulating backend ingestion for demo.");
        return MOCK_BIG_DATA_CSV; 
    }

    throw new Error(`Unsupported file format: .${extension}`);
};

const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
};

const parseExcelFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                resolve(csv);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

const convertRowsToCSV = (rows: Record<string, any>[]): string => {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const csvRows = rows.map(row => 
        headers.map(fieldName => {
            const val = row[fieldName];
            const str = val === null || val === undefined ? '' : String(val);
            return JSON.stringify(str); // Handles escaping quotes
        }).join(',')
    );
    return [headers.join(','), ...csvRows].join('\n');
};

const MOCK_BIG_DATA_CSV = `TransactionID,UserID,Amount,Currency,Timestamp,Merchant,IsFraud,DeviceType
TXN-1001,User-502,150.50,USD,2023-10-01 08:30:00,Amazon,0,Mobile
TXN-1002,User-104,2500.00,EUR,2023-10-01 09:15:00,Apple Store,0,Desktop
TXN-1003,User-502,10.99,USD,2023-10-01 09:45:00,Spotify,0,Mobile
TXN-1004,User-999,9999.99,USD,2023-10-01 10:00:00,Unknown,1,BotNet
TXN-1005,User-205,45.00,GBP,2023-10-01 10:30:00,Tesco,0,Tablet
TXN-1006,User-104,120.00,EUR,,Apple Store,0,Desktop
TXN-1007,User-303,5.00,USD,2023-10-01 11:00:00,Starbucks,0,Mobile
TXN-1008,User-502,150.50,USD,2023-10-01 08:30:00,Amazon,0,Mobile`;

// --- Math Helpers ---
const calcMean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const calcStd = (arr: number[], mean: number) => arr.length ? Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length) : 0;
const calcPercentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
};

const calculateHistogram = (values: number[], bins = 10): { bin: string; count: number }[] => {
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return [{ bin: String(min), count: values.length }];

    const width = (max - min) / bins;
    const histogram = Array(bins).fill(0);
    
    values.forEach(v => {
        let binIndex = Math.floor((v - min) / width);
        if (binIndex >= bins) binIndex = bins - 1;
        histogram[binIndex]++;
    });

    return histogram.map((count, i) => {
        const start = (min + i * width).toFixed(1);
        const end = (min + (i + 1) * width).toFixed(1);
        return { bin: `${start}-${end}`, count };
    });
};

const calculateCorrelation = (x: number[], y: number[]): number => {
    if (x.length !== y.length || x.length === 0) return 0;
    const n = x.length;
    const meanX = calcMean(x);
    const meanY = calcMean(y);
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }

    if (denomX === 0 || denomY === 0) return 0;
    return numerator / Math.sqrt(denomX * denomY);
};

export const generateProfile = (data: Record<string, any>[]): DataProfile => {
  if (!data || data.length === 0) {
    return { columns: [], missingCells: 0, duplicateRows: 0, totalCells: 0, samples: [] };
  }

  const columns = Object.keys(data[0]);
  
  // 1. Column Statistics & Histograms
  const colStats: ColumnStats[] = columns.map(col => {
    const values = data.map(d => d[col]);
    const definedValues = values.filter(v => v !== undefined && v !== null && v !== '');
    const missing = values.length - definedValues.length;
    
    // Type detection
    const isNumeric = definedValues.length > 0 && definedValues.every(v => typeof v === 'number');
    const isDate = !isNumeric && definedValues.length > 0 && definedValues.every(v => !isNaN(Date.parse(String(v))));
    
    let type: ColumnStats['type'] = 'text';
    if (isNumeric) type = 'numeric';
    else if (isDate) type = 'datetime';
    else if (definedValues.length > 0 && new Set(definedValues).size < values.length * 0.5) type = 'categorical';

    const unique = new Set(definedValues).size;
    
    let stats: Partial<ColumnStats> = {};
    if (type === 'numeric' && definedValues.length > 0) {
      const nums = definedValues as number[];
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / nums.length;
      stats.mean = mean;
      stats.min = Math.min(...nums);
      stats.max = Math.max(...nums);
      stats.std = calcStd(nums, mean);
      stats.histogram = calculateHistogram(nums);
    }

    // Top values for categorical
    let topValues = undefined;
    if (type === 'categorical' || type === 'text') {
        const counts: Record<string, number> = {};
        definedValues.forEach(v => {
            const s = String(v);
            counts[s] = (counts[s] || 0) + 1;
        });
        topValues = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([value, count]) => ({ value, count }));
    }

    return {
      name: col,
      type,
      missing,
      unique,
      ...stats,
      topValues
    };
  });

  // 2. Correlation Matrix
  const numericCols = colStats.filter(c => c.type === 'numeric').map(c => c.name);
  let correlations: Record<string, Record<string, number>> | undefined = undefined;

  if (numericCols.length > 1 && data.length > 0) {
      correlations = {};
      numericCols.forEach(xCol => {
          if (!correlations) correlations = {}; // Type guard logic
          correlations[xCol] = {};
          numericCols.forEach(yCol => {
              // Extract numeric pairs, filtering out rows where either is missing
              const xVals: number[] = [];
              const yVals: number[] = [];
              data.forEach(row => {
                  if (typeof row[xCol] === 'number' && typeof row[yCol] === 'number') {
                      xVals.push(row[xCol]);
                      yVals.push(row[yCol]);
                  }
              });
              
              if (correlations) {
                correlations[xCol][yCol] = calculateCorrelation(xVals, yVals);
              }
          });
      });
  }

  // Mock duplicate detection (simple stringify)
  const rowStrings = data.map(d => JSON.stringify(d));
  const duplicateRows = rowStrings.length - new Set(rowStrings).size;

  return {
    columns: colStats,
    missingCells: colStats.reduce((acc, c) => acc + c.missing, 0),
    duplicateRows,
    totalCells: data.length * columns.length,
    samples: data.slice(0, 5),
    correlations
  };
};

export const generatePythonSnippet = (config: CleaningConfig, datasetName: string): string => {
  const overrides = (config.columnOverrides || []).map(ov => {
      if (ov.action === 'drop_rows') return `df.dropna(subset=['${ov.colName}'], inplace=True)`;
      if (ov.action === 'drop_col') return `df.drop(columns=['${ov.colName}'], inplace=True)`;
      if (ov.action === 'impute_mean') return `df['${ov.colName}'].fillna(df['${ov.colName}'].mean(), inplace=True)`;
      if (ov.action === 'impute_median') return `df['${ov.colName}'].fillna(df['${ov.colName}'].median(), inplace=True)`;
      if (ov.action === 'impute_mode') return `df['${ov.colName}'].fillna(df['${ov.colName}'].mode()[0], inplace=True)`;
      return '';
  }).join('\n');

  const features = (config.newFeatures || []).map(nf => {
      const opMap = { 'add': '+', 'sub': '-', 'mul': '*', 'div': '/' };
      return `df['${nf.name}'] = df['${nf.col1}'] ${opMap[nf.operation]} df['${nf.col2}']`;
  }).join('\n');

  return `
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import ${config.scaling === 'standard' ? 'StandardScaler' : config.scaling === 'minmax' ? 'MinMaxScaler' : 'RobustScaler'}, ${config.encoding === 'onehot' ? 'OneHotEncoder' : 'OrdinalEncoder'}

# Load Data
df = pd.read_csv('${datasetName}') 

# 1. Data Quality Checks & Cleaning
print(f"Initial Shape: {df.shape}")

# 2. Handling Duplicates
${config.removeDuplicates ? 'df.drop_duplicates(inplace=True)' : '# Duplicate removal skipped'}

# 3. Column-Specific Overrides
${overrides || '# No column overrides'}

# 4. Feature Engineering (Manual)
${features || '# No new features defined'}

# 5. Global Pipeline Definition
numeric_features = df.select_dtypes(include=['int64', 'float64']).columns
categorical_features = df.select_dtypes(include=['object', 'category']).columns

numeric_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='${config.imputationStrategy}')),
    ('scaler', ${config.scaling === 'standard' ? 'StandardScaler()' : config.scaling === 'minmax' ? 'MinMaxScaler()' : 'RobustScaler()'})
])

categorical_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('encoder', ${config.encoding === 'onehot' ? "OneHotEncoder(handle_unknown='ignore')" : "OrdinalEncoder()"})
])

preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, numeric_features),
        ('cat', categorical_transformer, categorical_features)
    ])

# 6. Fit and Transform
# Note: Feature engineered columns will be included automatically by select_dtypes
X_processed = preprocessor.fit_transform(df)
print("Processing Complete.")
print(f"Final Shape: {X_processed.shape}")
  `.trim();
};

export const getHeuristicConfig = (profile: DataProfile): CleaningConfig => {
    // A rule-based system to approximate a "Best Practice" config
    const hasMissing = profile.missingCells > 0;
    const hasDuplicates = profile.duplicateRows > 0;
    
    return {
        imputationStrategy: hasMissing ? 'mean' : 'mean', 
        handleOutliers: true,
        outlierMethod: 'iqr', 
        scaling: 'standard',
        encoding: 'onehot',
        removeDuplicates: hasDuplicates, 
        fixDataTypes: true,
        balanceClasses: false,
        featureSelection: true,
        columnOverrides: [],
        newFeatures: []
    };
}

export const calculateQualityScore = (stats: CleaningStats, config: CleaningConfig | null): number => {
    const completenessScore = stats.completionRate * 0.3;
    const retentionScore = stats.dataRetention * 0.2;
    const uniquenessScore = stats.duplicateRows === 0 ? 20 : 0;
    let configScore = 0;
    if (config) {
        if (config.scaling !== 'none') configScore += 10;
        if (config.handleOutliers) configScore += 10;
        if (config.fixDataTypes) configScore += 5;
        if (config.featureSelection) configScore += 5;
        // Bonus for granular control
        if (config.columnOverrides?.length > 0) configScore += 2;
        if (config.newFeatures?.length > 0) configScore += 3;
    }

    return Math.round(completenessScore + retentionScore + uniquenessScore + configScore);
}

export const simulateCleaning = (profile: DataProfile, config: CleaningConfig | null): CleaningStats => {
    const originalRows = profile.columns.length > 0 ? (profile.totalCells / profile.columns.length) : 0;
    const originalMissing = profile.missingCells;
    const originalDuplicates = profile.duplicateRows;

    if (!config) {
        const rawStats = {
            rowsRetained: Math.floor(originalRows),
            missingCells: originalMissing,
            duplicateRows: originalDuplicates,
            dataRetention: 100,
            completionRate: Math.max(0, 100 - (originalMissing / profile.totalCells * 100)),
            qualityScore: 0
        };
        rawStats.qualityScore = calculateQualityScore(rawStats, null);
        return rawStats;
    }

    let rows = originalRows;
    let missing = originalMissing;
    let duplicates = originalDuplicates;

    if (config.removeDuplicates) {
        rows -= duplicates;
        duplicates = 0;
    }

    if (config.imputationStrategy === 'drop') {
        const rowsWithMissing = Math.min(rows, missing);
        rows -= rowsWithMissing;
        missing = 0;
    } else {
        missing = 0;
    }

    const retention = originalRows > 0 ? (rows / originalRows) * 100 : 0;
    const completion = 100;

    const stats = {
        rowsRetained: Math.floor(rows),
        missingCells: missing,
        duplicateRows: duplicates,
        dataRetention: Math.min(100, Math.max(0, retention)),
        completionRate: Math.min(100, Math.max(0, completion)),
        qualityScore: 0
    };

    stats.qualityScore = calculateQualityScore(stats, config);
    return stats;
};

export const cleanDataAndExport = (rawContent: string, config: CleaningConfig): string => {
    // 1. Ingest Data
    let rows = parseCSV(rawContent);
    if (rows.length === 0) return '';
    let headers = Object.keys(rows[0] || {});

    // --- PRE-CALCULATIONS ---
    const numericCols = headers.filter(h => rows.some(r => typeof r[h] === 'number'));
    const stats: Record<string, { mean: number, std: number, min: number, max: number, q1: number, q3: number, iqr: number, mode: any }> = {};

    headers.forEach(header => {
        const values = rows.map(r => r[header]).filter(v => v !== null && v !== undefined && v !== '');
        const numericValues = values.filter(v => typeof v === 'number') as number[];
        
        let mean = 0, std = 0, min = 0, max = 0, q1 = 0, q3 = 0, iqr = 0;
        
        if (numericValues.length > 0) {
            mean = calcMean(numericValues);
            std = calcStd(numericValues, mean);
            min = Math.min(...numericValues);
            max = Math.max(...numericValues);
            q1 = calcPercentile(numericValues, 0.25);
            q3 = calcPercentile(numericValues, 0.75);
            iqr = q3 - q1;
        }

        const counts: Record<string, number> = {};
        values.forEach(v => { counts[String(v)] = (counts[String(v)] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const mode = sorted.length > 0 ? sorted[0][0] : null;

        stats[header] = { mean, std, min, max, q1, q3, iqr, mode };
    });

    // 2. Remove Duplicates
    if (config.removeDuplicates) {
        const seen = new Set();
        rows = rows.filter(row => {
            const s = JSON.stringify(row);
            if (seen.has(s)) return false;
            seen.add(s);
            return true;
        });
    }

    // Identify columns to drop entirely first
    // SAFEGUARD: Ensure array exists before mapping
    const overrides = config.columnOverrides || [];
    const colsToDrop = overrides.filter(o => o.action === 'drop_col').map(o => o.colName);
    headers = headers.filter(h => !colsToDrop.includes(h));

    // 3. Impute Missing Values & Filter Rows (Outliers/Overrides)
    const cleanedRows: Record<string, any>[] = [];

    for (let i = 0; i < rows.length; i++) {
        const row = { ...rows[i] };
        
        // Remove dropped cols
        colsToDrop.forEach(c => delete row[c]);
        
        let dropRow = false;

        // Imputation Logic (Overrides first, then Global)
        headers.forEach(header => {
            let val = row[header];
            const isMissing = val === null || val === undefined || val === '';
            
            // Check override
            const override = overrides.find(o => o.colName === header);
            
            if (isMissing) {
                if (override) {
                    if (override.action === 'drop_rows') dropRow = true;
                    else if (override.action === 'impute_mean') row[header] = stats[header].mean;
                    else if (override.action === 'impute_median') row[header] = stats[header].q1; // approx
                    else if (override.action === 'impute_mode') row[header] = stats[header].mode;
                } else {
                    // Global strategy
                    if (config.imputationStrategy === 'drop') {
                        dropRow = true;
                    } else if (config.imputationStrategy === 'mean' || config.imputationStrategy === 'median') {
                        if (stats[header].mean !== undefined && !isNaN(stats[header].mean)) {
                            row[header] = Number(stats[header].mean.toFixed(2));
                        } else {
                             row[header] = stats[header].mode;
                        }
                    } else if (config.imputationStrategy === 'mode') {
                         row[header] = stats[header].mode;
                    }
                }
            }
        });

        // Outlier Logic (IQR)
        if (config.handleOutliers && !dropRow) {
            for (const col of numericCols) {
                if (headers.includes(col)) { // Check if still exists
                    const val = row[col];
                    if (typeof val === 'number') {
                        const { q1, q3, iqr } = stats[col];
                        if (val < (q1 - 1.5 * iqr) || val > (q3 + 1.5 * iqr)) {
                            dropRow = true;
                            break;
                        }
                    }
                }
            }
        }

        if (!dropRow) {
            cleanedRows.push(row);
        }
    }

    // 4. Feature Engineering (New Features)
    let finalRows = cleanedRows;
    let finalHeaders = [...headers];
    const newFeatures = config.newFeatures || []; // SAFEGUARD

    if (newFeatures.length > 0) {
        finalRows = finalRows.map(row => {
            const newRow = { ...row };
            newFeatures.forEach(feat => {
                const val1 = Number(row[feat.col1]);
                const val2 = Number(row[feat.col2]);
                let res = 0;
                
                if (!isNaN(val1) && !isNaN(val2)) {
                    if (feat.operation === 'add') res = val1 + val2;
                    if (feat.operation === 'sub') res = val1 - val2;
                    if (feat.operation === 'mul') res = val1 * val2;
                    if (feat.operation === 'div') res = val2 !== 0 ? val1 / val2 : 0;
                }
                newRow[feat.name] = Number(res.toFixed(2));
            });
            return newRow;
        });
        
        // Update headers
        newFeatures.forEach(feat => {
            if (!finalHeaders.includes(feat.name)) finalHeaders.push(feat.name);
        });
    }

    // 5. Categorical Encoding & Scaling
    // Identify Categorical Columns for One-Hot
    const categoricalCols = finalHeaders.filter(h => {
        const sampleVal = finalRows[0]?.[h];
        // Don't encode newly created numeric features
        if (newFeatures.some(f => f.name === h)) return false;
        return typeof sampleVal === 'string' && isNaN(Number(sampleVal));
    });

    // One-Hot Encoding
    if (config.encoding === 'onehot') {
        const encodedRows: Record<string, any>[] = [];
        const newColSet = new Set<string>();
        const categoryMaps: Record<string, Set<string>> = {};
        
        categoricalCols.forEach(col => {
             categoryMaps[col] = new Set();
             finalRows.forEach(r => {
                 if (r[col]) categoryMaps[col].add(String(r[col]));
             });
        });

        finalRows.forEach(row => {
            const newRow: Record<string, any> = {};
            finalHeaders.forEach(header => {
                if (categoricalCols.includes(header)) {
                    const val = String(row[header]);
                    categoryMaps[header].forEach(cat => {
                         const newHeader = `${header}_${cat}`;
                         newColSet.add(newHeader);
                         newRow[newHeader] = val === cat ? 1 : 0;
                    });
                } else {
                    newRow[header] = row[header];
                }
            });
            encodedRows.push(newRow);
        });

        finalRows = encodedRows;
        finalHeaders = finalHeaders.filter(h => !categoricalCols.includes(h));
        finalHeaders.push(...Array.from(newColSet).sort());
    }

    // Scaling
    if (config.scaling !== 'none') {
        // Recalculate stats on the cleaned data for accurate scaling
        const currentStats: Record<string, { mean: number, std: number, min: number, max: number }> = {};
        
        finalHeaders.forEach(h => {
             // Check if column is numeric in the final dataset
             const values = finalRows.map(r => r[h]).filter(v => typeof v === 'number') as number[];
             if (values.length > 0) {
                 const mean = calcMean(values);
                 const std = calcStd(values, mean);
                 const min = Math.min(...values);
                 const max = Math.max(...values);
                 currentStats[h] = { mean, std, min, max };
             }
        });

        finalRows = finalRows.map(row => {
            const newRow = { ...row };
            Object.keys(currentStats).forEach(h => {
                const val = newRow[h];
                if (typeof val === 'number') {
                    const { mean, std, min, max } = currentStats[h];
                    let scaledVal = val;
                    if (config.scaling === 'standard') {
                        scaledVal = std !== 0 ? (val - mean) / std : 0;
                    } else if (config.scaling === 'minmax') {
                        scaledVal = max !== min ? (val - min) / (max - min) : 0;
                    } else if (config.scaling === 'robust') {
                        // Simplified robust (using std for demo)
                        scaledVal = std !== 0 ? (val - mean) / std : 0; 
                    }
                    newRow[h] = Number(scaledVal.toFixed(4));
                }
            });
            return newRow;
        });
    }

    // 6. Serialize to CSV
    if (finalRows.length === 0) return '';
    
    const csvHeader = finalHeaders.join(',');
    const csvRows = finalRows.map(row => {
        return finalHeaders.map(header => {
            let val = row[header];
            if (val === null || val === undefined) return '';
            // Numbers are already formatted in scaling step or earlier
            const strVal = String(val);
            return strVal.includes(',') ? `"${strVal}"` : strVal;
        }).join(',');
    });

    return [csvHeader, ...csvRows].join('\n');
};