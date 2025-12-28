import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, RefreshCw, AlertCircle, TrendingUp, TrendingDown, DollarSign,
  BarChart3, Activity, Target, Shield, Award, Sparkles, ChevronDown, 
  ChevronRight, Info, CheckCircle, XCircle, AlertTriangle, LineChart, Layers,
  Zap, PieChart, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { Card, Button, LoadingSpinner } from './ui';
import { getCompanyFinancial, getKeyStats, hasToken } from '../services/stockbitService';
import { analyzeWithAI } from '../services/aiService';

// ====== PARSE FINANCIAL HTML ======
const parseFinancialHTML = (htmlString) => {
  if (!htmlString) return { periods: [], items: {} };
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  const headerCells = doc.querySelectorAll('thead th.periods-list');
  const periods = Array.from(headerCells).map(th => th.getAttribute('data-label') || th.textContent.trim());
  
  const items = {};
  const rows = doc.querySelectorAll('tbody tr');
  
  rows.forEach(row => {
    const nameCell = row.querySelector('.acc-name');
    if (!nameCell) return;
    
    const nameEn = nameCell.getAttribute('data-lang-1-full') || '';
    const nameId = nameCell.getAttribute('data-lang-0-full') || nameCell.textContent.trim();
    const isTotal = row.classList.contains('total');
    const isHeader = row.classList.contains('r_head');
    
    const values = [];
    const valueCells = row.querySelectorAll('td.rowval');
    
    valueCells.forEach((cell, idx) => {
      const rawValue = cell.getAttribute('data-raw');
      const idrValue = cell.getAttribute('data-value-idr');
      values.push({
        period: periods[idx] || `P${idx}`,
        raw: rawValue && rawValue !== '-' ? parseFloat(rawValue) : null,
        idr: idrValue ? parseFloat(idrValue) : null
      });
    });
    
    if (nameId && values.length > 0) {
      items[nameId] = { nameEn, values, isTotal, isHeader };
    }
  });
  
  return { periods, items };
};

// ====== EXTRACT KEY FINANCIAL METRICS ======
const extractFinancialMetrics = (incomeData, balanceData, cashFlowData) => {
  const getLatestValues = (data, keys, count = 8) => {
    if (!data?.items) return [];
    for (const key of keys) {
      const item = Object.entries(data.items).find(([k]) => 
        k.toLowerCase().includes(key.toLowerCase())
      );
      if (item) {
        return item[1].values.slice(-count).map(v => v.raw);
      }
    }
    return [];
  };

  const metrics = {
    // Income Statement
    revenue: getLatestValues(incomeData, ['Penjualan', 'Revenue', 'Pendapatan Usaha', 'Total Revenue']),
    grossProfit: getLatestValues(incomeData, ['Laba Kotor', 'Gross Profit']),
    operatingIncome: getLatestValues(incomeData, ['Laba Usaha', 'Operating Income', 'Laba Operasi']),
    netIncome: getLatestValues(incomeData, ['Laba Bersih', 'Net Income', 'Laba Periode']),
    ebitda: getLatestValues(incomeData, ['EBITDA']),
    
    // Balance Sheet
    totalAssets: getLatestValues(balanceData, ['Total Aset', 'Total Assets', 'Jumlah Aset']),
    totalLiabilities: getLatestValues(balanceData, ['Total Liabilitas', 'Total Liabilities', 'Jumlah Liabilitas']),
    totalEquity: getLatestValues(balanceData, ['Total Ekuitas', 'Total Equity', 'Jumlah Ekuitas']),
    cash: getLatestValues(balanceData, ['Kas', 'Cash', 'Kas Dan Setara Kas']),
    currentAssets: getLatestValues(balanceData, ['Aset Lancar', 'Current Assets']),
    currentLiabilities: getLatestValues(balanceData, ['Liabilitas Jangka Pendek', 'Current Liabilities']),
    inventory: getLatestValues(balanceData, ['Persediaan', 'Inventory']),
    receivables: getLatestValues(balanceData, ['Piutang', 'Receivables']),
    
    // Cash Flow
    operatingCashFlow: getLatestValues(cashFlowData, ['Arus Kas Dari Aktivitas Operasi', 'Operating Cash Flow', 'Cash From Operating']),
    investingCashFlow: getLatestValues(cashFlowData, ['Arus Kas Dari Aktivitas Investasi', 'Investing Cash Flow']),
    financingCashFlow: getLatestValues(cashFlowData, ['Arus Kas Dari Aktivitas Pendanaan', 'Financing Cash Flow']),
    freeCashFlow: getLatestValues(cashFlowData, ['Free Cash Flow']),
    capex: getLatestValues(cashFlowData, ['Pembelian Aset Tetap', 'Capital Expenditure', 'CAPEX'])
  };

  return metrics;
};

// ====== CALCULATE GROWTH & TRENDS ======
const calculateGrowth = (values) => {
  if (!values || values.length < 2) return null;
  const validValues = values.filter(v => v !== null && v !== 0);
  if (validValues.length < 2) return null;
  
  const latest = validValues[validValues.length - 1];
  const previous = validValues[validValues.length - 2];
  if (previous === 0) return null;
  
  return ((latest - previous) / Math.abs(previous)) * 100;
};

const calculateCAGR = (values, periods = 4) => {
  if (!values || values.length < periods) return null;
  const validStart = values.filter(v => v !== null && v > 0)[0];
  const validEnd = values.filter(v => v !== null && v > 0).slice(-1)[0];
  if (!validStart || !validEnd || validStart <= 0) return null;
  
  return (Math.pow(validEnd / validStart, 1 / (periods - 1)) - 1) * 100;
};

const getTrend = (values) => {
  if (!values || values.length < 3) return 'neutral';
  const validValues = values.filter(v => v !== null);
  if (validValues.length < 3) return 'neutral';
  
  let increasing = 0, decreasing = 0;
  for (let i = 1; i < validValues.length; i++) {
    if (validValues[i] > validValues[i-1]) increasing++;
    else if (validValues[i] < validValues[i-1]) decreasing++;
  }
  
  if (increasing > decreasing + 1) return 'up';
  if (decreasing > increasing + 1) return 'down';
  return 'neutral';
};

const countPositive = (values) => {
  if (!values) return 0;
  return values.filter(v => v !== null && v > 0).length;
};

// ====== HELPER FUNCTIONS ======
const parseValue = (val) => {
  if (!val || val === '-' || val === '') return null;
  const str = String(val).replace(/,/g, '').replace('%', '').replace(/[()]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
};

const formatNumber = (num) => {
  if (num === null || num === undefined) return '-';
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(2) + ' T';
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + ' B';
  if (abs >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  if (abs >= 1e3) return (num / 1e3).toFixed(1) + ' K';
  return num.toFixed(0);
};

const formatPercent = (val) => {
  if (val === null || val === undefined) return '-';
  return (val > 0 ? '+' : '') + val.toFixed(2) + '%';
};

// ====== DEEP FUNDAMENTAL ANALYSIS ======
const deepFundamentalAnalysis = (keyStats, metrics) => {
  const analysis = {
    profitability: { score: 0, maxScore: 100, items: [], trends: {} },
    growth: { score: 0, maxScore: 100, items: [], trends: {} },
    financialStrength: { score: 0, maxScore: 100, items: [], trends: {} },
    cashFlowQuality: { score: 0, maxScore: 100, items: [], trends: {} },
    efficiency: { score: 0, maxScore: 100, items: [], trends: {} },
    redFlags: [],
    greenFlags: [],
    verdict: { status: 'NEUTRAL', color: 'gray', emoji: '⚪', message: '' }
  };

  if (!keyStats) return analysis;

  // === 1. PROFITABILITY ANALYSIS ===
  const roe = parseValue(keyStats['Return on Equity (TTM)']);
  const roa = parseValue(keyStats['Return on Assets (TTM)']);
  const roic = parseValue(keyStats['Return On Invested Capital (TTM)']);
  const grossMargin = parseValue(keyStats['Gross Profit Margin (Quarter)']);
  const netMargin = parseValue(keyStats['Net Profit Margin (Quarter)']);
  const opMargin = parseValue(keyStats['Operating Profit Margin (Quarter)']);

  if (roe !== null) {
    if (roe > 20) { analysis.profitability.score += 20; analysis.profitability.items.push({ text: `ROE excellent (${formatPercent(roe)}) - generating strong returns`, status: 'good' }); }
    else if (roe > 15) { analysis.profitability.score += 15; analysis.profitability.items.push({ text: `ROE good (${formatPercent(roe)})`, status: 'good' }); }
    else if (roe > 10) { analysis.profitability.score += 10; analysis.profitability.items.push({ text: `ROE moderate (${formatPercent(roe)})`, status: 'neutral' }); }
    else { analysis.profitability.items.push({ text: `ROE low (${formatPercent(roe)})`, status: 'bad' }); analysis.redFlags.push('ROE rendah'); }
  }

  if (grossMargin !== null) {
    if (grossMargin > 40) { analysis.profitability.score += 20; analysis.profitability.items.push({ text: `Gross Margin tinggi (${formatPercent(grossMargin)}) - pricing power kuat`, status: 'good' }); analysis.greenFlags.push('Margin kotor tinggi'); }
    else if (grossMargin > 25) { analysis.profitability.score += 12; analysis.profitability.items.push({ text: `Gross Margin wajar (${formatPercent(grossMargin)})`, status: 'neutral' }); }
    else { analysis.profitability.items.push({ text: `Gross Margin rendah (${formatPercent(grossMargin)}) - kompetisi ketat`, status: 'warning' }); }
  }

  if (netMargin !== null) {
    if (netMargin > 15) { analysis.profitability.score += 20; analysis.profitability.items.push({ text: `Net Margin premium (${formatPercent(netMargin)})`, status: 'good' }); analysis.greenFlags.push('Profitabilitas tinggi'); }
    else if (netMargin > 8) { analysis.profitability.score += 12; analysis.profitability.items.push({ text: `Net Margin healthy (${formatPercent(netMargin)})`, status: 'neutral' }); }
    else if (netMargin > 0) { analysis.profitability.score += 5; analysis.profitability.items.push({ text: `Net Margin tipis (${formatPercent(netMargin)})`, status: 'warning' }); }
    else { analysis.profitability.items.push({ text: `Merugi (${formatPercent(netMargin)})`, status: 'bad' }); analysis.redFlags.push('Perusahaan merugi'); }
  }

  if (roic !== null && roic > 12) { analysis.profitability.score += 20; analysis.greenFlags.push('ROIC tinggi - capital allocation bagus'); }

  // Net Income Consistency
  const netIncomePositive = countPositive(metrics.netIncome);
  if (netIncomePositive >= 7) { analysis.profitability.score += 20; analysis.profitability.items.push({ text: `Konsisten profit (${netIncomePositive}/8 periode positif)`, status: 'good' }); analysis.greenFlags.push('Profit konsisten'); }
  else if (netIncomePositive >= 5) { analysis.profitability.score += 10; analysis.profitability.items.push({ text: `Profit tidak konsisten (${netIncomePositive}/8 periode)`, status: 'neutral' }); }
  else if (netIncomePositive > 0) { analysis.profitability.items.push({ text: `Sering merugi (hanya ${netIncomePositive}/8 periode profit)`, status: 'bad' }); analysis.redFlags.push('Profit tidak konsisten'); }

  // === 2. GROWTH ANALYSIS ===
  const revenueGrowth = parseValue(keyStats['Revenue (Quarter YoY Growth)']);
  const netIncomeGrowth = parseValue(keyStats['Net Income (Quarter YoY Growth)']);
  const epsGrowth = parseValue(keyStats['EPS Growth YoY (Quarter)']);
  
  const revenueTrend = getTrend(metrics.revenue);
  const netIncomeTrend = getTrend(metrics.netIncome);
  const revenueCAGR = calculateCAGR(metrics.revenue);
  
  analysis.growth.trends = { revenue: revenueTrend, netIncome: netIncomeTrend };

  if (revenueGrowth !== null) {
    if (revenueGrowth > 20) { analysis.growth.score += 25; analysis.growth.items.push({ text: `Revenue growth kuat (${formatPercent(revenueGrowth)})`, status: 'good' }); analysis.greenFlags.push('Pertumbuhan revenue kuat'); }
    else if (revenueGrowth > 10) { analysis.growth.score += 18; analysis.growth.items.push({ text: `Revenue growth solid (${formatPercent(revenueGrowth)})`, status: 'good' }); }
    else if (revenueGrowth > 0) { analysis.growth.score += 10; analysis.growth.items.push({ text: `Revenue growth lambat (${formatPercent(revenueGrowth)})`, status: 'neutral' }); }
    else { analysis.growth.items.push({ text: `Revenue menurun (${formatPercent(revenueGrowth)})`, status: 'bad' }); analysis.redFlags.push('Revenue menurun'); }
  }

  if (netIncomeGrowth !== null) {
    if (netIncomeGrowth > 25) { analysis.growth.score += 25; analysis.growth.items.push({ text: `Profit growth excellent (${formatPercent(netIncomeGrowth)})`, status: 'good' }); }
    else if (netIncomeGrowth > 10) { analysis.growth.score += 15; analysis.growth.items.push({ text: `Profit growth baik (${formatPercent(netIncomeGrowth)})`, status: 'good' }); }
    else if (netIncomeGrowth < -10) { analysis.growth.items.push({ text: `Profit menurun signifikan (${formatPercent(netIncomeGrowth)})`, status: 'bad' }); analysis.redFlags.push('Profit menurun'); }
  }

  if (revenueTrend === 'up') { analysis.growth.score += 25; analysis.growth.items.push({ text: 'Trend revenue naik konsisten', status: 'good' }); }
  else if (revenueTrend === 'down') { analysis.growth.items.push({ text: 'Trend revenue menurun', status: 'bad' }); }

  if (revenueCAGR !== null) {
    analysis.growth.items.push({ text: `Revenue CAGR: ${formatPercent(revenueCAGR)}`, status: revenueCAGR > 10 ? 'good' : revenueCAGR > 0 ? 'neutral' : 'bad' });
    if (revenueCAGR > 15) analysis.growth.score += 25;
    else if (revenueCAGR > 5) analysis.growth.score += 12;
  }

  // === 3. FINANCIAL STRENGTH ===
  const currentRatio = parseValue(keyStats['Current Ratio (Quarter)']);
  const quickRatio = parseValue(keyStats['Quick Ratio (Quarter)']);
  const debtToEquity = parseValue(keyStats['Debt to Equity Ratio (Quarter)']);
  const interestCoverage = parseValue(keyStats['Interest Coverage (TTM)']);
  const altmanZ = parseValue(keyStats['Altman Z-Score (Modified)']);

  if (currentRatio !== null) {
    if (currentRatio > 2) { analysis.financialStrength.score += 20; analysis.financialStrength.items.push({ text: `Likuiditas sangat baik (CR: ${currentRatio.toFixed(2)}x)`, status: 'good' }); }
    else if (currentRatio > 1.5) { analysis.financialStrength.score += 15; analysis.financialStrength.items.push({ text: `Likuiditas baik (CR: ${currentRatio.toFixed(2)}x)`, status: 'good' }); }
    else if (currentRatio > 1) { analysis.financialStrength.score += 8; analysis.financialStrength.items.push({ text: `Likuiditas cukup (CR: ${currentRatio.toFixed(2)}x)`, status: 'neutral' }); }
    else { analysis.financialStrength.items.push({ text: `Risiko likuiditas (CR: ${currentRatio.toFixed(2)}x)`, status: 'bad' }); analysis.redFlags.push('Likuiditas rendah'); }
  }

  if (debtToEquity !== null) {
    if (debtToEquity < 0.3) { analysis.financialStrength.score += 25; analysis.financialStrength.items.push({ text: `Hampir bebas utang (D/E: ${debtToEquity.toFixed(2)}x)`, status: 'good' }); analysis.greenFlags.push('Utang rendah'); }
    else if (debtToEquity < 0.7) { analysis.financialStrength.score += 18; analysis.financialStrength.items.push({ text: `Utang terkendali (D/E: ${debtToEquity.toFixed(2)}x)`, status: 'good' }); }
    else if (debtToEquity < 1.5) { analysis.financialStrength.score += 10; analysis.financialStrength.items.push({ text: `Leverage moderate (D/E: ${debtToEquity.toFixed(2)}x)`, status: 'neutral' }); }
    else { analysis.financialStrength.items.push({ text: `Leverage tinggi (D/E: ${debtToEquity.toFixed(2)}x)`, status: 'bad' }); analysis.redFlags.push('Utang tinggi'); }
  }

  if (interestCoverage !== null) {
    if (interestCoverage > 10) { analysis.financialStrength.score += 20; analysis.financialStrength.items.push({ text: `Interest coverage sangat aman (${interestCoverage.toFixed(1)}x)`, status: 'good' }); }
    else if (interestCoverage > 3) { analysis.financialStrength.score += 12; analysis.financialStrength.items.push({ text: `Interest coverage aman (${interestCoverage.toFixed(1)}x)`, status: 'neutral' }); }
    else if (interestCoverage > 1) { analysis.financialStrength.items.push({ text: `Interest coverage rendah (${interestCoverage.toFixed(1)}x)`, status: 'warning' }); }
    else { analysis.financialStrength.items.push({ text: `Tidak mampu bayar bunga`, status: 'bad' }); analysis.redFlags.push('Interest coverage negatif'); }
  }

  if (altmanZ !== null) {
    if (altmanZ > 2.99) { analysis.financialStrength.score += 15; analysis.financialStrength.items.push({ text: `Altman Z-Score safe zone (${altmanZ.toFixed(2)})`, status: 'good' }); }
    else if (altmanZ > 1.81) { analysis.financialStrength.items.push({ text: `Altman Z-Score grey zone (${altmanZ.toFixed(2)})`, status: 'warning' }); }
    else { analysis.financialStrength.items.push({ text: `Altman Z-Score distress zone (${altmanZ.toFixed(2)})`, status: 'bad' }); analysis.redFlags.push('Risiko kebangkrutan tinggi'); }
  }

  // Equity trend
  const equityTrend = getTrend(metrics.totalEquity);
  if (equityTrend === 'up') { analysis.financialStrength.score += 20; analysis.financialStrength.items.push({ text: 'Ekuitas terus bertumbuh', status: 'good' }); }
  else if (equityTrend === 'down') { analysis.financialStrength.items.push({ text: 'Ekuitas menurun', status: 'warning' }); }

  // === 4. CASH FLOW QUALITY ===
  const ocfPositive = countPositive(metrics.operatingCashFlow);
  const ocfTrend = getTrend(metrics.operatingCashFlow);
  const latestOCF = metrics.operatingCashFlow?.slice(-1)[0];
  const latestNetIncome = metrics.netIncome?.slice(-1)[0];

  if (ocfPositive >= 7) { analysis.cashFlowQuality.score += 35; analysis.cashFlowQuality.items.push({ text: `OCF konsisten positif (${ocfPositive}/8 periode)`, status: 'good' }); analysis.greenFlags.push('Cash flow operasional kuat'); }
  else if (ocfPositive >= 5) { analysis.cashFlowQuality.score += 20; analysis.cashFlowQuality.items.push({ text: `OCF cukup stabil (${ocfPositive}/8 periode positif)`, status: 'neutral' }); }
  else { analysis.cashFlowQuality.items.push({ text: `OCF tidak stabil (${ocfPositive}/8 periode positif)`, status: 'bad' }); analysis.redFlags.push('Cash flow tidak stabil'); }

  if (ocfTrend === 'up') { analysis.cashFlowQuality.score += 20; analysis.hashFlowQuality?.items?.push({ text: 'Trend OCF naik', status: 'good' }); }

  // Cash Flow vs Net Income quality check
  if (latestOCF !== null && latestNetIncome !== null && latestNetIncome > 0) {
    const ocfToNI = latestOCF / latestNetIncome;
    if (ocfToNI > 1) { analysis.cashFlowQuality.score += 25; analysis.cashFlowQuality.items.push({ text: `OCF > Net Income (${ocfToNI.toFixed(2)}x) - kualitas laba tinggi`, status: 'good' }); analysis.greenFlags.push('Kualitas laba tinggi'); }
    else if (ocfToNI > 0.7) { analysis.cashFlowQuality.score += 15; analysis.cashFlowQuality.items.push({ text: `OCF mendekati Net Income (${ocfToNI.toFixed(2)}x)`, status: 'neutral' }); }
    else if (ocfToNI > 0) { analysis.cashFlowQuality.items.push({ text: `OCF jauh di bawah Net Income (${ocfToNI.toFixed(2)}x) - cek kualitas laba`, status: 'warning' }); }
  }

  // Free Cash Flow
  const fcfPositive = countPositive(metrics.freeCashFlow);
  if (fcfPositive >= 6) { analysis.cashFlowQuality.score += 20; analysis.cashFlowQuality.items.push({ text: `FCF konsisten positif`, status: 'good' }); }

  // === 5. VALUATION ===
  const pe = parseValue(keyStats['Current PE Ratio (TTM)']);
  const pbv = parseValue(keyStats['Current Price to Book Value']);
  const ps = parseValue(keyStats['Current Price to Sales (TTM)']);
  const evEbitda = parseValue(keyStats['EV to EBITDA (TTM)']);
  const peg = parseValue(keyStats['PEG Ratio']);
  const dividendYield = parseValue(keyStats['Dividend Yield']);

  if (pe !== null && pe > 0) {
    if (pe < 8) { analysis.efficiency.score += 25; analysis.efficiency.items.push({ text: `PE sangat murah (${pe.toFixed(2)}x)`, status: 'good' }); analysis.greenFlags.push('Valuasi murah'); }
    else if (pe < 12) { analysis.efficiency.score += 20; analysis.efficiency.items.push({ text: `PE attractive (${pe.toFixed(2)}x)`, status: 'good' }); }
    else if (pe < 18) { analysis.efficiency.score += 12; analysis.efficiency.items.push({ text: `PE wajar (${pe.toFixed(2)}x)`, status: 'neutral' }); }
    else if (pe < 30) { analysis.efficiency.score += 5; analysis.efficiency.items.push({ text: `PE premium (${pe.toFixed(2)}x)`, status: 'warning' }); }
    else { analysis.efficiency.items.push({ text: `PE sangat mahal (${pe.toFixed(2)}x)`, status: 'bad' }); analysis.redFlags.push('Valuasi terlalu mahal'); }
  }

  if (pbv !== null) {
    if (pbv < 1) { analysis.efficiency.score += 25; analysis.efficiency.items.push({ text: `PBV < 1 (${pbv.toFixed(2)}x) - di bawah nilai buku`, status: 'good' }); }
    else if (pbv < 1.5) { analysis.efficiency.score += 15; analysis.efficiency.items.push({ text: `PBV reasonable (${pbv.toFixed(2)}x)`, status: 'neutral' }); }
    else if (pbv < 3) { analysis.efficiency.score += 8; analysis.efficiency.items.push({ text: `PBV moderate (${pbv.toFixed(2)}x)`, status: 'neutral' }); }
    else { analysis.efficiency.items.push({ text: `PBV tinggi (${pbv.toFixed(2)}x)`, status: 'warning' }); }
  }

  if (evEbitda !== null && evEbitda > 0) {
    if (evEbitda < 6) { analysis.efficiency.score += 20; analysis.efficiency.items.push({ text: `EV/EBITDA murah (${evEbitda.toFixed(2)}x)`, status: 'good' }); }
    else if (evEbitda < 10) { analysis.efficiency.score += 12; analysis.efficiency.items.push({ text: `EV/EBITDA wajar (${evEbitda.toFixed(2)}x)`, status: 'neutral' }); }
    else { analysis.efficiency.items.push({ text: `EV/EBITDA mahal (${evEbitda.toFixed(2)}x)`, status: 'warning' }); }
  }

  if (dividendYield !== null && dividendYield > 0) {
    if (dividendYield > 5) { analysis.efficiency.score += 15; analysis.efficiency.items.push({ text: `Dividend yield tinggi (${formatPercent(dividendYield)})`, status: 'good' }); analysis.greenFlags.push('Dividen tinggi'); }
    else if (dividendYield > 2) { analysis.efficiency.score += 8; analysis.efficiency.items.push({ text: `Dividend yield wajar (${formatPercent(dividendYield)})`, status: 'neutral' }); }
  }

  if (peg !== null && peg > 0) {
    if (peg < 1) { analysis.efficiency.score += 10; analysis.efficiency.items.push({ text: `PEG < 1 (${peg.toFixed(2)}) - undervalued vs growth`, status: 'good' }); }
    else if (peg < 2) { analysis.efficiency.items.push({ text: `PEG wajar (${peg.toFixed(2)})`, status: 'neutral' }); }
  }

  // === CALCULATE FINAL VERDICT ===
  const avgScore = (analysis.profitability.score + analysis.growth.score + analysis.financialStrength.score + analysis.cashFlowQuality.score + analysis.efficiency.score) / 5;
  const redFlagCount = analysis.redFlags.length;
  const greenFlagCount = analysis.greenFlags.length;

  let finalScore = avgScore;
  if (redFlagCount >= 3) finalScore -= 15;
  if (greenFlagCount >= 3) finalScore += 10;

  if (finalScore >= 65) {
    analysis.verdict = { status: 'STRONG BUY', color: 'green', emoji: '🟢', message: 'Fundamental sangat kuat dengan valuasi menarik. Layak untuk investasi jangka panjang.' };
  } else if (finalScore >= 50) {
    analysis.verdict = { status: 'BUY', color: 'green', emoji: '🟢', message: 'Fundamental baik dengan valuasi reasonable. Perhatikan timing entry.' };
  } else if (finalScore >= 40) {
    analysis.verdict = { status: 'HOLD', color: 'yellow', emoji: '🟡', message: 'Fundamental cukup, valuasi wajar. Wait for better opportunity atau hold jika sudah punya.' };
  } else if (finalScore >= 25) {
    analysis.verdict = { status: 'WEAK', color: 'orange', emoji: '🟠', message: 'Beberapa kelemahan fundamental. Hindari atau kurangi posisi.' };
  } else {
    analysis.verdict = { status: 'AVOID', color: 'red', emoji: '🔴', message: 'Fundamental lemah dengan banyak red flags. Sangat tidak disarankan.' };
  }

  analysis.overallScore = Math.round(finalScore);

  return analysis;
};

// ====== UI COMPONENTS ======
const TrendIcon = ({ trend }) => {
  if (trend === 'up') return <ArrowUpRight className="w-4 h-4 text-green-400" />;
  if (trend === 'down') return <ArrowDownRight className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
};

const MetricCard = ({ label, value, status, icon: Icon, trend }) => {
  const colors = {
    good: 'text-green-400 bg-green-500/10 border-green-500/30',
    neutral: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    warning: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    bad: 'text-red-400 bg-red-500/10 border-red-500/30'
  };

  return (
    <div className={`p-3 rounded-xl border ${colors[status] || 'text-gray-400 bg-gray-500/10 border-gray-500/30'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          {Icon && <Icon size={14} />}
          <span className="text-xs text-gray-400">{label}</span>
        </div>
        {trend && <TrendIcon trend={trend} />}
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
};

const AnalysisSection = ({ title, score, maxScore, items, icon: Icon, color, trends }) => {
  const [isOpen, setIsOpen] = useState(true);
  const pct = Math.round((score / maxScore) * 100);
  const getColor = (p) => p >= 60 ? 'green' : p >= 40 ? 'yellow' : p >= 25 ? 'orange' : 'red';
  
  const statusIcons = {
    good: <CheckCircle className="w-4 h-4 text-green-400" />,
    neutral: <Info className="w-4 h-4 text-yellow-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-orange-400" />,
    bad: <XCircle className="w-4 h-4 text-red-400" />
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-5 h-5 text-${color}-400`} />}
          <h3 className="font-bold text-white text-sm">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold text-${getColor(pct)}-400`}>{pct}%</span>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full mt-2">
        <div className={`h-full bg-${getColor(pct)}-500 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {isOpen && items.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {statusIcons[item.status]}
              <span className="text-gray-300">{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const FlagsList = ({ flags, type }) => {
  if (!flags || flags.length === 0) return null;
  const isGreen = type === 'green';
  
  return (
    <div className={`p-3 rounded-xl border ${isGreen ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
      <h4 className={`text-sm font-bold mb-2 ${isGreen ? 'text-green-400' : 'text-red-400'}`}>
        {isGreen ? '✅ Green Flags' : '⚠️ Red Flags'}
      </h4>
      <div className="flex flex-wrap gap-2">
        {flags.map((f, i) => (
          <span key={i} className={`px-2 py-1 rounded-lg text-xs ${isGreen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{f}</span>
        ))}
      </div>
    </div>
  );
};

// ====== FINANCIAL STATEMENTS SECTION ======
const REPORT_TYPES = [
  { value: 1, label: 'Income Statement' },
  { value: 2, label: 'Balance Sheet' },
  { value: 3, label: 'Cash Flow' }
];

const STATEMENT_TYPES = [
  { value: 1, label: 'Quarterly' },
  { value: 2, label: 'Annual' },
  { value: 3, label: 'TTM' },
  { value: 4, label: 'Interim YTD' },
  { value: 5, label: 'Q1' },
  { value: 6, label: 'Q2' },
  { value: 7, label: 'Q3' },
  { value: 8, label: 'Q4' },
  { value: 9, label: 'QoQ Growth' },
  { value: 10, label: 'Quarter YoY Growth' },
  { value: 11, label: 'YTD YoY Growth' },
  { value: 12, label: 'Annual YoY Growth' },
  { value: 13, label: '3 Year CAGR' }
];

const FinancialStatementsSection = ({ symbol }) => {
  const [reportType, setReportType] = useState(1);
  const [stmtType, setStmtType] = useState(1);
  const [financialData, setFinancialData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(8);

  const fetchFinancialData = useCallback(async () => {
    if (!symbol || !hasToken()) return;
    setIsLoading(true);
    try {
      const res = await getCompanyFinancial({ symbol, reportType, statementType: stmtType });
      if (res.data?.html_report) {
        setFinancialData(parseFinancialHTML(res.data.html_report));
      }
    } catch (err) {
      console.error('Failed to fetch financial data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, reportType, stmtType]);

  useEffect(() => {
    if (symbol) fetchFinancialData();
  }, [symbol, reportType, stmtType]);

  const reportLabel = REPORT_TYPES.find(r => r.value === reportType)?.label || 'Financial';
  const stmtLabel = STATEMENT_TYPES.find(s => s.value === stmtType)?.label || '';

  const periods = financialData?.periods?.slice(-visibleColumns) || [];
  const items = financialData?.items || {};
  const itemEntries = Object.entries(items);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <LineChart className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-white">Financial Statements</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select 
            value={reportType} 
            onChange={(e) => setReportType(Number(e.target.value))}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
          >
            {REPORT_TYPES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <select 
            value={stmtType} 
            onChange={(e) => setStmtType(Number(e.target.value))}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
          >
            {STATEMENT_TYPES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={visibleColumns}
            onChange={(e) => setVisibleColumns(Number(e.target.value))}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value={4}>4 Periods</option>
            <option value={8}>8 Periods</option>
            <option value={12}>12 Periods</option>
            <option value={20}>20 Periods</option>
          </select>
          <Button onClick={fetchFinancialData} variant="outline" size="sm" loading={isLoading} icon={<RefreshCw size={14} />} />
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">{reportLabel} - {stmtLabel} • {symbol}</p>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full" />
          <span className="ml-2 text-gray-400 text-sm">Loading...</span>
        </div>
      )}

      {!isLoading && itemEntries.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="text-left py-2 px-2 text-gray-400 font-semibold sticky left-0 bg-black z-10 min-w-[180px]">
                  Account (In Million)
                </th>
                {periods.map((p, idx) => (
                  <th key={idx} className="text-right py-2 px-2 text-gray-400 font-semibold whitespace-nowrap">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itemEntries.map(([name, data], rowIdx) => {
                const displayValues = data.values.slice(-visibleColumns);
                const isHeader = data.isHeader;
                const isTotal = data.isTotal;
                
                return (
                  <tr 
                    key={rowIdx} 
                    className={`border-b border-gray-900 hover:bg-gray-900/50 transition-colors ${isTotal ? 'bg-gray-800/50 font-bold' : ''} ${isHeader ? 'bg-gray-900/30' : ''}`}
                  >
                    <td 
                      className={`py-1.5 px-2 sticky left-0 bg-black z-10 ${isTotal ? 'text-white font-bold' : isHeader ? 'text-purple-400 font-semibold' : 'text-gray-300'}`}
                      title={name}
                    >
                      <span className="block truncate max-w-[180px]">{name}</span>
                    </td>
                    {displayValues.map((v, colIdx) => {
                      const val = v.raw;
                      const isPositive = val !== null && val > 0;
                      const isNegative = val !== null && val < 0;
                      const isGrowthType = stmtType >= 9;
                      
                      let textColor = 'text-gray-400';
                      if (isGrowthType) {
                        textColor = isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-500';
                      } else {
                        textColor = isNegative ? 'text-red-400' : isPositive ? 'text-white' : 'text-gray-500';
                      }

                      return (
                        <td key={colIdx} className={`py-1.5 px-2 text-right whitespace-nowrap ${textColor} ${isTotal ? 'font-bold' : ''}`}>
                          {val !== null ? (
                            isGrowthType ? formatPercent(val) : formatNumber(val)
                          ) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && itemEntries.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <LineChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No financial data available</p>
        </div>
      )}

      <p className="text-[10px] text-gray-600 mt-3">
        * Data dalam jutaan IDR. Warna merah menunjukkan nilai negatif.
      </p>
    </Card>
  );
};

// ====== MAIN COMPONENT ======
const FundAnalysisView = () => {
  const [symbol, setSymbol] = useState('');
  const [symbolInput, setSymbolInput] = useState('');
  const [statementType, setStatementType] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [keyStats, setKeyStats] = useState(null);
  const [incomeData, setIncomeData] = useState(null);
  const [balanceData, setBalanceData] = useState(null);
  const [cashFlowData, setCashFlowData] = useState(null);
  
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    if (!hasToken()) { setError('Token tidak ditemukan. Set di Settings.'); return; }

    setIsLoading(true);
    setError(null);
    setAiAnalysis(null);

    try {
      const [ksRes, incRes, balRes, cfRes] = await Promise.all([
        getKeyStats({ symbol }),
        getCompanyFinancial({ symbol, reportType: 1, statementType }),
        getCompanyFinancial({ symbol, reportType: 2, statementType }),
        getCompanyFinancial({ symbol, reportType: 3, statementType })
      ]);

      if (ksRes.data?.closure_fin_items_results) {
        const flat = {};
        ksRes.data.closure_fin_items_results.forEach(s => {
          s.fin_name_results?.forEach(i => { if (i.fitem) flat[i.fitem.name] = i.fitem.value; });
          s.fin_item_results?.forEach(i => { flat[i.title] = i.value; });
        });
        setKeyStats(flat);
      }

      if (incRes.data?.html_report) setIncomeData(parseFinancialHTML(incRes.data.html_report));
      if (balRes.data?.html_report) setBalanceData(parseFinancialHTML(balRes.data.html_report));
      if (cfRes.data?.html_report) setCashFlowData(parseFinancialHTML(cfRes.data.html_report));
    } catch (err) {
      setError(`Gagal memuat: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, statementType]);

  useEffect(() => { if (symbol) fetchData(); }, [symbol, statementType]);

  const metrics = useMemo(() => extractFinancialMetrics(incomeData, balanceData, cashFlowData), [incomeData, balanceData, cashFlowData]);
  const analysis = useMemo(() => deepFundamentalAnalysis(keyStats, metrics), [keyStats, metrics]);

  const handleSearch = (e) => { e?.preventDefault(); if (symbolInput.trim()) setSymbol(symbolInput.trim().toUpperCase()); };

  const fetchAI = useCallback(async () => {
    if (!analysis || !symbol) return;
    setIsLoadingAI(true);
    try {
      const ctx = `Deep Analysis ${symbol}:
Overall Score: ${analysis.overallScore}%
Verdict: ${analysis.verdict.status}

Profitability: ${analysis.profitability.score}%
Growth: ${analysis.growth.score}%
Financial Strength: ${analysis.financialStrength.score}%
Cash Flow Quality: ${analysis.cashFlowQuality.score}%
Valuation: ${analysis.efficiency.score}%

Green Flags: ${analysis.greenFlags.join(', ') || 'None'}
Red Flags: ${analysis.redFlags.join(', ') || 'None'}

Key Stats: ${Object.entries(keyStats || {}).slice(0, 15).map(([k, v]) => `${k}: ${v}`).join('\n')}`;
      
      const prompt = `Berdasarkan deep fundamental analysis di atas untuk ${symbol}, berikan:
1. Ringkasan eksekutif kondisi perusahaan
2. Competitive advantage yang dimiliki
3. Risiko utama yang perlu diperhatikan
4. Apakah valuasi saat ini menarik?
5. Target harga wajar (jika memungkinkan)
6. Rekomendasi final: BUY/HOLD/SELL dengan alasan`;

      const res = await analyzeWithAI(prompt, ctx);
      setAiAnalysis(res.success ? res.analysis : `Error: ${res.error}`);
    } catch (err) {
      setAiAnalysis(`Error: ${err.message}`);
    } finally {
      setIsLoadingAI(false);
    }
  }, [analysis, symbol, keyStats]);

  const revenueTrend = getTrend(metrics.revenue);
  const profitTrend = getTrend(metrics.netIncome);
  const ocfTrend = getTrend(metrics.operatingCashFlow);

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-7 h-7 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Deep Fund Analysis</h1>
          <p className="text-gray-500 text-xs">Analisis Fundamental Komprehensif</p>
        </div>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" value={symbolInput} onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              placeholder="BBRI, TLKM, ASII..." className="w-full pl-9 pr-4 py-2.5 bg-black border-2 border-gray-800 rounded-xl text-white" />
          </div>
          <select value={statementType} onChange={(e) => setStatementType(Number(e.target.value))}
            className="px-3 py-2 bg-black border-2 border-gray-800 rounded-xl text-white">
            <option value={1}>Quarterly</option>
            <option value={2}>Annual</option>
          </select>
          <Button type="submit" variant="primary" loading={isLoading} icon={<Search size={16} />}>Analisa</Button>
          {symbol && <Button onClick={fetchData} variant="outline" loading={isLoading} icon={<RefreshCw size={16} />} />}
        </form>
      </Card>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
      {isLoading && <LoadingSpinner message={`Deep analyzing ${symbol}...`} />}

      {analysis && keyStats && !isLoading && (
        <div className="space-y-4">
          {/* Verdict Card */}
          <Card className={`p-5 border-2 ${analysis.verdict.color === 'green' ? 'border-green-500/40 bg-gradient-to-r from-green-500/10 to-transparent' : analysis.verdict.color === 'yellow' ? 'border-yellow-500/40 bg-gradient-to-r from-yellow-500/10 to-transparent' : analysis.verdict.color === 'orange' ? 'border-orange-500/40 bg-gradient-to-r from-orange-500/10 to-transparent' : 'border-red-500/40 bg-gradient-to-r from-red-500/10 to-transparent'}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-bold text-white">{symbol}</h2>
                <p className="text-gray-400 text-sm mt-1">{analysis.verdict.message}</p>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold ${analysis.verdict.color === 'green' ? 'text-green-400' : analysis.verdict.color === 'yellow' ? 'text-yellow-400' : analysis.verdict.color === 'orange' ? 'text-orange-400' : 'text-red-400'}`}>
                  {analysis.overallScore}%
                </div>
                <div className={`text-lg font-bold mt-1 px-4 py-1 rounded-lg ${analysis.verdict.color === 'green' ? 'bg-green-500/20 text-green-400' : analysis.verdict.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' : analysis.verdict.color === 'orange' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                  {analysis.verdict.emoji} {analysis.verdict.status}
                </div>
              </div>
            </div>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <MetricCard label="PE Ratio" value={keyStats['Current PE Ratio (TTM)'] || '-'} status={parseValue(keyStats['Current PE Ratio (TTM)']) < 15 ? 'good' : 'neutral'} icon={Target} />
            <MetricCard label="PBV" value={keyStats['Current Price to Book Value'] || '-'} status={parseValue(keyStats['Current Price to Book Value']) < 2 ? 'good' : 'neutral'} icon={Layers} />
            <MetricCard label="ROE" value={keyStats['Return on Equity (TTM)'] || '-'} status={parseValue(keyStats['Return on Equity (TTM)']) > 15 ? 'good' : 'neutral'} icon={TrendingUp} trend={profitTrend} />
            <MetricCard label="D/E" value={keyStats['Debt to Equity Ratio (Quarter)'] || '-'} status={parseValue(keyStats['Debt to Equity Ratio (Quarter)']) < 1 ? 'good' : 'warning'} icon={Shield} />
            <MetricCard label="Revenue" value={formatNumber(metrics.revenue?.slice(-1)[0])} status={revenueTrend === 'up' ? 'good' : 'neutral'} icon={DollarSign} trend={revenueTrend} />
            <MetricCard label="OCF" value={formatNumber(metrics.operatingCashFlow?.slice(-1)[0])} status={(metrics.operatingCashFlow?.slice(-1)[0] || 0) > 0 ? 'good' : 'bad'} icon={Activity} trend={ocfTrend} />
          </div>

          {/* Flags */}
          <div className="grid md:grid-cols-2 gap-3">
            <FlagsList flags={analysis.greenFlags} type="green" />
            <FlagsList flags={analysis.redFlags} type="red" />
          </div>

          {/* Analysis Sections */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <AnalysisSection title="Profitability" {...analysis.profitability} icon={TrendingUp} color="green" />
            <AnalysisSection title="Growth" {...analysis.growth} icon={Zap} color="purple" />
            <AnalysisSection title="Financial Strength" {...analysis.financialStrength} icon={Shield} color="blue" />
            <AnalysisSection title="Cash Flow" {...analysis.cashFlowQuality} icon={Activity} color="cyan" />
            <AnalysisSection title="Valuation" {...analysis.efficiency} icon={Target} color="yellow" />
          </div>

          {/* AI Analysis */}
          <Card className="p-4 border-2 border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white">AI Deep Analysis</h3>
              </div>
              <Button onClick={fetchAI} variant="primary" size="sm" loading={isLoadingAI} icon={<Sparkles size={14} />}
                className="bg-gradient-to-r from-purple-500 to-pink-500">
                {aiAnalysis ? 'Refresh' : 'Generate'}
              </Button>
            </div>
            {isLoadingAI && <div className="text-purple-400 text-sm py-4 flex items-center gap-2"><div className="animate-spin w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full" />AI sedang menganalisis...</div>}
            {aiAnalysis && !isLoadingAI && <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{aiAnalysis}</div>}
            {!aiAnalysis && !isLoadingAI && <p className="text-gray-500 text-sm">Klik Generate untuk mendapatkan analisis mendalam dari AI</p>}
          </Card>

          {/* Key Stats */}
          <Card className="p-4">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-cyan-400" />All Key Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {Object.entries(keyStats).map(([k, v]) => (
                <div key={k} className="p-2 bg-gray-900/50 rounded-lg">
                  <p className="text-[10px] text-gray-500 truncate" title={k}>{k}</p>
                  <p className="text-xs font-medium text-white">{v || '-'}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Financial Statements Tables */}
          <FinancialStatementsSection symbol={symbol} />
        </div>
      )}

      {!symbol && !isLoading && (
        <Card className="p-8 text-center">
          <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Deep Fundamental Analysis</h3>
          <p className="text-gray-400 max-w-md mx-auto">Analisis komprehensif mencakup Profitability, Growth, Financial Strength, Cash Flow Quality, dan Valuation</p>
        </Card>
      )}
    </div>
  );
};

export default FundAnalysisView;
