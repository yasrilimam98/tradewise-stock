import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, RefreshCw, AlertCircle, TrendingUp, TrendingDown, DollarSign,
  Shield, Target, Award, CheckCircle, XCircle, HelpCircle, Info,
  BookOpen, Percent, BarChart3, PieChart, Activity, Zap, Calculator, Sparkles
} from 'lucide-react';
import { Card, Button, LoadingSpinner } from './ui';
import { getKeyStats, hasToken } from '../services/stockbitService';
import { analyzeWithAI, generateValueInvestingPrompt } from '../services/aiService';

// ====== HELPER FUNCTIONS ======
const parseValue = (val) => {
  if (!val || val === '-') return null;
  const str = String(val).replace(/,/g, '').replace('%', '').replace(/[()]/g, '').trim();
  if (str.includes('T')) return parseFloat(str) * 1e12;
  if (str.includes('B')) return parseFloat(str) * 1e9;
  if (str.includes('M')) return parseFloat(str) * 1e6;
  if (str.includes('K')) return parseFloat(str) * 1e3;
  return parseFloat(str) || null;
};

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
  if (val === null || val === undefined) return '-';
  const n = parseFloat(String(val).replace('%', ''));
  return isNaN(n) ? '-' : n.toFixed(2) + '%';
};

// ====== GRAHAM CRITERIA ======
// Benjamin Graham's 7 Criteria for Defensive Investors (The Intelligent Investor)
const evaluateGraham = (data) => {
  const criteria = [];
  let passCount = 0;

  // 1. Adequate Size - Revenue > 100M USD (adjusted for Indonesia: > 1T IDR)
  const revenue = parseValue(data['Revenue (TTM)']);
  const revenuePassed = revenue && revenue > 1e12;
  criteria.push({
    name: 'Ukuran Perusahaan Memadai',
    description: 'Revenue > 1 Triliun IDR',
    value: formatNumber(revenue),
    passed: revenuePassed,
    weight: 1
  });
  if (revenuePassed) passCount++;

  // 2. Strong Financial Condition - Current Ratio >= 2
  const currentRatio = parseValue(data['Current Ratio (Quarter)']);
  const currentRatioPassed = currentRatio && currentRatio >= 2;
  criteria.push({
    name: 'Current Ratio >= 2',
    description: 'Kemampuan bayar hutang jangka pendek',
    value: currentRatio?.toFixed(2) || '-',
    passed: currentRatioPassed,
    weight: 1
  });
  if (currentRatioPassed) passCount++;

  // 3. Earnings Stability - Positive earnings for last years (check ROE > 0)
  const roe = parseValue(data['Return on Equity (TTM)']);
  const roePassed = roe && roe > 0;
  criteria.push({
    name: 'Laba Positif Konsisten',
    description: 'ROE > 0%',
    value: formatPercent(roe),
    passed: roePassed,
    weight: 1
  });
  if (roePassed) passCount++;

  // 4. Dividend Record - Has dividend
  const dividend = parseValue(data['Dividend (TTM)']);
  const dividendPassed = dividend && dividend > 0;
  criteria.push({
    name: 'Membayar Dividen',
    description: 'Memiliki track record dividen',
    value: dividend ? `Rp ${dividend}` : 'Tidak ada',
    passed: dividendPassed,
    weight: 1
  });
  if (dividendPassed) passCount++;

  // 5. Earnings Growth - Net income positive
  const netIncome = parseValue(data['Net Income (TTM)']);
  const netIncomePassed = netIncome && netIncome > 0;
  criteria.push({
    name: 'Laba Bersih Positif',
    description: 'Net Income > 0',
    value: formatNumber(netIncome),
    passed: netIncomePassed,
    weight: 1
  });
  if (netIncomePassed) passCount++;

  // 6. Moderate P/E Ratio - PE < 15 (Graham's rule)
  const pe = parseValue(data['Current PE Ratio (TTM)']);
  const pePassed = pe && pe > 0 && pe < 15;
  criteria.push({
    name: 'P/E Ratio < 15',
    description: 'Valuasi tidak terlalu mahal',
    value: pe?.toFixed(2) || '-',
    passed: pePassed,
    weight: 1.5
  });
  if (pePassed) passCount += 1.5;

  // 7. Moderate P/B Ratio - PBV < 1.5 (Graham's rule)
  const pbv = parseValue(data['Current Price to Book Value']);
  const pbvPassed = pbv && pbv > 0 && pbv < 1.5;
  criteria.push({
    name: 'P/B Ratio < 1.5',
    description: 'Harga di bawah nilai buku',
    value: pbv?.toFixed(2) || '-',
    passed: pbvPassed,
    weight: 1.5
  });
  if (pbvPassed) passCount += 1.5;

  // 8. Graham Number Check - PE x PBV < 22.5
  const grahamProduct = pe && pbv ? pe * pbv : null;
  const grahamPassed = grahamProduct && grahamProduct < 22.5;
  criteria.push({
    name: 'Graham Number (PE x PBV < 22.5)',
    description: 'Kombinasi valuasi aman',
    value: grahamProduct?.toFixed(2) || '-',
    passed: grahamPassed,
    weight: 2
  });
  if (grahamPassed) passCount += 2;

  // 9. Low Debt - Debt to Equity < 0.5
  const debtEquity = parseValue(data['Debt to Equity Ratio (Quarter)']);
  const debtPassed = debtEquity && debtEquity < 0.5;
  criteria.push({
    name: 'Debt to Equity < 0.5',
    description: 'Hutang rendah relative terhadap ekuitas',
    value: debtEquity?.toFixed(2) || '-',
    passed: debtPassed,
    weight: 1
  });
  if (debtPassed) passCount++;

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const score = (passCount / totalWeight) * 100;

  return { criteria, score, passCount, totalCriteria: criteria.length };
};

// ====== BUFFETT CRITERIA ======
// Warren Buffett's Quality & Moat Indicators
const evaluateBuffett = (data) => {
  const criteria = [];
  let passCount = 0;

  // 1. High ROE - ROE > 15% (Buffett loves high ROE)
  const roe = parseValue(data['Return on Equity (TTM)']);
  const roePassed = roe && roe > 15;
  criteria.push({
    name: 'ROE > 15%',
    description: 'Return on Equity yang tinggi',
    value: formatPercent(roe),
    passed: roePassed,
    weight: 2
  });
  if (roePassed) passCount += 2;

  // 2. High ROIC - ROIC > 12%
  const roic = parseValue(data['Return On Invested Capital (TTM)']);
  const roicPassed = roic && roic > 12;
  criteria.push({
    name: 'ROIC > 12%',
    description: 'Return on Invested Capital',
    value: formatPercent(roic),
    passed: roicPassed,
    weight: 2
  });
  if (roicPassed) passCount += 2;

  // 3. Consistent Profitability - Net Profit Margin > 10%
  const npm = parseValue(data['Net Profit Margin (Quarter)']);
  const npmPassed = npm && npm > 10;
  criteria.push({
    name: 'Net Profit Margin > 10%',
    description: 'Margin laba bersih tinggi',
    value: formatPercent(npm),
    passed: npmPassed,
    weight: 1.5
  });
  if (npmPassed) passCount += 1.5;

  // 4. Gross Margin > 40% (Competitive advantage indicator)
  const gpm = parseValue(data['Gross Profit Margin (Quarter)']);
  const gpmPassed = gpm && gpm > 40;
  criteria.push({
    name: 'Gross Margin > 40%',
    description: 'Indikator competitive advantage',
    value: formatPercent(gpm),
    passed: gpmPassed,
    weight: 1.5
  });
  if (gpmPassed) passCount += 1.5;

  // 5. Low Debt - Debt/Equity < 0.5
  const de = parseValue(data['Debt to Equity Ratio (Quarter)']);
  const dePassed = de && de < 0.5;
  criteria.push({
    name: 'Debt/Equity < 0.5',
    description: 'Tidak terlalu bergantung hutang',
    value: de?.toFixed(2) || '-',
    passed: dePassed,
    weight: 1.5
  });
  if (dePassed) passCount += 1.5;

  // 6. Interest Coverage > 5 (Can easily pay interest)
  const ic = parseValue(data['Interest Coverage (TTM)']);
  const icPassed = ic && ic > 5;
  criteria.push({
    name: 'Interest Coverage > 5x',
    description: 'Kemampuan bayar bunga tinggi',
    value: ic?.toFixed(2) || '-',
    passed: icPassed,
    weight: 1
  });
  if (icPassed) passCount++;

  // 7. Positive Free Cash Flow
  const fcf = parseValue(data['Free cash flow (TTM)']);
  const fcfPassed = fcf && fcf > 0;
  criteria.push({
    name: 'Free Cash Flow Positif',
    description: 'Menghasilkan kas bebas',
    value: formatNumber(fcf),
    passed: fcfPassed,
    weight: 1.5
  });
  if (fcfPassed) passCount += 1.5;

  // 8. Revenue Growth YoY Positive
  const revGrowth = parseValue(data['Revenue (Quarter YoY Growth)']);
  const growthPassed = revGrowth && revGrowth > 0;
  criteria.push({
    name: 'Pertumbuhan Revenue Positif',
    description: 'Bisnis masih bertumbuh',
    value: formatPercent(revGrowth),
    passed: growthPassed,
    weight: 1
  });
  if (growthPassed) passCount++;

  // 9. Piotroski F-Score >= 6 (Financial strength)
  const fScore = parseValue(data['Piotroski F-Score']);
  const fScorePassed = fScore && fScore >= 6;
  criteria.push({
    name: 'Piotroski F-Score >= 6',
    description: 'Skor kesehatan finansial',
    value: fScore?.toFixed(0) || '-',
    passed: fScorePassed,
    weight: 1.5
  });
  if (fScorePassed) passCount += 1.5;

  // 10. Reasonable Valuation - Forward PE < 20
  const forwardPE = parseValue(data['Forward PE Ratio']);
  const valPassed = forwardPE && forwardPE > 0 && forwardPE < 20;
  criteria.push({
    name: 'Forward PE < 20',
    description: 'Valuasi wajar untuk masa depan',
    value: forwardPE?.toFixed(2) || '-',
    passed: valPassed,
    weight: 1
  });
  if (valPassed) passCount++;

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const score = (passCount / totalWeight) * 100;

  return { criteria, score, passCount, totalCriteria: criteria.length };
};

// ====== INTRINSIC VALUE CALCULATOR ======
const calculateIntrinsicValue = (data) => {
  const eps = parseValue(data['Current EPS (TTM)']);
  const bvps = parseValue(data['Current Book Value Per Share']);
  const pe = parseValue(data['Current PE Ratio (TTM)']);
  const pbv = parseValue(data['Current Price to Book Value']);

  if (!eps || !bvps) return null;

  // Graham Number = √(22.5 × EPS × BVPS)
  const grahamNumber = Math.sqrt(22.5 * Math.abs(eps) * bvps);

  // Estimate current price
  const currentPrice = eps * pe || bvps * pbv;

  // Margin of Safety
  const marginOfSafety = currentPrice ? ((grahamNumber - currentPrice) / currentPrice) * 100 : null;

  return { grahamNumber, currentPrice, marginOfSafety, eps, bvps };
};

// ====== SCORE CARD COMPONENT ======
const ScoreCard = ({ title, score, icon: Icon, color, description }) => {
  const getScoreColor = (s) => {
    if (s >= 70) return 'text-green-400';
    if (s >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (s) => {
    if (s >= 70) return 'from-green-500/20 to-emerald-500/10';
    if (s >= 50) return 'from-yellow-500/20 to-amber-500/10';
    return 'from-red-500/20 to-rose-500/10';
  };

  return (
    <Card className={`p-4 bg-gradient-to-br ${getScoreBg(score)} border-${color}-500/30`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 text-${color}-400`} />
          <span className="font-bold text-white">{title}</span>
        </div>
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score.toFixed(0)}%</span>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
      <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: score >= 70 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444' }} />
      </div>
    </Card>
  );
};

// ====== CRITERIA LIST COMPONENT ======
const CriteriaList = ({ criteria, title, color }) => (
  <Card className="overflow-hidden">
    <div className={`p-3 border-b border-gray-800 bg-gradient-to-r from-${color}-500/10 to-transparent`}>
      <h3 className="font-bold text-white">{title}</h3>
    </div>
    <div className="divide-y divide-gray-800/50 max-h-[400px] overflow-y-auto">
      {criteria.map((c, i) => (
        <div key={i} className={`p-3 flex items-center gap-3 ${c.passed ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
          {c.passed ? (
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-sm ${c.passed ? 'text-green-400' : 'text-red-400'}`}>{c.name}</p>
            <p className="text-xs text-gray-500">{c.description}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className={`font-bold text-sm ${c.passed ? 'text-green-400' : 'text-white'}`}>{c.value}</span>
            {c.weight > 1 && <span className="text-[10px] text-gray-600 block">x{c.weight}</span>}
          </div>
        </div>
      ))}
    </div>
  </Card>
);

// ====== MAIN COMPONENT ======
const ValueInvestingView = ({ onNavigateToSettings }) => {
  const [symbol, setSymbol] = useState('');
  const [symbolInput, setSymbolInput] = useState('');
  const [data, setData] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState('graham');
  
  // AI Analysis states
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  const fetchData = useCallback(async () => {
    if (!symbol) { setError('Masukkan kode saham'); return; }
    if (!hasToken()) { setError('Token tidak ditemukan. Set token di Settings.'); return; }

    setIsLoading(true);
    setError(null);

    try {
      const res = await getKeyStats({ symbol });
      if (res.data?.closure_fin_items_results) {
        setRawData(res.data);
        
        // Flatten data for easy access
        const flattened = {};
        res.data.closure_fin_items_results.forEach(section => {
          section.fin_name_results?.forEach(item => {
            flattened[item.fitem.name] = item.fitem.value;
          });
        });
        setData(flattened);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  const handleSearch = (e) => {
    e?.preventDefault();
    const s = symbolInput.trim().toUpperCase();
    if (s) setSymbol(s);
  };

  useEffect(() => {
    if (symbol) fetchData();
  }, [symbol]);

  // Analysis results
  const grahamResult = useMemo(() => data ? evaluateGraham(data) : null, [data]);
  const buffettResult = useMemo(() => data ? evaluateBuffett(data) : null, [data]);
  const intrinsicValue = useMemo(() => data ? calculateIntrinsicValue(data) : null, [data]);

  // Overall verdict
  const verdict = useMemo(() => {
    if (!grahamResult || !buffettResult) return null;
    const avgScore = (grahamResult.score + buffettResult.score) / 2;
    if (avgScore >= 70) return { text: 'LAYAK BELI', color: 'green', emoji: '✅' };
    if (avgScore >= 50) return { text: 'PERTIMBANGKAN', color: 'yellow', emoji: '⚠️' };
    return { text: 'TIDAK DIREKOMENDASIKAN', color: 'red', emoji: '❌' };
  }, [grahamResult, buffettResult]);

  // Fetch AI Analysis
  const fetchAIAnalysis = useCallback(async () => {
    if (!grahamResult || !buffettResult || !symbol) return;
    
    setIsLoadingAI(true);
    setShowAIAnalysis(true);
    
    try {
      const metrics = {
        'Graham Score': `${grahamResult.score.toFixed(0)}%`,
        'Buffett Score': `${buffettResult.score.toFixed(0)}%`,
        'PE Ratio': data?.pe || '-',
        'PBV': data?.pbv || '-',
        'ROE': data?.roe || '-',
        'Current Ratio': data?.currentRatio || '-',
        'Debt to Equity': data?.debtToEquity || '-',
        'EPS Growth': data?.epsGrowth || '-',
        'Revenue Growth': data?.revenueGrowth || '-',
        'Gross Margin': data?.grossMargin || '-',
        'Net Margin': data?.netMargin || '-',
      };

      const { context, prompt } = generateValueInvestingPrompt({
        symbol,
        grahamScore: grahamResult.score,
        buffettScore: buffettResult.score,
        metrics
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
  }, [grahamResult, buffettResult, symbol, data]);

  return (
    <div className="space-y-4 pb-20 lg:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-6 h-6" /> Value Investing
            {symbol && <span className="text-purple-400 ml-2">{symbol}</span>}
          </h1>
          <p className="text-gray-500 text-sm">Analisis Fundamental ala Benjamin Graham & Warren Buffett</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowGuide(!showGuide)} variant={showGuide ? 'primary' : 'outline'} size="sm" icon={<HelpCircle size={14} />}>Panduan</Button>
        </div>
      </div>

      {/* Guide */}
      {showGuide && (
        <Card className="p-4 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-cyan-500/5">
          <div className="flex items-start gap-3">
            <BookOpen className="w-6 h-6 text-purple-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-3">📖 Panduan Value Investing</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-cyan-400 mb-2">👴 Benjamin Graham (Defensive)</h4>
                  <p className="text-gray-300 text-xs mb-2">Fokus pada keamanan (Margin of Safety):</p>
                  <ul className="space-y-1 text-gray-400 text-xs">
                    <li>• PE Ratio &lt; 15 (murah)</li>
                    <li>• PBV &lt; 1.5 (di bawah nilai buku)</li>
                    <li>• PE × PBV &lt; 22.5 (Graham Number)</li>
                    <li>• Current Ratio ≥ 2 (likuid)</li>
                    <li>• Debt/Equity &lt; 0.5 (hutang rendah)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-green-400 mb-2">🎩 Warren Buffett (Quality)</h4>
                  <p className="text-gray-300 text-xs mb-2">Fokus pada kualitas bisnis (Economic Moat):</p>
                  <ul className="space-y-1 text-gray-400 text-xs">
                    <li>• ROE &gt; 15% (efisien)</li>
                    <li>• ROIC &gt; 12% (return bagus)</li>
                    <li>• Gross Margin &gt; 40% (moat)</li>
                    <li>• Free Cash Flow positif</li>
                    <li>• Piotroski F-Score ≥ 6</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              placeholder="Masukkan kode saham: BBRI, TLKM, ASII..."
              className="w-full pl-9 pr-4 py-2.5 bg-black border-2 border-gray-800 rounded-xl text-white placeholder:text-gray-600 focus:border-purple-500"
            />
          </div>
          <Button type="submit" variant="primary" loading={isLoading} icon={<Search size={16} />}>Analisa</Button>
          {symbol && <Button onClick={fetchData} variant="outline" loading={isLoading} icon={<RefreshCw size={16} />} />}
        </form>
      </Card>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {isLoading && <LoadingSpinner message={`Menganalisa ${symbol}...`} />}

      {data && !isLoading && grahamResult && buffettResult && (
        <>
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ScoreCard
              title="Graham Score"
              score={grahamResult.score}
              icon={Shield}
              color="cyan"
              description="Analisis keamanan & valuasi murah"
            />
            <ScoreCard
              title="Buffett Score"
              score={buffettResult.score}
              icon={Award}
              color="green"
              description="Analisis kualitas bisnis & moat"
            />
            <Card className={`p-4 bg-gradient-to-br ${verdict.color === 'green' ? 'from-green-500/20 to-emerald-500/10' : verdict.color === 'yellow' ? 'from-yellow-500/20 to-amber-500/10' : 'from-red-500/20 to-rose-500/10'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-white">Kesimpulan</span>
              </div>
              <p className={`text-xl font-bold ${verdict.color === 'green' ? 'text-green-400' : verdict.color === 'yellow' ? 'text-yellow-400' : 'text-red-400'}`}>
                {verdict.emoji} {verdict.text}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Rata-rata skor: {((grahamResult.score + buffettResult.score) / 2).toFixed(0)}%
              </p>
            </Card>
          </div>

          {/* Intrinsic Value */}
          {intrinsicValue && (
            <Card className="p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
              <h3 className="font-bold text-white flex items-center gap-2 mb-3">
                <Calculator className="w-5 h-5 text-purple-400" /> Graham Intrinsic Value
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">EPS (TTM)</p>
                  <p className="text-lg font-bold text-white">Rp {intrinsicValue.eps?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Book Value/Share</p>
                  <p className="text-lg font-bold text-white">Rp {formatNumber(intrinsicValue.bvps, 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Graham Number</p>
                  <p className="text-lg font-bold text-purple-400">Rp {formatNumber(intrinsicValue.grahamNumber, 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Margin of Safety</p>
                  <p className={`text-lg font-bold ${intrinsicValue.marginOfSafety > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {intrinsicValue.marginOfSafety > 0 ? '+' : ''}{intrinsicValue.marginOfSafety?.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                * Graham Number = √(22.5 × EPS × BVPS). Jika harga saat ini &lt; Graham Number, saham undervalued.
              </p>
            </Card>
          )}

          {/* AI Analysis Section */}
          <Card className="p-4 border-2 border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white">AI Value Investing Analysis</h3>
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
                <span className="text-sm">AI sedang menganalisis fundamental {symbol}...</span>
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
                Klik tombol di atas untuk mendapatkan analisis value investing mendalam dari AI untuk saham {symbol}.
              </p>
            )}
          </Card>

          {/* Key Metrics Quick View */}
          <Card className="p-4">
            <h3 className="font-bold text-white mb-3">📊 Metrik Kunci</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
              {[
                { label: 'PE Ratio', value: data['Current PE Ratio (TTM)'], good: parseValue(data['Current PE Ratio (TTM)']) < 15 },
                { label: 'PBV', value: data['Current Price to Book Value'], good: parseValue(data['Current Price to Book Value']) < 1.5 },
                { label: 'ROE', value: data['Return on Equity (TTM)'], good: parseValue(data['Return on Equity (TTM)']) > 15 },
                { label: 'D/E Ratio', value: data['Debt to Equity Ratio (Quarter)'], good: parseValue(data['Debt to Equity Ratio (Quarter)']) < 0.5 },
                { label: 'NPM', value: data['Net Profit Margin (Quarter)'], good: parseValue(data['Net Profit Margin (Quarter)']) > 10 },
                { label: 'F-Score', value: data['Piotroski F-Score'], good: parseValue(data['Piotroski F-Score']) >= 6 },
              ].map((m, i) => (
                <div key={i} className={`p-2 rounded-lg ${m.good ? 'bg-green-500/10' : 'bg-gray-800'}`}>
                  <p className="text-[10px] text-gray-500">{m.label}</p>
                  <p className={`text-sm font-bold ${m.good ? 'text-green-400' : 'text-white'}`}>{m.value || '-'}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-800 pb-2">
            <button
              onClick={() => setActiveTab('graham')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'graham' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              👴 Benjamin Graham
            </button>
            <button
              onClick={() => setActiveTab('buffett')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'buffett' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              🎩 Warren Buffett
            </button>
          </div>

          {/* Criteria Details */}
          {activeTab === 'graham' && (
            <CriteriaList criteria={grahamResult.criteria} title={`Graham Criteria (${grahamResult.passCount}/${grahamResult.totalCriteria} passed)`} color="cyan" />
          )}
          {activeTab === 'buffett' && (
            <CriteriaList criteria={buffettResult.criteria} title={`Buffett Criteria (${buffettResult.passCount}/${buffettResult.totalCriteria} passed)`} color="green" />
          )}

          {/* All Financial Data */}
          <Card className="overflow-hidden">
            <div className="p-3 border-b border-gray-800 bg-gradient-to-r from-gray-500/10 to-transparent">
              <h3 className="font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Data Keuangan Lengkap
              </h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-800 max-h-[400px] overflow-y-auto">
              {rawData?.closure_fin_items_results?.map((section, si) => (
                <div key={si} className="bg-gray-900 p-3">
                  <h4 className="font-semibold text-purple-400 text-sm mb-2">{section.keystats_name}</h4>
                  <div className="space-y-1">
                    {section.fin_name_results?.slice(0, 6).map((item, ii) => (
                      <div key={ii} className="flex justify-between text-xs">
                        <span className="text-gray-400 truncate pr-2">{item.fitem.name.replace(' (TTM)', '').replace(' (Quarter)', '')}</span>
                        <span className="text-white font-medium flex-shrink-0">{item.fitem.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {!data && !isLoading && !error && (
        <Card className="p-12 text-center">
          <Calculator className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">Masukkan kode saham untuk memulai analisis value investing</p>
          <p className="text-xs text-gray-600 mt-2">Contoh: BBRI, TLKM, ASII, UNVR, BBCA</p>
        </Card>
      )}
    </div>
  );
};

export default ValueInvestingView;
