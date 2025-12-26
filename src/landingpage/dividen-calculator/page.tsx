"use client";

import React, { useState, useMemo, FC, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { FaCalculator, FaArrowUp, FaArrowDown, FaEquals, FaLightbulb } from "react-icons/fa";

// --- TYPES ---
type Market = "IDX" | "US";

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number, currency: Market = "IDX") => {
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency: currency === "IDX" ? "IDR" : "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  };
  return new Intl.NumberFormat(currency === "IDX" ? "id-ID" : "en-US", options).format(value);
};
const formatPercentage = (value: number) => `${(value || 0).toFixed(2)}%`;
const parseInput = (input: string) => Number(input.replace(/[^0-9]/g, "")) || 0;

// --- MAIN COMPONENT ---
export default function DividendCalculator() {
  const [market, setMarket] = useState<Market>("IDX");
  const [sharePrice, setSharePrice] = useState<string>("2700");
  const [averagePurchasePrice, setAveragePurchasePrice] = useState<string>("2500");
  const [sharesOwned, setSharesOwned] = useState<string>("1000");
  const [dividendPerShare, setDividendPerShare] = useState<string>("400");
  const [netProfit, setNetProfit] = useState<string>("");
  const [totalShares, setTotalShares] = useState<string>("");
  const [taxRate, setTaxRate] = useState<string>("15");
  const [dividendFrequency, setDividendFrequency] = useState<number>(2);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const loadScript = (src: string, id: string) => {
      if (!document.getElementById(id)) {
        const script = document.createElement("script");
        script.src = src;
        script.id = id;
        script.async = true;
        document.body.appendChild(script);
      }
    };
    loadScript("https://cdn.jsdelivr.net/npm/chart.js", "chartjs-script");
    loadScript("https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js", "chartjs-annotation-script");
  }, []);

  const { calculationResult, totalReturnResult } = useMemo(() => {
    const pSharePrice = parseInput(sharePrice);
    const pAvgPrice = parseInput(averagePurchasePrice);
    const pSharesOwned = parseInput(sharesOwned);
    const pDividendPerShare = parseInput(dividendPerShare);

    if (pSharePrice <= 0 || pSharesOwned <= 0 || pDividendPerShare <= 0 || pAvgPrice <= 0) {
      return { calculationResult: null, totalReturnResult: null };
    }

    const annualDPS = market === "US" ? pDividendPerShare * 4 : pDividendPerShare * dividendFrequency;
    const dividendYield = (annualDPS / pSharePrice) * 100;
    const grossDividend = pSharesOwned * annualDPS;
    const finalTaxRate = market === "IDX" ? 10 : parseInput(taxRate);
    const taxAmount = grossDividend * (finalTaxRate / 100);
    const netDividend = grossDividend - taxAmount;

    const pNetProfit = parseInput(netProfit);
    const pTotalShares = parseInput(totalShares);
    let dpr: number | null = null;
    if (pNetProfit > 0 && pTotalShares > 0) {
      dpr = ((annualDPS * pTotalShares) / pNetProfit) * 100;
    }
    const dividendResult = { yield: dividendYield, grossDividend, taxAmount, netDividend, dpr };

    const initialCapital = pAvgPrice * pSharesOwned;
    const capitalGain = (pSharePrice - pAvgPrice) * pSharesOwned;
    const capitalGainPercentage = initialCapital > 0 ? (capitalGain / initialCapital) * 100 : 0;
    const totalReturn = netDividend + capitalGain;
    const totalReturnPercentage = initialCapital > 0 ? (totalReturn / initialCapital) * 100 : 0;
    const returnResult = { capitalGain, netDividend, totalReturn, totalReturnPercentage, capitalGainPercentage };

    return { calculationResult: dividendResult, totalReturnResult: returnResult };
  }, [market, sharePrice, averagePurchasePrice, sharesOwned, dividendPerShare, netProfit, totalShares, taxRate, dividendFrequency]);

  // --- CHART LOGIC ---
  useEffect(() => {
    const canvas = document.getElementById("dividendChart") as HTMLCanvasElement;
    if (!canvas || !(window as any).Chart || !calculationResult) {
      if (chartRef.current) chartRef.current.destroy();
      return;
    }

    if (chartRef.current) chartRef.current.destroy();

    const { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } = (window as any).Chart;
    if (!Chart || !BarController) return; // Guard against Chart.js not being loaded

    Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

    chartRef.current = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Dividen/Pajak"],
        datasets: [
          { label: "Dividen Bersih", data: [calculationResult.netDividend], backgroundColor: "#2dd4bf" },
          { label: "Pajak", data: [calculationResult.taxAmount], backgroundColor: "#f472b6" },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: "#e2e8f0" } },
          tooltip: { callbacks: { label: (c: any) => formatCurrency(c.raw as number) } },
        },
        scales: {
          x: { stacked: true, ticks: { color: "#94a3b8", callback: (v: any) => formatCurrency(Number(v)) } },
          y: { stacked: true, ticks: { display: false } },
        },
      },
    });
  }, [calculationResult]);

  return (
    <main className="min-h-screen bg-black text-zinc-200 p-4 md:p-8 font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 to-gray-900 -z-10"></div>
      <div className="text-center mb-10">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
          Kalkulator Keuntungan Investasi
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-zinc-400 mt-2">
          Analisis total keuntungan dari dividen dan capital gain.
        </motion.p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 space-y-6">
          <ControlGroup title="Pilih Pasar">
            <div className="flex bg-zinc-800 p-1 rounded-lg">
              <button onClick={() => setMarket("IDX")} className={`w-1/2 p-2 rounded-md text-sm font-semibold transition ${market === "IDX" ? "bg-cyan-500 text-slate-900" : "hover:bg-slate-600"}`}>
                Saham Indonesia
              </button>
              <button onClick={() => setMarket("US")} className={`w-1/2 p-2 rounded-md text-sm font-semibold transition ${market === "US" ? "bg-cyan-500 text-slate-900" : "hover:bg-slate-600"}`}>
                Saham US
              </button>
            </div>
          </ControlGroup>
          <ControlGroup title="Data Investasi Anda">
            <InputControl label="Harga Beli Rata-Rata" value={averagePurchasePrice} onChange={setAveragePurchasePrice} currency={market} />
            <InputControl label={market === "IDX" ? "Jumlah Lembar Saham" : "Jumlah Saham Dimiliki"} value={sharesOwned} onChange={setSharesOwned} placeholder={market === "IDX" ? "cth: 10 lot = 1000" : ""} />
            <InputControl label="Harga Jual / Saat Ini" value={sharePrice} onChange={setSharePrice} currency={market} />
          </ControlGroup>
          <ControlGroup title="Data Dividen Perusahaan">
            <InputControl label="Dividen per Saham (per Pembagian)" value={dividendPerShare} onChange={setDividendPerShare} currency={market} />
            <p className="text-xs text-zinc-500 -mt-2">Estimasi dividen tahunan akan dihitung berdasarkan frekuensi.</p>
          </ControlGroup>
          <AnimatePresence>
            {market === "IDX" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <ControlGroup title="Frekuensi Dividen (IDX)">
                  <SliderControl label="Jumlah Pembagian per Tahun" value={dividendFrequency} onChange={setDividendFrequency} min={1} max={4} step={1} displayValue={`${dividendFrequency}x`} />
                </ControlGroup>
              </motion.div>
            )}
          </AnimatePresence>
          <ControlGroup title="Analisis Tambahan (Opsional)">
            <InputControl label="Laba Bersih Perusahaan (Tahunan)" value={netProfit} onChange={setNetProfit} currency={market} />
            <InputControl label="Jumlah Saham Beredar" value={totalShares} onChange={setTotalShares} />
          </ControlGroup>
          <AnimatePresence>
            {market === "US" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <ControlGroup title="Pajak Dividen (Saham US)">
                  <InputControl label="Tarif Pajak Anda (%)" value={taxRate} onChange={setTaxRate} />
                </ControlGroup>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">
          <AnimatePresence>
            {calculationResult && totalReturnResult ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <TotalReturnCard summary={totalReturnResult} currency={market} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <BreakdownCard label="Keuntungan dari Dividen" value={calculationResult.netDividend} percentage={calculationResult.yield} percentageLabel="Yield" currency={market} />
                  <BreakdownCard label="Potensi Capital Gain/Loss" value={totalReturnResult.capitalGain} percentage={totalReturnResult.capitalGainPercentage} percentageLabel="Return" currency={market} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {calculationResult.dpr !== null && (
                    <div className="md:col-span-2">
                      <AnalysisCard title="Dividend Payout Ratio (DPR)" value={formatPercentage(calculationResult.dpr)} isDPR dprValue={calculationResult.dpr} />
                    </div>
                  )}
                  <div className={`bg-zinc-900/60 p-4 rounded-2xl border border-zinc-700 min-h-[250px] ${calculationResult.dpr !== null ? "md:col-span-3" : "md:col-span-5"}`}>
                    <h3 className="text-lg font-bold text-white mb-2 text-center">Komposisi Dividen Kotor</h3>
                    <div className="h-56">
                      <canvas id="dividendChart"></canvas>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div className="flex items-center justify-center h-full bg-zinc-900/60 p-10 rounded-2xl border border-zinc-700 border-dashed">
                <div className="text-center text-zinc-500">
                  <FaCalculator className="mx-auto text-5xl mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-400">Hasil Kalkulasi Akan Muncul di Sini</h3>
                  <p className="text-sm">Isi data di sebelah kiri untuk memulai.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}

// --- SUB-COMPONENTS ---
const ControlGroup: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border-t border-zinc-700 pt-5 first-of-type:border-t-0 first-of-type:pt-0">
    <h3 className="text-sm font-semibold text-zinc-300 mb-3">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const InputControl: FC<{ label: string; value: string; onChange: (val: string) => void; currency?: Market; placeholder?: string }> = ({ label, value, onChange, currency, placeholder }) => (
  <div>
    <label className="text-sm font-medium text-zinc-400">{label}</label>
    <div className="relative mt-1">
      {currency && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">{currency === "IDX" ? "Rp" : "$"}</span>}
      <input
        type="text"
        value={parseInput(value).toLocaleString(currency === "IDX" ? "id-ID" : "en-US")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full p-2.5 rounded-lg bg-zinc-800 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white ${currency ? "pl-9" : "pl-3"}`}
      />
    </div>
  </div>
);

const SliderControl: FC<{ label: string; value: number; onChange: (val: number) => void; min: number; max: number; step: number; displayValue: string }> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  displayValue,
}) => (
  <div>
    <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
      <label>{label}</label>
      <span className="font-semibold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">{displayValue}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
    />
  </div>
);

const TotalReturnCard: FC<{ summary: any; currency: Market }> = ({ summary, currency }) => {
  const { totalReturn, totalReturnPercentage } = summary;
  const isProfit = totalReturn > 0;
  const colorClass = isProfit ? "text-green-400" : totalReturn < 0 ? "text-red-400" : "text-zinc-300";
  const icon = isProfit ? <FaArrowUp /> : totalReturn < 0 ? <FaArrowDown /> : <FaEquals />;

  return (
    <div className={`p-6 rounded-2xl border ${isProfit ? "bg-green-500/10 border-green-400/30" : "bg-red-500/10 border-red-400/30"}`}>
      <p className="text-sm text-zinc-400">Potensi Keuntungan Total</p>
      <div className={`text-4xl font-extrabold flex items-center gap-3 mt-2 ${colorClass}`}>
        {icon}
        <span>{formatCurrency(totalReturn, currency)}</span>
      </div>
      <p className={`text-lg font-semibold ${colorClass}`}>{totalReturnPercentage !== undefined ? formatPercentage(totalReturnPercentage) : "0.00%"} dari modal awal</p>
    </div>
  );
};

const BreakdownCard: FC<{ label: string; value: number; percentage?: number; percentageLabel: string; currency: Market }> = ({ label, value, percentage, percentageLabel, currency }) => {
  const isProfit = value > 0;
  const colorClass = isProfit ? "text-green-400" : value < 0 ? "text-red-400" : "text-zinc-300";
  return (
    <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{formatCurrency(value, currency)}</p>
      {percentage !== undefined && (
        <p className={`text-sm font-semibold mt-1 ${colorClass}`}>
          {formatPercentage(percentage)} ({percentageLabel})
        </p>
      )}
    </div>
  );
};

const AnalysisCard: FC<{ title: string; value: string; isDPR?: boolean; dprValue?: number | null }> = ({ title, value, isDPR, dprValue }) => {
  let insight = "";
  if (isDPR && dprValue !== null && dprValue !== undefined) {
    if (dprValue > 100) insight = "DPR di atas 100% menandakan perusahaan membayar dividen lebih besar dari labanya, mungkin tidak berkelanjutan.";
    else if (dprValue > 70) insight = "DPR tinggi menunjukkan komitmen besar pada pemegang saham, tapi menyisakan sedikit laba untuk pertumbuhan.";
    else if (dprValue > 20) insight = "DPR di level ini dianggap sehat, menyeimbangkan pembagian keuntungan dan investasi kembali ke perusahaan.";
    else insight = "DPR rendah umumnya ditemukan pada perusahaan yang fokus pada pertumbuhan cepat (growth stocks).";
  }
  return (
    <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-700 h-full flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-white">{title}</h3>
        <p className="text-3xl font-extrabold text-white my-2">{value}</p>
      </div>
      {insight && (
        <p className="text-xs text-zinc-400 italic flex items-start gap-2">
          <FaLightbulb className="mt-0.5 flex-shrink-0" />
          {insight}
        </p>
      )}
    </div>
  );
};
