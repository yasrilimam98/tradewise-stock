"use client";

import React, { useState, useEffect, useRef, FC } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChartData, ChartOptions } from "chart.js";
import { FaChartLine, FaSyncAlt, FaTimes } from "react-icons/fa";

// --- DATA & TYPES ---
const availableAssets = [
  { symbol: "BTCUSDT", name: "Bitcoin", type: "crypto", coinId: "bitcoin", currency: "USD", defaultPrice: 69000 },
  { symbol: "ETHUSDT", name: "Ethereum", type: "crypto", coinId: "ethereum", currency: "USD", defaultPrice: 3600 },
  { symbol: "SOLUSDT", name: "Solana", type: "crypto", coinId: "solana", currency: "USD", defaultPrice: 160 },
  { symbol: "XRPUSDT", name: "XRP", type: "crypto", coinId: "ripple", currency: "USD", defaultPrice: 0.52 },
  { symbol: "DOGEUSDT", name: "Dogecoin", type: "crypto", coinId: "dogecoin", currency: "USD", defaultPrice: 0.16 },
  { symbol: "ADRO.JK", name: "Adaro Energy", type: "stock", currency: "IDR", defaultPrice: 2700 },
  { symbol: "BBCA.JK", name: "Bank Central Asia", type: "stock", currency: "IDR", defaultPrice: 9200 },
  { symbol: "BBRI.JK", name: "Bank Rakyat Indonesia", type: "stock", currency: "IDR", defaultPrice: 4300 },
  { symbol: "BMRI.JK", name: "Bank Mandiri", type: "stock", currency: "IDR", defaultPrice: 5800 },
  { symbol: "TLKM.JK", name: "Telkom Indonesia", type: "stock", currency: "IDR", defaultPrice: 2900 },
  { symbol: "GOLD", name: "Emas (XAU/USD)", type: "commodity", currency: "USD", defaultPrice: 2300 },
  { symbol: "OIL", name: "Minyak Mentah (WTI)", type: "commodity", currency: "USD", defaultPrice: 78 },
];

type Asset = (typeof availableAssets)[0];
type RawPriceData = { [symbol: string]: number[] };
type NormalizedPriceData = { [symbol: string]: number[] };
type Metrics = { price: string; change: number; volatility: number; roi: number };

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number, currency: string): string => {
  const options: Intl.NumberFormatOptions = { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 };
  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", options).format(value);
  }
  return new Intl.NumberFormat("en-US", options).format(value);
};

const generateSimulatedPrices = (initialPrice: number, volatility: number, days: number): number[] => {
  const prices: number[] = [initialPrice];
  for (let i = 1; i < days; i++) {
    const returns = (Math.random() - 0.495) * volatility;
    prices.push(prices[i - 1] * (1 + returns));
  }
  return prices;
};

const calculateMetrics = (symbol: string, prices: number[]): Metrics => {
  if (prices.length < 2) return { price: formatCurrency(0, "USD"), change: 0, volatility: 0, roi: 0 };
  const asset = availableAssets.find((a) => a.symbol === symbol)!;
  const currentPrice = prices[prices.length - 1];
  const initialPrice = prices[0];
  const change = ((currentPrice - initialPrice) / initialPrice) * 100;

  // Calculate volatility (annualized standard deviation of daily returns)
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const squaredDiffs = returns.map((r) => Math.pow(r - meanReturn, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const annualizedVolatility = stdDev * Math.sqrt(365) * 100; // As a percentage

  return {
    price: formatCurrency(currentPrice, asset.currency),
    change: parseFloat(change.toFixed(2)),
    volatility: parseFloat(annualizedVolatility.toFixed(2)),
    roi: parseFloat(change.toFixed(2)),
  };
};

// --- MAIN COMPONENT ---
export default function CompareAssetPage() {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timePeriod, setTimePeriod] = useState("1M");
  const [activeTab, setActiveTab] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rawPriceData, setRawPriceData] = useState<RawPriceData>({});
  const [metrics, setMetrics] = useState<{ [symbol: string]: Metrics }>({});

  const chartRef = useRef<any>(null); // For Chart.js instance

  // --- Dynamic Script Loading ---
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
    loadScript("https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js", "chartjs-zoom-script");
    loadScript("https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js", "axios-script");
  }, []);

  // --- Data Fetching and Processing ---
  useEffect(() => {
    const fetchData = async () => {
      if (selectedAssets.length === 0) {
        setRawPriceData({});
        return;
      }
      setIsLoading(true);
      setError(null);

      const days = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365 }[timePeriod] ?? 30;
      const newPriceData: RawPriceData = {};

      try {
        for (const symbol of selectedAssets) {
          const asset = availableAssets.find((a) => a.symbol === symbol);
          if (!asset) continue;

          let prices: number[] = [];
          if (asset.type === "crypto" && (window as any).axios) {
            const response = await (window as any).axios.get(`https://api.coingecko.com/api/v3/coins/${asset.coinId}/market_chart`, {
              params: { vs_currency: "usd", days: days, interval: "daily" },
            });
            prices = response.data.prices.map((p: [number, number]) => p[1]);
          } else {
            const volatility = asset.type === "stock" ? 0.015 : 0.01;
            prices = generateSimulatedPrices(asset.defaultPrice, volatility, days);
          }
          newPriceData[symbol] = prices;
        }
        setRawPriceData(newPriceData);
      } catch (err: any) {
        setError(`Gagal mengambil data: ${err.message}. Coba lagi nanti.`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedAssets, timePeriod]);

  // --- Chart and Metrics Calculation ---
  useEffect(() => {
    if (Object.keys(rawPriceData).length === 0) {
      if (chartRef.current) chartRef.current.destroy();
      setMetrics({});
      return;
    }

    const newMetrics: { [symbol: string]: Metrics } = {};
    const normalizedDatasets: any[] = [];
    const colors = ["#2dd4bf", "#f472b6", "#4ade80", "#facc15", "#a78bfa"];
    const days = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365 }[timePeriod] ?? 30;
    const labels = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1) + i);
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    });

    Object.entries(rawPriceData).forEach(([symbol, prices], index) => {
      const initialPrice = prices[0];
      const normalizedPrices = prices.map((p) => (p / initialPrice) * 100);
      newMetrics[symbol] = calculateMetrics(symbol, prices);

      normalizedDatasets.push({
        label: symbol,
        data: normalizedPrices,
        borderColor: colors[index % colors.length],
        backgroundColor: `${colors[index % colors.length]}33`,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 2,
      });
    });

    setMetrics(newMetrics);

    // Update chart
    if (chartRef.current) chartRef.current.destroy();
    const canvas = document.getElementById("assetChart") as HTMLCanvasElement;
    if (canvas && (window as any).Chart) {
      chartRef.current = new (window as any).Chart(canvas, {
        type: "line",
        data: { labels, datasets: normalizedDatasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { color: "#e2e8f0" } },
            title: { display: true, text: "Perbandingan Pertumbuhan Aset (Dinormalisasi)", color: "#e2e8f0", font: { size: 16 } },
            tooltip: {
              mode: "index",
              intersect: false,
              callbacks: {
                label: (context: any) => {
                  const symbol = context.dataset.label!;
                  const normalizedValue = context.parsed.y;
                  const originalPrice = rawPriceData[symbol]?.[context.dataIndex];
                  const asset = availableAssets.find((a) => a.symbol === symbol)!;
                  return `${symbol}: ${formatCurrency(originalPrice, asset.currency)} (${(normalizedValue - 100).toFixed(2)}%)`;
                },
              },
            },
            zoom: { pan: { enabled: true, mode: "x" }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" } },
          },
          scales: {
            y: { title: { display: true, text: "Pertumbuhan (%)", color: "#94a3b8" }, ticks: { color: "#94a3b8" }, grid: { color: "#475569" } },
            x: { ticks: { color: "#94a3b8" }, grid: { color: "#475569" } },
          },
        },
      });
    }
  }, [rawPriceData]);

  // --- UI Handlers ---
  const handleSelectAsset = (symbol: string) => {
    if (!selectedAssets.includes(symbol) && selectedAssets.length < 5) {
      setSelectedAssets([...selectedAssets, symbol]);
    }
    setSearchTerm("");
  };
  const handleRemoveAsset = (symbol: string) => setSelectedAssets(selectedAssets.filter((asset) => asset !== symbol));
  const filteredAssetList = availableAssets.filter(
    (asset) => (activeTab === "All" || asset.type === activeTab.toLowerCase()) && (asset.symbol.toUpperCase().includes(searchTerm.toUpperCase()) || asset.name.toUpperCase().includes(searchTerm.toUpperCase()))
  );

  return (
    <main className="min-h-screen bg-black text-zinc-200 p-4 md:p-8 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Perbandingan Kinerja Aset</h1>
        <p className="text-zinc-400 mt-2">Analisis dan bandingkan pertumbuhan hingga 5 aset secara visual.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Control Panel */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 h-fit space-y-6">
          <div>
            <h2 className="font-bold text-lg text-white mb-3">Pilih Aset</h2>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari (misal: BTC, BBCA)"
                className="w-full p-2 rounded-lg bg-zinc-800/50 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white"
              />
              {searchTerm && (
                <ul className="absolute z-10 w-full mt-1 bg-zinc-800 rounded-lg max-h-60 overflow-y-auto shadow-lg">
                  {filteredAssetList.map((asset) => (
                    <li key={asset.symbol} onClick={() => handleSelectAsset(asset.symbol)} className="p-2 cursor-pointer hover:bg-slate-600">
                      {asset.symbol} - {asset.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {["All", "crypto", "stock", "commodity"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs rounded-full transition ${activeTab === tab ? "bg-cyan-500 text-slate-900 font-semibold" : "bg-zinc-800 hover:bg-slate-600"}`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {selectedAssets.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <h3 className="font-bold text-lg text-white mb-3">Aset Dipilih</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAssets.map((symbol) => (
                    <div key={symbol} className="flex items-center bg-zinc-800 text-sm pl-3 pr-1 py-1 rounded-full">
                      <span>{symbol}</span>
                      <button onClick={() => handleRemoveAsset(symbol)} className="ml-2 text-zinc-400 hover:text-red-400">
                        <FaTimes size="12" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <h3 className="font-bold text-lg text-white mb-3">Periode Waktu</h3>
            <div className="flex flex-wrap gap-2">
              {["1M", "3M", "6M", "1Y"].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={`px-4 py-2 text-sm rounded-lg transition ${timePeriod === period ? "bg-cyan-500 text-slate-900 font-bold" : "bg-zinc-800 hover:bg-slate-600"}`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 space-y-6">
          <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg text-white">Grafik Pertumbuhan</h2>
              <button onClick={() => chartRef.current?.resetZoom()} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition">
                <FaSyncAlt /> Reset Zoom
              </button>
            </div>
            <div className="flex-grow">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-zinc-400">
                  <p>Memuat data grafik...</p>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full text-red-400">
                  <p>{error}</p>
                </div>
              ) : selectedAssets.length > 0 ? (
                <div className="h-[400px]">
                  <canvas id="assetChart"></canvas>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center text-zinc-500">
                  <div>
                    <FaChartLine className="mx-auto text-4xl mb-2" />
                    <p>Pilih aset untuk memulai perbandingan.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {Object.keys(metrics).length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedAssets.map(
                  (symbol) =>
                    metrics[symbol] && (
                      <div key={symbol} className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-700">
                        <h3 className="font-bold text-white">{symbol}</h3>
                        <p className="text-xl font-light text-zinc-300">{metrics[symbol].price}</p>
                        <div className="text-sm mt-2 grid grid-cols-2 gap-2">
                          <p className="text-zinc-400">Perubahan:</p>
                          <p className={`font-semibold ${metrics[symbol].change >= 0 ? "text-green-400" : "text-red-400"}`}>{metrics[symbol].change}%</p>
                          <p className="text-zinc-400">Volatilitas:</p>
                          <p className="font-semibold text-amber-400">{metrics[symbol].volatility}%</p>
                        </div>
                      </div>
                    )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}
