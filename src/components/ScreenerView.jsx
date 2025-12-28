import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Filter, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  List, Grid3X3, Star, Settings, AlertCircle, ArrowUpDown, BarChart3, Eye
} from 'lucide-react';
import { Card, Button, LoadingSpinner } from './ui';
import { hasToken, getScreenerData } from '../services/stockbitService';

// Default screener templates - GURU type
const GURU_TEMPLATES = [
  { id: 96, name: 'Bandar Accumulation', type: 'TEMPLATE_TYPE_GURU' },
  { id: 95, name: 'Bandar Bearish Reversal', type: 'TEMPLATE_TYPE_GURU' },
  { id: 94, name: 'Bandar Bullish Reversal', type: 'TEMPLATE_TYPE_GURU' },
  { id: 63, name: 'High Volume Breakout', type: 'TEMPLATE_TYPE_GURU' },
  { id: 64, name: 'Lower Volume than Usual', type: 'TEMPLATE_TYPE_GURU' },
  { id: 92, name: 'Big Accumulation', type: 'TEMPLATE_TYPE_GURU' },
  { id: 79, name: '1 Week Net Foreign Flow', type: 'TEMPLATE_TYPE_GURU' },
];

// Custom screener templates
const CUSTOM_TEMPLATES = [
  { id: 4948261, name: 'FOREIGN MOLOGY', type: 'TEMPLATE_TYPE_CUSTOM' },
  { id: 4804992, name: 'Screener Bandar', type: 'TEMPLATE_TYPE_CUSTOM' },
  { id: 4961810, name: 'CACING - NAGA', type: 'TEMPLATE_TYPE_CUSTOM' },
  { id: 5006771, name: 'Cacing', type: 'TEMPLATE_TYPE_CUSTOM' },
  { id: 4768612, name: 'Mencari Saham Sehat, Stabil, dan Masih Murah', type: 'TEMPLATE_TYPE_CUSTOM' },
  { id: 4768107, name: 'Mengintip Momen Tepat untuk Take Profit', type: 'TEMPLATE_TYPE_CUSTOM' },
  { id: 5570353, name: 'Beli Pagi Jual Siang', type: 'TEMPLATE_TYPE_CUSTOM' },
];


// Format number based on its value
const formatNumber = (num) => {
  if (num === null || num === undefined || num === '') return '-';
  const n = parseFloat(num);
  if (isNaN(n)) return num;
  
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + ' T';
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + ' B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + ' M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + ' K';
  if (Number.isInteger(n)) return n.toLocaleString('id-ID');
  return n.toFixed(2);
};

// Determine if a column contains percentage values
const isPercentageColumn = (itemName) => {
  const percentKeywords = ['%', 'Return', 'Margin', 'Yield', 'Growth', 'ROE', 'ROA', 'ROIC', 'Ratio'];
  return percentKeywords.some(kw => itemName.toLowerCase().includes(kw.toLowerCase()));
};

// Format cell value - use display value if available, otherwise format raw
const formatCellValue = (result) => {
  if (!result) return '-';
  if (result.display && result.display !== '-') return result.display;
  if (result.raw) return formatNumber(result.raw);
  return '-';
};

// Determine cell color based on value
const getCellColor = (result) => {
  if (!result || !result.raw) return 'text-gray-400';
  const value = parseFloat(result.raw);
  if (isNaN(value)) return 'text-gray-400';
  
  // For percentage-like columns or columns that can be positive/negative
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-gray-400';
};

// ====== COMPONENTS ======
const StockRow = ({ calc, columns, onViewStock }) => {
  const { company, results } = calc;
  
  // Create a map for quick lookup of results by item name
  const resultMap = useMemo(() => {
    const map = {};
    results.forEach(r => { map[r.item] = r; });
    return map;
  }, [results]);

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-900/50 transition-colors">
      {/* Fixed Company Column */}
      <td className="sticky left-0 bg-black z-10 py-3 px-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <img 
            src={company.icon_url} 
            alt={company.symbol}
            className="w-8 h-8 rounded-lg bg-gray-800 flex-shrink-0"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/32?text=' + company.symbol.charAt(0); }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-white text-sm">{company.symbol}</span>
              {company.badges?.is_new && (
                <span className="px-1 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">NEW</span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate max-w-[120px]" title={company.name}>{company.name}</p>
          </div>
        </div>
      </td>
      
      {/* Dynamic Metric Columns */}
      {columns.map((col) => {
        const result = resultMap[col];
        const color = result?.raw && parseFloat(result.raw) !== 0 
          ? (parseFloat(result.raw) > 0 ? 'text-green-400' : parseFloat(result.raw) < 0 ? 'text-red-400' : 'text-white')
          : 'text-white';
        
        return (
          <td key={col} className={`py-3 px-3 text-right text-sm whitespace-nowrap ${color}`}>
            {formatCellValue(result)}
          </td>
        );
      })}
      
      {/* Action Column */}
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <button 
          onClick={() => onViewStock(company.symbol)}
          className="p-1.5 rounded-lg bg-gray-800 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400 transition-colors"
          title="View Details"
        >
          <Eye size={14} />
        </button>
      </td>
    </tr>
  );
};

const ColumnHeader = ({ column, sortConfig, onSort }) => {
  const isActive = sortConfig.key === column;
  
  return (
    <th 
      className="py-3 px-3 text-right text-xs font-semibold text-gray-400 cursor-pointer hover:text-white transition-colors whitespace-nowrap"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center justify-end gap-1">
        <span className="truncate max-w-[100px]" title={column}>{column}</span>
        {isActive ? (
          sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ArrowUpDown size={10} className="text-gray-600" />
        )}
      </div>
    </th>
  );
};

// ====== MAIN COMPONENT ======
const ScreenerView = () => {
  const [allTemplates, setAllTemplates] = useState([...GURU_TEMPLATES, ...CUSTOM_TEMPLATES]);
  const [selectedTemplate, setSelectedTemplate] = useState(GURU_TEMPLATES[0]);
  const [screenerData, setScreenerData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [customTemplateId, setCustomTemplateId] = useState('');

  // Extract dynamic columns from data
  const columns = useMemo(() => {
    if (!screenerData?.data?.calcs?.length) return [];
    
    // Get unique column names from all results
    const columnSet = new Set();
    screenerData.data.calcs.forEach(calc => {
      calc.results.forEach(r => columnSet.add(r.item));
    });
    
    // Return as array, maintaining order from first item
    const firstCalc = screenerData.data.calcs[0];
    return firstCalc.results.map(r => r.item);
  }, [screenerData]);

  // Get screen name from API response
  const screenName = useMemo(() => {
    return screenerData?.data?.screen_name || selectedTemplate.name;
  }, [screenerData, selectedTemplate]);

  // Filtered and sorted data
  const processedData = useMemo(() => {
    if (!screenerData?.data?.calcs) return [];
    
    let data = [...screenerData.data.calcs];
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(calc => 
        calc.company.symbol.toLowerCase().includes(query) ||
        calc.company.name.toLowerCase().includes(query)
      );
    }
    
    // Sort
    if (sortConfig.key) {
      data.sort((a, b) => {
        const aResult = a.results.find(r => r.item === sortConfig.key);
        const bResult = b.results.find(r => r.item === sortConfig.key);
        
        const aVal = aResult ? parseFloat(aResult.raw) || 0 : 0;
        const bVal = bResult ? parseFloat(bResult.raw) || 0 : 0;
        
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    
    return data;
  }, [screenerData, searchQuery, sortConfig]);

  const fetchScreenerData = useCallback(async () => {
    if (!hasToken()) {
      setError('Token tidak ditemukan. Set token di Settings.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getScreenerData(selectedTemplate.id, selectedTemplate.type);
      setScreenerData(data);
      
      // Update template name from API response if available
      if (data?.data?.screen_name) {
        setAllTemplates(prev => prev.map(t => 
          t.id === selectedTemplate.id 
            ? { ...t, name: data.data.screen_name }
            : t
        ));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    fetchScreenerData();
  }, [selectedTemplate]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleViewStock = (symbol) => {
    // Navigate to Fund Analysis or Stock Detail
    window.location.hash = `#/fund-analysis?symbol=${symbol}`;
  };

  const handleAddCustomTemplate = () => {
    if (customTemplateId && !allTemplates.find(t => t.id === parseInt(customTemplateId))) {
      const newTemplate = {
        id: parseInt(customTemplateId),
        name: `Custom #${customTemplateId}`,
        type: 'TEMPLATE_TYPE_CUSTOM'
      };
      setAllTemplates(prev => [...prev, newTemplate]);
      setSelectedTemplate(newTemplate);
      setCustomTemplateId('');
    }
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-7 h-7 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Stock Screener</h1>
            <p className="text-gray-500 text-xs">
              {screenerData ? screenName : 'Filter dan temukan saham sesuai kriteria'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {processedData.length} stocks
          </span>
          <Button 
            onClick={fetchScreenerData} 
            variant="outline" 
            size="sm"
            loading={isLoading}
            icon={<RefreshCw size={14} />}
          />
        </div>
      </div>

      {/* Template Selection */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Template Buttons */}
          <div className="flex flex-wrap gap-2">
            {allTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedTemplate.id === template.id
                    ? 'bg-purple-500 text-white'
                    : template.type === 'TEMPLATE_TYPE_CUSTOM'
                      ? 'bg-gray-800 text-blue-400 hover:bg-blue-500/20'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {template.type === 'TEMPLATE_TYPE_CUSTOM' && <Star size={12} className="inline mr-1" />}
                {template.name}
              </button>
            ))}
          </div>

          {/* Add Custom Template */}
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="text"
              value={customTemplateId}
              onChange={(e) => setCustomTemplateId(e.target.value.replace(/\D/g, ''))}
              placeholder="Custom ID..."
              className="w-28 px-2 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
            />
            <Button onClick={handleAddCustomTemplate} variant="outline" size="sm" icon={<Star size={14} />}>
              Add
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari symbol atau nama perusahaan..."
            className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
          />
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && <LoadingSpinner message={`Loading ${screenName}...`} />}

      {/* Data Table */}
      {!isLoading && processedData.length > 0 && (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900/80 border-b border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Company</th>
                  {columns.map(col => (
                    <th 
                      key={col} 
                      className="px-3 py-3 text-right text-xs font-semibold text-gray-400 cursor-pointer hover:text-white whitespace-nowrap"
                      onClick={() => handleSort(col)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col}
                        {sortConfig.key === col && (
                          sortConfig.direction === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400">
                    <Settings size={12} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {processedData.map((calc, idx) => (
                  <tr key={calc.company.id || idx} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img 
                          src={calc.company.icon_url} 
                          alt={calc.company.symbol}
                          className="w-8 h-8 rounded-lg bg-gray-800"
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/32?text=' + calc.company.symbol.charAt(0); }}
                        />
                        <div>
                          <span className="font-bold text-white text-sm">{calc.company.symbol}</span>
                          <p className="text-xs text-gray-500 truncate max-w-[120px]">{calc.company.name}</p>
                        </div>
                      </div>
                    </td>
                    {columns.map(col => {
                      const result = calc.results.find(r => r.item === col);
                      const val = result?.raw ? parseFloat(result.raw) : 0;
                      const color = val > 0 ? 'text-green-400' : val < 0 ? 'text-red-400' : 'text-white';
                      return (
                        <td key={col} className={`px-3 py-3 text-right whitespace-nowrap ${color}`}>
                          {result?.display || '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right">
                      <button 
                        onClick={() => handleViewStock(calc.company.symbol)}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer */}
          <div className="p-3 border-t border-gray-800 bg-gray-900/50">
            <p className="text-xs text-gray-500">
              Template: <span className="text-purple-400">{screenName}</span> • 
              Columns: <span className="text-white">{columns.length}</span> • 
              Stocks: <span className="text-white">{processedData.length}</span>
              {sortConfig.key && (
                <> • Sorted by: <span className="text-green-400">{sortConfig.key}</span> ({sortConfig.direction})</>
              )}
            </p>
          </div>
        </Card>
      )}

      {/* No Data */}
      {!isLoading && !error && processedData.length === 0 && screenerData && (
        <Card className="p-8 text-center">
          <Filter className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="font-bold text-white mb-1">No Stocks Found</h3>
          <p className="text-gray-400 text-sm">Tidak ada saham yang cocok dengan filter</p>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && !screenerData && (
        <Card className="p-8 text-center">
          <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Stock Screener</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Pilih template screener untuk memfilter saham berdasarkan berbagai kriteria
          </p>
        </Card>
      )}

      {/* Info Card */}
      <Card className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
        <h4 className="font-bold text-white mb-2 flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          Guru Screener Templates
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-gray-400">
          <div><span className="text-green-400">Warren Buffett:</span> Value investing, moat companies</div>
          <div><span className="text-green-400">Peter Lynch:</span> Growth at reasonable price</div>
          <div><span className="text-green-400">Benjamin Graham:</span> Deep value, margin of safety</div>
          <div><span className="text-green-400">Joel Greenblatt:</span> Magic formula investing</div>
          <div><span className="text-blue-400">Top Gainers:</span> Stocks with highest gains</div>
          <div><span className="text-red-400">Top Losers:</span> Stocks with biggest drops</div>
        </div>
      </Card>
    </div>
  );
};

export default ScreenerView;
