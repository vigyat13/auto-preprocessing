import React, { useState } from 'react';

interface CorrelationHeatmapProps {
  data: Record<string, Record<string, number>>;
}

const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ data }) => {
  const keys = Object.keys(data);
  const [hoveredCell, setHoveredCell] = useState<{ x: string; y: string; val: number } | null>(null);

  if (keys.length === 0) {
    return (
        <div className="flex items-center justify-center h-64 text-slate-400 italic bg-slate-50 rounded-lg">
            Not enough numeric columns to generate correlations.
        </div>
    );
  }

  // Color interpolation helper
  const getColor = (value: number) => {
    // Value is -1 to 1
    // -1 (Red) -> 0 (White) -> 1 (Blue)
    if (value > 0) {
        // White to Blue
        const intensity = Math.round(value * 255);
        return `rgba(59, 130, 246, ${value})`; // Tailwind Blue-500 equivalent with opacity
    } else {
        // White to Red
        const intensity = Math.round(Math.abs(value) * 255);
        return `rgba(239, 68, 68, ${Math.abs(value)})`; // Tailwind Red-500
    }
  };

  return (
    <div className="relative overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="relative">
            <table className="min-w-full divide-y divide-slate-200 border-collapse">
            <thead>
                <tr>
                <th className="p-2 border border-slate-100 bg-slate-50 sticky left-0 z-10"></th>
                {keys.map(key => (
                    <th key={key} className="p-2 text-xs font-medium text-slate-500 uppercase tracking-wider border border-slate-100 bg-slate-50 rotate-0 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]" title={key}>
                        {key}
                    </th>
                ))}
                </tr>
            </thead>
            <tbody className="bg-white">
                {keys.map(rowKey => (
                <tr key={rowKey}>
                    <td className="p-2 text-xs font-medium text-slate-700 border border-slate-100 bg-slate-50 sticky left-0 z-10 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]" title={rowKey}>
                        {rowKey}
                    </td>
                    {keys.map(colKey => {
                    const val = data[rowKey][colKey];
                    return (
                        <td 
                            key={`${rowKey}-${colKey}`}
                            className="p-1 border border-slate-100 text-center relative hover:z-20 cursor-default transition-all duration-200 hover:scale-110"
                            style={{ backgroundColor: getColor(val) }}
                            onMouseEnter={() => setHoveredCell({ x: colKey, y: rowKey, val })}
                            onMouseLeave={() => setHoveredCell(null)}
                        >
                            <span className={`text-[10px] font-medium ${Math.abs(val) > 0.6 ? 'text-white' : 'text-slate-800'}`}>
                                {val.toFixed(2)}
                            </span>
                        </td>
                    );
                    })}
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-slate-500">
        <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 mr-2 rounded"></div> Negative Correlation (-1)
        </div>
        <div className="flex items-center">
            <div className="w-4 h-4 bg-white border border-slate-200 mr-2 rounded"></div> No Correlation (0)
        </div>
        <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 mr-2 rounded"></div> Positive Correlation (+1)
        </div>
      </div>
    </div>
  );
};

export default CorrelationHeatmap;