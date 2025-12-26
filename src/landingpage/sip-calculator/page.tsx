"use client";

import React, { useState, useMemo, FC, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { FaLightbulb } from "react-icons/fa";

// --- TYPES ---
type CalculationResult = {
  futureValue: number;
  totalInvested: number;
  totalGrowth: number;
};

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;
const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
const parseInput = (input: string) => Number(input.replace(/[^0-9]/g, "")) || 0;

// --- MAIN COMPONENT ---
export default function SIPCalculator() {
  // --- STATE MANAGEMENT ---
  const [monthlyInvestment, setMonthlyInvestment] = useState<string>("1000000");
  const [annualRate, setAnnualRate] = useState<number>(12);
  const [investmentPeriod, setInvestmentPeriod] = useState<number>(5);

  const chartRef = useRef<any>(null); // Untuk menyimpan instance Chart.js

  // --- DYNAMIC SCRIPT LOADING ---
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

  // --- MEMOIZED CALCULATIONS ---
  const calculationResult = useMemo<CalculationResult | null>(() => {
    const P = parseInput(monthlyInvestment); // Principal per period
    const r = annualRate / 100 / 12; // Monthly interest rate
    const n = investmentPeriod * 12; // Total number of periods (months)

    if (P <= 0 || r <= 0 || n <= 0) {
      return null;
    }

    // Rumus Future Value of an Annuity Due (pembayaran di awal periode)
    const futureValue = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    const totalInvested = P * n;
    const totalGrowth = futureValue - totalInvested;

    return { futureValue, totalInvested, totalGrowth };
  }, [monthlyInvestment, annualRate, investmentPeriod]);

  // --- CHART LOGIC ---
  useEffect(() => {
    const canvas = document.getElementById("sipChart") as HTMLCanvasElement;
    if (!canvas || !(window as any).Chart || !calculationResult) {
      if (chartRef.current) chartRef.current.destroy();
      return;
    }

    if (chartRef.current) chartRef.current.destroy();

    const { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } = (window as any).Chart;
    Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

    const P = parseInput(monthlyInvestment);
    const r = annualRate / 100 / 12;
    const n = investmentPeriod * 12;

    const labels = Array.from({ length: investmentPeriod + 1 }, (_, i) => `Thn ${i}`);
    const dataPoints: number[] = [P];

    for (let i = 1; i <= n; i++) {
      if (i % 12 === 0 || i === n) {
        const fvAtMonth = P * ((Math.pow(1 + r, i) - 1) / r) * (1 + r);
        dataPoints.push(fvAtMonth);
      }
    }

    chartRef.current = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Pertumbuhan Investasi",
            data: dataPoints,
            borderColor: "#2dd4bf",
            backgroundColor: "rgba(45, 212, 191, 0.2)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => `Nilai: ${formatCurrency(c.raw as number)}` } } },
        scales: {
          x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148, 163, 184, 0.1)" } },
          y: { ticks: { color: "#94a3b8", callback: (v: number) => formatCurrency(Number(v)) }, grid: { color: "rgba(148, 163, 184, 0.1)" } },
        },
      },
    });
  }, [calculationResult, monthlyInvestment, annualRate, investmentPeriod]);

  return (
    <main className="min-h-screen bg-black text-zinc-200 p-4 md:p-8 font-sans">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); body { font-family: 'Inter', sans-serif; } input[type="range"] { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; background: #1e293b; border-radius: 5px; outline: none; } input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; background: white; cursor: pointer; border-radius: 50%; border: 4px solid #0f172a; } input[type="range"]::-moz-range-thumb { width: 24px; height: 24px; background: white; cursor: pointer; border-radius: 50%; border: 4px solid #0f172a; }`}</style>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 to-gray-900 -z-10"></div>

      <div className="text-center mb-10">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
          Kalkulator SIP (Investasi Rutin)
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-zinc-400 mt-2">
          Lihat bagaimana investasi rutin bulanan Anda dapat bertumbuh seiring waktu.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* --- Kolom Kontrol --- */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 space-y-6">
          <ControlGroup title="Parameter Investasi">
            <InputControl label="Investasi per Bulan" value={monthlyInvestment} onChange={setMonthlyInvestment} prefix="Rp" />
            <SliderControl label="Estimasi Imbal Hasil Tahunan" value={annualRate} onChange={setAnnualRate} min={1} max={30} step={0.5} displayValue={formatPercentage(annualRate)} />
            <SliderControl label="Jangka Waktu Investasi" value={investmentPeriod} onChange={setInvestmentPeriod} min={1} max={40} step={1} displayValue={`${investmentPeriod} Tahun`} />
          </ControlGroup>
          <ExplanationCard />
        </motion.div>

        {/* --- Kolom Dashboard & Grafik --- */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-3 space-y-6">
          <AnimatePresence>
            {calculationResult ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DashboardStat label="Total Modal Diinvestasikan" value={formatCurrency(calculationResult.totalInvested)} />
                  <DashboardStat label="Total Keuntungan" value={formatCurrency(calculationResult.totalGrowth)} isGrowth />
                </div>
                <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/20 p-6 rounded-2xl border border-teal-400/30 text-center">
                  <p className="text-lg text-zinc-300">Estimasi Nilai Akhir Investasi</p>
                  <p className="text-4xl md:text-5xl font-extrabold text-white my-2">{formatCurrency(calculationResult.futureValue)}</p>
                </div>
                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-700 min-h-[300px]">
                  <h3 className="text-lg font-bold text-white mb-4 text-center">Grafik Pertumbuhan Investasi</h3>
                  <div className="h-64">
                    <canvas id="sipChart"></canvas>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-full bg-zinc-900/60 p-10 rounded-2xl border border-zinc-700 border-dashed">
                <p className="text-zinc-500">Hasil akan muncul di sini.</p>
              </div>
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
    <h3 className="text-lg font-semibold text-zinc-300 mb-4">{title}</h3>
    <div className="space-y-6">{children}</div>
  </div>
);

const InputControl: FC<{ label: string; value: string; onChange: (val: string) => void; prefix?: string }> = ({ label, value, onChange, prefix }) => (
  <div>
    <label className="text-sm font-medium text-zinc-400">{label}</label>
    <div className="relative mt-1">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">{prefix}</span>}
      <input
        type="text"
        value={parseInput(value).toLocaleString("id-ID")}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full p-3 rounded-lg bg-zinc-800 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white text-lg ${prefix ? "pl-9" : "pl-3"}`}
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
    <div className="flex justify-between items-center text-sm text-zinc-400 mb-1">
      <label>{label}</label>
      <span className="font-semibold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md">{displayValue}</span>
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

const DashboardStat: FC<{ label: string; value: string; isGrowth?: boolean }> = ({ label, value, isGrowth }) => (
  <div className={`p-6 rounded-lg text-center ${isGrowth ? "bg-green-500/10" : "bg-zinc-900/50"}`}>
    <p className="text-sm text-zinc-400">{label}</p>
    <p className={`text-3xl font-bold mt-1 ${isGrowth ? "text-green-400" : "text-white"}`}>{value}</p>
  </div>
);

const ExplanationCard: FC = () => (
  <div className="bg-cyan-900/20 p-5 rounded-lg border border-cyan-500/30">
    <div className="flex items-start gap-4">
      <div className="text-zinc-300 text-2xl mt-1">
        <FaLightbulb />
      </div>
      <div>
        <h3 className="font-semibold text-white">Bagaimana Ini Bekerja?</h3>
        <p className="text-sm text-zinc-400 mt-1">
          Kalkulator ini menggunakan rumus **Future Value of Annuity** untuk memproyeksikan pertumbuhan investasi rutin Anda. Dengan asumsi imbal hasil tahunan yang konstan, Anda dapat melihat bagaimana
          kekuatan bunga majemuk bekerja seiring waktu.
        </p>
      </div>
    </div>
  </div>
);
