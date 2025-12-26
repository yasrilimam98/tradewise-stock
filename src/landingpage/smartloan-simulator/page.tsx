"use client";

import React, { useState, useEffect, FC, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCalculator, FaExclamationTriangle, FaSpinner } from "react-icons/fa";

// --- DATA & TYPES ---
const loanTypes = [
  { value: "KPR_Rumah", label: "KPR Rumah", maxTenorYears: 30, defaultRate: 6.5 },
  { value: "Mobil_Baru", label: "Kredit Mobil Baru", maxTenorYears: 7, defaultRate: 5.5 },
  { value: "Multiguna", label: "Kredit Multiguna", maxTenorYears: 10, defaultRate: 8.0 },
];
type Installment = { month: number; payment: number; principal: number; interest: number; balance: number };
type Result = { monthlyPayment: number; totalPayment: number; totalInterest: number; dtiRatio: number; installments: Installment[] };

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;
const parseCurrency = (input: string) => Number(input.replace(/[^0-9]/g, "")) || 0;

// --- MAIN COMPONENT ---
export default function SmartLoanSimulator() {
  const [loanType, setLoanType] = useState(loanTypes[0].value);
  const [interestType, setInterestType] = useState("effective");
  const [assetPrice, setAssetPrice] = useState(500_000_000);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [monthlyIncome, setMonthlyIncome] = useState(15_000_000);
  const [tenorYears, setTenorYears] = useState(15);
  const [fixedRate, setFixedRate] = useState(loanTypes[0].defaultRate);
  const [fixedPeriodYears, setFixedPeriodYears] = useState(3);
  const [floatingRates, setFloatingRates] = useState<number[]>([]);

  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const mainChartRef = useRef<any>(null);
  const donutChartRef = useRef<any>(null);

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
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", "jspdf-script");
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js", "jspdf-autotable-script");
  }, []);

  // Update defaults on loan type change
  useEffect(() => {
    const selectedLoan = loanTypes.find((lt) => lt.value === loanType)!;
    setFixedRate(selectedLoan.defaultRate);
    if (tenorYears > selectedLoan.maxTenorYears) {
      setTenorYears(selectedLoan.maxTenorYears);
    }
    // Initialize floating rates array with default 11% for each floating year
    const floatingYears = Math.max(0, tenorYears - fixedPeriodYears);
    setFloatingRates(Array(floatingYears).fill(11));
  }, [loanType, tenorYears, fixedPeriodYears]);

  const loanAmount = assetPrice - assetPrice * (downPaymentPercent / 100);

  const updateFloatingRate = (index: number, value: number) => {
    const newRates = [...floatingRates];
    newRates[index] = Math.max(5, Math.min(25, value)); // Clamp between 5% and 25%
    setFloatingRates(newRates);
  };

  const calculateLoan = () => {
    setError(null);
    setIsCalculating(true);

    // --- Validation ---
    if (loanAmount <= 0 || monthlyIncome <= 0 || tenorYears <= 0) {
      setError("Harga aset, penghasilan, dan tenor harus lebih dari nol.");
      setIsCalculating(false);
      return;
    }
    const maxTenor = loanTypes.find((lt) => lt.value === loanType)!.maxTenorYears;
    if (tenorYears > maxTenor) {
      setError(`Tenor maksimum untuk ${loanType} adalah ${maxTenor} tahun.`);
      setIsCalculating(false);
      return;
    }

    const numberOfMonths = tenorYears * 12;
    let monthlyPayment = 0;
    const installments: Installment[] = [];
    let balance = loanAmount;

    if (interestType === "flat") {
      const totalInterest = loanAmount * (fixedRate / 100) * tenorYears;
      const totalPayment = loanAmount + totalInterest;
      monthlyPayment = totalPayment / numberOfMonths;
      const monthlyPrincipal = loanAmount / numberOfMonths;
      const monthlyInterest = totalInterest / numberOfMonths;

      for (let i = 1; i <= numberOfMonths; i++) {
        balance -= monthlyPrincipal;
        installments.push({ month: i, payment: monthlyPayment, principal: monthlyPrincipal, interest: monthlyInterest, balance: Math.max(0, balance) });
      }
    } else {
      // Effective / Floating
      const fixedMonths = fixedPeriodYears * 12;
      const floatingMonths = numberOfMonths - fixedMonths;

      // Fixed Period Calculation
      const fixedMonthlyRate = fixedRate / 100 / 12;
      const fixedMonthlyPayment = fixedMonths > 0 ? (loanAmount * (fixedMonthlyRate * Math.pow(1 + fixedMonthlyRate, numberOfMonths))) / (Math.pow(1 + fixedMonthlyRate, numberOfMonths) - 1) : 0;

      for (let i = 1; i <= fixedMonths; i++) {
        const interestPaid = balance * fixedMonthlyRate;
        const principalPaid = fixedMonthlyPayment - interestPaid;
        balance -= principalPaid;
        installments.push({ month: i, payment: fixedMonthlyPayment, principal: principalPaid, interest: interestPaid, balance: Math.max(0, balance) });
      }

      // Floating Period Calculation with yearly rates
      if (floatingMonths > 0) {
        let currentMonth = fixedMonths + 1;
        let remainingBalance = balance;

        for (let year = 0; year < floatingRates.length; year++) {
          const monthsInYear = Math.min(12, floatingMonths - year * 12);
          if (monthsInYear <= 0) break;

          const floatingMonthlyRate = floatingRates[year] / 100 / 12;
          const floatingMonthlyPayment =
            remainingBalance > 0
              ? (remainingBalance * (floatingMonthlyRate * Math.pow(1 + floatingMonthlyRate, floatingMonths - year * 12))) / (Math.pow(1 + floatingMonthlyRate, floatingMonths - year * 12) - 1)
              : 0;

          for (let i = 1; i <= monthsInYear; i++) {
            const interestPaid = remainingBalance * floatingMonthlyRate;
            const principalPaid = floatingMonthlyPayment - interestPaid;
            remainingBalance -= principalPaid;
            installments.push({
              month: currentMonth,
              payment: floatingMonthlyPayment,
              principal: principalPaid,
              interest: interestPaid,
              balance: Math.max(0, remainingBalance),
            });
            currentMonth++;
          }
        }
      }

      // Use average payment for DTI
      const totalPaid = installments.reduce((acc, i) => acc + i.payment, 0);
      monthlyPayment = totalPaid / numberOfMonths;
    }

    const totalPayment = installments.reduce((sum, i) => sum + i.payment, 0);
    const totalInterest = totalPayment - loanAmount;
    const dtiRatio = (monthlyPayment / monthlyIncome) * 100;

    setTimeout(() => {
      setResult({ monthlyPayment, totalPayment, totalInterest, dtiRatio, installments });
      setIsCalculating(false);
    }, 1000);
  };

  // Chart Update Effect
  useEffect(() => {
    if (result) {
      if (mainChartRef.current) mainChartRef.current.destroy();
      if (donutChartRef.current) donutChartRef.current.destroy();

      if ((window as any).Chart) {
        const mainCanvas = document.getElementById("amortizationChart") as HTMLCanvasElement;
        const donutCanvas = document.getElementById("compositionChart") as HTMLCanvasElement;

        if (mainCanvas) {
          mainChartRef.current = new (window as any).Chart(mainCanvas.getContext("2d"), {
            type: "bar",
            data: {
              labels: result.installments.map((i) => (i.month % 12 === 0 ? `Thn ${i.month / 12}` : "")),
              datasets: [
                { label: "Pokok", data: result.installments.map((i) => i.principal), backgroundColor: "#2dd4bf" },
                { label: "Bunga", data: result.installments.map((i) => i.interest), backgroundColor: "#f472b6" },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { labels: { color: "#e2e8f0" } } },
              scales: {
                x: { stacked: true, ticks: { color: "#94a3b8" } },
                y: { stacked: true, ticks: { color: "#94a3b8", callback: (v: number) => formatCurrency(Number(v)).replace("Rp ", "") + " Jt" } },
              },
            },
          });
        }
        if (donutCanvas) {
          donutChartRef.current = new (window as any).Chart(donutCanvas.getContext("2d"), {
            type: "doughnut",
            data: {
              labels: ["Total Pokok", "Total Bunga"],
              datasets: [{ data: [loanAmount, result.totalInterest], backgroundColor: ["#2dd4bf", "#f472b6"], borderColor: "#1e293b", borderWidth: 4 }],
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: "#e2e8f0" } } } },
          });
        }
      }
    }
  }, [result, loanAmount]);

  return (
    <main className="min-h-screen bg-black text-zinc-200 p-4 md:p-8 font-sans">
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #22d3ee;
          cursor: pointer;
          border: 2px solid #1e293b;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #22d3ee;
          cursor: pointer;
          border: 2px solid #1e293b;
        }
      `}</style>
      <div className="container mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">Smart Loan Simulator</h1>
          <p className="mt-3 text-lg text-zinc-400">Rencanakan pinjaman Anda dengan presisi dan pemahaman mendalam.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 h-fit space-y-6">
            <ControlGroup title="Jenis Pinjaman & Bunga">
              <select value={loanType} onChange={(e) => setLoanType(e.target.value)} className="w-full p-2.5 rounded-lg bg-zinc-800 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white">
                {loanTypes.map((lt) => (
                  <option key={lt.value} value={lt.value}>
                    {lt.label}
                  </option>
                ))}
              </select>
              <select
                value={interestType}
                onChange={(e) => setInterestType(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-zinc-800 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <option value="effective">Bunga Efektif / Floating</option>
                <option value="flat">Bunga Flat</option>
              </select>
            </ControlGroup>
            <ControlGroup title="Detail Finansial">
              <InputCurrency label="Harga Aset" value={assetPrice} onChange={setAssetPrice} />
              <InputCurrency label="Penghasilan / Bulan" value={monthlyIncome} onChange={setMonthlyIncome} />
            </ControlGroup>
            <ControlGroup title="Struktur Pinjaman">
              <SliderControl label="Uang Muka (DP)" value={downPaymentPercent} onChange={setDownPaymentPercent} min={10} max={90} step={1} displayValue={`${downPaymentPercent}%`} />
              <div className="text-sm bg-black/50 p-3 rounded-lg text-center">
                <p className="text-zinc-400">Pokok Pinjaman</p>
                <p className="font-bold text-lg text-white">{formatCurrency(loanAmount)}</p>
              </div>
            </ControlGroup>
            <ControlGroup title="Jangka Waktu & Suku Bunga">
              <SliderControl label="Tenor" value={tenorYears} onChange={setTenorYears} min={1} max={loanTypes.find((lt) => lt.value === loanType)!.maxTenorYears} step={1} displayValue={`${tenorYears} Tahun`} />
              <SliderControl
                label={interestType === "flat" ? "Suku Bunga Flat" : "Suku Bunga Fixed"}
                value={fixedRate}
                onChange={setFixedRate}
                min={3}
                max={20}
                step={0.1}
                displayValue={`${fixedRate.toFixed(1)}% / tahun`}
              />
              <AnimatePresence>
                {interestType === "effective" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 overflow-hidden">
                    <SliderControl label="Periode Fixed" value={fixedPeriodYears} onChange={setFixedPeriodYears} min={1} max={tenorYears} step={1} displayValue={`${fixedPeriodYears} Tahun`} />
                    {floatingRates.map((rate, index) => (
                      <SliderControl
                        key={`floating-rate-${index}`}
                        label={`Suku Bunga Floating Tahun ${index + 1}`}
                        value={rate}
                        onChange={(value) => updateFloatingRate(index, value)}
                        min={5}
                        max={25}
                        step={0.1}
                        displayValue={`${rate.toFixed(1)}% / tahun`}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </ControlGroup>
            <motion.button
              onClick={calculateLoan}
              disabled={isCalculating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-2 bg-gradient-to-r from-white to-zinc-300 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isCalculating ? <FaSpinner className="animate-spin" /> : <FaCalculator />}
              {isCalculating ? "Menghitung..." : "Hitung Simulasi"}
            </motion.button>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-6">
            <AnimatePresence>
              {!result && !error && (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-full bg-zinc-900/60 p-10 rounded-2xl border border-zinc-700 border-dashed"
                >
                  <div className="text-center text-zinc-500">
                    <FaCalculator className="mx-auto text-5xl mb-4" />
                    <h3 className="text-lg font-semibold text-zinc-400">Hasil Simulasi Akan Muncul di Sini</h3>
                    <p className="text-sm">Konfigurasi pinjaman di sebelah kiri untuk memulai.</p>
                  </div>
                </motion.div>
              )}
              {error && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-red-900/20 p-6 rounded-2xl border border-red-500/30 flex items-center gap-4">
                  <FaExclamationTriangle className="text-red-400 text-3xl flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-red-300">Terjadi Kesalahan</h3>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </motion.div>
              )}
              {result && (
                <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <ResultCards result={result} loanAmount={loanAmount} />
                  <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700">
                    <h3 className="text-xl font-bold text-white mb-4">Grafik Amortisasi (Pokok vs Bunga)</h3>
                    <div className="h-[250px]">
                      <canvas id="amortizationChart"></canvas>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
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

const InputCurrency: FC<{ label: string; value: number; onChange: (val: number) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs text-zinc-400 mb-1">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">Rp</span>
      <input
        type="text"
        value={value.toLocaleString("id-ID")}
        onChange={(e) => onChange(parseCurrency(e.target.value))}
        className="w-full pl-8 p-2 rounded-lg bg-zinc-800 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white"
      />
    </div>
  </div>
);

const SliderControl: FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step: number;
  displayValue: string;
}> = ({ label, value, onChange, min, max, step, displayValue }) => (
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

const ResultStat: FC<{ label: string; value: string; dti?: number; className?: string }> = ({ label, value, dti, className }) => {
  const dtiColor = dti ? (dti <= 30 ? "text-green-400" : dti <= 40 ? "text-amber-400" : "text-red-400") : "text-white";
  return (
    <div className={`bg-zinc-900 p-4 rounded-lg text-center ${className}`}>
      <p className="text-sm text-zinc-400">{label}</p>
      <p className={`text-xl md:text-2xl font-bold ${dti ? dtiColor : "text-white"}`}>{value}</p>
    </div>
  );
};

const ResultCards: FC<{ result: Result; loanAmount: number }> = ({ result, loanAmount }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700">
      <h2 className="text-xl font-bold text-white mb-4">Ringkasan Finansial</h2>
      <div className="grid grid-cols-2 gap-4">
        <ResultStat label="Angsuran / Bulan" value={formatCurrency(result.monthlyPayment)} />
        <ResultStat label="DTI Ratio" value={`${result.dtiRatio.toFixed(1)}%`} dti={result.dtiRatio} />
        <ResultStat label="Total Bunga" value={formatCurrency(result.totalInterest)} />
        <ResultStat label="Total Pembayaran" value={formatCurrency(result.totalPayment)} />
      </div>
    </div>
    <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700">
      <h3 className="text-xl font-bold text-white mb-4">Komposisi Pembayaran</h3>
      <div className="h-48">
        <canvas id="compositionChart"></canvas>
      </div>
    </div>
  </div>
);
