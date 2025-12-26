import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Search, Calendar, Filter, RefreshCw, AlertCircle, X,
  TrendingUp, TrendingDown, Loader2, PieChart, Eye, Building2,
  Globe, Shield, Crown, ArrowUpRight, ArrowDownRight, Briefcase,
  HelpCircle, Info, UserCheck, Percent, BarChart3, Zap
} from 'lucide-react';
import { Card, Button, LoadingSpinner } from './ui';
import { getInsiderData, hasToken } from '../services/stockbitService';

// Demo data
const DEMO_DATA = [
  { id: '1', name: 'FUAD HASAN MASYHUR', symbol: 'MKTR', date: '04 Nov 25', previous: { value: '8,276,210,000', percentage: '68.6640' }, current: { value: '8,276,210,000', percentage: '68.6300' }, changes: { value: '0', percentage: '-0.0340' }, nationality: 'NATIONALITY_TYPE_LOCAL', action_type: 'ACTION_TYPE_BUY', data_source: { label: 'Sumber: KSEI', type: 'SOURCE_TYPE_KSEI' }, badges: ['SHAREHOLDER_BADGE_PENGENDALI'] },
  { id: '2', name: 'PT SARATOGA INVESTAMA SEDAYA', symbol: 'ADRO', date: '03 Nov 25', previous: { value: '2,500,000,000', percentage: '12.5000' }, current: { value: '2,600,000,000', percentage: '13.0000' }, changes: { value: '100,000,000', percentage: '+0.5000' }, nationality: 'NATIONALITY_TYPE_LOCAL', action_type: 'ACTION_TYPE_BUY', data_source: { label: 'Sumber: IDX', type: 'SOURCE_TYPE_IDX' }, badges: ['SHAREHOLDER_BADGE_PENGENDALI'] },
  { id: '3', name: 'BLACKROCK INC', symbol: 'BBCA', date: '02 Nov 25', previous: { value: '1,800,000,000', percentage: '7.2000' }, current: { value: '1,750,000,000', percentage: '7.0000' }, changes: { value: '-50,000,000', percentage: '-0.2000' }, nationality: 'NATIONALITY_TYPE_FOREIGN', action_type: 'ACTION_TYPE_SELL', data_source: { label: 'Sumber: KSEI', type: 'SOURCE_TYPE_KSEI' }, badges: [] },
  { id: '4', name: 'GOVERNMENT OF SINGAPORE', symbol: 'TLKM', date: '01 Nov 25', previous: { value: '3,200,000,000', percentage: '8.5000' }, current: { value: '3,350,000,000', percentage: '8.9000' }, changes: { value: '150,000,000', percentage: '+0.4000' }, nationality: 'NATIONALITY_TYPE_FOREIGN', action_type: 'ACTION_TYPE_BUY', data_source: { label: 'Sumber: KSEI', type: 'SOURCE_TYPE_KSEI' }, badges: [] },
];

const parseValue = (val) => parseInt(String(val).replace(/,/g, '') || '0');
const formatValue = (num) => {
  if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString('id-ID');
};

const ACTION_TYPES = [
  { value: 'ACTION_TYPE_UNSPECIFIED', label: 'Semua Aksi' },
  { value: 'ACTION_TYPE_BUY', label: 'Beli' },
  { value: 'ACTION_TYPE_SELL', label: 'Jual' },
  { value: 'ACTION_TYPE_CROSS', label: 'Cross' },
  { value: 'ACTION_TYPE_TRANSFER', label: 'Transfer' },
  { value: 'ACTION_TYPE_CORPACTION', label: 'Corporate Action' },
];

const SOURCE_TYPES = [
  { value: 'SOURCE_TYPE_UNSPECIFIED', label: 'Semua Sumber' },
  { value: 'SOURCE_TYPE_IDX', label: 'IDX' },
  { value: 'SOURCE_TYPE_KSEI', label: 'KSEI' },
];

const InsiderView = ({ onNavigateToSettings }) => {
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [dateStart, setDateStart] = useState(lastMonth);
  const [dateEnd, setDateEnd] = useState(today);
  const [symbol, setSymbol] = useState('');
  const [actionType, setActionType] = useState('ACTION_TYPE_UNSPECIFIED');
  const [sourceType, setSourceType] = useState('SOURCE_TYPE_UNSPECIFIED');
  const [showFilters, setShowFilters] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [movements, setMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [useDemo, setUseDemo] = useState(false);

  // Analysis
  const analysis = useMemo(() => {
    if (movements.length === 0) return null;

    let totalBuy = 0, totalSell = 0, buyCount = 0, sellCount = 0;
    let localBuy = 0, localSell = 0, foreignBuy = 0, foreignSell = 0;
    const symbolMap = {};
    const holderMap = {};
    const majorHolders = []; // > 5%

    movements.forEach(m => {
      const changeVal = parseValue(m.changes?.value || '0');
      const changePct = parseFloat(m.changes?.percentage || '0');
      const currentPct = parseFloat(m.current?.percentage || '0');
      const isLocal = m.nationality === 'NATIONALITY_TYPE_LOCAL';
      const isBuy = m.action_type?.includes('BUY') || changePct > 0;
      const isSell = m.action_type?.includes('SELL') || changePct < 0;

      if (isBuy) { totalBuy += Math.abs(changeVal); buyCount++; if (isLocal) localBuy += Math.abs(changeVal); else foreignBuy += Math.abs(changeVal); }
      if (isSell) { totalSell += Math.abs(changeVal); sellCount++; if (isLocal) localSell += Math.abs(changeVal); else foreignSell += Math.abs(changeVal); }

      // Symbol aggregation
      if (!symbolMap[m.symbol]) symbolMap[m.symbol] = { symbol: m.symbol, buyVol: 0, sellVol: 0, count: 0 };
      symbolMap[m.symbol].count++;
      if (isBuy) symbolMap[m.symbol].buyVol += Math.abs(changeVal);
      if (isSell) symbolMap[m.symbol].sellVol += Math.abs(changeVal);

      // Holder aggregation
      if (!holderMap[m.name]) holderMap[m.name] = { name: m.name, nationality: m.nationality, buyVol: 0, sellVol: 0, badges: m.badges || [], symbols: new Set() };
      holderMap[m.name].symbols.add(m.symbol);
      if (isBuy) holderMap[m.name].buyVol += Math.abs(changeVal);
      if (isSell) holderMap[m.name].sellVol += Math.abs(changeVal);

      // Major Holders > 5%
      if (currentPct >= 5) {
        majorHolders.push({ ...m, currentPct });
      }
    });

    const topSymbols = Object.values(symbolMap).sort((a, b) => (b.buyVol + b.sellVol) - (a.buyVol + a.sellVol)).slice(0, 10);
    const topHolders = Object.values(holderMap).map(h => ({ ...h, symbols: Array.from(h.symbols), net: h.buyVol - h.sellVol })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).slice(0, 10);
    const uniqueMajorHolders = [...new Map(majorHolders.map(m => [m.name + m.symbol, m])).values()].sort((a, b) => b.currentPct - a.currentPct);

    const netFlow = totalBuy - totalSell;
    const foreignNet = foreignBuy - foreignSell;
    let sentiment = 'NETRAL', sentimentColor = 'text-gray-400', emoji = '⚖️';
    if (buyCount > sellCount * 1.5 || netFlow > 0) { sentiment = 'AKUMULASI'; sentimentColor = 'text-green-400'; emoji = '📈'; }
    else if (sellCount > buyCount * 1.5 || netFlow < 0) { sentiment = 'DISTRIBUSI'; sentimentColor = 'text-red-400'; emoji = '📉'; }

    return { totalBuy, totalSell, buyCount, sellCount, localBuy, localSell, foreignBuy, foreignSell, foreignNet, netFlow, topSymbols, topHolders, uniqueMajorHolders, sentiment, sentimentColor, emoji };
  }, [movements]);

  const fetchData = useCallback(async (loadMore = false) => {
    if (!hasToken()) { setError('Token belum diset'); setMovements(DEMO_DATA); setUseDemo(true); return; }
    if (!loadMore) { setIsLoading(true); setMovements([]); setPage(1); setHasMore(true); }
    setError(null);

    try {
      const response = await getInsiderData({
        dateStart, dateEnd, page: loadMore ? page + 1 : 1, limit: 20,
        actionType, sourceType, symbol: symbol.trim() || null
      });
      if (response.data?.movement) {
        const newData = response.data.movement;
        loadMore ? setMovements(prev => [...prev, ...newData]) : setMovements(newData);
        setHasMore(response.data.is_more);
        if (loadMore) setPage(p => p + 1);
        setUseDemo(false);
      }
    } catch (err) {
      if (err.message.includes('CORS')) { setError('CORS - Demo mode'); setMovements(DEMO_DATA); setUseDemo(true); }
      else setError(err.message);
    } finally { setIsLoading(false); }
  }, [dateStart, dateEnd, symbol, actionType, sourceType, page]);

  useEffect(() => { fetchData(); }, []);

  const handleSearch = (e) => { e.preventDefault(); fetchData(); };

  const getActionBadge = (type) => {
    if (type?.includes('BUY')) return <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded font-bold">BELI</span>;
    if (type?.includes('SELL')) return <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded font-bold">JUAL</span>;
    if (type?.includes('CROSS')) return <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded font-bold">CROSS</span>;
    if (type?.includes('TRANSFER')) return <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded font-bold">TRANSFER</span>;
    if (type?.includes('CORPACTION') || type?.includes('WARRANT')) return <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded font-bold">CORP ACTION</span>;
    return <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded">-</span>;
  };

  const getNationalityBadge = (nat) => {
    if (nat?.includes('FOREIGN')) return <span className="px-1.5 py-0.5 text-[9px] bg-purple-500/30 text-purple-300 rounded font-bold">ASING</span>;
    return <span className="px-1.5 py-0.5 text-[9px] bg-blue-500/30 text-blue-300 rounded font-bold">LOKAL</span>;
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6" /> Insider Trading
            {analysis && <span className={`text-base ${analysis.sentimentColor}`}>{analysis.emoji} {analysis.sentiment}</span>}
          </h1>
          <p className="text-gray-500 text-sm">Pergerakan Pemegang Saham Utama & Major Holder {useDemo && <span className="text-yellow-500">(Demo)</span>}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowGuide(!showGuide)} variant={showGuide ? 'primary' : 'outline'} size="sm" icon={<HelpCircle size={14} />}>Panduan</Button>
          <Button onClick={() => setShowFilters(!showFilters)} variant={showFilters ? 'primary' : 'secondary'} size="sm" icon={<Filter size={14} />}>Filter</Button>
        </div>
      </div>

      {/* Guide */}
      {showGuide && (
        <Card className="p-4 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-3">📖 Panduan Insider Trading</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-cyan-400 mb-2">📊 Apa itu Insider Trading?</h4>
                  <p className="text-gray-300">Data pergerakan kepemilikan saham oleh pemegang saham utama (major holder), komisaris, direksi, dan pihak terafiliasi yang wajib dilaporkan ke OJK.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-cyan-400 mb-2">🔍 Cara Membaca:</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li><strong className="text-green-400">BELI</strong> = Insider menambah kepemilikan (bullish)</li>
                    <li><strong className="text-red-400">JUAL</strong> = Insider mengurangi kepemilikan</li>
                    <li><strong className="text-purple-400">CROSS</strong> = Transaksi tutup sendiri</li>
                    <li><strong className="text-orange-400">CORP ACTION</strong> = Right issue, warrant, dll</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-green-400 mb-2">💡 Tips Analisa:</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li>• <strong>Insider Buy</strong> = Sinyal positif, mereka tahu kondisi internal</li>
                    <li>• <strong>Asing akumulasi</strong> = Institusi besar tertarik</li>
                    <li>• <strong>Pengendali beli</strong> = Sangat bullish</li>
                    <li>• Perhatikan <strong>% kepemilikan</strong> setelah transaksi</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-400 mb-2">🏷️ Badge:</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li><strong className="text-yellow-400">👑 PENGENDALI</strong> = Pemegang saham pengendali</li>
                    <li><strong className="text-blue-400">LOKAL</strong> = Investor domestik</li>
                    <li><strong className="text-purple-400">ASING</strong> = Investor asing</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search & Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Kode saham (opsional): BBRI, TLKM..." className="w-full pl-9 pr-4 py-2.5 bg-black border-2 border-gray-800 rounded-xl text-white placeholder:text-gray-600 focus:border-gray-600" />
            </div>
            <div className="flex gap-2">
              <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-32 px-3 py-2.5 bg-black border-2 border-gray-800 rounded-xl text-white text-sm" />
              <span className="text-gray-500 self-center">-</span>
              <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-32 px-3 py-2.5 bg-black border-2 border-gray-800 rounded-xl text-white text-sm" />
            </div>
            <Button type="submit" variant="primary" loading={isLoading}><Search size={16} />Cari</Button>
          </div>
          {showFilters && (
            <div className="pt-3 border-t border-gray-800 grid grid-cols-2 lg:grid-cols-3 gap-2">
              <select value={actionType} onChange={(e) => setActionType(e.target.value)} className="px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm">
                {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm">
                {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button type="button" onClick={() => { setActionType('ACTION_TYPE_UNSPECIFIED'); setSourceType('SOURCE_TYPE_UNSPECIFIED'); setSymbol(''); }} className="px-3 py-2 border border-gray-800 rounded-lg text-gray-400 hover:text-white text-sm flex items-center justify-center gap-1"><X size={14} />Reset</button>
            </div>
          )}
        </form>
      </Card>

      {error && <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4 text-yellow-500" /><span className="text-yellow-400">{error}</span></div>}

      {/* Analysis */}
      {analysis && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="p-3 bg-gradient-to-br from-green-500/10 to-green-500/5"><div className="flex items-center gap-2"><ArrowUpRight className="w-5 h-5 text-green-400" /><div><p className="text-[10px] text-gray-500">Total Beli</p><p className="text-lg font-bold text-green-400">{formatValue(analysis.totalBuy)}</p></div></div></Card>
            <Card className="p-3 bg-gradient-to-br from-red-500/10 to-red-500/5"><div className="flex items-center gap-2"><ArrowDownRight className="w-5 h-5 text-red-400" /><div><p className="text-[10px] text-gray-500">Total Jual</p><p className="text-lg font-bold text-red-400">{formatValue(analysis.totalSell)}</p></div></div></Card>
            <Card className="p-3"><div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-400" /><div><p className="text-[10px] text-gray-500">Transaksi</p><p className="text-lg font-bold text-blue-400">{movements.length}</p></div></div></Card>
            <Card className={`p-3 ${analysis.netFlow >= 0 ? 'bg-gradient-to-br from-green-500/10 to-green-500/5' : 'bg-gradient-to-br from-red-500/10 to-red-500/5'}`}><div className="flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /><div><p className="text-[10px] text-gray-500">Net Flow</p><p className={`text-lg font-bold ${analysis.netFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>{analysis.netFlow >= 0 ? '+' : ''}{formatValue(analysis.netFlow)}</p></div></div></Card>
            <Card className="p-3"><div className="flex items-center gap-2"><Globe className="w-5 h-5 text-purple-400" /><div><p className="text-[10px] text-gray-500">Asing Beli</p><p className="text-lg font-bold text-purple-400">{formatValue(analysis.foreignBuy)}</p></div></div></Card>
            <Card className={`p-3 ${analysis.foreignNet >= 0 ? 'bg-gradient-to-br from-purple-500/10 to-purple-500/5' : ''}`}><div className="flex items-center gap-2"><Globe className="w-5 h-5 text-purple-400" /><div><p className="text-[10px] text-gray-500">Asing Net</p><p className={`text-lg font-bold ${analysis.foreignNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>{analysis.foreignNet >= 0 ? '+' : ''}{formatValue(analysis.foreignNet)}</p></div></div></Card>
          </div>

          {/* Top Active Holders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="overflow-hidden">
              <div className="p-3 border-b border-gray-800 bg-gradient-to-r from-cyan-500/10 to-transparent">
                <h3 className="font-bold text-white flex items-center gap-2"><UserCheck className="w-4 h-4 text-cyan-400" />Top Holder Aktif</h3>
              </div>
              <div className="divide-y divide-gray-800 max-h-[250px] overflow-y-auto">
                {analysis.topHolders.slice(0, 8).map((h, i) => (
                  <div key={h.name} className="flex items-center gap-2 p-2.5 hover:bg-white/5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{h.name}</p>
                      <p className="text-[10px] text-gray-500">{h.symbols.join(', ')}</p>
                    </div>
                    {getNationalityBadge(h.nationality)}
                    <span className={`font-bold text-sm ${h.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>{h.net >= 0 ? '+' : ''}{formatValue(h.net)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="p-3 border-b border-gray-800 bg-gradient-to-r from-purple-500/10 to-transparent">
                <h3 className="font-bold text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-400" />Top Saham Aktif</h3>
              </div>
              <div className="divide-y divide-gray-800 max-h-[250px] overflow-y-auto">
                {analysis.topSymbols.slice(0, 8).map((s, i) => (
                  <div key={s.symbol} className="flex items-center gap-2 p-2.5 hover:bg-white/5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'}`}>{i + 1}</span>
                    <span className="font-bold text-white">{s.symbol}</span>
                    <span className="text-xs text-gray-500">{s.count}x</span>
                    <div className="ml-auto flex gap-2">
                      <span className="text-xs text-green-400">+{formatValue(s.buyVol)}</span>
                      <span className="text-xs text-red-400">-{formatValue(s.sellVol)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Major Holders > 5% */}
          {analysis.uniqueMajorHolders.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-3 border-b border-gray-800 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
                <h3 className="font-bold text-white flex items-center gap-2"><Crown className="w-5 h-5 text-yellow-400" />Pemegang Saham Diatas 5%</h3>
                <p className="text-xs text-gray-500">Major shareholders dengan kepemilikan signifikan</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-black/30 text-left"><th className="px-3 py-2 text-xs text-gray-500">Nama</th><th className="px-3 py-2 text-xs text-gray-500">Saham</th><th className="px-3 py-2 text-xs text-gray-500">Tipe</th><th className="px-3 py-2 text-xs text-gray-500 text-right">% Kepemilikan</th><th className="px-3 py-2 text-xs text-gray-500 text-right">Perubahan</th><th className="px-3 py-2 text-xs text-gray-500">Sumber</th></tr></thead>
                  <tbody className="divide-y divide-gray-800">
                    {analysis.uniqueMajorHolders.slice(0, 15).map(m => {
                      const changePct = parseFloat(m.changes?.percentage || '0');
                      return (
                        <tr key={m.id} className="hover:bg-white/5">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{m.name}</span>
                              {m.badges?.includes('SHAREHOLDER_BADGE_PENGENDALI') && <span className="text-yellow-400 text-xs">👑</span>}
                              {getNationalityBadge(m.nationality)}
                            </div>
                          </td>
                          <td className="px-3 py-2"><span className="font-bold text-cyan-400">{m.symbol}</span></td>
                          <td className="px-3 py-2">{getActionBadge(m.action_type)}</td>
                          <td className="px-3 py-2 text-right"><span className="font-bold text-white">{parseFloat(m.current?.percentage || 0).toFixed(2)}%</span></td>
                          <td className="px-3 py-2 text-right"><span className={`font-bold ${changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>{changePct >= 0 ? '+' : ''}{changePct.toFixed(4)}%</span></td>
                          <td className="px-3 py-2"><span className="text-xs text-gray-400">{m.data_source?.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Insight */}
          <Card className="p-4 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 border-cyan-500/20">
            <h3 className="font-bold text-white flex items-center gap-2 mb-3"><Zap className="w-5 h-5 text-cyan-400" />Analisa Profesional</h3>
            <div className="space-y-2 text-sm text-gray-300">
              {analysis.sentiment === 'AKUMULASI' && <p className="text-green-400 font-semibold">📈 AKUMULASI: Insider lebih banyak membeli, sinyal percaya diri terhadap prospek perusahaan</p>}
              {analysis.sentiment === 'DISTRIBUSI' && <p className="text-red-400 font-semibold">📉 DISTRIBUSI: Insider lebih banyak menjual, perlu waspada terhadap potensi penurunan</p>}
              {analysis.foreignNet > 0 && <p className="text-purple-400">🌍 <strong>Foreign Net Buy:</strong> Institusi asing sedang akumulasi - sinyal positif dari investor global</p>}
              {analysis.foreignNet < 0 && <p className="text-orange-400">🌍 <strong>Foreign Net Sell:</strong> Institusi asing sedang keluar - perlu perhatian lebih</p>}
              {analysis.uniqueMajorHolders.filter(m => m.badges?.includes('SHAREHOLDER_BADGE_PENGENDALI')).length > 0 && <p className="text-yellow-400">👑 <strong>Aktivitas Pengendali:</strong> Pemegang saham pengendali aktif bertransaksi - perhatikan arah aksinya</p>}
              <p className="text-gray-400 mt-2">• Beli: <strong className="text-green-400">{analysis.buyCount}</strong> transaksi | Jual: <strong className="text-red-400">{analysis.sellCount}</strong> transaksi</p>
              <p className="text-gray-400">• Lokal Net: <strong className={analysis.localBuy - analysis.localSell >= 0 ? 'text-green-400' : 'text-red-400'}>{formatValue(analysis.localBuy - analysis.localSell)}</strong> | Asing Net: <strong className={analysis.foreignNet >= 0 ? 'text-green-400' : 'text-red-400'}>{formatValue(analysis.foreignNet)}</strong></p>
            </div>
          </Card>
        </>
      )}

      {/* Movement List */}
      <Card className="overflow-hidden">
        <div className="p-3 border-b border-gray-800 flex items-center justify-between">
          <div><h3 className="font-bold text-white">Riwayat Pergerakan</h3><p className="text-xs text-gray-500">{movements.length} data</p></div>
          <Button onClick={() => fetchData()} variant="ghost" size="sm" loading={isLoading} icon={<RefreshCw size={14} />}>Refresh</Button>
        </div>

        {isLoading && <div className="py-12"><LoadingSpinner message="Memuat data..." /></div>}
        {!isLoading && movements.length === 0 && <div className="py-12 text-center text-gray-500"><Users className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>Tidak ada data insider</p></div>}

        {!isLoading && movements.length > 0 && (
          <div className="divide-y divide-gray-800/50 max-h-[500px] overflow-y-auto">
            {movements.map((m, i) => {
              const changePct = parseFloat(m.changes?.percentage || '0');
              const currentPct = parseFloat(m.current?.percentage || '0');
              const isBuy = m.action_type?.includes('BUY') || changePct > 0;
              return (
                <div key={m.id || i} className={`p-3 hover:bg-white/5 ${currentPct >= 5 ? 'border-l-2 border-yellow-500 bg-yellow-500/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBuy ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {isBuy ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-cyan-400">{m.symbol}</span>
                        {getActionBadge(m.action_type)}
                        {getNationalityBadge(m.nationality)}
                        {m.badges?.includes('SHAREHOLDER_BADGE_PENGENDALI') && <span className="px-1.5 py-0.5 text-[9px] bg-yellow-500/30 text-yellow-300 rounded font-bold">👑 PENGENDALI</span>}
                        {currentPct >= 5 && <span className="px-1.5 py-0.5 text-[9px] bg-orange-500/30 text-orange-300 rounded font-bold">≥5%</span>}
                      </div>
                      <p className="text-sm text-white font-medium truncate">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.date} • {m.data_source?.label}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-white">{currentPct.toFixed(2)}%</p>
                      <p className={`text-sm font-semibold ${changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>{changePct >= 0 ? '+' : ''}{changePct.toFixed(4)}%</p>
                      <p className="text-[10px] text-gray-500">{formatValue(parseValue(m.changes?.value))} lbr</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && movements.length > 0 && hasMore && (
          <div className="p-3 text-center border-t border-gray-800">
            <Button onClick={() => fetchData(true)} variant="ghost" size="sm" loading={isLoading}>Load More</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default InsiderView;
