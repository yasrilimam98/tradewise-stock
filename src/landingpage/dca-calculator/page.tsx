"use client";

import React, { useState, useEffect, useRef, FC } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCalculator, FaSpinner, FaTrophy } from "react-icons/fa";

// --- DATA & TYPES ---
const availableAssets = [
  { symbol: "BTCUSDT", name: "Bitcoin", type: "crypto", defaultPrice: 69000, defaultVolatility: 2.5, currency: "USD" },
  { symbol: "ETHUSDT", name: "Ethereum", type: "crypto", defaultPrice: 3600, defaultVolatility: 3.0, currency: "USD" },
  { symbol: "NVDA", name: "NVIDIA", type: "stock", defaultPrice: 120, defaultVolatility: 2.0, currency: "USD" },
  { symbol: "AAPL", name: "Apple", type: "stock", defaultPrice: 210, defaultVolatility: 1.5, currency: "USD" },
  { symbol: "BBCA.JK", name: "Bank Central Asia", type: "stock", defaultPrice: 9200, defaultVolatility: 1.0, currency: "IDR" },
  { symbol: "BBRI.JK", name: "Bank Rakyat Indonesia", type: "stock", defaultPrice: 4300, defaultVolatility: 1.2, currency: "IDR" },
  { symbol: "GOLD", name: "Emas (XAU/USD)", type: "commodity", defaultPrice: 2300, defaultVolatility: 0.8, currency: "USD" },
];
type AssetInfo = (typeof availableAssets)[0];

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number, currency: string): string => {
  console.log("Formatting value:", value, "Currency:", currency);

  const options: Intl.NumberFormatOptions = { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 };
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", options).format(value);
};

const parseInput = (input: string) => Number(input.replace(/[^0-9]/g, "")) || 0;

const generateDynamicPrices = (initialPrice: number, volatility: number, trend: number, days: number): number[] => {
  const prices: number[] = [initialPrice];
  const dailyDrift = trend / 100 / 365;
  const dailyVol = volatility / 100 / Math.sqrt(365);
  for (let i = 1; i < days; i++) {
    const shock = dailyDrift + (dailyVol * (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3)) / 3; // Central Limit Theorem approximation
    prices.push(prices[i - 1] * Math.exp(shock));
  }
  return prices;
};

// --- MAIN COMPONENT ---
export default function DCACalculatorPage() {
  // State Hooks
  const [selectedAsset, setSelectedAsset] = useState<AssetInfo | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<number>(10000000);
  const [initialPrice, setInitialPrice] = useState<number>(0);
  const [priceVolatility, setPriceVolatility] = useState<number>(10);
  const [priceTrend, setPriceTrend] = useState<number>(5);
  const [period, setPeriod] = useState<number>(1);
  const [dcaFrequency, setDcaFrequency] = useState<number>(30);

  const [previewPrices, setPreviewPrices] = useState<number[]>([]);
  const [results, setResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const chartRef = useRef<any>(null);

  // Dynamic Script Loading
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
  }, []);

  // Set defaults when asset changes
  useEffect(() => {
    if (selectedAsset) {
      setInitialPrice(selectedAsset.defaultPrice);
      setPriceVolatility(selectedAsset.defaultVolatility);
    }
  }, [selectedAsset]);

  // Generate preview prices
  useEffect(() => {
    if (selectedAsset && initialPrice > 0) {
      const days = period * 365;
      setPreviewPrices(generateDynamicPrices(initialPrice, priceVolatility, priceTrend, days));
    } else {
      setPreviewPrices([]);
    }
  }, [selectedAsset, initialPrice, priceVolatility, priceTrend, period]);

  // Main Calculation Logic
  const handleCalculate = () => {
    if (!selectedAsset) {
      alert("Pilih aset terlebih dahulu.");
      return;
    }
    setIsCalculating(true);

    // Simulate calculation delay
    setTimeout(() => {
      const days = period * 365;
      const prices = generateDynamicPrices(initialPrice, priceVolatility, priceTrend, days);
      const { currency } = selectedAsset;

      // Lump Sum Calculation
      const lumpSumUnits = investmentAmount / prices[0];
      const lumpSumFinalValue = lumpSumUnits * prices[prices.length - 1];
      const lumpSumRoi = ((lumpSumFinalValue - investmentAmount) / investmentAmount) * 100;

      // DCA Calculation
      const investments = Math.floor(days / dcaFrequency);
      const investmentPerPeriod = investmentAmount / investments;
      let dcaUnits = 0;
      let dcaInvested = 0;
      for (let i = 0; i < investments; i++) {
        const dayIndex = i * dcaFrequency;
        if (dayIndex < prices.length) {
          dcaUnits += investmentPerPeriod / prices[dayIndex];
          dcaInvested += investmentPerPeriod;
        }
      }
      const dcaFinalValue = dcaUnits * prices[prices.length - 1];
      const dcaRoi = ((dcaFinalValue - dcaInvested) / dcaInvested) * 100;

      setResults({
        lumpSum: { units: lumpSumUnits, invested: investmentAmount, value: lumpSumFinalValue, roi: lumpSumRoi, avgPrice: prices[0] },
        dca: { units: dcaUnits, invested: dcaInvested, value: dcaFinalValue, roi: dcaRoi, avgPrice: dcaInvested / dcaUnits },
      });

      // Update Chart
      if (chartRef.current) chartRef.current.destroy();
      const canvas = document.getElementById("resultChart") as HTMLCanvasElement;
      if (canvas && (window as any).Chart) {
        const labels = Array.from({ length: prices.length }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          return i % Math.floor(days / 12) === 0 ? d.toLocaleDateString("id-ID", { month: "short", year: "numeric" }) : "";
        });
        chartRef.current = new (window as any).Chart(canvas, {
          type: "line",
          data: {
            labels,
            datasets: [
              { label: "Harga Aset", data: prices, borderColor: "#64748b", borderWidth: 2, pointRadius: 0, yAxisID: "yPrice" },
              {
                label: "Nilai DCA",
                data: Array.from({ length: days }, (_, i) => {
                  let currentUnits = 0;
                  for (let j = 0; j <= Math.floor(i / dcaFrequency); j++) {
                    currentUnits += investmentPerPeriod / prices[j * dcaFrequency];
                  }
                  return currentUnits * prices[i];
                }),
                borderColor: "#f472b6",
                backgroundColor: "#f472b622",
                fill: true,
                tension: 0.1,
                pointRadius: 0,
                yAxisID: "yValue",
              },
              {
                label: "Nilai Lump Sum",
                data: Array.from({ length: days }, (_, i) => lumpSumUnits * prices[i]),
                borderColor: "#2dd4bf",
                backgroundColor: "#2dd4bf22",
                fill: true,
                tension: 0.1,
                pointRadius: 0,
                yAxisID: "yValue",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            scales: {
              yPrice: {
                type: "linear",
                display: true,
                position: "right",
                grid: { drawOnChartArea: false },
                ticks: { color: "#64748b", callback: (v: number) => formatCurrency(v, currency) },
                title: { display: true, text: "Harga Aset", color: "#64748b" },
              },
              yValue: {
                type: "linear",
                display: true,
                position: "left",
                ticks: { color: "#cbd5e1", callback: (v: number) => formatCurrency(v, currency) },
                title: { display: true, text: "Nilai Investasi", color: "#cbd5e1" },
              },
            },
            plugins: { legend: { labels: { color: "#e2e8f0" } } },
          },
        });
      }

      setIsCalculating(false);
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-black text-zinc-200 p-4 md:p-8 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; }
        input[type="range"]::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; border-radius: 50%; background: white; cursor: pointer; }
        input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: white; cursor: pointer; border: none; }
      `}</style>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Simulator Investasi: DCA vs Lump Sum</h1>
        <p className="text-zinc-400 mt-2 max-w-3xl mx-auto">Simulasikan dan bandingkan hasil investasi dengan dua strategi populer di berbagai kondisi pasar.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Control Panel --- */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 h-fit space-y-5">
          <h2 className="text-xl font-bold text-white">Parameter Simulasi</h2>
          {/* Asset Selection */}
          <ControlGroup title="Aset Investasi">
            <select
              onChange={(e) => setSelectedAsset(availableAssets.find((a) => a.symbol === e.target.value) || null)}
              className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <option value="">-- Pilih Aset --</option>
              {availableAssets.map((asset) => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.name} ({asset.symbol})
                </option>
              ))}
            </select>
          </ControlGroup>
          {/* Investment Amount */}
          <ControlGroup title="Total Investasi">
            <div className="relative mt-1">
              {/* <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">{selectedAsset?.currency || "IDR"}</span> */}
              <input
                type="text"
                value={formatCurrency(investmentAmount, selectedAsset?.currency || "IDR")}
                onChange={(e) => {
                  const rawValue = parseInput(e.target.value); // Parse raw number from input
                  setInvestmentAmount(rawValue);
                }}
                className={`w-full p-2.5 rounded-lg bg-zinc-800 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white`}
              />
            </div>
          </ControlGroup>
          {/* Market Conditions */}
          <ControlGroup title="Kondisi Pasar (Simulasi)">
            <ControlSlider
              label="Harga Awal"
              value={initialPrice}
              onChange={setInitialPrice}
              min={0}
              max={selectedAsset ? selectedAsset.defaultPrice * 2 : 10000}
              step={100}
              displayValue={formatCurrency(initialPrice, selectedAsset?.currency || "IDR")}
            />
            <ControlSlider label="Volatilitas" value={priceVolatility} onChange={setPriceVolatility} min={0} max={10} step={0.5} displayValue={`${priceVolatility.toFixed(1)}%`} />
            <ControlSlider label="Tren Tahunan" value={priceTrend} onChange={setPriceTrend} min={-50} max={50} step={1} displayValue={`${priceTrend}%`} />
          </ControlGroup>
          {/* Investment Period */}
          <ControlGroup title="Periode & Frekuensi">
            <ControlSlider label="Periode Investasi" value={period} onChange={setPeriod} min={1} max={10} step={1} displayValue={`${period} Tahun`} />
            <ControlSlider label="Frekuensi DCA" value={dcaFrequency} onChange={setDcaFrequency} min={7} max={90} step={1} displayValue={`${dcaFrequency} hari`} />
          </ControlGroup>
          {/* Action Button */}
          <motion.button
            onClick={handleCalculate}
            disabled={isCalculating || !selectedAsset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-4 bg-gradient-to-r from-white to-zinc-300 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculating ? <FaSpinner className="animate-spin" /> : <FaCalculator />}
            {isCalculating ? "Menghitung..." : "Jalankan Simulasi"}
          </motion.button>
        </motion.div>

        {/* --- Results Panel --- */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-6">
          {/* Preview Chart */}
          <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-700 min-h-[250px]">
            <h3 className="text-lg font-bold text-white mb-2">Pratinjau Harga Aset</h3>
            <div className="h-48">
              {previewPrices.length > 0 ? (
                <PreviewChart prices={previewPrices} asset={selectedAsset!} />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500">Pilih aset untuk melihat pratinjau.</div>
              )}
            </div>
          </div>
          {/* Result Section */}
          <AnimatePresence>
            {results && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <ComparisonResultCard results={results} currency={selectedAsset?.currency || "IDR"} />
                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-700 min-h-[400px]">
                  <h3 className="text-lg font-bold text-white mb-2">Grafik Hasil Investasi</h3>
                  <div className="h-[400px]">
                    <canvas id="resultChart"></canvas>
                  </div>
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
  <div className="relative border-t border-zinc-700 pt-4">
    <h3 className="text-sm font-semibold text-zinc-300 mb-2">{title}</h3>
    {children}
  </div>
);

const ControlSlider: FC<{ label: string; value: number; onChange: (val: number) => void; min: number; max: number; step: number; displayValue: string }> = ({
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
      <span className="font-semibold text-zinc-300">{displayValue}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
  </div>
);

const PreviewChart: FC<{ prices: number[]; asset: AssetInfo }> = ({ prices, asset }) => {
  const data = {
    labels: Array.from({ length: prices.length }, (_, i) => i + 1),
    datasets: [
      {
        label: `Harga ${asset.symbol}`,
        data: prices,
        borderColor: "#94a3b8",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
      },
    ],
  };
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } };

  return <LineChart data={data} options={options} />;
};

const ComparisonResultCard: FC<{ results: any; currency: string }> = ({ results, currency }) => {
  const winner = results.dca.roi > results.lumpSum.roi ? "DCA" : "Lump Sum";
  const roiDiff = Math.abs(results.dca.roi - results.lumpSum.roi);

  return (
    <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/20 p-6 rounded-2xl border border-teal-400/30">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
          <FaTrophy className="text-amber-300" /> Strategi Terbaik
        </h3>
        <p className="text-4xl font-extrabold text-white mt-2">{winner}</p>
        <p className="text-zinc-300 mt-1">Unggul sebesar **{roiDiff.toFixed(2)}%** dalam simulasi ini.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-6 text-center">
        {/* DCA Results */}
        <div className="bg-zinc-900 p-4 rounded-lg">
          <h4 className="font-bold text-pink-400">DCA</h4>
          <p className="text-xl font-semibold">{formatCurrency(results.dca.value, currency)}</p>
          <p className={`text-sm font-bold ${results.dca.roi >= 0 ? "text-green-400" : "text-red-400"}`}>ROI: {results.dca.roi.toFixed(2)}%</p>
          <p className="text-xs text-zinc-400 mt-1">Avg. Price: {formatCurrency(results.dca.avgPrice, currency)}</p>
        </div>
        {/* Lump Sum Results */}
        <div className="bg-zinc-900 p-4 rounded-lg">
          <h4 className="font-bold text-zinc-300">Lump Sum</h4>
          <p className="text-xl font-semibold">{formatCurrency(results.lumpSum.value, currency)}</p>
          <p className={`text-sm font-bold ${results.lumpSum.roi >= 0 ? "text-green-400" : "text-red-400"}`}>ROI: {results.lumpSum.roi.toFixed(2)}%</p>
          <p className="text-xs text-zinc-400 mt-1">Avg. Price: {formatCurrency(results.lumpSum.avgPrice, currency)}</p>
        </div>
      </div>
    </div>
  );
};

// A wrapper for Chart.js to handle dynamic loading
const LineChart: FC<{ data: any; options: any }> = ({ data, options }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current || !(window as any).Chart) return;
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      chartRef.current = new (window as any).Chart(ctx, {
        type: "line",
        data,
        options,
      });
    }
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, options]);

  return <canvas ref={canvasRef}></canvas>;
};
