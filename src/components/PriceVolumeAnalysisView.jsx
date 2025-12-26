import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Activity,
  BarChart3, Calendar, HelpCircle, Info, ArrowUp, ArrowDown, Minus,
  AlertTriangle, CheckCircle, XCircle, Target, Zap, Users, DollarSign, Flame, Sparkles
} from 'lucide-react';
import { Card, Button, LoadingSpinner } from './ui';
import { getPriceVolumeHistory, getMarketMovers, hasToken } from '../services/stockbitService';
import { analyzeWithAI, generatePVAPrompt } from '../services/aiService';

// Demo data for testing
const DEMO_HISTORY = [
  { date: "2025-12-01", close: 1625, change: -250, value: 1026408798500, volume: 5634603, frequency: 153752, foreign_buy: 102915893500, foreign_sell: 163713585500, net_foreign: -60797692000, change_percentage: -13.33 },
  { date: "2025-11-03", close: 1875, change: 315, value: 2325414594500, volume: 13258111, frequency: 274258, foreign_buy: 355153449000, foreign_sell: 412145030500, net_foreign: -56991581500, change_percentage: 20.19 },
  { date: "2025-10-01", close: 1560, change: -245, value: 2728439754500, volume: 14084808, frequency: 347695, foreign_buy: 463184415000, foreign_sell: 588781078000, net_foreign: -125596663000, change_percentage: -13.57 },
  { date: "2025-09-01", close: 1805, change: -535, value: 2209491024000, volume: 11478899, frequency: 240121, foreign_buy: 438463946000, foreign_sell: 591710428500, net_foreign: -153246482500, change_percentage: -22.86 },
  { date: "2025-08-01", close: 2340, change: -260, value: 2235393997000, volume: 9074553, frequency: 238745, foreign_buy: 519970077000, foreign_sell: 595477871000, net_foreign: -75507794000, change_percentage: -10 },
  { date: "2025-07-01", close: 2600, change: 1010, value: 4592089789000, volume: 18691496, frequency: 406570, foreign_buy: 863586959500, foreign_sell: 1449695478000, net_foreign: -586108518500, change_percentage: 63.52 },
  { date: "2025-06-02", close: 1590, change: 575, value: 955615059000, volume: 6801802, frequency: 77779, foreign_buy: 237726842000, foreign_sell: 377148995000, net_foreign: -139422153000, change_percentage: 56.65 },
  { date: "2025-05-02", close: 1015, change: 170, value: 342535060500, volume: 3903517, frequency: 26933, foreign_buy: 55402075500, foreign_sell: 169843451500, net_foreign: -114441376000, change_percentage: 20.12 },
];

// ====== HELPER FUNCTIONS ======
const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return '-';
  const n = parseFloat(num);
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(decimals) + ' T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(decimals) + ' B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(decimals) + ' M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(decimals) + ' K';
  return n.toLocaleString('id-ID', { maximumFractionDigits: decimals });
};

const formatPercent = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return val >= 0 ? `+${val.toFixed(2)}%` : `${val.toFixed(2)}%`;
};

const getDateRange = (months) => {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
};

// ====== PVA ANALYSIS FUNCTIONS ======
const analyzeSingleStock = (item) => {
  const value = item.value?.raw || 0;
  const netForeignBuy = item.net_foreign_buy?.raw || 0;
  const netForeignSell = item.net_foreign_sell?.raw || 0;
  const netForeign = netForeignBuy - netForeignSell;
  const change = item.change?.percentage || 0;
  const volume = item.volume?.raw || 0;

  // Churning Ratio = |Net Foreign| / Total Value * 100
  const absoluteNetForeign = Math.abs(netForeign);
  const churningRatio = value > 0 ? (absoluteNetForeign / value) * 100 : 0;
  
  // Tektokan detection
  const isTektokan = churningRatio < 5 && value > 50e9;
  const tektokanLevel = churningRatio < 2 ? 'HIGH' : churningRatio < 5 ? 'MEDIUM' : 'LOW';

  // PVA Signal based on today's data
  let pvaSignal = 'HOLD';
  let pvaPattern = 'NEUTRAL';
  let pvaEmoji = '⚖️';

  if (change > 0 && netForeign > 0) {
    pvaPattern = 'AKUMULASI KUAT';
    pvaSignal = 'BUY';
    pvaEmoji = '🚀';
  } else if (change > 0 && netForeign < 0) {
    pvaPattern = 'DISTRIBUSI TERSELUBUNG';
    pvaSignal = 'CAUTION';
    pvaEmoji = '⚠️';
  } else if (change < 0 && netForeign > 0) {
    pvaPattern = 'AKUMULASI DI BAWAH';
    pvaSignal = 'ACCUMULATE';
    pvaEmoji = '💰';
  } else if (change < 0 && netForeign < 0) {
    pvaPattern = 'DISTRIBUSI KUAT';
    pvaSignal = 'SELL';
    pvaEmoji = '🔴';
  }

  if (isTektokan) {
    pvaPattern = 'TEKTOKAN BROKER';
    pvaSignal = 'AVOID';
    pvaEmoji = '🔄';
  }

  return {
    ...item,
    netForeign,
    churningRatio,
    isTektokan,
    tektokanLevel,
    pvaSignal,
    pvaPattern,
    pvaEmoji
  };
};

const analyzePVA = (data) => {
  if (!data || data.length < 1) return null;

  // Sort by date ascending
  const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const analysis = sorted.map((item, idx) => {
    const prev = sorted[idx - 1];
    
    const priceChange = prev ? item.close - prev.close : 0;
    const priceChangePercent = prev ? ((item.close - prev.close) / prev.close) * 100 : 0;
    const volumeChange = prev ? item.volume - prev.volume : 0;
    const volumeChangePercent = prev ? ((item.volume - prev.volume) / prev.volume) * 100 : 0;

    const totalValue = item.value;
    const netForeign = item.net_foreign || 0;
    
    // Churning Ratio
    const absoluteNetForeign = Math.abs(netForeign);
    const churningRatio = totalValue > 0 ? (absoluteNetForeign / totalValue) * 100 : 0;
    const isTektokan = churningRatio < 5 && totalValue > 100e9;
    const tektokanLevel = churningRatio < 2 ? 'HIGH' : churningRatio < 5 ? 'MEDIUM' : 'LOW';

    // Retail estimation
    const retailSelling = netForeign > 0 ? -netForeign : Math.abs(netForeign);

    // PVA Pattern
    let pvaPattern = 'NEUTRAL';
    let pvaSignal = 'HOLD';
    let pvaEmoji = '⚖️';

    if (priceChange > 0 && volumeChange > 0 && netForeign > 0) {
      pvaPattern = 'AKUMULASI KUAT';
      pvaSignal = 'BUY';
      pvaEmoji = '🚀';
    } else if (priceChange > 0 && volumeChange > 0 && netForeign < 0) {
      pvaPattern = 'DISTRIBUSI TERSELUBUNG';
      pvaSignal = 'CAUTION';
      pvaEmoji = '⚠️';
    } else if (priceChange > 0 && volumeChange < 0) {
      pvaPattern = 'KENAIKAN LEMAH';
      pvaSignal = 'WEAK BUY';
      pvaEmoji = '📈';
    } else if (priceChange < 0 && volumeChange > 0 && netForeign < 0) {
      pvaPattern = 'DISTRIBUSI KUAT';
      pvaSignal = 'SELL';
      pvaEmoji = '🔴';
    } else if (priceChange < 0 && volumeChange > 0 && netForeign > 0) {
      pvaPattern = 'AKUMULASI DI BAWAH';
      pvaSignal = 'ACCUMULATE';
      pvaEmoji = '💰';
    } else if (priceChange < 0 && volumeChange < 0) {
      pvaPattern = 'PENURUNAN LEMAH';
      pvaSignal = 'HOLD';
      pvaEmoji = '📉';
    }

    if (isTektokan) {
      pvaPattern = 'TEKTOKAN BROKER';
      pvaSignal = 'AVOID';
      pvaEmoji = '🔄';
    }

    return {
      ...item,
      priceChange,
      priceChangePercent,
      volumeChange,
      volumeChangePercent,
      churningRatio,
      isTektokan,
      tektokanLevel,
      pvaPattern,
      pvaSignal,
      pvaEmoji,
      retailSelling
    };
  });

  // Summary calculations
  const latest = analysis[analysis.length - 1];
  const avgVolume = analysis.reduce((sum, d) => sum + d.volume, 0) / analysis.length;
  const avgValue = analysis.reduce((sum, d) => sum + d.value, 0) / analysis.length;
  const totalNetForeign = analysis.reduce((sum, d) => sum + (d.net_foreign || 0), 0);
  const tektokanCount = analysis.filter(d => d.isTektokan).length;
  const akumulasiCount = analysis.filter(d => ['BUY', 'ACCUMULATE'].includes(d.pvaSignal)).length;
  const distribusiCount = analysis.filter(d => ['SELL', 'CAUTION'].includes(d.pvaSignal)).length;

  // Price metrics
  const prices = analysis.map(d => d.close);
  const highestPrice = Math.max(...prices);
  const lowestPrice = Math.min(...prices);
  const priceRange = highestPrice - lowestPrice;
  const currentPrice = latest?.close || 0;
  const pricePosition = priceRange > 0 ? ((currentPrice - lowestPrice) / priceRange) * 100 : 50;

  // Volume metrics
  const volumes = analysis.map(d => d.volume);
  const highestVolume = Math.max(...volumes);
  const avgVolumeRecent = analysis.slice(-3).reduce((sum, d) => sum + d.volume, 0) / 3;
  const volumeTrend = avgVolumeRecent > avgVolume ? 'MENINGKAT' : 'MENURUN';

  // Foreign flow metrics
  const foreignFlows = analysis.map(d => d.net_foreign || 0);
  const recentForeignFlow = analysis.slice(-3).reduce((sum, d) => sum + (d.net_foreign || 0), 0);
  const foreignFlowTrend = recentForeignFlow > 0 ? 'NET BUY' : 'NET SELL';

  // Support/Resistance detection
  const support = lowestPrice;
  const resistance = highestPrice;
  const pivot = (highestPrice + lowestPrice + currentPrice) / 3;
  const r1 = 2 * pivot - lowestPrice;
  const s1 = 2 * pivot - highestPrice;

  // Overall trend
  let overallTrend = 'SIDEWAYS';
  let trendColor = 'yellow';
  let trendEmoji = '➡️';
  
  if (akumulasiCount > distribusiCount * 1.5) {
    overallTrend = 'AKUMULASI';
    trendColor = 'green';
    trendEmoji = '📈';
  } else if (distribusiCount > akumulasiCount * 1.5) {
    overallTrend = 'DISTRIBUSI';
    trendColor = 'red';
    trendEmoji = '📉';
  }

  if (tektokanCount > analysis.length * 0.4) {
    overallTrend = 'TEKTOKAN DOMINAN';
    trendColor = 'orange';
    trendEmoji = '🔄';
  }

  return {
    data: analysis.reverse(),
    summary: {
      latest,
      avgVolume,
      avgValue,
      totalNetForeign,
      tektokanCount,
      akumulasiCount,
      distribusiCount,
      overallTrend,
      trendColor,
      trendEmoji,
      totalPeriods: analysis.length,
      // Price metrics
      highestPrice,
      lowestPrice,
      priceRange,
      pricePosition,
      // Volume metrics
      highestVolume,
      avgVolumeRecent,
      volumeTrend,
      // Foreign flow
      recentForeignFlow,
      foreignFlowTrend,
      // Support/Resistance
      support,
      resistance,
      pivot,
      r1,
      s1
    }
  };
};

// ====== PROFESSIONAL ANALYSIS GENERATOR ======
const generateProfessionalAnalysis = (summary, symbol) => {
  if (!summary) return null;

  const {
    overallTrend, totalNetForeign, tektokanCount, akumulasiCount, distribusiCount,
    totalPeriods, highestPrice, lowestPrice, pricePosition, volumeTrend,
    foreignFlowTrend, recentForeignFlow, support, resistance, pivot, r1, s1,
    avgVolume, avgValue, latest
  } = summary;

  const currentPrice = latest?.close || 0;
  const analyses = [];

  // 1. Smart Money Analysis
  let smartMoneyVerdict = '';
  let smartMoneyColor = 'gray';
  if (totalNetForeign > 0 && akumulasiCount > distribusiCount) {
    smartMoneyVerdict = 'Smart money sedang AKUMULASI. Asing melakukan net buy konsisten.';
    smartMoneyColor = 'green';
  } else if (totalNetForeign < 0 && distribusiCount > akumulasiCount) {
    smartMoneyVerdict = 'Smart money sedang DISTRIBUSI. Asing melakukan net sell konsisten.';
    smartMoneyColor = 'red';
  } else if (totalNetForeign > 0 && distribusiCount > akumulasiCount) {
    smartMoneyVerdict = 'Mixed signal: Asing net buy tapi harga turun. Kemungkinan akumulasi di bawah.';
    smartMoneyColor = 'cyan';
  } else if (totalNetForeign < 0 && akumulasiCount > distribusiCount) {
    smartMoneyVerdict = 'Mixed signal: Harga naik tapi asing net sell. Retail yang mendorong kenaikan.';
    smartMoneyColor = 'yellow';
  } else {
    smartMoneyVerdict = 'Tidak ada arah jelas dari smart money. Wait and see.';
    smartMoneyColor = 'gray';
  }

  analyses.push({
    title: '🧠 Smart Money Analysis',
    content: smartMoneyVerdict,
    color: smartMoneyColor,
    metrics: [
      { label: 'Total Net Foreign', value: formatNumber(totalNetForeign), positive: totalNetForeign > 0 },
      { label: 'Recent Flow (3 periode)', value: formatNumber(recentForeignFlow), positive: recentForeignFlow > 0 },
      { label: 'Trend', value: foreignFlowTrend, positive: foreignFlowTrend === 'NET BUY' }
    ]
  });

  // 2. Volume Analysis
  let volumeVerdict = '';
  let volumeColor = 'gray';
  if (volumeTrend === 'MENINGKAT' && overallTrend === 'AKUMULASI') {
    volumeVerdict = 'Volume meningkat dengan trend akumulasi. Ini konfirmasi BULLISH yang kuat.';
    volumeColor = 'green';
  } else if (volumeTrend === 'MENINGKAT' && overallTrend === 'DISTRIBUSI') {
    volumeVerdict = 'Volume tinggi saat distribusi menunjukkan panic selling atau profit taking besar-besaran.';
    volumeColor = 'red';
  } else if (volumeTrend === 'MENURUN' && overallTrend === 'AKUMULASI') {
    volumeVerdict = 'Kenaikan harga tanpa dukungan volume. Kenaikan mungkin tidak sustainable.';
    volumeColor = 'yellow';
  } else {
    volumeVerdict = 'Volume normal, tidak ada anomali signifikan.';
    volumeColor = 'gray';
  }

  analyses.push({
    title: '📊 Volume Analysis',
    content: volumeVerdict,
    color: volumeColor,
    metrics: [
      { label: 'Avg Volume', value: formatNumber(avgVolume) },
      { label: 'Volume Trend', value: volumeTrend, positive: volumeTrend === 'MENINGKAT' },
      { label: 'Avg Value', value: formatNumber(avgValue) }
    ]
  });

  // 3. Tektokan/Churning Analysis
  let tektokanVerdict = '';
  let tektokanColor = 'gray';
  const tektokanPercentage = (tektokanCount / totalPeriods) * 100;
  
  if (tektokanPercentage > 40) {
    tektokanVerdict = `⚠️ BAHAYA! ${tektokanPercentage.toFixed(0)}% periode menunjukkan TEKTOKAN. Broker melakukan trading antar sesama. HINDARI saham ini!`;
    tektokanColor = 'red';
  } else if (tektokanPercentage > 20) {
    tektokanVerdict = `Waspada! ${tektokanPercentage.toFixed(0)}% periode menunjukkan aktivitas tektokan. Perlu monitoring ketat.`;
    tektokanColor = 'orange';
  } else if (tektokanPercentage > 0) {
    tektokanVerdict = `Terdeteksi ${tektokanCount} periode dengan aktivitas tektokan minor. Masih dalam batas wajar.`;
    tektokanColor = 'yellow';
  } else {
    tektokanVerdict = 'Tidak ada tektokan terdeteksi. Transaksi terlihat organik.';
    tektokanColor = 'green';
  }

  analyses.push({
    title: '🔄 Tektokan Detection',
    content: tektokanVerdict,
    color: tektokanColor,
    metrics: [
      { label: 'Tektokan Count', value: `${tektokanCount}x`, positive: tektokanCount === 0 },
      { label: 'Tektokan %', value: `${tektokanPercentage.toFixed(0)}%`, positive: tektokanPercentage < 20 }
    ]
  });

  // 4. Price Position Analysis
  let priceVerdict = '';
  let priceColor = 'gray';
  
  if (pricePosition > 80) {
    priceVerdict = `Harga berada di ${pricePosition.toFixed(0)}% dari range. Mendekati RESISTANCE. Potensi pullback tinggi.`;
    priceColor = 'yellow';
  } else if (pricePosition < 20) {
    priceVerdict = `Harga berada di ${pricePosition.toFixed(0)}% dari range. Mendekati SUPPORT. Potensi rebound jika ada akumulasi.`;
    priceColor = 'cyan';
  } else if (pricePosition > 50 && overallTrend === 'AKUMULASI') {
    priceVerdict = 'Harga di mid-high zone dengan akumulasi. Momentum bullish masih terjaga.';
    priceColor = 'green';
  } else if (pricePosition < 50 && overallTrend === 'DISTRIBUSI') {
    priceVerdict = 'Harga di mid-low zone dengan distribusi. Tekanan jual masih dominan.';
    priceColor = 'red';
  } else {
    priceVerdict = 'Harga berada di zona netral. Menunggu konfirmasi arah.';
    priceColor = 'gray';
  }

  analyses.push({
    title: '📍 Price Position',
    content: priceVerdict,
    color: priceColor,
    metrics: [
      { label: 'Current', value: currentPrice.toLocaleString() },
      { label: 'Support', value: support.toLocaleString() },
      { label: 'Resistance', value: resistance.toLocaleString() },
      { label: 'Pivot', value: Math.round(pivot).toLocaleString() }
    ]
  });

  // 5. Trading Recommendation
  let recommendation = '';
  let recAction = 'HOLD';
  let recColor = 'gray';
  let recEmoji = '⏸️';

  if (overallTrend === 'AKUMULASI' && tektokanPercentage < 20 && totalNetForeign > 0) {
    recommendation = 'Trend BULLISH dengan konfirmasi smart money. Pertimbangkan untuk BUY atau ADD position dengan target resistance.';
    recAction = 'BUY';
    recColor = 'green';
    recEmoji = '🟢';
  } else if (overallTrend === 'AKUMULASI' && totalNetForeign < 0) {
    recommendation = 'Harga naik tapi asing jualan. Hati-hati, ini bisa jadi bull trap. Tunggu konfirmasi.';
    recAction = 'WATCH';
    recColor = 'yellow';
    recEmoji = '👀';
  } else if (overallTrend === 'DISTRIBUSI' && totalNetForeign < 0) {
    recommendation = 'Trend BEARISH dengan konfirmasi distribusi smart money. HINDARI atau SELL jika punya posisi.';
    recAction = 'SELL';
    recColor = 'red';
    recEmoji = '🔴';
  } else if (overallTrend === 'DISTRIBUSI' && totalNetForeign > 0) {
    recommendation = 'Harga turun tapi asing akumulasi. Potensi bottom fishing. Bisa cicil beli dengan SL ketat.';
    recAction = 'ACCUMULATE';
    recColor = 'cyan';
    recEmoji = '💰';
  } else if (overallTrend === 'TEKTOKAN DOMINAN') {
    recommendation = 'HINDARI! Saham ini didominasi aktivitas tektokan broker. Tidak ada genuine buying/selling.';
    recAction = 'AVOID';
    recColor = 'red';
    recEmoji = '⛔';
  } else {
    recommendation = 'Tidak ada sinyal kuat. Tunggu konfirmasi trend sebelum entry.';
    recAction = 'HOLD';
    recColor = 'gray';
    recEmoji = '⏸️';
  }

  const tradingRec = {
    recommendation,
    action: recAction,
    color: recColor,
    emoji: recEmoji,
    levels: {
      entry: overallTrend === 'AKUMULASI' ? s1 : null,
      target: overallTrend === 'AKUMULASI' ? resistance : null,
      stopLoss: overallTrend === 'AKUMULASI' ? support * 0.95 : null
    }
  };

  return { analyses, tradingRec };
};

// ====== COMPONENTS ======
const TrendIndicator = ({ value, showArrow = true }) => {
  if (value === null || value === undefined) return <span className="text-gray-500">-</span>;
  const isPositive = value > 0;
  const isZero = value === 0;
  const color = isZero ? 'text-gray-400' : isPositive ? 'text-green-400' : 'text-red-400';
  const Icon = isZero ? Minus : isPositive ? ArrowUp : ArrowDown;
  
  return (
    <span className={`flex items-center gap-1 ${color}`}>
      {showArrow && <Icon size={12} />}
      {formatPercent(value)}
    </span>
  );
};

const SignalBadge = ({ signal, emoji }) => {
  const colors = {
    'BUY': 'bg-green-500/20 text-green-400 border-green-500/30',
    'SELL': 'bg-red-500/20 text-red-400 border-red-500/30',
    'HOLD': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'CAUTION': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'AVOID': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'WEAK BUY': 'bg-lime-500/20 text-lime-400 border-lime-500/30',
    'ACCUMULATE': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${colors[signal] || colors['HOLD']}`}>
      {emoji} {signal}
    </span>
  );
};

// Top Volume Stock Card
const TopVolumeCard = ({ item, onClick, isSelected }) => {
  const analyzed = analyzeSingleStock(item);
  
  return (
    <div
      onClick={() => onClick(item.stock_detail.code)}
      className={`p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-purple-500/20 border-purple-500' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img src={item.stock_detail.icon_url} alt="" className="w-6 h-6 rounded" onError={(e) => e.target.style.display = 'none'} />
          <span className="font-bold text-white">{item.stock_detail.code}</span>
        </div>
        <SignalBadge signal={analyzed.pvaSignal} emoji={analyzed.pvaEmoji} />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-gray-500">Harga</p>
          <div className="flex items-center gap-1">
            <span className="text-white font-medium">{item.price.toLocaleString()}</span>
            <TrendIndicator value={item.change.percentage} />
          </div>
        </div>
        <div>
          <p className="text-gray-500">Volume</p>
          <span className="text-blue-400 font-medium">{item.volume.formatted}</span>
        </div>
        <div>
          <p className="text-gray-500">Value</p>
          <span className="text-purple-400 font-medium">{item.value.formatted}</span>
        </div>
        <div>
          <p className="text-gray-500">Net Foreign</p>
          <span className={`font-medium ${analyzed.netForeign >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {analyzed.netForeign >= 0 ? '+' : ''}{formatNumber(analyzed.netForeign)}
          </span>
        </div>
      </div>

      {analyzed.isTektokan && (
        <div className="mt-2 p-1.5 bg-orange-500/10 rounded text-center">
          <span className="text-orange-400 text-[10px] font-bold">🔄 TEKTOKAN ({analyzed.churningRatio.toFixed(1)}%)</span>
        </div>
      )}
    </div>
  );
};

// PVA Row for historical data
const PVARow = ({ item, maxVolume, maxValue }) => {
  const volumeWidth = maxVolume > 0 ? (item.volume / maxVolume) * 100 : 0;
  const valueWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
  
  return (
    <div className={`p-3 border-l-4 ${item.isTektokan ? 'border-l-orange-500 bg-orange-500/5' : item.pvaSignal === 'BUY' ? 'border-l-green-500 bg-green-500/5' : item.pvaSignal === 'SELL' ? 'border-l-red-500 bg-red-500/5' : 'border-l-gray-700'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <SignalBadge signal={item.pvaSignal} emoji={item.pvaEmoji} />
          {item.isTektokan && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.tektokanLevel === 'HIGH' ? 'bg-red-500/30 text-red-300' : 'bg-orange-500/30 text-orange-300'}`}>
              🔄 TEKTOKAN
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{item.pvaPattern}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <p className="text-gray-500 mb-1">Harga</p>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{item.close?.toLocaleString()}</span>
            <TrendIndicator value={item.priceChangePercent} />
          </div>
        </div>
        <div>
          <p className="text-gray-500 mb-1">Volume</p>
          <div className="space-y-1">
            <span className="font-bold text-white">{formatNumber(item.volume)}</span>
            <div className="h-1.5 bg-gray-800 rounded overflow-hidden">
              <div className="h-full bg-blue-500 rounded" style={{ width: `${volumeWidth}%` }} />
            </div>
          </div>
        </div>
        <div>
          <p className="text-gray-500 mb-1">Value</p>
          <div className="space-y-1">
            <span className="font-bold text-white">{formatNumber(item.value)}</span>
            <div className="h-1.5 bg-gray-800 rounded overflow-hidden">
              <div className="h-full bg-purple-500 rounded" style={{ width: `${valueWidth}%` }} />
            </div>
          </div>
        </div>
        <div>
          <p className="text-gray-500 mb-1">Net Foreign</p>
          <span className={`font-bold ${(item.net_foreign || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(item.net_foreign || 0) >= 0 ? '+' : ''}{formatNumber(item.net_foreign || 0)}
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Churning:</span>
          <span className={`font-bold ${item.churningRatio < 5 ? 'text-orange-400' : 'text-green-400'}`}>
            {item.churningRatio?.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Frequency:</span>
          <span className="text-white">{item.frequency?.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

// ====== MAIN COMPONENT ======
const PriceVolumeAnalysisView = ({ onNavigateToSettings }) => {
  const [activeTab, setActiveTab] = useState('topVolume'); // topVolume, detail
  const [symbol, setSymbol] = useState('');
  const [symbolInput, setSymbolInput] = useState('');
  const [period, setPeriod] = useState('HS_PERIOD_MONTHLY');
  const [months, setMonths] = useState(12);
  const [topVolumeData, setTopVolumeData] = useState([]);
  const [historyData, setHistoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  
  // AI Analysis states
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  // Fetch Top Volume
  const fetchTopVolume = useCallback(async () => {
    if (!hasToken()) { setError('Token tidak ditemukan.'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const res = await getMarketMovers({ moverType: 'MOVER_TYPE_TOP_VOLUME' });
      if (res.data?.mover_list) {
        setTopVolumeData(res.data.mover_list.slice(0, 20));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch Historical Data for a symbol
  const fetchHistory = useCallback(async (sym) => {
    if (!sym) return;
    
    setIsLoadingHistory(true);
    setHistoryData(null);
    setError(null);
    
    // Check token
    if (!hasToken()) { 
      setError('Token tidak ditemukan. Menggunakan demo data.');
      setHistoryData(DEMO_HISTORY);
      setIsLoadingHistory(false);
      return; 
    }
    
    const { startDate, endDate } = getDateRange(months);
    
    try {
      const res = await getPriceVolumeHistory({
        symbol: sym,
        period,
        startDate,
        endDate,
        limit: 50,
        page: 1
      });
      
      console.log('History response:', res);
      
      // Check various response structures
      let resultData = null;
      
      if (res.data?.result && res.data.result.length > 0) {
        // Structure: { data: { result: [...] } }
        resultData = res.data.result;
      } else if (res.result && res.result.length > 0) {
        // Structure: { result: [...] }
        resultData = res.result;
      } else if (Array.isArray(res.data) && res.data.length > 0) {
        // Structure: { data: [...] }
        resultData = res.data;
      } else if (Array.isArray(res) && res.length > 0) {
        // Structure: [...]
        resultData = res;
      }
      
      if (resultData) {
        setHistoryData(resultData);
        setError(null);
      } else {
        // Use demo data as fallback
        setError(`Tidak ada data untuk ${sym}. Menggunakan demo.`);
        setHistoryData(DEMO_HISTORY);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
      setError(`Gagal memuat: ${err.message}. Menggunakan demo.`);
      setHistoryData(DEMO_HISTORY);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [period, months]);

  // Handle stock click from top volume
  const handleStockClick = (code) => {
    setSymbol(code);
    setSymbolInput(code);
    setActiveTab('detail');
    fetchHistory(code);
  };

  // Handle manual search
  const handleSearch = (e) => {
    e?.preventDefault();
    const s = symbolInput.trim().toUpperCase();
    if (s) {
      setSymbol(s);
      setActiveTab('detail');
      fetchHistory(s);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTopVolume();
  }, []);

  // Refetch history when period/months change
  useEffect(() => {
    if (symbol && activeTab === 'detail') {
      fetchHistory(symbol);
    }
  }, [period, months]);

  // Analysis results
  const analysis = useMemo(() => historyData ? analyzePVA(historyData) : null, [historyData]);
  
  // Analyze top volume
  const analyzedTopVolume = useMemo(() => {
    return topVolumeData.map(item => analyzeSingleStock(item));
  }, [topVolumeData]);

  // Stats from top volume
  const topVolumeStats = useMemo(() => {
    const buyCount = analyzedTopVolume.filter(s => ['BUY', 'ACCUMULATE'].includes(s.pvaSignal)).length;
    const sellCount = analyzedTopVolume.filter(s => ['SELL', 'CAUTION'].includes(s.pvaSignal)).length;
    const tektokanCount = analyzedTopVolume.filter(s => s.isTektokan).length;
    return { buyCount, sellCount, tektokanCount, total: analyzedTopVolume.length };
  }, [analyzedTopVolume]);

  // Professional analysis
  const professionalAnalysis = useMemo(() => {
    if (analysis?.summary) {
      return generateProfessionalAnalysis(analysis.summary, symbol);
    }
    return null;
  }, [analysis, symbol]);

  // Fetch AI Analysis
  const fetchAIAnalysis = useCallback(async () => {
    if (!analysis?.summary || !symbol) return;
    
    setIsLoadingAI(true);
    setShowAIAnalysis(true);
    
    try {
      const { context, prompt } = generatePVAPrompt({
        summary: analysis.summary,
        symbol,
        historyData
      });
      
      const result = await analyzeWithAI(prompt, context);
      
      if (result.success) {
        setAiAnalysis(result.analysis);
      } else {
        setAiAnalysis(`⚠️ Gagal mendapatkan analisis AI: ${result.error}`);
      }
    } catch (err) {
      setAiAnalysis(`⚠️ Error: ${err.message}`);
    } finally {
      setIsLoadingAI(false);
    }
  }, [analysis, symbol, historyData]);

  return (
    <div className="space-y-4 pb-20 lg:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6" /> Price Volume Analysis
            {symbol && <span className="text-purple-400 ml-2">{symbol}</span>}
          </h1>
          <p className="text-gray-500 text-sm">Analisis PVA dengan Deteksi Tektokan Broker</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchTopVolume} variant="outline" size="sm" loading={isLoading} icon={<RefreshCw size={14} />}>Refresh</Button>
          <Button onClick={() => setShowGuide(!showGuide)} variant={showGuide ? 'primary' : 'outline'} size="sm" icon={<HelpCircle size={14} />}>?</Button>
        </div>
      </div>

      {/* Guide */}
      {showGuide && (
        <Card className="p-4 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-cyan-500/5">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-cyan-400 mb-2">📊 Konsep PVA</h4>
              <ul className="space-y-1 text-gray-400 text-xs">
                <li>• <span className="text-green-400">Harga ↑ + Net ↑</span> = Akumulasi</li>
                <li>• <span className="text-yellow-400">Harga ↑ + Net ↓</span> = Distribusi Terselubung</li>
                <li>• <span className="text-cyan-400">Harga ↓ + Net ↑</span> = Akumulasi Bawah</li>
                <li>• <span className="text-red-400">Harga ↓ + Net ↓</span> = Distribusi Kuat</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-orange-400 mb-2">🔄 Deteksi Tektokan</h4>
              <ul className="space-y-1 text-gray-400 text-xs">
                <li>• Churning Ratio = |Net| / Value</li>
                <li>• <strong>&lt; 5%</strong> = Tektokan (HINDARI!)</li>
                <li>• Broker jual beli sendiri</li>
                <li>• Volume besar, net kecil</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-400 mb-2">🎯 Cara Pakai</h4>
              <ul className="space-y-1 text-gray-400 text-xs">
                <li>• Lihat Top Volume hari ini</li>
                <li>• Klik saham untuk lihat historis</li>
                <li>• Cari pattern AKUMULASI</li>
                <li>• Hindari saham TEKTOKAN</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('topVolume')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'topVolume' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          <Flame size={16} /> Top Volume Hari Ini
        </button>
        <button
          onClick={() => setActiveTab('detail')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'detail' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          <BarChart3 size={16} /> Detail Historis {symbol && `(${symbol})`}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* TOP VOLUME TAB */}
      {activeTab === 'topVolume' && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-500/5">
              <p className="text-xs text-gray-500">Total Saham</p>
              <p className="text-2xl font-bold text-white">{topVolumeStats.total}</p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-green-500/20 to-green-500/5">
              <p className="text-xs text-gray-500">🚀 Akumulasi</p>
              <p className="text-2xl font-bold text-green-400">{topVolumeStats.buyCount}</p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-red-500/20 to-red-500/5">
              <p className="text-xs text-gray-500">🔴 Distribusi</p>
              <p className="text-2xl font-bold text-red-400">{topVolumeStats.sellCount}</p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-orange-500/20 to-orange-500/5">
              <p className="text-xs text-gray-500">🔄 Tektokan</p>
              <p className="text-2xl font-bold text-orange-400">{topVolumeStats.tektokanCount}</p>
            </Card>
          </div>

          {isLoading ? (
            <LoadingSpinner message="Memuat Top Volume..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {topVolumeData.map((item, i) => (
                <TopVolumeCard
                  key={i}
                  item={item}
                  onClick={handleStockClick}
                  isSelected={symbol === item.stock_detail.code}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* DETAIL TAB */}
      {activeTab === 'detail' && (
        <>
          {/* Search & Controls */}
          <Card className="p-4">
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={symbolInput}
                    onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                    placeholder="Masukkan kode saham atau pilih dari Top Volume..."
                    className="w-full pl-9 pr-4 py-2.5 bg-black border-2 border-gray-800 rounded-xl text-white placeholder:text-gray-600 focus:border-purple-500"
                  />
                </div>
                <Button type="submit" variant="primary" loading={isLoadingHistory} icon={<Search size={16} />}>Analisa</Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
                  {[
                    { value: 'HS_PERIOD_DAILY', label: 'Daily' },
                    { value: 'HS_PERIOD_WEEKLY', label: 'Weekly' },
                    { value: 'HS_PERIOD_MONTHLY', label: 'Monthly' },
                  ].map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPeriod(p.value)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${period === p.value ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
                  {[3, 6, 12, 24].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMonths(m)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${months === m ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </Card>

          {isLoadingHistory && <LoadingSpinner message={`Memuat ${symbol}...`} />}

          {analysis && !isLoadingHistory && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <Card className={`p-3 col-span-2 bg-gradient-to-br ${analysis.summary.trendColor === 'green' ? 'from-green-500/20 to-emerald-500/10' : analysis.summary.trendColor === 'red' ? 'from-red-500/20 to-rose-500/10' : analysis.summary.trendColor === 'orange' ? 'from-orange-500/20 to-amber-500/10' : 'from-yellow-500/20 to-amber-500/10'}`}>
                  <p className="text-xs text-gray-500 mb-1">Trend {symbol}</p>
                  <p className={`text-xl font-bold ${analysis.summary.trendColor === 'green' ? 'text-green-400' : analysis.summary.trendColor === 'red' ? 'text-red-400' : analysis.summary.trendColor === 'orange' ? 'text-orange-400' : 'text-yellow-400'}`}>
                    {analysis.summary.trendEmoji} {analysis.summary.overallTrend}
                  </p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-gray-500">Harga</p>
                  <p className="text-xl font-bold text-white">{analysis.summary.latest?.close?.toLocaleString()}</p>
                </Card>
                <Card className={`p-3 ${analysis.summary.totalNetForeign >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <p className="text-xs text-gray-500">Total Net</p>
                  <p className={`text-lg font-bold ${analysis.summary.totalNetForeign >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatNumber(analysis.summary.totalNetForeign)}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-gray-500">🔄 Tektokan</p>
                  <p className={`text-xl font-bold ${analysis.summary.tektokanCount > 2 ? 'text-orange-400' : 'text-white'}`}>{analysis.summary.tektokanCount}x</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-gray-500">Akum vs Dist</p>
                  <p><span className="text-green-400 font-bold">{analysis.summary.akumulasiCount}</span> vs <span className="text-red-400 font-bold">{analysis.summary.distribusiCount}</span></p>
                </Card>
              </div>

              {/* AI Analysis Button and Section */}
              <Card className="p-4 border-2 border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-white">AI Analysis by Gemini</h3>
                  </div>
                  <Button
                    onClick={fetchAIAnalysis}
                    variant="primary"
                    size="sm"
                    loading={isLoadingAI}
                    icon={<Sparkles size={14} />}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {aiAnalysis ? 'Refresh Analisis' : 'Minta Analisis AI'}
                  </Button>
                </div>
                
                {isLoadingAI && (
                  <div className="flex items-center gap-3 text-purple-400 py-4">
                    <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                    <span className="text-sm">AI sedang menganalisis {symbol}...</span>
                  </div>
                )}
                
                {showAIAnalysis && aiAnalysis && !isLoadingAI && (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                      {aiAnalysis.split('\n').map((line, i) => (
                        <p key={i} className={`mb-2 ${line.startsWith('•') || line.startsWith('-') || line.startsWith('*') ? 'ml-4' : ''}`}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                
                {!showAIAnalysis && !isLoadingAI && (
                  <p className="text-gray-500 text-sm">
                    Klik tombol di atas untuk mendapatkan analisis mendalam dari AI berdasarkan data PVA {symbol}.
                  </p>
                )}
              </Card>

              {/* Professional Analysis Section */}
              {professionalAnalysis && (
                <>
                  {/* Trading Recommendation Card */}
                  <Card className={`p-4 border-2 ${
                    professionalAnalysis.tradingRec.color === 'green' ? 'border-green-500/50 bg-gradient-to-r from-green-500/20 to-emerald-500/10' :
                    professionalAnalysis.tradingRec.color === 'red' ? 'border-red-500/50 bg-gradient-to-r from-red-500/20 to-rose-500/10' :
                    professionalAnalysis.tradingRec.color === 'cyan' ? 'border-cyan-500/50 bg-gradient-to-r from-cyan-500/20 to-blue-500/10' :
                    professionalAnalysis.tradingRec.color === 'yellow' ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-500/20 to-amber-500/10' :
                    'border-gray-500/50 bg-gradient-to-r from-gray-500/20 to-gray-500/10'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        🎯 Trading Recommendation
                      </h3>
                      <span className={`px-4 py-2 rounded-lg text-lg font-bold ${
                        professionalAnalysis.tradingRec.color === 'green' ? 'bg-green-500 text-white' :
                        professionalAnalysis.tradingRec.color === 'red' ? 'bg-red-500 text-white' :
                        professionalAnalysis.tradingRec.color === 'cyan' ? 'bg-cyan-500 text-white' :
                        professionalAnalysis.tradingRec.color === 'yellow' ? 'bg-yellow-500 text-black' :
                        'bg-gray-500 text-white'
                      }`}>
                        {professionalAnalysis.tradingRec.emoji} {professionalAnalysis.tradingRec.action}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">{professionalAnalysis.tradingRec.recommendation}</p>
                    
                    {professionalAnalysis.tradingRec.levels.entry && (
                      <div className="grid grid-cols-3 gap-3 text-center text-sm">
                        <div className="p-2 bg-cyan-500/10 rounded-lg">
                          <p className="text-gray-500 text-xs">Entry Zone</p>
                          <p className="text-cyan-400 font-bold">{Math.round(professionalAnalysis.tradingRec.levels.entry).toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <p className="text-gray-500 text-xs">Target</p>
                          <p className="text-green-400 font-bold">{Math.round(professionalAnalysis.tradingRec.levels.target).toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-red-500/10 rounded-lg">
                          <p className="text-gray-500 text-xs">Stop Loss</p>
                          <p className="text-red-400 font-bold">{Math.round(professionalAnalysis.tradingRec.levels.stopLoss).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Analysis Cards Grid */}
                  <div className="grid md:grid-cols-2 gap-3">
                    {professionalAnalysis.analyses.map((item, idx) => (
                      <Card key={idx} className={`p-4 border-l-4 ${
                        item.color === 'green' ? 'border-l-green-500' :
                        item.color === 'red' ? 'border-l-red-500' :
                        item.color === 'cyan' ? 'border-l-cyan-500' :
                        item.color === 'yellow' ? 'border-l-yellow-500' :
                        item.color === 'orange' ? 'border-l-orange-500' :
                        'border-l-gray-500'
                      }`}>
                        <h4 className="font-bold text-white mb-2">{item.title}</h4>
                        <p className={`text-sm mb-3 ${
                          item.color === 'green' ? 'text-green-400' :
                          item.color === 'red' ? 'text-red-400' :
                          item.color === 'cyan' ? 'text-cyan-400' :
                          item.color === 'yellow' ? 'text-yellow-400' :
                          item.color === 'orange' ? 'text-orange-400' :
                          'text-gray-400'
                        }`}>{item.content}</p>
                        <div className="flex flex-wrap gap-2">
                          {item.metrics.map((m, mi) => (
                            <div key={mi} className={`px-2 py-1 rounded text-xs ${
                              m.positive === true ? 'bg-green-500/20 text-green-400' :
                              m.positive === false ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-800 text-gray-400'
                            }`}>
                              <span className="text-gray-500">{m.label}: </span>
                              <span className="font-bold">{m.value}</span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* History Table */}
              <Card className="overflow-hidden">
                <div className="p-3 border-b border-gray-800 bg-gradient-to-r from-purple-500/10 to-transparent">
                  <h3 className="font-bold text-white">📊 Detail Per Periode</h3>
                </div>
                <div className="divide-y divide-gray-800/50 max-h-[500px] overflow-y-auto">
                  {analysis.data.map((item, i) => (
                    <PVARow
                      key={i}
                      item={item}
                      maxVolume={Math.max(...analysis.data.map(d => d.volume || 0))}
                      maxValue={Math.max(...analysis.data.map(d => d.value || 0))}
                    />
                  ))}
                </div>
              </Card>
            </>
          )}

          {!historyData && !isLoadingHistory && (
            <Card className="p-12 text-center">
              <Activity className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">
                {symbol ? `Tidak ada data untuk ${symbol}` : 'Pilih saham dari Top Volume atau ketik kode saham'}
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default PriceVolumeAnalysisView;
