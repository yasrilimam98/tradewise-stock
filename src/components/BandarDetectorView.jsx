import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, RefreshCw, AlertCircle, X, Users, Calendar,
  TrendingUp, TrendingDown, Loader2, BarChart3, Eye,
  HelpCircle, Info, Zap, Filter, ChevronDown, Building2, Globe, Flag, Award, Target, GitBranch
} from 'lucide-react';
import { Card, Button, LoadingSpinner } from './ui';
import { getBrokerDetector, getBrokerList, getBrokerActivityDetail, hasToken } from '../services/stockbitService';
import BrokerDistributionView from './BrokerDistributionView';

const TRANSACTION_TYPES = [
  { value: 'TRANSACTION_TYPE_NET', label: 'Net' },
  { value: 'TRANSACTION_TYPE_GROSS', label: 'Gross' },
];

const MARKET_BOARDS = [
  { value: 'MARKET_BOARD_REGULER', label: 'Reguler' },
  { value: 'MARKET_BOARD_ALL', label: 'All' },
  { value: 'MARKET_BOARD_TUNAI', label: 'Tunai' },
  { value: 'MARKET_BOARD_NEGO', label: 'Nego' },
];

const INVESTOR_TYPES = [
  { value: 'INVESTOR_TYPE_ALL', label: 'Semua' },
  { value: 'INVESTOR_TYPE_DOMESTIC', label: 'Domestik' },
  { value: 'INVESTOR_TYPE_FOREIGN', label: 'Asing' },
];

const BROKER_COLORS = {
  'Asing': '#ef4444',
  'Lokal': '#3b82f6',
  'Pemerintah': '#22c55e',
  'Ritel': '#f59e0b',
  'Zombie': '#6b7280',
};

const formatValue = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '-';
  const n = parseFloat(num);
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString('id-ID');
};

const formatLot = (num) => {
  // Use parseFloat to handle scientific notation like "2.187216779e+07"
  const n = Math.round(parseFloat(num)) || 0;
  return n.toLocaleString('id-ID');
};

// Horizontal Bar Chart Component
const HorizontalBarChart = ({ data, title, valueKey, labelKey = 'code', colorKey = 'type', maxItems = 10, suffix = '' }) => {
  if (!data || data.length === 0) return null;
  
  const items = data.slice(0, maxItems);
  const maxVal = Math.max(...items.map(d => Math.abs(parseFloat(d[valueKey]) || 0)));

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-gray-400 mb-3">{title}</h4>
      {items.map((item, i) => {
        const val = parseFloat(item[valueKey]) || 0;
        const width = maxVal > 0 ? (Math.abs(val) / maxVal) * 100 : 0;
        const color = BROKER_COLORS[item[colorKey]] || '#3b82f6';
        
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="w-8 text-xs font-bold text-white">{item[labelKey]}</div>
            <div className="flex-1 h-6 bg-gray-800 rounded-md overflow-hidden relative">
              <div className="h-full rounded-md transition-all duration-500" style={{ width: `${width}%`, backgroundColor: color }} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white font-medium">{formatValue(val)}{suffix}</span>
            </div>
            <div className="w-16 text-right">
              <span className={`text-xs px-1.5 py-0.5 rounded ${item[colorKey] === 'Asing' ? 'bg-red-500/20 text-red-400' : item[colorKey] === 'Pemerintah' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>{item[colorKey] || 'Lokal'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Comparison Bar Chart (Domestic vs Foreign)
const ComparisonBarChart = ({ domesticBuy, domesticSell, foreignBuy, foreignSell, title }) => {
  const maxVal = Math.max(domesticBuy, domesticSell, foreignBuy, foreignSell);
  
  const items = [
    { label: 'Domestik Beli', value: domesticBuy, color: '#3b82f6' },
    { label: 'Domestik Jual', value: domesticSell, color: '#60a5fa' },
    { label: 'Asing Beli', value: foreignBuy, color: '#ef4444' },
    { label: 'Asing Jual', value: foreignSell, color: '#f87171' },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-gray-400">{title}</h4>
      {items.map((item, i) => {
        const width = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-28 text-xs text-gray-400">{item.label}</div>
            <div className="flex-1 h-7 bg-gray-800 rounded-lg overflow-hidden relative">
              <div className="h-full rounded-lg transition-all duration-700" style={{ width: `${width}%`, backgroundColor: item.color }} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white font-bold">{formatValue(item.value)}</span>
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-gray-400">Net Domestik:</span>
          <span className={`text-sm font-bold ${domesticBuy - domesticSell >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {domesticBuy - domesticSell >= 0 ? '+' : ''}{formatValue(domesticBuy - domesticSell)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-red-400" />
          <span className="text-xs text-gray-400">Net Asing:</span>
          <span className={`text-sm font-bold ${foreignBuy - foreignSell >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {foreignBuy - foreignSell >= 0 ? '+' : ''}{formatValue(foreignBuy - foreignSell)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Broker Activity Detail Modal
const BrokerDetailModal = ({ isOpen, onClose, brokerCode, dateFrom, dateTo, transactionType, marketBoard, investorType }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !brokerCode) return;
    
    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getBrokerActivityDetail({
          brokerCode,
          from: dateFrom,
          to: dateTo,
          transactionType,
          marketBoard,
          investorType
        });
        if (res.data) setData(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [isOpen, brokerCode, dateFrom, dateTo, transactionType, marketBoard, investorType]);

  if (!isOpen) return null;

  const buyData = data?.broker_summary?.brokers_buy || [];
  const sellData = data?.broker_summary?.brokers_sell || [];
  const brokerName = data?.broker_name || brokerCode;

  // Calculate totals
  const totalBuy = buyData.reduce((sum, b) => sum + (parseFloat(b.bval) || 0), 0);
  const totalSell = sellData.reduce((sum, b) => sum + Math.abs(parseFloat(b.sval) || 0), 0);
  const netValue = totalBuy - totalSell;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Detail Broker: <span className="text-cyan-400">{brokerCode}</span>
            </h3>
            <p className="text-sm text-gray-400">{brokerName}</p>
            <p className="text-xs text-gray-500 mt-1">{dateFrom} s/d {dateTo}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-2"><X size={24} /></button>
        </div>

        {/* Summary Stats */}
        {data && (
          <div className="p-4 grid grid-cols-3 gap-3 border-b border-gray-800">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-gray-500">Total Beli</p>
              <p className="text-lg font-bold text-green-400">{formatValue(totalBuy)}</p>
              <p className="text-xs text-gray-500">{buyData.length} emiten</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-gray-500">Total Jual</p>
              <p className="text-lg font-bold text-red-400">{formatValue(totalSell)}</p>
              <p className="text-xs text-gray-500">{sellData.length} emiten</p>
            </div>
            <div className={`p-3 rounded-lg border ${netValue >= 0 ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-pink-500/10 border-pink-500/20'}`}>
              <p className="text-xs text-gray-500">Net Value</p>
              <p className={`text-lg font-bold ${netValue >= 0 ? 'text-cyan-400' : 'text-pink-400'}`}>
                {netValue >= 0 ? '+' : ''}{formatValue(netValue)}
              </p>
              <p className="text-xs text-gray-500">{netValue >= 0 ? 'Net Buy' : 'Net Sell'}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="py-8"><LoadingSpinner message={`Memuat detail ${brokerCode}...`} /></div>
          ) : error ? (
            <div className="p-4 text-center text-red-400">{error}</div>
          ) : data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Buy Side */}
              <div>
                <h4 className="font-bold text-green-400 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Emiten yang Dibeli ({buyData.length})
                </h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {buyData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10 hover:bg-green-500/10">
                      <div>
                        <span className="font-bold text-white text-sm">{item.netbs_stock_code}</span>
                        <p className="text-xs text-gray-500">{formatLot(item.blot)} lot @ {parseInt(parseFloat(item.netbs_buy_avg_price || 0)).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold text-sm">{formatValue(item.bval)}</p>
                      </div>
                    </div>
                  ))}
                  {buyData.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Tidak ada data pembelian</p>}
                </div>
              </div>

              {/* Sell Side */}
              <div>
                <h4 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" /> Emiten yang Dijual ({sellData.length})
                </h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {sellData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10">
                      <div>
                        <span className="font-bold text-white text-sm">{item.netbs_stock_code}</span>
                        <p className="text-xs text-gray-500">{formatLot(Math.abs(parseFloat(item.slot)))} lot @ {parseInt(parseFloat(item.netbs_sell_avg_price || 0)).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-400 font-bold text-sm">{formatValue(Math.abs(parseFloat(item.sval)))}</p>
                      </div>
                    </div>
                  ))}
                  {sellData.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Tidak ada data penjualan</p>}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Broker Summary Table - with clickable broker codes
const BrokerSummaryTable = ({ buyData, sellData, symbol, onBrokerClick }) => {
  const maxRows = Math.max(buyData.length, sellData.length);
  const rows = [];
  
  for (let i = 0; i < Math.min(maxRows, 10); i++) {
    rows.push({ rank: i + 1, buy: buyData[i] || null, sell: sellData[i] || null });
  }

  const totalBuyLot = buyData.reduce((sum, b) => sum + (parseFloat(b.blot) || 0), 0);
  const totalBuyVal = buyData.reduce((sum, b) => sum + (parseFloat(b.bval) || 0), 0);
  const totalBuyFrq = buyData.length;
  const totalSellLot = sellData.reduce((sum, b) => sum + Math.abs(parseFloat(b.slot) || 0), 0);
  const totalSellVal = sellData.reduce((sum, b) => sum + Math.abs(parseFloat(b.sval) || 0), 0);
  const totalSellFrq = sellData.length;

  const getBrokerBadge = (type) => {
    const colors = {
      'Asing': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Lokal': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Pemerintah': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Zombie': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      'Ritel': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
    return colors[type] || colors['Lokal'];
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-3 border-b border-gray-800 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
        <h3 className="font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          Broker Summary Saham
          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full ml-2">{symbol}</span>
        </h3>
        <p className="text-xs text-gray-500 mt-1">Klik kode broker untuk melihat detail emiten</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-900/50">
              <th className="px-2 py-2 text-center text-gray-500 font-medium">BC</th>
              <th className="px-2 py-2 text-right text-gray-500 font-medium">BLot</th>
              <th className="px-2 py-2 text-right text-gray-500 font-medium">BVal</th>
              <th className="px-2 py-2 text-right text-gray-500 font-medium">BAvg</th>
              <th className="px-2 py-2 text-center text-gray-600 font-bold">#</th>
              <th className="px-2 py-2 text-center text-gray-500 font-medium">SC</th>
              <th className="px-2 py-2 text-right text-gray-500 font-medium">SLot</th>
              <th className="px-2 py-2 text-right text-gray-500 font-medium">SVal</th>
              <th className="px-2 py-2 text-right text-gray-500 font-medium">SAvg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="px-2 py-2 text-center">
                  {row.buy && (
                    <button 
                      onClick={() => onBrokerClick(row.buy.netbs_broker_code)}
                      className={`px-1.5 py-0.5 rounded border text-xs font-bold hover:scale-110 transition-transform cursor-pointer ${getBrokerBadge(row.buy.type)}`}
                    >
                      {row.buy.netbs_broker_code}
                    </button>
                  )}
                </td>
                <td className="px-2 py-2 text-right text-gray-300 font-mono">{row.buy ? formatLot(row.buy.blot) : '-'}</td>
                <td className="px-2 py-2 text-right text-cyan-400 font-mono font-medium">{row.buy ? formatValue(row.buy.bval) : '-'}</td>
                <td className="px-2 py-2 text-right text-green-400 font-mono">{row.buy && row.buy.netbs_buy_avg_price ? parseInt(parseFloat(row.buy.netbs_buy_avg_price)).toLocaleString() : '-'}</td>
                <td className="px-2 py-2 text-center text-gray-600 font-bold">{row.rank}</td>
                <td className="px-2 py-2 text-center">
                  {row.sell && (
                    <button
                      onClick={() => onBrokerClick(row.sell.netbs_broker_code)}
                      className={`px-1.5 py-0.5 rounded border text-xs font-bold hover:scale-110 transition-transform cursor-pointer ${getBrokerBadge(row.sell.type)}`}
                    >
                      {row.sell.netbs_broker_code}
                    </button>
                  )}
                </td>
                <td className="px-2 py-2 text-right text-gray-300 font-mono">{row.sell ? formatLot(Math.abs(parseFloat(row.sell.slot))) : '-'}</td>
                <td className="px-2 py-2 text-right text-pink-400 font-mono font-medium">{row.sell ? formatValue(Math.abs(parseFloat(row.sell.sval))) : '-'}</td>
                <td className="px-2 py-2 text-right text-red-400 font-mono">{row.sell && row.sell.netbs_sell_avg_price ? parseInt(parseFloat(row.sell.netbs_sell_avg_price)).toLocaleString() : '-'}</td>
              </tr>
            ))}
            <tr className="bg-gray-900/70 font-bold">
              <td className="px-2 py-2 text-center text-gray-400">Total</td>
              <td className="px-2 py-2 text-right text-white font-mono">{formatLot(totalBuyLot)}</td>
              <td className="px-2 py-2 text-right text-cyan-400 font-mono">{formatValue(totalBuyVal)}</td>
              <td className="px-2 py-2 text-right text-green-400 font-mono">-</td>
              <td className="px-2 py-2 text-center text-gray-600">-</td>
              <td className="px-2 py-2 text-center text-gray-400">Total</td>
              <td className="px-2 py-2 text-right text-white font-mono">{formatLot(totalSellLot)}</td>
              <td className="px-2 py-2 text-right text-pink-400 font-mono">{formatValue(totalSellVal)}</td>
              <td className="px-2 py-2 text-right text-red-400 font-mono">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-800 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500"></span><span className="text-gray-400">Pemerintah</span></div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500"></span><span className="text-gray-400">Asing</span></div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-500"></span><span className="text-gray-400">Lokal/Institusi</span></div>
      </div>
    </Card>
  );
};

// Broker List Modal
const BrokerListModal = ({ isOpen, onClose, brokers, isLoading }) => {
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');

  const filteredBrokers = useMemo(() => {
    if (!brokers) return [];
    return brokers.filter(b => {
      const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase());
      const matchGroup = filterGroup === 'all' || b.group === filterGroup;
      return matchSearch && matchGroup;
    });
  }, [brokers, search, filterGroup]);

  const groupCounts = useMemo(() => {
    if (!brokers) return {};
    return brokers.reduce((acc, b) => { acc[b.group] = (acc[b.group] || 0) + 1; return acc; }, {});
  }, [brokers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-cyan-400" /> Daftar Broker</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-4 border-b border-gray-800 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari broker..." className="w-full pl-9 pr-4 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterGroup('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterGroup === 'all' ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'}`}>Semua ({brokers?.length || 0})</button>
            {Object.entries(groupCounts).map(([group, count]) => (
              <button key={group} onClick={() => setFilterGroup(group)} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${filterGroup === group ? 'text-black' : 'text-gray-300'}`}
                style={{ backgroundColor: filterGroup === group ? BROKER_COLORS[group] || '#3b82f6' : 'transparent', border: `1px solid ${BROKER_COLORS[group] || '#3b82f6'}40` }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BROKER_COLORS[group] || '#3b82f6' }} />{group} ({count})
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (<div className="py-8"><LoadingSpinner message="Memuat broker..." /></div>) : (
            <div className="space-y-2">
              {filteredBrokers.map((broker) => (
                <div key={broker.id} className="flex items-center gap-3 p-3 rounded-lg bg-black/50 hover:bg-white/5" style={{ borderLeft: `3px solid ${BROKER_COLORS[broker.group] || '#3b82f6'}` }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white" style={{ backgroundColor: BROKER_COLORS[broker.group] || '#3b82f6' }}>{broker.code}</div>
                  <div className="flex-1 min-w-0"><p className="text-white font-medium truncate">{broker.name}</p><p className="text-xs text-gray-500 truncate">{broker.permission}</p></div>
                  <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: `${BROKER_COLORS[broker.group] || '#3b82f6'}20`, color: BROKER_COLORS[broker.group] || '#3b82f6' }}>{broker.group}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BandarDetectorView = ({ onNavigateToSettings }) => {
  const [symbol, setSymbol] = useState('');
  const [symbolInput, setSymbolInput] = useState('');
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [transactionType, setTransactionType] = useState('TRANSACTION_TYPE_NET');
  const [marketBoard, setMarketBoard] = useState('MARKET_BOARD_REGULER');
  const [investorType, setInvestorType] = useState('INVESTOR_TYPE_ALL');
  const [detectorData, setDetectorData] = useState(null);
  const [brokerList, setBrokerList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBrokers, setIsLoadingBrokers] = useState(false);
  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState(null);
  const [useDemo, setUseDemo] = useState(false);

  useEffect(() => {
    const fetchBrokers = async () => {
      if (!hasToken()) return;
      setIsLoadingBrokers(true);
      try {
        const res = await getBrokerList();
        if (res.data) setBrokerList(res.data);
      } catch (err) { console.error('Failed:', err); }
      finally { setIsLoadingBrokers(false); }
    };
    fetchBrokers();
  }, []);

  const fetchData = useCallback(async () => {
    if (!symbol) { setError('Masukkan kode saham'); return; }
    if (!hasToken()) { setUseDemo(true); setError('Token tidak ditemukan.'); return; }
    setIsLoading(true); setError(null);
    try {
      const res = await getBrokerDetector({ symbol, from: dateFrom, to: dateTo, transactionType, marketBoard, investorType });
      if (res.data) { setDetectorData(res.data); setUseDemo(false); }
    } catch (err) {
      if (err.message.includes('CORS')) { setError('CORS Error'); setUseDemo(true); }
      else setError(err.message);
    } finally { setIsLoading(false); }
  }, [symbol, dateFrom, dateTo, transactionType, marketBoard, investorType]);

  const handleSearch = () => { const s = symbolInput.trim().toUpperCase(); if (s) setSymbol(s); };

  const handleBrokerClick = (brokerCode) => { setSelectedBroker(brokerCode); };

  useEffect(() => { if (symbol) fetchData(); }, [symbol, transactionType, marketBoard, investorType]);

  const chartData = useMemo(() => {
    if (!detectorData?.broker_summary) return null;
    const { brokers_buy = [], brokers_sell = [] } = detectorData.broker_summary;
    const topBuyersValue = brokers_buy.slice(0, 10).map(b => ({ code: b.netbs_broker_code, value: parseFloat(b.bval) || 0, type: b.type }));
    const topSellersValue = brokers_sell.slice(0, 10).map(b => ({ code: b.netbs_broker_code, value: Math.abs(parseFloat(b.sval) || 0), type: b.type }));
    const netBuy = brokers_buy.filter(b => parseFloat(b.bval) > 0).slice(0, 10).map(b => ({ code: b.netbs_broker_code, value: parseFloat(b.bval) || 0, type: b.type }));
    const netSell = brokers_sell.filter(b => parseFloat(b.sval) < 0).slice(0, 10).map(b => ({ code: b.netbs_broker_code, value: Math.abs(parseFloat(b.sval) || 0), type: b.type }));
    
    let domesticBuy = 0, domesticSell = 0, foreignBuy = 0, foreignSell = 0;
    brokers_buy.forEach(b => { const val = parseFloat(b.bval) || 0; if (b.type === 'Asing') foreignBuy += val; else domesticBuy += val; });
    brokers_sell.forEach(b => { const val = Math.abs(parseFloat(b.sval) || 0); if (b.type === 'Asing') foreignSell += val; else domesticSell += val; });

    return { topBuyersValue, topSellersValue, netBuy, netSell, domesticBuy, domesticSell, foreignBuy, foreignSell, brokers_buy, brokers_sell };
  }, [detectorData]);

  const analysis = useMemo(() => {
    if (!detectorData?.bandar_detector) return null;
    const bd = detectorData.bandar_detector;
    const insights = [];
    if (bd.broker_accdist === 'Acc') insights.push({ type: 'positive', text: 'AKUMULASI - Big player mengumpulkan saham' });
    else if (bd.broker_accdist === 'Dist') insights.push({ type: 'negative', text: 'DISTRIBUSI - Big player melepas saham' });
    if (bd.total_buyer > bd.total_seller) insights.push({ type: 'positive', text: `Buyer (${bd.total_buyer}) > Seller (${bd.total_seller})` });
    else if (bd.total_seller > bd.total_buyer) insights.push({ type: 'negative', text: `Seller (${bd.total_seller}) > Buyer (${bd.total_buyer})` });
    return { ...bd, insights };
  }, [detectorData]);

  const conclusion = useMemo(() => {
    if (!chartData || !analysis) return null;
    const { domesticBuy, domesticSell, foreignBuy, foreignSell } = chartData;
    const netDomestic = domesticBuy - domesticSell;
    const netForeign = foreignBuy - foreignSell;
    let verdict = '', verdictType = 'neutral', recommendation = '', signals = [];

    if (netForeign > 0 && netDomestic > 0) { verdict = '🚀 BULLISH STRONG'; verdictType = 'bullish'; recommendation = 'Asing & Domestik akumulasi. Momentum positif!'; signals = ['✅ Foreign Net Buy', '✅ Domestic Net Buy']; }
    else if (netForeign > 0 && netDomestic < 0) { verdict = '📊 BULLISH (Foreign)'; verdictType = 'bullish'; recommendation = 'Smart money masuk!'; signals = ['✅ Foreign Net Buy', '⚠️ Domestic Net Sell']; }
    else if (netForeign < 0 && netDomestic > 0) { verdict = '⚖️ MIXED'; verdictType = 'neutral'; recommendation = 'Perhatikan volume!'; signals = ['⚠️ Foreign Net Sell', '✅ Domestic Net Buy']; }
    else if (netForeign < 0 && netDomestic < 0) { verdict = '🔻 BEARISH'; verdictType = 'bearish'; recommendation = 'Hati-hati distribusi!'; signals = ['❌ Foreign Net Sell', '❌ Domestic Net Sell']; }
    else { verdict = '➖ SIDEWAYS'; verdictType = 'neutral'; recommendation = 'Netral.'; signals = ['➖ Neutral']; }

    return { verdict, verdictType, recommendation, signals, netDomestic, netForeign };
  }, [chartData, analysis]);

  return (
    <div className="space-y-4 pb-20 lg:pb-0 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="w-6 h-6" /> Bandar Detector</h1>
          <p className="text-gray-500 text-sm">Broker Summary {symbol && <span className="text-cyan-400">• {symbol}</span>}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowDistributionModal(true)} variant="outline" size="sm" icon={<GitBranch size={14} />}>Distribution</Button>
          <Button onClick={() => setShowBrokerModal(true)} variant="outline" size="sm" icon={<Building2 size={14} />}>Daftar Broker</Button>
          <Button onClick={() => setShowGuide(!showGuide)} variant={showGuide ? 'primary' : 'outline'} size="sm" icon={<HelpCircle size={14} />}>Panduan</Button>
        </div>
      </div>

      {showGuide && (
        <Card className="p-4 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-3">📖 Panduan</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <ol className="space-y-1 text-gray-300 list-decimal list-inside">
                    <li>Masukkan <strong>kode saham</strong></li>
                    <li>Pilih <strong>rentang tanggal</strong></li>
                    <li className="text-cyan-400 font-bold">Klik kode broker untuk lihat detail emiten!</li>
                  </ol>
                </div>
                <div>
                  <ul className="space-y-1 text-gray-300">
                    <li>• <span className="text-red-400 font-bold">Asing</span> = Foreign</li>
                    <li>• <span className="text-green-400 font-bold">Pemerintah</span> = BUMN</li>
                    <li>• <span className="text-blue-400 font-bold">Lokal</span> = Domestik</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" value={symbolInput} onChange={(e) => setSymbolInput(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Kode saham (contoh: BBRI)" className="w-full pl-9 pr-4 py-2.5 bg-black border border-gray-800 rounded-lg text-white placeholder:text-gray-600" />
            </div>
            <Button onClick={handleSearch} variant="primary" loading={isLoading} icon={<Search size={16} />}>Search</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-500" />
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-1.5 bg-black border border-gray-800 rounded-lg text-white text-sm" />
              <span className="text-gray-500">s/d</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-1.5 bg-black border border-gray-800 rounded-lg text-white text-sm" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipe</label>
              <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">{TRANSACTION_TYPES.map(t => (<button key={t.value} onClick={() => setTransactionType(t.value)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${transactionType === t.value ? 'bg-white text-black' : 'text-gray-400'}`}>{t.label}</button>))}</div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Board</label>
              <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">{MARKET_BOARDS.map(b => (<button key={b.value} onClick={() => setMarketBoard(b.value)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${marketBoard === b.value ? 'bg-white text-black' : 'text-gray-400'}`}>{b.label}</button>))}</div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Investor</label>
              <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">{INVESTOR_TYPES.map(t => (<button key={t.value} onClick={() => setInvestorType(t.value)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${investorType === t.value ? 'bg-white text-black' : 'text-gray-400'}`}>{t.label}</button>))}</div>
            </div>
          </div>
        </div>
      </Card>

      {error && <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4 text-yellow-500" /><span className="text-yellow-400">{error}</span></div>}
      {isLoading && <div className="py-8"><LoadingSpinner message={`Memuat ${symbol}...`} /></div>}

      {analysis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20"><p className="text-xs text-gray-500 mb-1">Total Buyer</p><p className="text-2xl font-bold text-green-400">{analysis.total_buyer || 0}</p></Card>
          <Card className="p-4 bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20"><p className="text-xs text-gray-500 mb-1">Total Seller</p><p className="text-2xl font-bold text-red-400">{analysis.total_seller || 0}</p></Card>
          <Card className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border-cyan-500/20"><p className="text-xs text-gray-500 mb-1">Volume</p><p className="text-2xl font-bold text-cyan-400">{formatLot(analysis.volume)}</p><p className="text-xs text-gray-500">lot</p></Card>
          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/20"><p className="text-xs text-gray-500 mb-1">Value</p><p className="text-2xl font-bold text-purple-400">{formatValue(analysis.value)}</p></Card>
        </div>
      )}

      {chartData && <BrokerSummaryTable buyData={chartData.brokers_buy} sellData={chartData.brokers_sell} symbol={symbol} onBrokerClick={handleBrokerClick} />}

      {chartData && (
        <Card className="p-4">
          <ComparisonBarChart domesticBuy={chartData.domesticBuy} domesticSell={chartData.domesticSell} foreignBuy={chartData.foreignBuy} foreignSell={chartData.foreignSell} title="🌍 Domestik vs Asing" />
        </Card>
      )}

      {chartData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4"><HorizontalBarChart data={chartData.topBuyersValue} title="🟢 Beli Teratas" valueKey="value" colorKey="type" /></Card>
          <Card className="p-4"><HorizontalBarChart data={chartData.topSellersValue} title="🔴 Jual Teratas" valueKey="value" colorKey="type" /></Card>
          <Card className="p-4"><HorizontalBarChart data={chartData.netBuy} title="💰 Net Buy Teratas" valueKey="value" colorKey="type" /></Card>
          <Card className="p-4"><HorizontalBarChart data={chartData.netSell} title="💸 Net Sell Teratas" valueKey="value" colorKey="type" /></Card>
        </div>
      )}

      {conclusion && (
        <Card className={`p-5 border-2 ${conclusion.verdictType === 'bullish' ? 'border-green-500/50 bg-gradient-to-br from-green-500/10 to-emerald-500/5' : conclusion.verdictType === 'bearish' ? 'border-red-500/50 bg-gradient-to-br from-red-500/10 to-rose-500/5' : 'border-gray-500/50 bg-gradient-to-br from-gray-500/10 to-slate-500/5'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl ${conclusion.verdictType === 'bullish' ? 'bg-green-500/20' : conclusion.verdictType === 'bearish' ? 'bg-red-500/20' : 'bg-gray-500/20'}`}>
              {conclusion.verdictType === 'bullish' ? '🚀' : conclusion.verdictType === 'bearish' ? '🔻' : '⚖️'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2"><Award className={`w-5 h-5 ${conclusion.verdictType === 'bullish' ? 'text-green-400' : conclusion.verdictType === 'bearish' ? 'text-red-400' : 'text-gray-400'}`} /><h3 className={`text-xl font-bold ${conclusion.verdictType === 'bullish' ? 'text-green-400' : conclusion.verdictType === 'bearish' ? 'text-red-400' : 'text-gray-400'}`}>{conclusion.verdict}</h3></div>
              <p className="text-gray-300 mb-4">{conclusion.recommendation}</p>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-black/30"><p className="text-xs text-gray-500 mb-1">Net Domestik</p><p className={`text-lg font-bold ${conclusion.netDomestic >= 0 ? 'text-green-400' : 'text-red-400'}`}>{conclusion.netDomestic >= 0 ? '+' : ''}{formatValue(conclusion.netDomestic)}</p></div>
                <div className="p-3 rounded-lg bg-black/30"><p className="text-xs text-gray-500 mb-1">Net Asing</p><p className={`text-lg font-bold ${conclusion.netForeign >= 0 ? 'text-green-400' : 'text-red-400'}`}>{conclusion.netForeign >= 0 ? '+' : ''}{formatValue(conclusion.netForeign)}</p></div>
              </div>
              <div className="flex flex-wrap gap-2">{conclusion.signals.map((signal, i) => (<span key={i} className="px-3 py-1.5 bg-black/30 rounded-lg text-sm text-gray-300">{signal}</span>))}</div>
            </div>
          </div>
        </Card>
      )}

      <BrokerListModal isOpen={showBrokerModal} onClose={() => setShowBrokerModal(false)} brokers={brokerList} isLoading={isLoadingBrokers} />
      <BrokerDetailModal isOpen={!!selectedBroker} onClose={() => setSelectedBroker(null)} brokerCode={selectedBroker} dateFrom={dateFrom} dateTo={dateTo} transactionType={transactionType} marketBoard={marketBoard} investorType={investorType} />
      <BrokerDistributionView isOpen={showDistributionModal} onClose={() => setShowDistributionModal(false)} symbol={symbol} date={dateTo} />
    </div>
  );
};

export default BandarDetectorView;
