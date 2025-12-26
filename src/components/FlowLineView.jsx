import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LineChart, Search, RefreshCw, AlertCircle, X, Plus,
  TrendingUp, TrendingDown, Loader2, BarChart3, Eye, EyeOff,
  HelpCircle, Info, Zap, ChevronDown, ChevronRight, Check, Trash2
} from 'lucide-react';
import { Card, Button, LoadingSpinner } from './ui';
import { getFundaChartMetrics, getFundaChartData, hasToken } from '../services/stockbitService';

const TIMEFRAMES = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' },
  { value: '3y', label: '3Y' },
  { value: '5y', label: '5Y' },
];

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const DEMO_METRICS = [
  { fitem_id: 19, fitem_name: 'Valuation', child: [
    { fitem_id: 2661, fitem_name: 'Price', child: [] },
    { fitem_id: 2891, fitem_name: 'Current PE Ratio (TTM)', child: [] },
    { fitem_id: 2896, fitem_name: 'Current Price to Book Value', child: [] },
  ]},
  { fitem_id: 18, fitem_name: 'Size', child: [
    { fitem_id: 21335, fitem_name: 'Number of Shareholders (# of changes 1M)', child: [] },
    { fitem_id: 21334, fitem_name: 'Number of Shareholders', child: [] },
  ]},
  { fitem_id: 47, fitem_name: 'Technical', child: [
    { fitem_id: 3194, fitem_name: 'Net Foreign Buy / Sell', child: [] },
  ]},
];

const DEMO_CHART = {
  data: [
    { company_name: 'ADRO', ratios: [
      { item_id: 2661, item_name: 'Price', chart_data: Array.from({length: 30}, (_, i) => ({ formated_date: `2025-${String(Math.floor(i/10)+10).padStart(2,'0')}-${String((i%10)+1).padStart(2,'0')}`, value: 1700 + Math.random() * 300 })) }
    ]},
  ]
};

const formatValue = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '-';
  if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString('id-ID');
};

// Better Canvas-based Chart
const BetterLineChart = ({ data, visibleCompanies, visibleMetrics, colors }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  // Prepare series data
  const series = useMemo(() => {
    const result = [];
    if (!data) return result;
    
    data.forEach((company, companyIdx) => {
      if (!visibleCompanies.includes(company.company_name)) return;
      company.ratios?.forEach((ratio, ratioIdx) => {
        if (!visibleMetrics.includes(ratio.item_id)) return;
        const chartData = ratio.chart_data || [];
        if (chartData.length === 0) return;
        result.push({
          name: `${company.company_name} - ${ratio.item_name}`,
          company: company.company_name,
          metric: ratio.item_name,
          data: chartData.map(d => ({ date: d.formated_date, value: d.value })),
          color: colors[(companyIdx * 3 + ratioIdx) % colors.length]
        });
      });
    });
    return result;
  }, [data, visibleCompanies, visibleMetrics, colors]);

  // Get all dates and value range
  const { dates, minVal, maxVal } = useMemo(() => {
    const allDates = new Set();
    let min = Infinity, max = -Infinity;
    series.forEach(s => {
      s.data.forEach(d => {
        allDates.add(d.date);
        if (d.value < min) min = d.value;
        if (d.value > max) max = d.value;
      });
    });
    const sorted = Array.from(allDates).sort();
    const range = max - min;
    return { dates: sorted, minVal: min - range * 0.1, maxVal: max + range * 0.1 };
  }, [series]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setDimensions({ width: Math.max(400, width), height: 350 });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || series.length === 0 || dates.length === 0) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    const padding = { top: 30, right: 20, bottom: 50, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const range = maxVal - minVal || 1;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * chartHeight;
      const value = maxVal - (i / 5) * range;
      ctx.fillText(formatValue(value), padding.left - 10, y + 4);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    const xStep = Math.ceil(dates.length / 6);
    dates.forEach((date, i) => {
      if (i % xStep === 0 || i === dates.length - 1) {
        const x = padding.left + (i / (dates.length - 1)) * chartWidth;
        ctx.fillText(date.slice(5), x, height - padding.bottom + 20);
      }
    });

    // Draw lines
    series.forEach(s => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      s.data.forEach((point, i) => {
        const dateIdx = dates.indexOf(point.date);
        if (dateIdx === -1) return;
        const x = padding.left + (dateIdx / (dates.length - 1 || 1)) * chartWidth;
        const y = padding.top + ((maxVal - point.value) / range) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw points
      ctx.fillStyle = s.color;
      s.data.forEach((point, i) => {
        const dateIdx = dates.indexOf(point.date);
        if (dateIdx === -1) return;
        const x = padding.left + (dateIdx / (dates.length - 1 || 1)) * chartWidth;
        const y = padding.top + ((maxVal - point.value) / range) * chartHeight;
        // Only draw points for first/last or every nth
        if (i === 0 || i === s.data.length - 1 || s.data.length < 20) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });

  }, [series, dates, minVal, maxVal, dimensions]);

  // Mouse move for tooltip
  const handleMouseMove = (e) => {
    if (series.length === 0 || dates.length === 0) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { width, height } = dimensions;
    const padding = { top: 30, right: 20, bottom: 50, left: 70 };
    const chartWidth = width - padding.left - padding.right;

    if (x < padding.left || x > width - padding.right) {
      setTooltip(null);
      return;
    }

    const dateIdx = Math.round(((x - padding.left) / chartWidth) * (dates.length - 1));
    const date = dates[dateIdx];
    if (!date) { setTooltip(null); return; }

    const values = series.map(s => {
      const point = s.data.find(d => d.date === date);
      return { ...s, value: point?.value };
    }).filter(v => v.value !== undefined);

    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, date, values });
  };

  if (series.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-500">Tidak ada data untuk ditampilkan</div>;
  }

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        className="w-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      
      {/* Tooltip */}
      {tooltip && (
        <div className="absolute pointer-events-none bg-black/95 border border-gray-700 rounded-lg p-3 shadow-xl z-10" style={{ left: Math.min(tooltip.x, dimensions.width - 200), top: tooltip.y + 20 }}>
          <p className="text-xs text-gray-400 mb-2 font-mono">{tooltip.date}</p>
          {tooltip.values.map((v, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} />
              <span className="text-gray-300">{v.company}</span>
              <span className="text-white font-bold ml-auto">{formatValue(v.value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 justify-center px-4">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs bg-gray-900/50 px-3 py-1.5 rounded-full">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: s.color }} />
            <span className="text-gray-300">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const FlowLineView = ({ onNavigateToSettings }) => {
  const [metricsTree, setMetricsTree] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState([{ fitem_id: 2661, fitem_name: 'Price' }]);
  const [companies, setCompanies] = useState(['ADRO']);
  const [companyInput, setCompanyInput] = useState('');
  const [timeframe, setTimeframe] = useState('3m');
  const [chartData, setChartData] = useState(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showMetricPicker, setShowMetricPicker] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [metricSearch, setMetricSearch] = useState('');
  const [visibleCompanies, setVisibleCompanies] = useState([]);
  const [visibleMetrics, setVisibleMetrics] = useState([]);
  const [useDemo, setUseDemo] = useState(false);

  // Fetch metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!hasToken()) { setMetricsTree(DEMO_METRICS); setUseDemo(true); return; }
      setIsLoadingMetrics(true);
      try {
        const res = await getFundaChartMetrics();
        if (res.data) { setMetricsTree(res.data); setUseDemo(false); }
      } catch { setMetricsTree(DEMO_METRICS); setUseDemo(true); }
      finally { setIsLoadingMetrics(false); }
    };
    fetchMetrics();
  }, []);

  // Fetch chart data
  const fetchChartData = useCallback(async () => {
    if (companies.length === 0 || selectedMetrics.length === 0) return;
    if (!hasToken()) {
      setChartData(DEMO_CHART);
      setVisibleCompanies(companies);
      setVisibleMetrics(selectedMetrics.map(m => m.fitem_id));
      setUseDemo(true);
      return;
    }
    setIsLoadingChart(true);
    setError(null);
    try {
      const res = await getFundaChartData({ items: selectedMetrics.map(m => m.fitem_id), companies, timeframe });
      if (res.data) {
        setChartData(res);
        setVisibleCompanies(companies);
        setVisibleMetrics(selectedMetrics.map(m => m.fitem_id));
        setUseDemo(false);
      }
    } catch (err) {
      if (err.message.includes('CORS')) {
        setChartData(DEMO_CHART);
        setVisibleCompanies(companies);
        setVisibleMetrics(selectedMetrics.map(m => m.fitem_id));
        setUseDemo(true);
        setError('CORS - Demo mode');
      } else setError(err.message);
    } finally { setIsLoadingChart(false); }
  }, [companies, selectedMetrics, timeframe]);

  // Auto fetch on timeframe change
  useEffect(() => {
    if (companies.length > 0 && selectedMetrics.length > 0) {
      fetchChartData();
    }
  }, [timeframe]);

  // Auto fetch when companies change
  useEffect(() => {
    if (companies.length > 0 && selectedMetrics.length > 0) {
      fetchChartData();
    }
  }, [companies.length]);

  // Auto fetch when metrics change
  useEffect(() => {
    if (companies.length > 0 && selectedMetrics.length > 0) {
      fetchChartData();
    }
  }, [selectedMetrics.length]);

  // Filter metrics by search
  const filteredMetrics = useMemo(() => {
    if (!metricSearch.trim()) return metricsTree;
    const search = metricSearch.toLowerCase();
    return metricsTree.map(group => ({
      ...group,
      child: (group.child || []).filter(item => 
        item.fitem_name.toLowerCase().includes(search) ||
        (item.child || []).some(c => c.fitem_name.toLowerCase().includes(search))
      ).map(item => ({
        ...item,
        child: (item.child || []).filter(c => c.fitem_name.toLowerCase().includes(search))
      }))
    })).filter(g => g.child.length > 0 || g.fitem_name.toLowerCase().includes(search));
  }, [metricsTree, metricSearch]);

  const addCompany = () => {
    const symbol = companyInput.trim().toUpperCase();
    if (symbol && !companies.includes(symbol)) {
      const newCompanies = [...companies, symbol];
      setCompanies(newCompanies);
      setVisibleCompanies([...visibleCompanies, symbol]);
      setCompanyInput('');
    }
  };

  const removeCompany = (symbol) => {
    setCompanies(companies.filter(c => c !== symbol));
    setVisibleCompanies(visibleCompanies.filter(c => c !== symbol));
  };

  const toggleCompanyVisibility = (symbol) => {
    setVisibleCompanies(prev => prev.includes(symbol) ? prev.filter(c => c !== symbol) : [...prev, symbol]);
  };

  const toggleMetricVisibility = (metricId) => {
    setVisibleMetrics(prev => prev.includes(metricId) ? prev.filter(m => m !== metricId) : [...prev, metricId]);
  };

  const addMetric = (metric) => {
    if (!selectedMetrics.find(m => m.fitem_id === metric.fitem_id)) {
      const newMetrics = [...selectedMetrics, { fitem_id: metric.fitem_id, fitem_name: metric.fitem_name }];
      setSelectedMetrics(newMetrics);
      setVisibleMetrics([...visibleMetrics, metric.fitem_id]);
    }
    setShowMetricPicker(false);
  };

  const removeMetric = (metricId) => {
    setSelectedMetrics(selectedMetrics.filter(m => m.fitem_id !== metricId));
    setVisibleMetrics(visibleMetrics.filter(m => m !== metricId));
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Analysis
  const analysis = useMemo(() => {
    if (!chartData?.data || chartData.data.length === 0) return null;
    const insights = [];
    const companyStats = [];

    chartData.data.forEach(company => {
      if (!visibleCompanies.includes(company.company_name)) return;
      company.ratios?.forEach(ratio => {
        if (!visibleMetrics.includes(ratio.item_id)) return;
        const data = ratio.chart_data || [];
        if (data.length < 2) return;
        const first = data[0]?.value;
        const last = data[data.length - 1]?.value;
        const change = last - first;
        const changePct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
        const values = data.map(d => d.value);
        companyStats.push({ company: company.company_name, metric: ratio.item_name, first, last, change, changePct, min: Math.min(...values), max: Math.max(...values) });

        if (ratio.item_name === 'Price') {
          if (changePct > 10) insights.push({ type: 'positive', text: `${company.company_name} naik ${changePct.toFixed(1)}% dalam periode ini` });
          else if (changePct < -10) insights.push({ type: 'negative', text: `${company.company_name} turun ${Math.abs(changePct).toFixed(1)}% dalam periode ini` });
        }
        if (ratio.item_name.includes('Shareholders') && change > 0) insights.push({ type: 'positive', text: `${company.company_name}: Jumlah shareholder +${formatValue(change)}` });
        if (ratio.item_name.includes('PE Ratio') && last < 15 && last > 0) insights.push({ type: 'info', text: `${company.company_name}: PE Ratio ${last.toFixed(1)} - potensi undervalued` });
      });
    });
    return { companyStats, insights };
  }, [chartData, visibleCompanies, visibleMetrics]);

  // Render metric item recursively
  const renderMetricItem = (item, level = 0) => {
    const hasChildren = item.child && item.child.length > 0;
    const isExpanded = expandedGroups[item.fitem_id];
    const isSelected = selectedMetrics.find(m => m.fitem_id === item.fitem_id);

    return (
      <div key={item.fitem_id}>
        <button
          onClick={() => hasChildren ? toggleGroup(item.fitem_id) : addMetric(item)}
          className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-left text-sm ${level > 0 ? 'pl-' + (level * 4 + 2) : ''}`}
          style={{ paddingLeft: level * 16 + 8 }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />
          ) : (
            isSelected ? <Check size={14} className="text-green-400" /> : <div className="w-3.5" />
          )}
          <span className={`${hasChildren ? 'text-gray-400 font-medium' : 'text-gray-300'} ${isSelected ? 'text-green-400' : ''}`}>
            {item.fitem_name}
          </span>
          {hasChildren && <span className="text-xs text-gray-600 ml-auto">{item.child.length}</span>}
        </button>
        {hasChildren && isExpanded && (
          <div className="border-l border-gray-800 ml-4">
            {item.child.map(child => renderMetricItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><LineChart className="w-6 h-6" /> FlowLine</h1>
          <p className="text-gray-500 text-sm">Fundamental Chart Comparison {useDemo && <span className="text-yellow-500">(Demo)</span>}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowGuide(!showGuide)} variant={showGuide ? 'primary' : 'outline'} size="sm" icon={<HelpCircle size={14} />}>Panduan</Button>
          <Button onClick={fetchChartData} variant="primary" size="sm" loading={isLoadingChart} icon={<RefreshCw size={14} />}>Refresh</Button>
        </div>
      </div>

      {/* Guide */}
      {showGuide && (
        <Card className="p-4 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-3">📖 Cara Menggunakan FlowLine</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-cyan-400 mb-2">📊 Langkah:</h4>
                  <ol className="space-y-1 text-gray-300 list-decimal list-inside">
                    <li>Tambahkan <strong>emiten</strong> (ketik lalu Enter/Add)</li>
                    <li>Pilih <strong>metrik</strong> dari grouped list</li>
                    <li>Pilih <strong>timeframe</strong> (auto refresh)</li>
                    <li><strong>Hover chart</strong> untuk melihat nilai</li>
                    <li>Toggle <strong>checkbox</strong> untuk filter</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold text-green-400 mb-2">💡 Tips:</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Bandingkan <strong>PE Ratio</strong> saham sejenis</li>
                    <li>• Track <strong>shareholder changes</strong></li>
                    <li>• Gunakan <strong>search</strong> untuk cari metrik</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Controls */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Companies */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Emiten</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {companies.map((c, i) => (
                <div key={c} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 rounded-lg group">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm text-white font-medium">{c}</span>
                  <button onClick={() => removeCompany(c)} className="ml-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <input type="text" value={companyInput} onChange={(e) => setCompanyInput(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && addCompany()} placeholder="Tambah emiten..." className="w-28 px-3 py-1.5 bg-black border border-gray-800 rounded-lg text-white text-sm placeholder:text-gray-600 focus:border-gray-600" />
                <Button onClick={addCompany} variant="secondary" size="sm" icon={<Plus size={14} />}>Add</Button>
              </div>
            </div>
          </div>

          {/* Metrics & Timeframe */}
          <div className="flex flex-wrap gap-4 items-start">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-2">Metrik</label>
              <div className="flex flex-wrap gap-2">
                {selectedMetrics.map(m => (
                  <div key={m.fitem_id} className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs font-medium group">
                    <span className="max-w-[150px] truncate">{m.fitem_name}</span>
                    <button onClick={() => removeMetric(m.fitem_id)} className="hover:text-red-400"><X size={12} /></button>
                  </div>
                ))}
                <button onClick={() => setShowMetricPicker(!showMetricPicker)} className="px-2.5 py-1 border border-dashed border-gray-700 rounded text-xs text-gray-500 hover:text-white hover:border-gray-500 flex items-center gap-1">
                  <Plus size={12} /> Tambah
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Timeframe</label>
              <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
                {TIMEFRAMES.map(tf => (
                  <button key={tf.value} onClick={() => setTimeframe(tf.value)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${timeframe === tf.value ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Metric Picker Modal */}
      {showMetricPicker && (
        <Card className="p-4 border-cyan-500/30 max-h-[400px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white">Pilih Metrik</h3>
            <button onClick={() => setShowMetricPicker(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>
          {/* Search */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" value={metricSearch} onChange={(e) => setMetricSearch(e.target.value)} placeholder="Cari metrik..." className="w-full pl-9 pr-4 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm placeholder:text-gray-600" />
          </div>
          {/* Grouped list */}
          <div className="overflow-y-auto flex-1 space-y-1">
            {isLoadingMetrics ? (
              <div className="py-8"><LoadingSpinner message="Memuat metrik..." /></div>
            ) : (
              filteredMetrics.map(group => renderMetricItem(group, 0))
            )}
          </div>
        </Card>
      )}

      {error && <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4 text-yellow-500" /><span className="text-yellow-400">{error}</span></div>}

      {/* Chart */}
      <Card className="p-4">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-cyan-400" />Chart</h3>
        {isLoadingChart ? (
          <div className="py-16"><LoadingSpinner message="Memuat chart..." /></div>
        ) : chartData?.data ? (
          <BetterLineChart data={chartData.data} visibleCompanies={visibleCompanies} visibleMetrics={visibleMetrics} colors={COLORS} />
        ) : (
          <div className="py-16 text-center text-gray-500"><LineChart className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>Tambah emiten dan metrik, lalu klik Refresh</p></div>
        )}
      </Card>

      {/* Toggle Controls */}
      {chartData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h4 className="font-bold text-white mb-3 flex items-center gap-2"><Eye className="w-4 h-4 text-green-400" />Emiten</h4>
            <div className="space-y-1">
              {companies.map((c, i) => (
                <label key={c} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5">
                  <input type="checkbox" checked={visibleCompanies.includes(c)} onChange={() => toggleCompanyVisibility(c)} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-0 focus:ring-offset-0" />
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-white font-medium">{c}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-bold text-white mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-400" />Metrik</h4>
            <div className="space-y-1">
              {selectedMetrics.map(m => (
                <label key={m.fitem_id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5">
                  <input type="checkbox" checked={visibleMetrics.includes(m.fitem_id)} onChange={() => toggleMetricVisibility(m.fitem_id)} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-0 focus:ring-offset-0" />
                  <span className="text-white truncate">{m.fitem_name}</span>
                </label>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Analysis */}
      {analysis && analysis.companyStats.length > 0 && (
        <>
          <Card className="overflow-hidden">
            <div className="p-3 border-b border-gray-800 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
              <h3 className="font-bold text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-cyan-400" />Statistik</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-black/30 text-left"><th className="px-3 py-2 text-xs text-gray-500">Emiten</th><th className="px-3 py-2 text-xs text-gray-500">Metrik</th><th className="px-3 py-2 text-xs text-gray-500 text-right">Awal</th><th className="px-3 py-2 text-xs text-gray-500 text-right">Akhir</th><th className="px-3 py-2 text-xs text-gray-500 text-right">%</th></tr></thead>
                <tbody className="divide-y divide-gray-800">
                  {analysis.companyStats.map((s, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="px-3 py-2 font-bold text-cyan-400">{s.company}</td>
                      <td className="px-3 py-2 text-gray-300 max-w-[200px] truncate">{s.metric}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{formatValue(s.first)}</td>
                      <td className="px-3 py-2 text-right font-bold text-white">{formatValue(s.last)}</td>
                      <td className={`px-3 py-2 text-right font-bold ${s.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>{s.changePct >= 0 ? '+' : ''}{s.changePct.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {analysis.insights.length > 0 && (
            <Card className="p-4 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 border-cyan-500/20">
              <h3 className="font-bold text-white flex items-center gap-2 mb-3"><Zap className="w-5 h-5 text-cyan-400" />Analisa</h3>
              <div className="space-y-2">
                {analysis.insights.map((ins, i) => (
                  <p key={i} className={`text-sm ${ins.type === 'positive' ? 'text-green-400' : ins.type === 'negative' ? 'text-red-400' : 'text-blue-400'}`}>
                    {ins.type === 'positive' ? '📈' : ins.type === 'negative' ? '📉' : '💡'} {ins.text}
                  </p>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default FlowLineView;
