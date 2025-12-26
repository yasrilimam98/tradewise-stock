"use client";

import React, { useState, useMemo, FC, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { FaInfoCircle, FaBook, FaTimes, FaArrowUp, FaArrowDown, FaEquals, FaLightbulb } from "react-icons/fa";

// --- TYPES ---
type CalculationResult = {
  allottedShares: number;
  allottedLots: number;
  totalCost: number;
  refundAmount: number;
  allotmentRate: number;
  capitalGain: number;
  capitalGainPercentage: number;
  analysisMessage: string;
  oversubscriptionRate: number;
};

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;
const formatNumber = (value: number, decimals: number = 0) => value.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: decimals });
const parseInput = (input: string) => Number(String(input).replace(/[^0-9]/g, "")) || 0;

// --- MAIN COMPONENT ---
export default function IPOAllotmentCalculator() {
  // Data simulasi untuk CDIA
  const [stockName, setStockName] = useState<string>("CDIA");
  const [totalIpoShares, setTotalIpoShares] = useState<string>("12482937500");
  const [ipoPrice, setIpoPrice] = useState<string>("190");
  const [myInvestment, setMyInvestment] = useState<string>("10000000");
  const [totalRetailDemand, setTotalRetailDemand] = useState<string>("5000000000000");
  const [listingPrice, setListingPrice] = useState<string>("220");

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false); // State untuk modal tutorial
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
  }, []);

  const { calculationResult, investorType } = useMemo(() => {
    const pIpoPrice = parseInput(ipoPrice);
    const pTotalIpoShares = parseInput(totalIpoShares);
    const pMyInvestment = parseInput(myInvestment);
    const pTotalRetailDemand = parseInput(totalRetailDemand);
    const pListingPrice = parseInput(listingPrice);

    const investorType = pMyInvestment > 0 ? (pMyInvestment < 100_000_000 ? "Retail" : "Non-Retail") : null;

    if (!pIpoPrice || !pTotalIpoShares || !pMyInvestment || !pTotalRetailDemand) return { calculationResult: null, investorType };

    const issuanceValue = pTotalIpoShares * pIpoPrice;

    const basePoolingShares = pTotalIpoShares * (2.5 / 100);
    const oversubscriptionRate = basePoolingShares > 0 ? pTotalRetailDemand / basePoolingShares : 0;

    let poolingAllocationPercent = 0;
    let emissionClass = "I";
    if (issuanceValue > 1_000_000_000_000) {
      emissionClass = "IV";
      if (oversubscriptionRate > 25) poolingAllocationPercent = 12.5;
      else if (oversubscriptionRate >= 10) poolingAllocationPercent = 7.5;
      else poolingAllocationPercent = 5;
    } else if (issuanceValue > 500_000_000_000) {
      emissionClass = "III";
      if (oversubscriptionRate > 25) poolingAllocationPercent = 17.5;
      else if (oversubscriptionRate >= 10) poolingAllocationPercent = 12.5;
      else poolingAllocationPercent = 10;
    } else if (issuanceValue > 250_000_000_000) {
      emissionClass = "II";
      if (oversubscriptionRate > 25) poolingAllocationPercent = 20;
      else if (oversubscriptionRate >= 10) poolingAllocationPercent = 15;
      else poolingAllocationPercent = 12.5;
    } else {
      emissionClass = "I";
      if (oversubscriptionRate > 25) poolingAllocationPercent = 25;
      else if (oversubscriptionRate >= 10) poolingAllocationPercent = 20;
      else poolingAllocationPercent = 17.5;
    }

    const totalPoolingShares = pTotalIpoShares * (poolingAllocationPercent / 100);
    const retailAllotmentPool = investorType === "Retail" ? totalPoolingShares / 3 : investorType === "Non-Retail" ? totalPoolingShares * (2 / 3) : 0;

    const myProportion = pTotalRetailDemand > 0 ? pMyInvestment / pTotalRetailDemand : 0;
    let allottedShares = myProportion * retailAllotmentPool;

    allottedShares = Math.floor(allottedShares / 100) * 100;
    const myOrderShares = pIpoPrice > 0 ? Math.floor(pMyInvestment / pIpoPrice) : 0;
    allottedShares = Math.min(allottedShares, myOrderShares);

    const totalCost = allottedShares * pIpoPrice;
    const refundAmount = pMyInvestment - totalCost;
    const allotmentRate = myOrderShares > 0 ? (allottedShares / myOrderShares) * 100 : 0;

    let capitalGain = 0;
    let capitalGainPercentage = 0;
    if (pListingPrice > 0 && totalCost > 0) {
      capitalGain = (pListingPrice - pIpoPrice) * allottedShares;
      capitalGainPercentage = (capitalGain / totalCost) * 100;
    }

    const analysisMessage = `
Berdasarkan nilai emisi ~${formatCurrency(issuanceValue)}, IPO ini masuk **Golongan ${emissionClass}**. 
Dengan tingkat oversubscription **${formatNumber(oversubscriptionRate, 2)}x**, persentase alokasi terpusat (pooling) yang ditetapkan adalah **${poolingAllocationPercent}%**. 
Dari total ${formatNumber(totalPoolingShares)} lembar saham di jatah pooling, porsi untuk investor ${investorType} diperkirakan sekitar **${formatNumber(retailAllotmentPool)} lembar**. 
Dana pesanan Anda (${formatCurrency(pMyInvestment)}) merupakan **${(myProportion * 100).toFixed(4)}%** dari total permintaan, sehingga Anda berhak atas estimasi alokasi ini.
    `;

    const result = { allottedShares, allottedLots: allottedShares / 100, totalCost, refundAmount, allotmentRate, capitalGain, capitalGainPercentage, analysisMessage, oversubscriptionRate };
    return { calculationResult: result, investorType };
  }, [myInvestment, ipoPrice, totalIpoShares, totalRetailDemand, listingPrice]);

  useEffect(() => {
    if (!calculationResult || !(window as any).Chart) return;
    const canvas = document.getElementById("ipoAllotmentChart") as HTMLCanvasElement;
    if (!canvas) return;

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new (window as any).Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Dana"],
        datasets: [
          { label: "Dipesan", data: [parseInput(myInvestment)], backgroundColor: "#334155", borderRadius: 6 },
          { label: "Dialokasikan", data: [calculationResult.totalCost], backgroundColor: "#2dd4bf", borderRadius: 6 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { color: "#e2e8f0" } } },
        scales: { y: { ticks: { callback: (v: any) => formatCurrency(v), color: "#94a3b8" }, grid: { color: "rgba(100, 116, 139, 0.2)" } }, x: { ticks: { color: "#94a3b8" }, grid: { display: false } } },
      },
    });
  }, [calculationResult, myInvestment]);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 font-sans">
      <div className="text-center mb-4">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-400">Kalkulator Penjatahan IPO</h1>
        <p className="text-slate-400 mt-2">Estimasi alokasi saham IPO Anda berdasarkan aturan bursa yang berlaku.</p>
      </div>
      <div className="text-center mb-10">
        <button
          onClick={() => setIsTutorialModalOpen(true)}
          className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition bg-slate-800/60 px-4 py-2 rounded-lg border border-slate-700"
        >
          <FaBook /> Cara Penggunaan & Contoh
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 bg-slate-800/60 p-6 rounded-2xl border border-slate-700 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-cyan-300">Parameter Simulasi</h2>
            <button onClick={() => setIsRulesModalOpen(true)} className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition">
              <FaInfoCircle /> Info Aturan Bursa
            </button>
          </div>
          <ControlGroup title="Data IPO">
            <InputControl label="Nama Saham / Emiten" value={stockName} onChange={setStockName} placeholder="Contoh: AADI" />
            <CurrencyInput label="Harga Penawaran per Lembar" value={ipoPrice} onChange={setIpoPrice} />
            <NumberInput label="Total Saham Ditawarkan (Publik)" value={totalIpoShares} onChange={setTotalIpoShares} />
            <CurrencyInput label="Estimasi Total Dana Pesanan Retail" value={totalRetailDemand} onChange={setTotalRetailDemand} note="Total permintaan dari investor < Rp 100 Juta" />
          </ControlGroup>
          <ControlGroup title="Pesanan & Proyeksi Anda">
            <CurrencyInput label="Dana yang Anda Siapkan" value={myInvestment} onChange={setMyInvestment} />
            {investorType && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-center p-2 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                Kategori Anda: <span className="font-bold text-cyan-300">{investorType === "Retail" ? "Investor Retail" : "Investor Non-Retail"}</span>
              </motion.div>
            )}
            <CurrencyInput label="Prediksi Harga di Pasar Sekunder" value={listingPrice} onChange={setListingPrice} note="Untuk hitung potensi capital gain" />
          </ControlGroup>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 space-y-6">
          <AnimatePresence>
            {calculationResult ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <DashboardStat
                    label="Estimasi Alokasi Didapat"
                    value={formatNumber(calculationResult.allottedLots)}
                    unit="Lot"
                    subValue={`(${formatNumber(calculationResult.allottedShares)} lembar)`}
                    isPrimary
                  />
                  <DashboardStat label="Tingkat Oversubscription" value={`${formatNumber(calculationResult.oversubscriptionRate, 2)}x`} subValue="Total Permintaan / Porsi Saham" />
                  <DashboardStat label="Dana Dikembalikan (Refund)" value={formatCurrency(calculationResult.refundAmount)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ProfitLossCard value={calculationResult.capitalGain} percentage={calculationResult.capitalGainPercentage} />
                  <ExplanationCard message={calculationResult.analysisMessage} />
                </div>
                <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 min-h-[300px]">
                  <h3 className="text-lg font-bold text-cyan-300 mb-4 text-center">Visualisasi Pesanan vs. Alokasi Dana</h3>
                  <div className="h-64 relative">
                    <canvas id="ipoAllotmentChart"></canvas>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-full bg-slate-800/60 p-10 rounded-2xl border border-slate-700 border-dashed">
                <p className="text-center text-slate-500">Isi data di sebelah kiri untuk melihat hasil simulasi.</p>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <RulesModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} />
      <TutorialModal isOpen={isTutorialModalOpen} onClose={() => setIsTutorialModalOpen(false)} />
    </main>
  );
}

// --- SUB-COMPONENTS ---
const ControlGroup: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-4 border-t border-slate-700 pt-5 first-of-type:border-t-0 first-of-type:pt-0">
    <h3 className="text-sm font-semibold text-slate-300 mb-3">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const InputControl: FC<{ label: string; value: string; onChange: (val: string) => void; prefix?: string; note?: string; placeholder?: string }> = ({ label, value, onChange, prefix, note, placeholder }) => (
  <div>
    <label className="text-sm font-medium text-slate-400 block mb-1.5">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{prefix}</span>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full p-2.5 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${prefix ? "pl-9" : "pl-3"}`}
      />
    </div>
    {note && <p className="text-xs text-slate-500 mt-1.5">{note}</p>}
  </div>
);

const CurrencyInput: FC<{ label: string; value: string; onChange: (val: string) => void; note?: string }> = ({ label, value, onChange, note }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value.replace(/[^0-9]/g, ""));
  const displayValue = value ? parseInput(value).toLocaleString("id-ID") : "";
  return <InputControl label={label} value={displayValue} onChange={(val) => handleChange({ target: { value: val } } as React.ChangeEvent<HTMLInputElement>)} prefix="Rp" note={note} />;
};

const NumberInput: FC<{ label: string; value: string; onChange: (val: string) => void }> = ({ label, value, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value.replace(/[^0-9]/g, ""));
  const displayValue = value ? parseInput(value).toLocaleString("id-ID") : "";
  return <InputControl label={label} value={displayValue} onChange={(val) => handleChange({ target: { value: val } } as React.ChangeEvent<HTMLInputElement>)} />;
};

const DashboardStat: FC<{ label: string; value: string; unit?: string; subValue?: string; isPrimary?: boolean }> = ({ label, value, unit, subValue, isPrimary }) => (
  <div className={`p-5 rounded-xl text-center h-full flex flex-col justify-center ${isPrimary ? "bg-teal-500/10 border border-teal-500/20" : "bg-slate-800/50 border border-slate-700/50"}`}>
    <p className="text-sm text-slate-400">{label}</p>
    <p className={`text-3xl font-bold mt-1 ${isPrimary ? "text-teal-300" : "text-white"}`}>
      {value} {unit && <span className="text-xl font-medium text-slate-400">{unit}</span>}
    </p>
    {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
  </div>
);

const ProfitLossCard: FC<{ value: number; percentage: number }> = ({ value, percentage }) => {
  const isProfit = value > 0;
  const isLoss = value < 0;
  const colorClass = isProfit ? "text-green-400" : isLoss ? "text-red-400" : "text-slate-300";
  const bgClass = isProfit ? "bg-green-500/10 border-green-400/30" : isLoss ? "bg-red-500/10 border-red-400/30" : "bg-slate-800/50 border-slate-700/50";
  const icon = isProfit ? <FaArrowUp /> : isLoss ? <FaArrowDown /> : <FaEquals />;

  return (
    <div className={`p-6 rounded-2xl border h-full flex flex-col justify-between ${bgClass}`}>
      <div>
        <p className="text-sm text-slate-400">Potensi Capital Gain/Loss</p>
        <div className={`text-3xl font-extrabold flex items-center gap-3 mt-2 ${colorClass}`}>
          {icon} <span>{formatCurrency(value)}</span>
        </div>
      </div>
      <p className={`text-lg font-semibold text-right ${colorClass}`}>{!isNaN(percentage) ? percentage.toFixed(2) : "0.00"}%</p>
    </div>
  );
};

const ExplanationCard: FC<{ message: string }> = ({ message }) => (
  <div className="bg-cyan-900/20 p-5 rounded-2xl border border-cyan-500/30 h-full">
    <div className="flex items-start gap-4">
      <div className="text-cyan-400 text-2xl mt-1 shrink-0">
        <FaLightbulb />
      </div>
      <div>
        <h3 className="font-semibold text-cyan-300">Analisis Alokasi</h3>
        <p className="text-sm text-slate-400 mt-1 whitespace-pre-line">{message}</p>
      </div>
    </div>
  </div>
);

const RulesModal: FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-800 p-6 rounded-2xl max-w-4xl w-full border border-slate-700 shadow-2xl shadow-cyan-500/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-cyan-400">Aturan Penjatahan Terpusat (Bursa)</h2>
            <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
              <FaTimes />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left table-auto">
              <thead className="bg-slate-700">
                <tr>
                  <th rowSpan={2} className="p-3">
                    Golongan
                  </th>
                  <th rowSpan={2} className="p-3">
                    Nilai Emisi
                  </th>
                  <th colSpan={3} className="p-3 text-center border-l border-slate-600">
                    Alokasi Pooling Berdasarkan Oversubscription
                  </th>
                </tr>
                <tr className="bg-slate-600/50">
                  <th className="p-3 text-center border-l border-slate-600">Pemesanan &lt; 10x</th>
                  <th className="p-3 text-center border-l border-slate-600">10x - 25x</th>
                  <th className="p-3 text-center border-l border-slate-600">&gt;25x</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-700">
                  <td className="p-3 font-semibold">I</td>
                  <td className="p-3">&lt; Rp 250 Miliar</td>
                  <td className="p-3 text-center border-l border-slate-700">17,50%</td>
                  <td className="p-3 text-center border-l border-slate-700">20%</td>
                  <td className="p-3 text-center border-l border-slate-700">25%</td>
                </tr>
                <tr className="border-b border-slate-700">
                  <td className="p-3 font-semibold">II</td>
                  <td className="p-3">Rp 250 - 500 Miliar</td>
                  <td className="p-3 text-center border-l border-slate-700">12,50%</td>
                  <td className="p-3 text-center border-l border-slate-700">15%</td>
                  <td className="p-3 text-center border-l border-slate-700">20%</td>
                </tr>
                <tr className="border-b border-slate-700">
                  <td className="p-3 font-semibold">III</td>
                  <td className="p-3">Rp 500 Miliar - 1 Triliun</td>
                  <td className="p-3 text-center border-l border-slate-700">10%</td>
                  <td className="p-3 text-center border-l border-slate-700">12,50%</td>
                  <td className="p-3 text-center border-l border-slate-700">17,50%</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">IV</td>
                  <td className="p-3">&gt; Rp 1 Triliun</td>
                  <td className="p-3 text-center border-l border-slate-700">5%</td>
                  <td className="p-3 text-center border-l border-slate-700">7,50%</td>
                  <td className="p-3 text-center border-l border-slate-700">12,50%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const TutorialModal: FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-800 p-6 rounded-2xl max-w-4xl w-full border border-slate-700 shadow-2xl shadow-cyan-500/10 text-slate-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-cyan-400">Panduan Penggunaan & Contoh</h2>
            <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
              <FaTimes />
            </button>
          </div>
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
            <div>
              <h3 className="font-semibold text-lg text-cyan-300 mb-2">Cara Mengisi Kalkulator</h3>
              <p className="text-sm">Untuk mendapatkan hasil simulasi, Anda perlu mengisi beberapa data yang bisa ditemukan di prospektus IPO atau berita sekuritas.</p>
              <ul className="list-disc list-inside space-y-2 mt-3 text-sm">
                <li>
                  <b>Harga Penawaran:</b> Harga final per lembar saham yang ditetapkan oleh emiten.
                </li>
                <li>
                  <b>Total Saham Ditawarkan:</b> Jumlah total saham yang ditawarkan kepada publik.
                </li>
                <li>
                  <b>Estimasi Total Dana Pesanan Retail:</b> Perkiraan total dana yang masuk dari seluruh investor retail (pesanan di bawah Rp 100 juta). Angka ini seringkali merupakan estimasi.
                </li>
                <li>
                  <b>Dana yang Anda Siapkan:</b> Jumlah uang yang Anda rencanakan untuk membeli saham IPO ini. Kalkulator akan otomatis mendeteksi Anda sebagai investor <b>Retail</b> (&lt; 100 Juta) atau{" "}
                  <b>Non-Retail</b>.
                </li>
              </ul>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h3 className="font-semibold text-lg text-cyan-300 mb-2">Contoh Simulasi: Saham AADI</h3>
              <p className="text-sm mb-4">Mari kita simulasikan dengan data berikut, sesuai contoh yang Anda berikan:</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-900/50 p-4 rounded-lg">
                <div>
                  <span className="font-semibold text-slate-400">Harga per Lembar:</span>
                  <br />
                  <span className="text-cyan-400 font-mono">Rp 5.550</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400">Total Saham IPO:</span>
                  <br />
                  <span className="text-cyan-400 font-mono">778.378.378</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400">Total Dana Retail:</span>
                  <br />
                  <span className="text-cyan-400 font-mono">Rp 3.000.000.000.000</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400">Dana Anda:</span>
                  <br />
                  <span className="text-cyan-400 font-mono">Rp 10.000.000</span>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-semibold text-md text-slate-200 mb-2">Hasil Perhitungan Otomatis:</h4>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-700">
                    <tr className="bg-slate-800/40">
                      <td className="p-2">Nilai Emisi</td>
                      <td className="p-2 font-mono text-right">~Rp 4,32 Triliun (Masuk Golongan IV)</td>
                    </tr>
                    <tr>
                      <td className="p-2">Tingkat Oversubscription</td>
                      <td className="p-2 font-mono text-right">~154,28x (Sangat Tinggi)</td>
                    </tr>
                    <tr className="bg-slate-800/40">
                      <td className="p-2">Alokasi Pooling Ditetapkan</td>
                      <td className="p-2 font-mono text-right">12,5% (Sesuai aturan &gt;25x)</td>
                    </tr>
                    <tr>
                      <td className="p-2">Total Saham di Jatah Pooling</td>
                      <td className="p-2 font-mono text-right">~97.297.297 Lembar</td>
                    </tr>
                    <tr className="bg-green-500/10">
                      <td className="p-2 font-bold text-green-300">Estimasi Jatah Anda</td>
                      <td className="p-2 font-mono text-right font-bold text-green-300">~324 Lembar (3 Lot)</td>
                    </tr>
                    <tr className="bg-slate-800/40">
                      <td className="p-2">Dana Terpakai</td>
                      <td className="p-2 font-mono text-right">Rp 1.798.200</td>
                    </tr>
                    <tr>
                      <td className="p-2">Dana Refund</td>
                      <td className="p-2 font-mono text-right">Rp 8.201.800</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-slate-500 mt-2">*Perhitungan di atas menggunakan proporsi permintaan Anda terhadap seluruh saham pooling yang tersedia.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
