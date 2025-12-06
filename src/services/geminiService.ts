// services/geminiService.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { DataProfile, CleaningConfig } from "../../types";
import { getHeuristicConfig } from "./mockDataService";

// ✅ Use Vite env, not process.env (process is undefined in browser)
const getApiKey = (): string | undefined => {
  return import.meta.env.VITE_GEMINI_API_KEY;
};

// --- Fallback Generators (Local Logic) ---

const generateFallbackReport = (
  profile: DataProfile,
  config: CleaningConfig
): string => {
  const missingCols = profile.columns.filter((c) => c.missing > 0);
  const numericCols = profile.columns.filter((c) => c.type === "numeric");

  return `
# Automated Analysis
The system analyzed **${profile.columns.length} columns**.
- **Data Completeness:** ${
    profile.missingCells > 0
      ? `Detected ${profile.missingCells} missing values across ${missingCols.length} columns.`
      : "Dataset is complete with no missing values."
  }
- **Duplication:** ${
    profile.duplicateRows > 0
      ? `Identified ${profile.duplicateRows} exact duplicate rows.`
      : "No duplicate rows detected."
  }
- **Data Types:** Found ${numericCols.length} numeric features suitable for scaling.

# Configuration Review
The current pipeline is set to:
- **Imputation:** ${config.imputationStrategy} (Applied to missing values)
- **Scaling:** ${
    config.scaling === "none"
      ? "None (Warning: Tree-based models only)"
      : config.scaling
  }
- **Encoding:** ${config.encoding} (For categorical features)

# Engineering Recommendations
*(Generated via heuristics)*
1. **Ratio Features:** Consider creating interaction features between numeric columns (e.g., ColA / ColB).
2. **Binning:** For skewed numeric distributions, try binning continuous variables into categories.
3. **Dimensionality Reduction:** If feature count is high, consider PCA or Recursive Feature Elimination.
  `.trim();
};

// ======================================================
// 1. Get Recommended Cleaning Config (JSON output)
// ======================================================

export const getRecommendedConfig = async (
  profile: DataProfile
): Promise<CleaningConfig | null> => {
  const apiKey = getApiKey();

  // Fallback immediately if no key to ensure UI responsiveness
  if (!apiKey) {
    console.warn("No Gemini API key found. Using heuristic config.");
    return getHeuristicConfig(profile);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Truncate to avoid token limits
  const profileSummary = {
    totalRows:
      profile.samples.length > 0
        ? profile.totalCells / profile.columns.length
        : 0,
    missingCells: profile.missingCells,
    duplicateRows: profile.duplicateRows,
    columns: profile.columns.slice(0, 40).map((c) => ({
      name: c.name,
      type: c.type,
      missing: c.missing,
      unique: c.unique,
    })),
  };

  const prompt = `
You are a Senior Data Scientist.
Analyze this dataset profile summary and output the optimal cleaning configuration.

Dataset Profile: ${JSON.stringify(profileSummary)}

Rules:
- If missing values are high (>5%), consider 'drop' or advanced imputation. Default to 'mean'.
- If 'max' is vastly larger than 'mean', use 'median' imputation and 'robust' scaling.
- If columns are mostly 'categorical', ensure encoding is 'onehot'.
- If duplicates exist, set removeDuplicates to true.
- Always set fixDataTypes to true.
- You may suggest columnOverrides if a specific column (like ID) should be dropped or treated differently.

Output STRICTLY valid JSON matching this interface:

interface CleaningConfig {
  imputationStrategy: 'mean' | 'median' | 'mode' | 'drop';
  handleOutliers: boolean;
  outlierMethod: 'zscore' | 'iqr';
  scaling: 'none' | 'standard' | 'minmax' | 'robust';
  encoding: 'onehot' | 'label';
  removeDuplicates: boolean; 
  fixDataTypes: boolean;
  balanceClasses: boolean;
  featureSelection: boolean;
  columnOverrides?: { colName: string; action: string }[];
  newFeatures?: { name: string; col1: string; operation: string; col2: string }[];
}
`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) throw new Error("Empty response from Gemini");

    const parsed = JSON.parse(text);

    // Sanitize response: ensure arrays exist
    return {
      ...parsed,
      columnOverrides: parsed.columnOverrides || [],
      newFeatures: parsed.newFeatures || [],
    } as CleaningConfig;
  } catch (e) {
    console.error(
      "Failed to generate AI cleaning config, falling back to heuristics",
      e
    );
    return getHeuristicConfig(profile);
  }
};

// ======================================================
// 2. Get Cleaning Suggestions (Markdown output)
// ======================================================

export const getCleaningSuggestions = async (
  profile: DataProfile,
  config: CleaningConfig
): Promise<string> => {
  const apiKey = getApiKey();

  // Return robust fallback if no key
  if (!apiKey) {
    return generateFallbackReport(profile, config);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Limit column list to prevent context overflow errors
  const limitedColumns = profile.columns
    .slice(0, 30)
    .map((c) => `${c.name} (${c.type})`)
    .join(", ");

  const prompt = `
You are a Senior ML Engineer. Analyze the following dataset profile and cleaning configuration.

Dataset Profile:
- Columns Sample: ${limitedColumns}
- Total Columns: ${profile.columns.length}
- Duplicates: ${profile.duplicateRows}
- Missing Cells: ${profile.missingCells}

Current Config:
- Imputation: ${config.imputationStrategy}
- Outliers: ${config.handleOutliers ? config.outlierMethod : "None"}
- Scaling: ${config.scaling}
- Encoding: ${config.encoding}
- Overrides: ${config.columnOverrides?.length || 0} columns
- New Features: ${config.newFeatures?.length || 0} features

Please provide a structured response using Markdown headers.

Structure your response exactly like this:
# Analysis
(Explain what the current pipeline achieves based on the data)

# Risk Assessment
(Critique the current config - e.g. data leakage, information loss, or scaling issues)

# Engineering Recommendations
(Suggest 2-3 specific feature engineering ideas based on the column names provided)
`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return text || generateFallbackReport(profile, config);
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Return the heuristic report so the UI is never blank
    return generateFallbackReport(profile, config);
  }
};
