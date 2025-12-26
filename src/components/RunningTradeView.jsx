import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Activity, Search, Calendar, Filter, RefreshCw, AlertCircle,
  ArrowUpCircle, ArrowDownCircle, X, Clock, TrendingUp, TrendingDown,
  Loader2, BarChart3, Settings, Crown, Zap, Target,
  PieChart, Shield, UserCheck, AlertTriangle, HelpCircle, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { Card, Button, LoadingSpinner } from './ui';
import { getRunningTrade, hasToken } from '../services/stockbitService';

// Constants
const BANDAR_LOT_THRESHOLD = 500;
const BIG_TRADE_THRESHOLD = 1000;
const SPLIT_TIME_THRESHOLD = 2;

const DEMO_TRADES = [
  { id: '1', time: '16:00:00', action: 'buy', code: 'PSAB', price: '545', change: '-0.91%', lot: '9,272', buyer: 'EP [D]', seller: 'AZ [D]', trade_number: '3536997', buyer_type: 'BROKER_TYPE_LOCAL', seller_type: 'BROKER_TYPE_LOCAL', market_board: 'RG' },
  { id: '2', time: '16:00:00', action: 'buy', code: 'PSAB', price: '545', change: '-0.91%', lot: '500', buyer: 'EP [D]', seller: 'YP [D]', trade_number: '3536996', buyer_type: 'BROKER_TYPE_LOCAL', seller_type: 'BROKER_TYPE_FOREIGN', market_board: 'RG' },
  { id: '3', time: '16:00:00', action: 'buy', code: 'PSAB', price: '545', change: '-0.91%', lot: '200', buyer: 'EP [D]', seller: 'XC [D]', trade_number: '3536995', buyer_type: 'BROKER_TYPE_LOCAL', seller_type: 'BROKER_TYPE_LOCAL', market_board: 'RG' },
  { id: '4', time: '16:00:01', action: 'sell', code: 'PSAB', price: '545', change: '-0.91%', lot: '3,313', buyer: 'ZP [F]', seller: 'AZ [D]', trade_number: '3536994', buyer_type: 'BROKER_TYPE_FOREIGN', seller_type: 'BROKER_TYPE_LOCAL', market_board: 'RG' },
  { id: '5', time: '15:49:26', action: 'buy', code: 'PSAB', price: '540', change: '-1.82%', lot: '700', buyer: 'AZ [D]', seller: 'YP [D]', trade_number: '3520341', buyer_type: 'BROKER_TYPE_LOCAL', seller_type: 'BROKER_TYPE_FOREIGN', market_board: 'RG' },
];

const parseLot = (lot) => parseInt(String(lot).replace(/,/g, '') || '0');
const formatValue = (num) => {
  if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString('id-ID');
};
const getBrokerCode = (broker) => broker?.split(' ')[0] || broker;
const parseTime = (time) => { const [h, m, s] = time.split(':').map(Number); return h * 3600 + m * 60 + s; };

const RunningTradeView = ({ onNavigateToSettings }) => {
  const [symbol, setSymbol] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionType, setActionType] = useState('');
  const [marketBoard, setMarketBoard] = useState('');
  const [minimumLot, setMinimumLot] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [trades, setTrades] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastTradeNumber, setLastTradeNumber] = useState(null);
  const [useDemo, setUseDemo] = useState(false);

  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Analysis
  const analysis = useMemo(() => {
    if (trades.length === 0) return null;
    let buyVolume = 0, sellVolume = 0, buyCount = 0, sellCount = 0, totalValue = 0, bigTradeCount = 0;
    const brokerNetMap = {};
    const brokerTypeStats = { local: { buy: 0, sell: 0 }, foreign: { buy: 0, sell: 0 }, govt: { buy: 0, sell: 0 }};
    const splitGroups = [];
    let currentGroup = null;
    const sortedTrades = [...trades].sort((a, b) => parseTime(b.time) - parseTime(a.time));

    sortedTrades.forEach((trade, idx) => {
      const lot = parseLot(trade.lot);
      const price = parseInt(String(trade.price).replace(/,/g, '')) || 0;
      const buyerCode = getBrokerCode(trade.buyer);
      const sellerCode = getBrokerCode(trade.seller);
      const tradeTime = parseTime(trade.time);

      totalValue += lot * price * 100;
      if (lot >= BIG_TRADE_THRESHOLD) bigTradeCount++;
      if (trade.action === 'buy') { buyVolume += lot; buyCount++; } else { sellVolume += lot; sellCount++; }

      // Net position
      if (!brokerNetMap[buyerCode]) brokerNetMap[buyerCode] = { code: buyerCode, net: 0, buy: 0, sell: 0, buyCount: 0, sellCount: 0, type: trade.buyer_type };
      brokerNetMap[buyerCode].buy += lot; brokerNetMap[buyerCode].buyCount++; brokerNetMap[buyerCode].net += lot;
      if (!brokerNetMap[sellerCode]) brokerNetMap[sellerCode] = { code: sellerCode, net: 0, buy: 0, sell: 0, buyCount: 0, sellCount: 0, type: trade.seller_type };
      brokerNetMap[sellerCode].sell += lot; brokerNetMap[sellerCode].sellCount++; brokerNetMap[sellerCode].net -= lot;

      const buyerTypeKey = trade.buyer_type?.includes('FOREIGN') ? 'foreign' : trade.buyer_type?.includes('GOVERNMENT') ? 'govt' : 'local';
      const sellerTypeKey = trade.seller_type?.includes('FOREIGN') ? 'foreign' : trade.seller_type?.includes('GOVERNMENT') ? 'govt' : 'local';
      brokerTypeStats[buyerTypeKey].buy += lot;
      brokerTypeStats[sellerTypeKey].sell += lot;

      // Split detection
      if (idx > 0) {
        const prev = sortedTrades[idx - 1];
        const prevTime = parseTime(prev.time);
        const timeDiff = Math.abs(tradeTime - prevTime);
        const isSameBuyer = buyerCode === getBrokerCode(prev.buyer) && trade.action === 'buy' && prev.action === 'buy';
        const isSameSeller = sellerCode === getBrokerCode(prev.seller) && trade.action === 'sell' && prev.action === 'sell';
        if (timeDiff <= SPLIT_TIME_THRESHOLD && (isSameBuyer || isSameSeller)) {
          if (!currentGroup) { currentGroup = { broker: isSameBuyer ? buyerCode : sellerCode, action: trade.action, trades: [prev], totalLot: parseLot(prev.lot), time: prev.time }; }
          currentGroup.trades.push(trade); currentGroup.totalLot += lot;
        } else if (currentGroup) { if (currentGroup.trades.length >= 2) splitGroups.push(currentGroup); currentGroup = null; }
      }
    });
    if (currentGroup && currentGroup.trades.length >= 2) splitGroups.push(currentGroup);

    // Broker profiles
    const brokerProfiles = Object.values(brokerNetMap).map(b => {
      const totalTx = b.buyCount + b.sellCount;
      const totalLot = b.buy + b.sell;
      const avgLot = totalTx > 0 ? totalLot / totalTx : 0;
      const brokerSplits = splitGroups.filter(g => g.broker === b.code);
      let classification = 'RETAIL', classColor = 'text-gray-400', emoji = '👤';
      if (avgLot >= BIG_TRADE_THRESHOLD || totalLot >= BIG_TRADE_THRESHOLD * 5) { classification = 'BANDAR BESAR'; classColor = 'text-yellow-400'; emoji = '🐋'; }
      else if (avgLot >= BANDAR_LOT_THRESHOLD || totalLot >= BANDAR_LOT_THRESHOLD * 10 || brokerSplits.length >= 2) { classification = 'BANDAR'; classColor = 'text-cyan-400'; emoji = '🦈'; }
      else if (avgLot >= 100 || totalLot >= 1000) { classification = 'TRADER'; classColor = 'text-blue-400'; emoji = '📊'; }
      return { ...b, totalTx, totalLot, avgLot, classification, classColor, emoji, splitOrders: brokerSplits };
    }).sort((a, b) => b.totalLot - a.totalLot);

    const totalVolume = buyVolume + sellVolume;
    const buyPercent = totalVolume > 0 ? (buyVolume / totalVolume * 100) : 50;
    const netPositions = Object.values(brokerNetMap).sort((a, b) => b.net - a.net);
    const topAccumulators = netPositions.filter(b => b.net > 0).slice(0, 5);
    const topDistributors = netPositions.filter(b => b.net < 0).sort((a, b) => a.net - b.net).slice(0, 5);
    let sentiment = 'NETRAL', sentimentColor = 'text-gray-400', sentimentEmoji = '⚖️';
    if (buyPercent > 60) { sentiment = 'BULLISH'; sentimentColor = 'text-green-400'; sentimentEmoji = '🚀'; }
    else if (buyPercent < 40) { sentiment = 'BEARISH'; sentimentColor = 'text-red-400'; sentimentEmoji = '📉'; }
    const foreignNet = brokerTypeStats.foreign.buy - brokerTypeStats.foreign.sell;

    return { buyVolume, sellVolume, buyCount, sellCount, buyPercent, sellPercent: 100 - buyPercent, totalVolume, totalValue, bigTradeCount, topAccumulators, topDistributors, brokerTypeStats, foreignNet, sentiment, sentimentColor, sentimentEmoji, splitGroups, brokerProfiles };
  }, [trades]);

  const fetchTrades = useCallback(async (isLoadMore = false) => {
    if (!symbol.trim()) { setError('Masukkan kode saham'); return; }
    if (!hasToken()) { setError('Token belum diset - Demo mode'); setTrades(DEMO_TRADES); setUseDemo(true); return; }
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setTrades([]);
      setLastTradeNumber(null);
      setHasMore(true);
    }
    setError(null);
    try {
      const response = await getRunningTrade({ symbol: symbol.toUpperCase(), date, limit: 50, tradeNumber: isLoadMore ? lastTradeNumber : null, actionType: actionType || null, marketBoard: marketBoard || null, minimumLot: minimumLot ? parseInt(minimumLot) : null });
      if (response.data?.running_trade) {
        const newTrades = response.data.running_trade;
        if (newTrades.length === 0) setHasMore(false);
        else { setLastTradeNumber(newTrades[newTrades.length - 1].trade_number); isLoadMore ? setTrades(prev => [...prev, ...newTrades]) : setTrades(newTrades); if (newTrades.length < 50) setHasMore(false); }
        setUseDemo(false);
      }
    } catch (err) { if (err.message.includes('CORS')) { setError('CORS - Demo mode'); if (!isLoadMore) { setTrades(DEMO_TRADES); setUseDemo(true); } } else setError(err.message); setHasMore(false); }
    finally { setIsLoading(false); setIsLoadingMore(false); }
  }, [symbol, date, actionType, marketBoard, minimumLot, lastTradeNumber]);

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && hasMore && !isLoadingMore && !isLoading && trades.length > 0) fetchTrades(true); }, { threshold: 0.1 });
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoadingMore, isLoading, trades.length, fetchTrades]);

  const handleSearch = (e) => { e.preventDefault(); fetchTrades(false); };
  const getBrokerBadge = (type) => {
    if (type?.includes('FOREIGN')) return <span className="px-1 py-0.5 text-[9px] bg-purple-500/30 text-purple-300 rounded font-bold">F</span>;
    if (type?.includes('GOVERNMENT')) return <span className="px-1 py-0.5 text-[9px] bg-orange-500/30 text-orange-300 rounded font-bold">G</span>;
    return <span className="px-1 py-0.5 text-[9px] bg-blue-500/30 text-blue-300 rounded font-bold">D</span>;
  };
  const getLotBadge = (lot) => {
    if (lot >= BIG_TRADE_THRESHOLD) return <span className="px-1.5 py-0.5 text-[9px] bg-yellow-500/30 text-yellow-300 rounded font-bold animate-pulse">🐋 WHALE</span>;
    if (lot >= BANDAR_LOT_THRESHOLD) return <span className="px-1.5 py-0.5 text-[9px] bg-cyan-500/30 text-cyan-300 rounded font-bold">BIG</span>;
    return null;
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6" /> Daily Transaksi
            {analysis && <span className={`text-base ${analysis.sentimentColor}`}>{analysis.sentimentEmoji} {analysis.sentiment}</span>}
          </h1>
          <p className="text-gray-500 text-sm">Analisa Running Trade, Bandar & Split Order {useDemo && <span className="text-yellow-500">(Demo)</span>}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowGuide(!showGuide)} variant={showGuide ? 'primary' : 'outline'} size="sm" icon={<HelpCircle size={14} />}>Panduan</Button>
          <Button onClick={() => setShowAnalysis(!showAnalysis)} variant={showAnalysis ? 'primary' : 'secondary'} size="sm" icon={<PieChart size={14} />}>Analisa</Button>
          <Button onClick={() => setShowFilters(!showFilters)} variant={showFilters ? 'primary' : 'secondary'} size="sm" icon={<Filter size={14} />}>Filter</Button>
        </div>
      </div>

      {/* User Guide */}
      {showGuide && (
        <Card className="p-4 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-3">📖 Panduan Penggunaan</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-cyan-400 mb-2">🔍 Cara Menggunakan:</h4>
                  <ol className="space-y-1 text-gray-300 list-decimal list-inside">
                    <li>Masukkan <strong>kode saham</strong> (contoh: BBRI, TLKM)</li>
                    <li>Pilih <strong>tanggal</strong> transaksi</li>
                    <li>Klik <strong>"Cari"</strong> untuk memuat data</li>
                    <li>Scroll ke bawah untuk <strong>load more</strong></li>
                    <li>Gunakan <strong>Filter</strong> untuk mempersempit data</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold text-cyan-400 mb-2">📊 Memahami Analisa:</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li><strong className="text-green-400">BUY</strong> = Pembeli agresif menyerang offer</li>
                    <li><strong className="text-red-400">SELL</strong> = Penjual agresif menyerang bid</li>
                    <li><strong className="text-yellow-400">🐋 WHALE</strong> = Transaksi ≥ 1000 lot</li>
                    <li><strong className="text-cyan-400">BIG</strong> = Transaksi ≥ 500 lot</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-400 mb-2">🔀 Deteksi Split Order:</h4>
                  <p className="text-gray-300">Sistem mendeteksi transaksi berurutan (≤2 detik) dari broker yang sama. Ini indikasi <strong>bandar menyamarkan order besar</strong> dengan memecah jadi kecil-kecil.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-400 mb-2">👥 Klasifikasi Broker:</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li><strong className="text-yellow-400">🐋 BANDAR BESAR</strong> = Avg lot ≥1000</li>
                    <li><strong className="text-cyan-400">🦈 BANDAR</strong> = Avg lot ≥500 / split banyak</li>
                    <li><strong className="text-blue-400">📊 TRADER</strong> = Avg lot ≥100</li>
                    <li><strong className="text-gray-400">👤 RETAIL</strong> = Transaksi kecil</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg">
                <h4 className="font-semibold text-green-400 mb-2">💡 Tips Analisa:</h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Jika <strong>Buy dominan (&gt;60%)</strong> + Bandar akumulasi → Potensi <strong className="text-green-400">BULLISH</strong></li>
                  <li>• Jika <strong>Sell dominan (&gt;60%)</strong> + Bandar distribusi → Potensi <strong className="text-red-400">BEARISH</strong></li>
                  <li>• Perhatikan <strong>Foreign Net</strong>: Asing buy = sinyal positif</li>
                  <li>• <strong>Split Order</strong> banyak di BUY = bandar lagi akumulasi diam-diam</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Kode saham: BBRI, TLKM..." className="w-full pl-9 pr-4 py-2.5 bg-black border-2 border-gray-800 rounded-xl text-white placeholder:text-gray-600 focus:border-gray-600" />
            </div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-40 px-4 py-2.5 bg-black border-2 border-gray-800 rounded-xl text-white" />
            <Button type="submit" variant="primary" loading={isLoading} className="sm:w-auto"><Search size={16} />Cari</Button>
          </div>
          {showFilters && (
            <div className="pt-3 border-t border-gray-800 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <select value={actionType} onChange={(e) => setActionType(e.target.value)} className="px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm"><option value="">Semua Tipe</option><option value="RUNNING_TRADE_ACTION_TYPE_BUY">Buy Only</option><option value="RUNNING_TRADE_ACTION_TYPE_SELL">Sell Only</option></select>
              <select value={marketBoard} onChange={(e) => setMarketBoard(e.target.value)} className="px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm"><option value="">Semua Pasar</option><option value="BOARD_TYPE_REGULAR">Regular</option><option value="BOARD_TYPE_NEGOTIATION">Nego</option></select>
              <input type="number" value={minimumLot} onChange={(e) => setMinimumLot(e.target.value)} placeholder="Min Lot" className="px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm" />
              <button type="button" onClick={() => { setActionType(''); setMarketBoard(''); setMinimumLot(''); }} className="px-3 py-2 border border-gray-800 rounded-lg text-gray-400 hover:text-white text-sm flex items-center justify-center gap-1"><X size={14} />Reset</button>
            </div>
          )}
        </form>
      </Card>

      {error && <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4 text-yellow-500" /><span className="text-yellow-400">{error}</span></div>}

      {/* Analysis */}
      {analysis && showAnalysis && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="p-3 bg-gradient-to-br from-green-500/10 to-green-500/5"><div className="flex items-center gap-2"><ArrowUpCircle className="w-5 h-5 text-green-400" /><div><p className="text-[10px] text-gray-500">Buy Volume</p><p className="text-lg font-bold text-green-400">{formatValue(analysis.buyVolume)}</p></div></div></Card>
            <Card className="p-3 bg-gradient-to-br from-red-500/10 to-red-500/5"><div className="flex items-center gap-2"><ArrowDownCircle className="w-5 h-5 text-red-400" /><div><p className="text-[10px] text-gray-500">Sell Volume</p><p className="text-lg font-bold text-red-400">{formatValue(analysis.sellVolume)}</p></div></div></Card>
            <Card className="p-3"><div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-400" /><div><p className="text-[10px] text-gray-500">Transaksi</p><p className="text-lg font-bold text-blue-400">{trades.length}</p></div></div></Card>
            <Card className="p-3"><div className="flex items-center gap-2"><span className="text-xl">🐋</span><div><p className="text-[10px] text-gray-500">Big Trade</p><p className="text-lg font-bold text-yellow-400">{analysis.bigTradeCount}</p></div></div></Card>
            <Card className="p-3"><div className="flex items-center gap-2"><span className="text-xl">🔀</span><div><p className="text-[10px] text-gray-500">Split Order</p><p className="text-lg font-bold text-orange-400">{analysis.splitGroups.length}</p></div></div></Card>
            <Card className={`p-3 ${analysis.foreignNet >= 0 ? 'bg-gradient-to-br from-purple-500/10 to-purple-500/5' : 'bg-gradient-to-br from-red-500/10 to-red-500/5'}`}><div className="flex items-center gap-2"><span className="text-xl">🌍</span><div><p className="text-[10px] text-gray-500">Foreign Net</p><p className={`text-lg font-bold ${analysis.foreignNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>{analysis.foreignNet >= 0 ? '+' : ''}{formatValue(analysis.foreignNet)}</p></div></div></Card>
          </div>

          {/* Dominance Bar */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400 font-bold">BUY {analysis.buyPercent.toFixed(1)}%</span>
              <Target className="w-5 h-5 text-gray-500" />
              <span className="text-red-400 font-bold">SELL {analysis.sellPercent.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
              <div className="bg-gradient-to-r from-green-600 to-green-400 h-full transition-all duration-500" style={{ width: `${analysis.buyPercent}%` }} />
              <div className="bg-gradient-to-r from-red-400 to-red-600 h-full transition-all duration-500" style={{ width: `${analysis.sellPercent}%` }} />
            </div>
          </Card>

          {/* Split Orders Warning */}
          {analysis.splitGroups.length > 0 && (
            <Card className="p-4 border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-yellow-500/5">
              <h3 className="font-bold text-white flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-orange-400" />⚠️ Split Order Terdeteksi ({analysis.splitGroups.length})</h3>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {analysis.splitGroups.map((g, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{g.broker}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${g.action === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{g.action.toUpperCase()}</span>
                      <span className="text-xs text-gray-500">@ {g.time}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-orange-400">{formatValue(g.totalLot)} lot</span>
                      <span className="text-xs text-gray-500 ml-2">({g.trades.length}x split)</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Broker Profiles */}
          <Card className="overflow-hidden">
            <div className="p-3 border-b border-gray-800 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2"><UserCheck className="w-5 h-5 text-cyan-400" />Profil Broker</h3>
              <span className="text-xs text-gray-500">{analysis.brokerProfiles.length} broker</span>
            </div>
            <div className="divide-y divide-gray-800 max-h-[280px] overflow-y-auto">
              {analysis.brokerProfiles.slice(0, 12).map((b, i) => (
                <div key={b.code} className="flex items-center gap-2 p-2.5 hover:bg-white/5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white">{b.code}</span>
                      {getBrokerBadge(b.type)}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${b.classColor} bg-white/5`}>{b.emoji} {b.classification}</span>
                      {b.splitOrders.length > 0 && <span className="text-[9px] text-orange-400">🔀{b.splitOrders.length}</span>}
                    </div>
                    <p className="text-[10px] text-gray-500">Avg: {formatValue(b.avgLot)}/tx • {b.totalTx}tx</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${b.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>{b.net >= 0 ? '+' : ''}{formatValue(b.net)}</p>
                    <p className="text-[10px] text-gray-500">{formatValue(b.totalLot)} lot</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Accum & Distrib */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-3">
              <h4 className="font-bold text-white flex items-center gap-2 mb-2"><Crown className="w-4 h-4 text-green-400" />Top Akumulasi</h4>
              <div className="space-y-1.5">
                {analysis.topAccumulators.slice(0, 4).map((b, i) => (
                  <div key={b.code} className="flex items-center justify-between p-2 bg-green-500/5 rounded-lg">
                    <div className="flex items-center gap-2"><span className="text-xs text-gray-500">{i + 1}.</span><span className="font-bold text-white">{b.code}</span></div>
                    <span className="font-bold text-green-400">+{formatValue(b.net)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-3">
              <h4 className="font-bold text-white flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-red-400" />Top Distribusi</h4>
              <div className="space-y-1.5">
                {analysis.topDistributors.slice(0, 4).map((b, i) => (
                  <div key={b.code} className="flex items-center justify-between p-2 bg-red-500/5 rounded-lg">
                    <div className="flex items-center gap-2"><span className="text-xs text-gray-500">{i + 1}.</span><span className="font-bold text-white">{b.code}</span></div>
                    <span className="font-bold text-red-400">{formatValue(b.net)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Running Trade List */}
      <Card className="overflow-hidden">
        <div className="p-3 border-b border-gray-800 flex items-center justify-between">
          <div><h3 className="font-bold text-white">Running Trade</h3><p className="text-xs text-gray-500">{trades.length} transaksi dimuat</p></div>
          {trades.length > 0 && <Button onClick={() => fetchTrades(false)} variant="ghost" size="sm" loading={isLoading} icon={<RefreshCw size={14} />}>Refresh</Button>}
        </div>
        
        {isLoading && <div className="py-12"><LoadingSpinner message="Memuat data..." /></div>}
        {!isLoading && trades.length === 0 && <div className="py-12 text-center text-gray-500"><Activity className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>Masukkan kode saham dan klik Cari</p></div>}
        
        {!isLoading && trades.length > 0 && (
          <div className="divide-y divide-gray-800/50 max-h-[500px] overflow-y-auto">
            {trades.map((trade, i) => {
              const lot = parseLot(trade.lot);
              const price = parseInt(String(trade.price).replace(/,/g, ''));
              const value = lot * price * 100;
              const isBig = lot >= BANDAR_LOT_THRESHOLD;
              return (
                <div key={trade.id || i} className={`p-3 hover:bg-white/5 transition-colors ${isBig ? 'bg-yellow-500/5 border-l-2 border-yellow-500' : ''}`}>
                  {/* Mobile & Desktop Layout */}
                  <div className="flex items-start gap-3">
                    {/* Time & Action */}
                    <div className="flex flex-col items-center gap-1">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${trade.action === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {trade.action === 'buy' ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">{trade.time}</span>
                    </div>
                    
                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${trade.action === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {trade.action.toUpperCase()}
                        </span>
                        <span className="font-bold text-white text-lg">{price.toLocaleString()}</span>
                        <span className={`text-xs ${trade.change?.startsWith('-') ? 'text-red-400' : 'text-green-400'}`}>{trade.change}</span>
                        {getLotBadge(lot)}
                      </div>
                      
                      {/* Broker Info */}
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">B:</span>
                          <span className="text-white font-medium">{trade.buyer}</span>
                          {getBrokerBadge(trade.buyer_type)}
                        </div>
                        <span className="text-gray-600">→</span>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">S:</span>
                          <span className="text-white font-medium">{trade.seller}</span>
                          {getBrokerBadge(trade.seller_type)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Lot & Value */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-white text-lg">{trade.lot}</p>
                      <p className="text-[10px] text-gray-500">≈ {formatValue(value)}</p>
                      <span className="text-[9px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">{trade.market_board}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {!isLoading && trades.length > 0 && hasMore && (
          <div ref={loadMoreRef} className="p-3 text-center border-t border-gray-800">
            {isLoadingMore ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /> : <span className="text-xs text-gray-500">↓ Scroll untuk load more</span>}
          </div>
        )}
        {!isLoading && trades.length > 0 && !hasMore && <div className="p-2 text-center text-xs text-gray-600">Semua data dimuat ✓</div>}
      </Card>
    </div>
  );
};

export default RunningTradeView;
