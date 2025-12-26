"use client";

import React, { useState, useEffect, useRef, FC } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from "chart.js";
import { Line } from "react-chartjs-2";
import axios from "axios";
import { FaChevronDown, FaChevronUp, FaSpinner, FaChartLine, FaFilePdf, FaShieldAlt, FaLightbulb, FaBullseye } from "react-icons/fa";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Extend the Window interface to include jspdf
declare global {
  interface Window {
    jspdf?: any;
  }
}

// --- Helper Functions & Types ---
const formatRupiah = (value: number): string => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
const parseToNumber = (input: string): number | null => {
  const cleanedInput = input.replace(/[^0-9]/g, "");
  if (!cleanedInput || isNaN(Number(cleanedInput))) return null;
  return parseFloat(cleanedInput);
};

type AiAnalysis = { summary: string; details?: string[] };
type Plan = { goalAmount: number; timeFrame: number; riskTolerance: string; suggestedInstruments: string[]; strategy: string; monthlyInvestment: string; expectedReturn: number };

function parseAnalysis(text: string): AiAnalysis {
  const cleanedText = text.replace(/[\*]+/g, "").replace(/\s+/g, " ").trim();
  const lines = cleanedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const summary = lines[0] || "Tidak ada analisis tersedia.";
  const details = lines.length > 1 ? lines.slice(1) : undefined;
  return { summary, details };
}

// --- Sub-Components ---
const PlanDetailItem: FC<{ icon: React.ReactElement; label: string; value: string | number }> = ({ icon, label, value }) => (
  <div className="bg-zinc-800/50 p-3 rounded-lg flex items-center gap-4">
    <div className="text-zinc-300 text-xl">{icon}</div>
    <div>
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="font-semibold text-zinc-100">{value}</p>
    </div>
  </div>
);

// (Removed: progressData state and setProgressData call from top-level. Move this logic into the main component below.)

const AiAnalysisCard: FC<{ analysis: AiAnalysis | null }> = ({ analysis }) => {
  if (!analysis) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-zinc-900/50 border border-teal-500/30 rounded-2xl p-6 shadow-xl shadow-teal-500/5">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
        <FaLightbulb /> Analisis Cerdas AI
      </h3>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-zinc-300 mb-4 italic border-l-4 border-teal-400 pl-4">
        {analysis.summary}
      </motion.p>
      {analysis.details && (
        <div>
          <h4 className="font-semibold text-zinc-200 mb-2">Poin-poin Penting:</h4>
          <ul className="space-y-2">
            {analysis.details.map((detail, index) => (
              <motion.li key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + index * 0.1 }} className="flex items-start gap-3 text-sm text-zinc-300">
                <FaShieldAlt className="text-zinc-300 mt-1 flex-shrink-0" />
                <span>{detail}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
};

export default function InvestmentPlanner() {
  const [goalAmount, setGoalAmount] = useState("");
  const [timeFrame, setTimeFrame] = useState("");
  const [riskTolerance, setRiskTolerance] = useState("moderate");
  const [analyzeWithAI, setAnalyzeWithAI] = useState(false);
  const [error, setError] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [progressData, setProgressData] = useState<any>({
    labels: [],
    datasets: [
      {
        label: "Pertumbuhan Investasi",
        data: [],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        fill: true,
      },
    ],
  });

  // Dynamically load jsPDF library
  useEffect(() => {
    const scriptId = "jspdf-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const calculatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setAiAnalysis(null);

    const amount = parseToNumber(goalAmount);
    const years = parseToNumber(timeFrame);

    if (amount === null || years === null || years <= 0) {
      setError("Masukkan jumlah tujuan dan jangka waktu yang valid.");
      setIsLoading(false);
      return;
    }

    let suggestedInstruments: string[] = [],
      strategy = "",
      annualReturn = 0;
    if (riskTolerance === "low") {
      suggestedInstruments = ["Reksa Dana Pasar Uang", "Obligasi Negara"];
      strategy = "Alokasi 70% Reksa Dana, 30% Obligasi";
      annualReturn = 0.05;
    } else if (riskTolerance === "moderate") {
      suggestedInstruments = ["Saham Blue Chip", "Reksa Dana Saham", "Obligasi"];
      strategy = "Alokasi 50% Saham, 30% Reksa Dana, 20% Obligasi";
      annualReturn = 0.08;
    } else {
      suggestedInstruments = ["Saham Growth", "Cryptocurrency", "ETF"];
      strategy = "Alokasi 60% Saham, 30% Crypto, 10% ETF";
      annualReturn = 0.12;
    }

    const monthlyInvestmentValue = (amount * (annualReturn / 12)) / (Math.pow(1 + annualReturn / 12, years * 12) - 1);
    const newPlan: Plan = {
      goalAmount: amount,
      timeFrame: years,
      riskTolerance,
      suggestedInstruments,
      strategy,
      monthlyInvestment: formatRupiah(monthlyInvestmentValue),
      expectedReturn: annualReturn * 100,
    };
    setPlan(newPlan);

    // Chart Data
    const labels = Array.from({ length: years + 1 }, (_, i) => `Tahun ${i}`);
    let currentValue = 0;
    const data = labels.map((_, i) => {
      if (i > 0) {
        currentValue = (currentValue + monthlyInvestmentValue * 12) * (1 + annualReturn);
      }
      return currentValue;
    });

    setProgressData({
      labels,
      datasets: [
        {
          label: "Pertumbuhan Investasi",
          data,
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.5)",
          fill: true,
        },
      ],
    });

    if (analyzeWithAI) {
      try {
        const response = await axios.post("https://tradewise-backend.vercel.app/api/planner", {
          goalAmount: amount,
          timeFrame: years,
          riskTolerance,
        });
        setAiAnalysis(parseAnalysis(response.data.analysis));
      } catch (err) {
        setAiAnalysis({
          summary: "Gagal mendapatkan analisis AI. Silakan coba lagi nanti.",
        });
      }
    }

    setIsLoading(false);
  };

  const exportToPDF = () => {
    if (!plan || !window.jspdf) {
      alert("Harap buat rencana terlebih dahulu atau tunggu pustaka PDF dimuat.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor("#14b8a6");
    doc.text("Rencana Investasi Cerdas Anda", 105, 20, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor("#334155");

    let y = 40;
    const writeLine = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, 80, y);
      y += 10;
    };

    writeLine("Tujuan Akhir:", formatRupiah(plan.goalAmount));
    writeLine("Jangka Waktu:", `${plan.timeFrame} tahun`);
    writeLine("Profil Risiko:", plan.riskTolerance.charAt(0).toUpperCase() + plan.riskTolerance.slice(1));
    writeLine("Investasi Bulanan:", plan.monthlyInvestment);
    writeLine("Estimasi Imbal Hasil:", `${plan.expectedReturn}% per tahun`);
    writeLine("Strategi Alokasi:", plan.strategy);
    writeLine("Instrumen Disarankan:", plan.suggestedInstruments.join(", "));

    if (aiAnalysis) {
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setTextColor("#14b8a6");
      doc.text("Analisis Cerdas AI", 20, y);
      y += 10;
      doc.setTextColor("#334155");
      doc.setFont("helvetica", "normal");
      const summaryLines = doc.splitTextToSize(`Ringkasan: ${aiAnalysis.summary}`, 170);
      doc.text(summaryLines, 20, y);
      y += summaryLines.length * 5 + 5;

      if (aiAnalysis.details) {
        doc.setFont("helvetica", "bold");
        doc.text("Detail Poin:", 20, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        aiAnalysis.details.forEach((detail) => {
          const detailLines = doc.splitTextToSize(`- ${detail}`, 165);
          doc.text(detailLines, 25, y);
          y += detailLines.length * 5;
        });
      }
    }

    doc.save("Rencana-Investasi-TradeWise.pdf");
  };

  const parseInput = (input: string) => Number(input.replace(/[^0-9]/g, "")) || 0;

  return (
    <div className="bg-black text-zinc-200 min-h-screen font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>
      <div className="container mx-auto px-4 py-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400"
        >
          Perencana Investasi Cerdas
        </motion.h1>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/20 border border-red-500/30 text-red-300 p-4 rounded-lg max-w-2xl mx-auto mb-6 text-center">
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column: Form */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 bg-zinc-900/60 backdrop-blur-sm p-6 rounded-2xl border border-zinc-700 h-fit">
            <h2 className="text-xl font-bold mb-4 text-white">Mulai Rencana Anda</h2>
            <form onSubmit={calculatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1" htmlFor="goalAmount">
                  Jumlah Tujuan (Rp)
                </label>
                <input
                  id="goalAmount"
                  type="text"
                  // value={goalAmount}

                  value={goalAmount}
                  placeholder="cth: 10.000.000"
                  // onChange={(e) => setGoalAmount(e.target.value)}
                  onChange={(e) => {
                    const rawValue = parseInput(e.target.value);
                    setGoalAmount(formatRupiah(rawValue));
                  }}
                  className="w-full p-3 rounded-lg bg-zinc-800/50 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1" htmlFor="timeFrame">
                  Jangka Waktu (Tahun)
                </label>
                <input
                  id="timeFrame"
                  type="text"
                  value={timeFrame}
                  onChange={(e) => setTimeFrame(e.target.value)}
                  placeholder="cth: 5"
                  className="w-full p-3 rounded-lg bg-zinc-800/50 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1" htmlFor="riskTolerance">
                  Toleransi Risiko
                </label>
                <select
                  id="riskTolerance"
                  value={riskTolerance}
                  onChange={(e) => setRiskTolerance(e.target.value)}
                  className="w-full p-3 rounded-lg bg-zinc-800/50 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white transition"
                >
                  <option value="low">Rendah</option>
                  <option value="moderate">Sedang</option>
                  <option value="high">Tinggi</option>
                </select>
              </div>
              <div className="flex items-center pt-2">
                <input
                  type="checkbox"
                  id="analyzeWithAI"
                  checked={analyzeWithAI}
                  onChange={(e) => setAnalyzeWithAI(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-500 bg-slate-600 border-slate-500 focus:ring-white cursor-pointer"
                />
                <label htmlFor="analyzeWithAI" className="ml-3 text-sm font-medium text-zinc-300 cursor-pointer flex items-center gap-2">
                  <FaShieldAlt className="text-zinc-300" /> Analisis dengan AI
                </label>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className={`w-full bg-gradient-to-r from-white to-zinc-400 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 ${
                  isLoading ? "opacity-60 cursor-not-allowed" : "hover:shadow-lg hover:shadow-teal-500/20"
                }`}
              >
                {isLoading ? (
                  <>
                    <FaSpinner className="animate-spin" /> Memproses...
                  </>
                ) : (
                  "Buat Rencana"
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* Right Column: Results */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-3">
            {plan ? (
              <div className="space-y-6">
                <div className="bg-zinc-900/60 backdrop-blur-sm p-6 rounded-2xl border border-zinc-700">
                  <h2 className="text-xl font-bold mb-4 text-white">Hasil Rencana Anda</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PlanDetailItem icon={<FaBullseye />} label="Tujuan Akhir" value={formatRupiah(plan.goalAmount)} />
                    <PlanDetailItem icon={<FaChartLine />} label="Investasi Bulanan" value={plan.monthlyInvestment} />
                    <PlanDetailItem icon={<FaShieldAlt />} label="Profil Risiko" value={plan.riskTolerance.charAt(0).toUpperCase() + plan.riskTolerance.slice(1)} />
                    <PlanDetailItem icon={<FaLightbulb />} label="Estimasi Imbal Hasil" value={`${plan.expectedReturn}% / tahun`} />
                    <div className="md:col-span-2">
                      <PlanDetailItem icon={<FaChartLine />} label="Instrumen Disarankan" value={plan.suggestedInstruments.join(", ")} />
                    </div>
                  </div>
                  <AiAnalysisCard analysis={aiAnalysis} />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={exportToPDF}
                    className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <FaFilePdf /> Ekspor ke PDF
                  </motion.button>
                </div>
                <div className="bg-zinc-900/60 backdrop-blur-sm p-6 rounded-2xl border border-zinc-700">
                  <h2 className="text-xl font-bold mb-4 text-white">Proyeksi Pertumbuhan</h2>
                  <div className="h-[300px] md:h-[400px]">
                    <div className="w-full h-[400px]">
                      <Line
                        data={progressData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { labels: { color: "white" } },
                            title: {
                              display: true,
                              text: "Pertumbuhan Investasi dari Waktu ke Waktu",
                              color: "white",
                              font: { size: 14 },
                            },
                          },
                          scales: {
                            x: { ticks: { color: "white" } },
                            y: {
                              ticks: {
                                color: "white",
                                callback: (value) => formatRupiah(Number(value)),
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-zinc-900/60 backdrop-blur-sm p-6 rounded-2xl border border-zinc-700 border-dashed">
                <div className="text-center text-zinc-500">
                  <FaBullseye className="text-4xl mb-4 m-auto text-zinc-300 flex" />
                  <p className="text-lg">Buat rencana investasi Anda untuk melihat hasilnya!</p>
                  <p className="text-sm mt-2">Isi formulir di sebelah kiri untuk memulai.</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
