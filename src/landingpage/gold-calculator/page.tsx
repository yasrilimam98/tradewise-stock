"use client";

import React, { useState, useMemo, FC, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- ICONS (Inline SVGs for portability) ---
const GoldBarIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.36,18.64L7.07,14.93L14.93,7.07L18.64,3.36C19.23,2.77 20.21,2.77 20.8,3.36L21.5,4.06C22.09,4.65 22.09,5.63 21.5,6.22L17.78,9.93L9.93,17.78L6.22,21.5C5.63,22.09 4.65,22.09 4.06,21.5L3.36,20.8C2.77,20.21 2.77,19.23 3.36,18.64M5.18,13.5L6.59,12.09L12.09,6.59L13.5,5.18L5.18,13.5Z" />
  </svg>
);
const InfoIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);
const CloseIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
const formatNumber = (value: number, decimals: number = 2) => new Intl.NumberFormat("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
const parseInput = (input: string): number => {
  // Remove all non-numeric characters except decimal point, then replace comma with dot for parsing
  const cleanInput = String(input)
    .replace(/[^0-9,.]/g, "")
    .replace(",", ".");
  const numValue = parseFloat(cleanInput);
  return isNaN(numValue) ? 0 : numValue;
};

// --- CONSTANTS ---
const TROY_OUNCE_IN_GRAMS = 31.1035;

// --- CHILD COMPONENTS ---
interface ValueInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  note?: string;
  isCurrency?: boolean;
  currencySymbol?: string;
}

const ValueInput: FC<ValueInputProps> = ({ label, value, onChange, note, isCurrency = false, currencySymbol = "Rp" }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/[^0-9]/g, ""); // Only allow numbers for currency
    onChange(rawValue);
  };

  const displayValue = useMemo(() => {
    if (!value) return "";
    const numValue = parseInput(value);
    const locale = currencySymbol === "$" ? "en-US" : "id-ID";
    return numValue.toLocaleString(locale);
  }, [value, currencySymbol]);

  return (
    <div>
      <label className="block mb-1.5 text-sm font-medium text-gray-400">{label}</label>
      <div className="relative">
        {isCurrency && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{currencySymbol}</span>}
        <input type="text" value={displayValue} onChange={handleInputChange} className={`w-full custom-input transition-all py-2 px-2 ${isCurrency ? "pl-10" : "pr-4"}`} placeholder={isCurrency ? "0" : "0"} />
      </div>
      {note && <p className="text-xs text-gray-500 mt-1.5">{note}</p>}
    </div>
  );
};

interface ResultCardProps {
  label: string;
  value: string;
  className?: string;
  subValue?: string;
  subValueClassName?: string;
}

const ResultCard: FC<ResultCardProps> = ({ label, value, className = "", subValue, subValueClassName = "" }) => (
  <div className="bg-gray-900/50 p-4 rounded-lg h-full flex flex-col justify-center">
    <p className="text-sm text-gray-400">{label}</p>
    <p className={`text-2xl font-bold mt-1 ${className}`}>{value}</p>
    {subValue && <p className={`text-base font-semibold ${subValueClassName}`}>{subValue}</p>}
  </div>
);

const ChartComponent: FC<{ data: any; options: any }> = ({ data, options }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  useEffect(() => {
    if (!chartRef.current || !(window as any).Chart) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new (window as any).Chart(chartRef.current, {
      type: "doughnut",
      data,
      options,
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, options]);

  return <canvas ref={chartRef}></canvas>;
};

const InvestmentChart: FC<{ investmentValue: number; spreadCost: number }> = ({ investmentValue, spreadCost }) => {
  const netGoldValue = investmentValue - spreadCost;
  const data = {
    labels: ["Nilai Aktual Emas", "Kerugian Spread"],
    datasets: [
      {
        data: [netGoldValue > 0 ? netGoldValue : 0, spreadCost > 0 ? spreadCost : 0],
        backgroundColor: ["#facc15", "#ef4444"],
        borderColor: "#1f2937",
        hoverOffset: 4,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: { position: "bottom" as "bottom", labels: { color: "#d1d5db", font: { family: "'Poppins', sans-serif" } } },
      tooltip: { callbacks: { label: (context: any) => formatCurrency(context.parsed) } },
    },
  };
  return <ChartComponent data={data} options={options} />;
};

const ProfitChart: FC<{ initialValue: number; profit: number }> = ({ initialValue, profit }) => {
  const data = {
    labels: ["Modal Awal", profit >= 0 ? "Keuntungan" : "Kerugian"],
    datasets: [
      {
        data: [initialValue > 0 ? initialValue : 0, Math.abs(profit)],
        backgroundColor: ["#6b7280", profit >= 0 ? "#22c55e" : "#ef4444"],
        borderColor: "#1f2937",
        hoverOffset: 4,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: { position: "bottom" as "bottom", labels: { color: "#d1d5db", font: { family: "'Poppins', sans-serif" } } },
      tooltip: { callbacks: { label: (context: any) => formatCurrency(context.parsed) } },
    },
  };
  return <ChartComponent data={data} options={options} />;
};

// --- MODAL COMPONENT ---
interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculations: {
    hargaJual: number;
    hargaBeli: number;
    spreadNominal: number;
    p_hargaUsd: number;
    p_kurs: number;
    p_spreadPercent: number;
  };
}

const InfoModal: FC<InfoModalProps> = ({ isOpen, onClose, calculations }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
          <motion.div
            initial={{ scale: 0.9, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-gray-800 p-6 rounded-2xl max-w-2xl w-full border border-amber-500/20 shadow-2xl shadow-amber-500/10 text-gray-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-amber-400">Detail Perhitungan Harga</h2>
              <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-amber-300">1. Harga Jual (Rp/gram)</h3>
                <p className="text-sm text-gray-400">Harga jual dihitung dengan mengkonversi harga emas dunia dari USD/troy ounce ke Rupiah/gram.</p>
                <p className="text-sm bg-gray-900/60 p-3 rounded-lg font-mono">(Harga USD/Oz × Kurs IDR) ÷ 31.1035</p>
                <p className="text-sm bg-gray-700 p-3 rounded-lg font-mono">
                  ({formatCurrency(calculations.p_hargaUsd).replace("Rp", "$")} × {formatCurrency(calculations.p_kurs)}) ÷ {TROY_OUNCE_IN_GRAMS} ={" "}
                  <span className="font-bold text-amber-300">{formatCurrency(calculations.hargaJual)}</span>
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-green-400">2. Harga Beli (Rp/gram)</h3>
                <p className="text-sm text-gray-400">Harga beli (buyback) adalah harga jual setelah dikurangi persentase spread.</p>
                <p className="text-sm bg-gray-900/60 p-3 rounded-lg font-mono">Harga Jual - (Harga Jual × Spread %)</p>
                <p className="text-sm bg-gray-700 p-3 rounded-lg font-mono">
                  {formatCurrency(calculations.hargaJual)} - ({formatCurrency(calculations.hargaJual)} × {calculations.p_spreadPercent}%) ={" "}
                  <span className="font-bold text-green-400">{formatCurrency(calculations.hargaBeli)}</span>
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-red-400">3. Spread Nominal</h3>
                <p className="text-sm text-gray-400">Ini adalah selisih nominal dalam Rupiah antara harga jual dan harga beli per gram.</p>
                <p className="text-sm bg-gray-900/60 p-3 rounded-lg font-mono">Harga Jual - Harga Beli</p>
                <p className="text-sm bg-gray-700 p-3 rounded-lg font-mono">
                  {formatCurrency(calculations.hargaJual)} - {formatCurrency(calculations.hargaBeli)} = <span className="font-bold text-red-400">{formatCurrency(calculations.spreadNominal)}</span>
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- MAIN COMPONENT ---
export default function GoldInvestmentCalculator() {
  const [hargaUsd, setHargaUsd] = useState("3330");
  const [kurs, setKurs] = useState("16167");
  const [spread, setSpread] = useState("2.5");
  const [danaInvestasi, setDanaInvestasi] = useState("10000000");
  const [hargaBeliSaya, setHargaBeliSaya] = useState("");
  const [jumlahEmas, setJumlahEmas] = useState("");
  const [targetJual, setTargetJual] = useState("2000000");
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const calculations = useMemo(() => {
    const p_hargaUsd = parseInput(hargaUsd);
    const p_kurs = parseInput(kurs);
    const p_spreadPercent = parseInput(spread);
    const p_danaInvestasi = parseInput(danaInvestasi);
    const p_targetJual = parseInput(targetJual);
    const p_hargaBeliSaya = parseInput(hargaBeliSaya);
    const p_jumlahEmas = parseInput(jumlahEmas);

    const hargaJual = (p_hargaUsd * p_kurs) / TROY_OUNCE_IN_GRAMS;
    const hargaBeli = hargaJual - hargaJual * (p_spreadPercent / 100);
    const spreadNominal = hargaJual - hargaBeli;

    const emasDidapat = p_danaInvestasi > 0 && hargaJual > 0 ? p_danaInvestasi / hargaJual : 0;
    const nilaiPenjualan = emasDidapat * p_targetJual;
    const potensiKeuntungan = p_targetJual > 0 ? nilaiPenjualan - p_danaInvestasi : 0;
    const potensiPersen = p_danaInvestasi > 0 ? (potensiKeuntungan / p_danaInvestasi) * 100 : 0;
    const biayaSpreadTotal = emasDidapat * spreadNominal;

    const profitPerGram = p_hargaBeliSaya > 0 ? hargaBeli - p_hargaBeliSaya : 0;
    const totalModalAwal = p_jumlahEmas * p_hargaBeliSaya;
    const nilaiPortofolioSekarang = p_jumlahEmas * hargaBeli;
    const totalKeuntunganPortofolio = nilaiPortofolioSekarang - totalModalAwal;
    const persenKeuntunganPortofolio = totalModalAwal > 0 ? (totalKeuntunganPortofolio / totalModalAwal) * 100 : 0;

    return {
      hargaJual,
      hargaBeli,
      spreadNominal,
      emasDidapat,
      potensiKeuntungan,
      potensiPersen,
      biayaSpreadTotal,
      profitPerGram,
      totalModalAwal,
      nilaiPortofolioSekarang,
      totalKeuntunganPortofolio,
      persenKeuntunganPortofolio,
      p_danaInvestasi,
      p_hargaUsd,
      p_kurs,
      p_spreadPercent,
      p_hargaBeliSaya,
      p_jumlahEmas,
    };
  }, [hargaUsd, kurs, spread, danaInvestasi, targetJual, hargaBeliSaya, jumlahEmas]);

  const profitColor = calculations.potensiKeuntungan > 0 ? "text-green-400" : calculations.potensiKeuntungan < 0 ? "text-red-400" : "text-gray-400";
  const profitBg = calculations.potensiKeuntungan > 0 ? "bg-green-900/50" : calculations.potensiKeuntungan < 0 ? "bg-red-900/50" : "bg-gray-900/50";
  const portfolioProfitColor = calculations.totalKeuntunganPortofolio > 0 ? "text-green-400" : calculations.totalKeuntunganPortofolio < 0 ? "text-red-400" : "text-gray-400";

  // Handler for the new spread input
  const handleSpreadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Allow only numbers and a single decimal point
    value = value.replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) {
      value = `${parts[0]}.${parts.slice(1).join("")}`;
    }
    setSpread(value);
  };

  return (
    <div className="font-sans bg-[#111827] text-gray-200 min-h-screen">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
          body { font-family: 'Poppins', sans-serif; }
          .gold-gradient-text {
            background: linear-gradient(90deg, #fef08a, #facc15, #d97706);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .gold-shadow {
            box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.2), 0 4px 6px -2px rgba(245, 158, 11, 0.1);
          }
          .custom-input {
            background-color: #374151;
            border: 1px solid #4b5563;
            color: #f3f4f6;
            border-radius: 0.5rem;
          }
          .custom-input:focus {
            outline: none;
            border-color: #f59e0b;
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.4);
          }
        `}
      </style>

      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold gold-gradient-text">Kalkulator Investasi Emas</h1>
          <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">Simulasikan investasi baru dan analisis portofolio emas Anda yang sudah ada.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-8">
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                <GoldBarIcon className="w-6 h-6" />
                Parameter Pasar
              </h2>
              <div className="space-y-4">
                <ValueInput label="Harga Emas Dunia (USD/Oz)" value={hargaUsd} onChange={setHargaUsd} note="Harga spot emas dunia." isCurrency currencySymbol="$" />
                <ValueInput label="Kurs USD ke IDR" value={kurs} onChange={setKurs} note="Kurs terkini." isCurrency />

                {/* --- MODIFIED SPREAD INPUT --- */}
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-400">Spread (%)</label>
                  <div className="relative">
                    <input type="text" value={spread} onChange={handleSpreadChange} className="w-full custom-input transition-all py-2 px-4" placeholder="0.0" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Selisih jual-beli, biasanya 2-5%.</p>
                </div>
                {/* --- END OF MODIFICATION --- */}
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <h2 className="text-xl font-bold text-amber-400 mb-4">Parameter Anda</h2>
              <div className="space-y-4">
                <ValueInput label="Jumlah Dana Investasi Baru" value={danaInvestasi} onChange={setDanaInvestasi} isCurrency note="Untuk simulasi investasi baru." />
                <ValueInput label="Harga Beli Anda /gram" value={hargaBeliSaya} onChange={setHargaBeliSaya} isCurrency note="Opsional: Untuk analisis portofolio." />

                {/* --- MODIFIED JUMLAH EMAS INPUT (using spread's logic) --- */}
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-400">Jumlah Emas Anda (gram)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={jumlahEmas}
                      onChange={(e) => {
                        let value = e.target.value;
                        value = value.replace(/[^0-9.]/g, "");
                        const parts = value.split(".");
                        if (parts.length > 2) {
                          value = `${parts[0]}.${parts.slice(1).join("")}`;
                        }
                        setJumlahEmas(value);
                      }}
                      className="w-full custom-input transition-all py-2 px-4"
                      placeholder="0.0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Opsional: Untuk analisis portofolio.</p>
                </div>
                {/* --- END OF MODIFICATION --- */}

                <ValueInput label="Target Harga Jual /gram" value={targetJual} onChange={setTargetJual} isCurrency note="Untuk simulasi investasi baru." />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 space-y-8">
            <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 gold-shadow">
              <div className="flex justify-center items-center mb-4 relative">
                <h2 className="text-xl font-bold text-amber-400 text-center">Harga Pasar Saat Ini</h2>
                <button onClick={() => setIsModalOpen(true)} className="absolute right-0 text-gray-400 hover:text-amber-400 transition-colors p-1">
                  <InfoIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <ResultCard label="Harga Jual /gram" value={formatCurrency(calculations.hargaJual)} className="text-amber-300" />
                <ResultCard label="Harga Beli /gram" value={formatCurrency(calculations.hargaBeli)} className="text-green-400" />
                <ResultCard label="Spread Nominal" value={formatCurrency(calculations.spreadNominal)} className="text-red-400" />
              </div>
            </motion.div>

            <AnimatePresence>
              {calculations.p_hargaBeliSaya > 0 && calculations.p_jumlahEmas > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto", transition: { delay: 0.1 } }}
                  exit={{ opacity: 0, y: 20, height: 0 }}
                  className="bg-gray-800 p-6 rounded-2xl border border-gray-700"
                >
                  <h2 className="text-xl font-bold text-amber-400 mb-4 text-center">Analisis Portofolio Anda</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="w-full h-48 md:h-56 mx-auto">
                      <ProfitChart initialValue={calculations.totalModalAwal} profit={calculations.totalKeuntunganPortofolio} />
                    </div>
                    <div className="space-y-4">
                      <ResultCard label="Total Modal Awal" value={formatCurrency(calculations.totalModalAwal)} className="text-gray-300" />
                      <ResultCard label="Nilai Portofolio Saat Ini" value={formatCurrency(calculations.nilaiPortofolioSekarang)} className="text-amber-300" />
                      <ResultCard
                        label="Total Keuntungan"
                        value={formatCurrency(calculations.totalKeuntunganPortofolio)}
                        className={portfolioProfitColor}
                        subValue={`(${formatNumber(calculations.persenKeuntunganPortofolio, 2)}%)`}
                        subValueClassName={portfolioProfitColor}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col justify-between">
                <h2 className="text-xl font-bold text-amber-400 mb-4">Simulasi Investasi Baru</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400">Estimasi Emas Didapat</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(calculations.emasDidapat, 4)} gram</p>
                  </div>
                  <div className={`p-4 rounded-lg transition-colors duration-300 ${profitBg}`}>
                    <p className="text-sm text-gray-400">Potensi Keuntungan (di Target Jual)</p>
                    <p className={`text-2xl font-bold ${profitColor}`}>{formatCurrency(calculations.potensiKeuntungan)}</p>
                    <p className={`text-lg font-semibold ${profitColor}`}>({formatNumber(calculations.potensiPersen, 2)}%)</p>
                  </div>
                </div>
              </motion.div>
              <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                <h2 className="text-xl font-bold text-amber-400 mb-4 text-center">Alokasi Investasi Baru</h2>
                <div className="w-full h-48 md:h-56 mx-auto">
                  {typeof window !== "undefined" && (window as any).Chart && <InvestmentChart investmentValue={calculations.p_danaInvestasi} spreadCost={calculations.biayaSpreadTotal} />}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Kalkulator Finansial. Dibuat untuk tujuan simulasi.</p>
        </footer>
      </div>
      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} calculations={calculations} />
    </div>
  );
}
