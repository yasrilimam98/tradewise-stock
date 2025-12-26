"use client";

import { useState, useMemo, FC, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Chart as ChartJS, LineController, LineElement, PointElement, LinearScale, Title, Tooltip, CategoryScale, Legend, Filler } from "chart.js";

// WAJIB: register komponen yang dibutuhkan
ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler);

// --- SVG ICONS ---
const FaLightbulb = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M176 0C78.8 0 0 78.8 0 176c0 60.3 30.1 113.8 76.3 144.2C88.6 333.8 96 346.6 96 360.7V416c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32v-55.3c0-14.1 7.4-26.9 19.7-40.5C321.9 289.8 352 236.3 352 176 352 78.8 273.2 0 176 0zM96 480c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32H96z"></path>
  </svg>
);

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
};

// --- MAIN COMPONENT ---
const RuleOf72Calculator: FC = () => {
  const [interestRate, setInterestRate] = useState<number>(8);
  const [initialInvestment, setInitialInvestment] = useState<number>(10000000);
  const [chartData, setChartData] = useState<any>(null);

  const chartRef = useRef<ChartJS | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);
  }, []);

  const yearsToDouble = useMemo(() => {
    if (interestRate > 0) {
      return 72 / interestRate;
    }
    return Infinity;
  }, [interestRate]);

  useEffect(() => {
    if (interestRate > 0 && initialInvestment > 0 && isFinite(yearsToDouble)) {
      const years = Math.ceil(yearsToDouble);
      const labels = Array.from({ length: years + 1 }, (_, i) => `Thn ${i}`);
      const dataPoints: number[] = [];
      let currentValue = initialInvestment;

      for (let i = 0; i <= years; i++) {
        dataPoints.push(i === 0 ? initialInvestment : (currentValue *= 1 + interestRate / 100));
      }

      setChartData({
        labels,
        datasets: [
          {
            label: "Nilai Investasi",
            data: dataPoints,
            borderColor: "#2dd4bf",
            backgroundColor: "rgba(45, 212, 191, 0.2)",
            fill: true,
            tension: 0.4,
          },
        ],
      });
    } else {
      setChartData(null);
    }
  }, [interestRate, initialInvestment, yearsToDouble]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    if (canvasRef.current && chartData) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        chartRef.current = new ChartJS(ctx, {
          type: "line",
          data: chartData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => `Nilai: ${formatCurrency(context.parsed.y)}`,
                },
              },
            },
            scales: {
              x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148, 163, 184, 0.1)" } },
              y: { ticks: { color: "#94a3b8", callback: (value) => formatCurrency(Number(value)) }, grid: { color: "rgba(148, 163, 184, 0.1)" } },
            },
          },
        });
      }
    }
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [chartData]);

  return (
    <div className="bg-black flex items-center justify-center min-h-screen p-4 font-sans text-white">
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #0f172a; }
        input[type="range"] { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; background: #1e293b; border-radius: 5px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; background: white; cursor: pointer; border-radius: 50%; border: 4px solid #0f172a; }
        input[type="range"]::-moz-range-thumb { width: 24px; height: 24px; background: white; cursor: pointer; border-radius: 50%; border: 4px solid #0f172a; }
        `}
      </style>

      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 to-gray-900 -z-10"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-5xl p-8 rounded-2xl shadow-2xl"
        style={{ background: "rgba(22, 33, 56, 0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(45, 212, 191, 0.2)" }}
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Kalkulator Rule of 72</h1>
          <p className="text-zinc-400 mt-2">Visualisasikan kekuatan bunga majemuk pada investasi Anda.</p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          {/* --- Kolom Kontrol --- */}
          <div className="md:col-span-2 space-y-8">
            <div>
              <label htmlFor="initialInvestment" className="block text-lg font-semibold text-zinc-300 mb-2">
                Investasi Awal
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">Rp</span>
                <input
                  type="text"
                  id="initialInvestment"
                  value={initialInvestment.toLocaleString("id-ID")}
                  onChange={(e) => {
                    const value = Number(e.target.value.replace(/[^0-9]/g, ""));
                    if (!isNaN(value)) setInitialInvestment(value);
                  }}
                  className="w-full pl-10 p-3 rounded-lg bg-zinc-800/50 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white text-lg"
                />
              </div>
            </div>
            <div>
              <label htmlFor="interestRate" className="block text-lg font-semibold text-zinc-300">
                Estimasi Imbal Hasil Tahunan
              </label>
              <div className="flex items-center gap-4 mt-2">
                <input type="range" id="interestRate" min="1" max="25" value={interestRate} step="0.1" onChange={(e) => setInterestRate(parseFloat(e.target.value))} className="flex-grow" />
                <span className="text-xl font-bold text-zinc-300 bg-zinc-800/50 px-3 py-1 rounded-lg w-24 text-center tabular-nums">{interestRate.toFixed(1)}%</span>
              </div>
            </div>
            <ExplanationCard />
          </div>

          {/* --- Kolom Hasil & Grafik --- */}
          <div className="md:col-span-3 space-y-6">
            <div className="text-center bg-black/50 p-6 rounded-xl border border-zinc-700">
              <p className="text-zinc-400 text-sm">Investasi Anda akan berlipat ganda dalam:</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={yearsToDouble.toString()}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-4xl md:text-5xl font-extrabold text-white my-2"
                >
                  <span className="tabular-nums">{isFinite(Number(yearsToDouble)) ? yearsToDouble.toFixed(1) : "∞"}</span>
                  <span className="text-2xl text-zinc-400 ml-2">Tahun</span>
                </motion.p>
              </AnimatePresence>
              <p className="text-zinc-400 text-sm">
                <span className="font-semibold text-zinc-200">{formatCurrency(initialInvestment)}</span> akan menjadi{" "}
                <span className="font-semibold text-zinc-200">{formatCurrency(initialInvestment * 2)}</span>.
              </p>
            </div>
            <div className="bg-black/50 p-4 rounded-xl border border-zinc-700 h-80">
              <h3 className="text-center font-semibold text-zinc-300 mb-4">Proyeksi Pertumbuhan</h3>
              <div className="w-full h-[calc(100%-2rem)]">
                <canvas ref={canvasRef}></canvas>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ExplanationCard: FC = () => (
  <div className="bg-cyan-900/20 p-5 rounded-lg border border-cyan-500/30">
    <div className="flex items-start gap-4">
      <div className="text-zinc-300 text-2xl mt-1">
        <FaLightbulb />
      </div>
      <div>
        <h3 className="font-semibold text-white">Apa itu Rule of 72?</h3>
        <p className="text-sm text-zinc-400 mt-1">
          Ini adalah rumus cepat untuk memperkirakan berapa tahun yang dibutuhkan agar investasi Anda nilainya menjadi dua kali lipat. Cukup bagi angka 72 dengan estimasi imbal hasil tahunan Anda.
        </p>
      </div>
    </div>
  </div>
);

export default RuleOf72Calculator;
