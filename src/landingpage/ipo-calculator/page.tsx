"use client";

import React, { useState, useMemo, FC, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- ICONS (Replaced react-icons with inline SVGs to fix dependency error) ---
const IconInfoCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);
const IconBook = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
  </svg>
);
const IconTimes = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const IconArrowUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
);
const IconArrowDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </svg>
);
const IconEquals = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="9" x2="19" y2="9"></line>
    <line x1="5" y1="15" x2="19" y2="15"></line>
  </svg>
);
const IconLightbulb = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6"></path>
    <path d="M10 22h4"></path>
    <path d="M12 2a7 7 0 0 0-7 7c0 3.03 1.15 4.9 2.5 6.5A3 3 0 0 0 8 18h8a3 3 0 0 0 .5-2.5c1.35-1.6 2.5-3.47 2.5-6.5a7 7 0 0 0-7-7z"></path>
  </svg>
);

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
  const [estimatedRetailParticipants, setEstimatedRetailParticipants] = useState<string>(""); // New state for 'pukul rata'

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
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
    const pEstimatedRetailParticipants = parseInput(estimatedRetailParticipants);

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

    // Split the pooling shares between retail and non-retail (1/3 vs 2/3 is a common simplification)
    const retailPoolShares = totalPoolingShares / 3;
    const nonRetailPoolShares = totalPoolingShares * (2 / 3);

    let allottedShares = 0;
    let analysisMessage = "";

    // Proportional calculation is based on your investment vs total demand.
    const myProportion = pTotalRetailDemand > 0 ? pMyInvestment / pTotalRetailDemand : 0;

    if (investorType === "Retail" && pEstimatedRetailParticipants > 0) {
      // --- NEW "Pukul Rata" (Fixed Allotment) Logic for Retail Investors ---
      allottedShares = retailPoolShares / pEstimatedRetailParticipants;
      analysisMessage = `
Berdasarkan nilai emisi ~${formatCurrency(issuanceValue)}, IPO ini masuk **Golongan ${emissionClass}**.
Dengan tingkat oversubscription **${formatNumber(oversubscriptionRate, 2)}x**, alokasi pooling ditetapkan **${poolingAllocationPercent}%**.
Porsi saham untuk investor Retail diperkirakan **${formatNumber(retailPoolShares)} lembar**.
Dengan asumsi ada **${formatNumber(pEstimatedRetailParticipants)} partisipan retail**, maka penjatahan di-pukul rata menjadi **sekitar ${formatNumber(allottedShares, 0)} lembar per partisipan**.
      `;
    } else {
      // --- Proportional Allotment Logic (Original Method) ---
      let poolForMyType = 0;
      if (investorType === "Retail") {
        allottedShares = myProportion * retailPoolShares;
        poolForMyType = retailPoolShares;
      } else if (investorType === "Non-Retail") {
        // Non-retail proportion should ideally be based on non-retail demand, but using total retail demand as a proxy.
        allottedShares = myProportion * nonRetailPoolShares;
        poolForMyType = nonRetailPoolShares;
      }

      analysisMessage = `
Berdasarkan nilai emisi ~${formatCurrency(issuanceValue)}, IPO ini masuk **Golongan ${emissionClass}**.
Dengan tingkat oversubscription **${formatNumber(oversubscriptionRate, 2)}x**, alokasi pooling ditetapkan **${poolingAllocationPercent}%**.
Porsi saham untuk investor ${investorType} diperkirakan **${formatNumber(poolForMyType)} lembar**.
Dana pesanan Anda (${formatCurrency(pMyInvestment)}) merupakan **${(myProportion * 100).toFixed(4)}%** dari total permintaan, sehingga Anda berhak atas estimasi alokasi proporsional ini.
      `;
    }

    // Final adjustments: round down to the nearest lot (100 shares) and ensure not more than ordered.
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

    const result = { allottedShares, allottedLots: allottedShares / 100, totalCost, refundAmount, allotmentRate, capitalGain, capitalGainPercentage, analysisMessage, oversubscriptionRate };
    return { calculationResult: result, investorType };
  }, [myInvestment, ipoPrice, totalIpoShares, totalRetailDemand, listingPrice, estimatedRetailParticipants]);

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
    <main className="min-h-screen bg-black text-zinc-200 p-4 md:p-8 font-sans">
      <div className="text-center mb-4">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Kalkulator Penjatahan IPO</h1>
        <p className="text-zinc-400 mt-2">Estimasi alokasi saham IPO Anda berdasarkan aturan bursa yang berlaku.</p>
      </div>
      <div className="text-center mb-10">
        <button
          onClick={() => setIsTutorialModalOpen(true)}
          className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition bg-zinc-900/60 px-4 py-2 rounded-lg border border-zinc-700"
        >
          <IconBook /> Cara Penggunaan & Contoh
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Parameter Simulasi</h2>
            <button onClick={() => setIsRulesModalOpen(true)} className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white transition">
              <IconInfoCircle /> Info Aturan Bursa
            </button>
          </div>
          <ControlGroup title="Data IPO">
            <InputControl label="Nama Saham / Emiten" value={stockName} onChange={setStockName} placeholder="Contoh: AADI" />
            <CurrencyInput label="Harga Penawaran per Lembar" value={ipoPrice} onChange={setIpoPrice} />
            <NumberInput label="Total Saham Ditawarkan (Publik)" value={totalIpoShares} onChange={setTotalIpoShares} />
            <CurrencyInput label="Estimasi Total Dana Pesanan Retail" value={totalRetailDemand} onChange={setTotalRetailDemand} note="Total permintaan dari investor < Rp 100 Juta" />
            <NumberInput label="Estimasi Jumlah Partisipan Retail" value={estimatedRetailParticipants} onChange={setEstimatedRetailParticipants} note="Isi untuk simulasi 'pukul rata' (opsional)" />
          </ControlGroup>
          <ControlGroup title="Pesanan & Proyeksi Anda">
            <CurrencyInput label="Dana yang Anda Siapkan" value={myInvestment} onChange={setMyInvestment} />
            {investorType && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-center p-2 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                Kategori Anda: <span className="font-bold text-white">{investorType === "Retail" ? "Investor Retail" : "Investor Non-Retail"}</span>
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
                <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 min-h-[300px]">
                  <h3 className="text-lg font-bold text-white mb-4 text-center">Visualisasi Pesanan vs. Alokasi Dana</h3>
                  <div className="h-64 relative">
                    <canvas id="ipoAllotmentChart"></canvas>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-full bg-zinc-900/60 p-10 rounded-2xl border border-zinc-700 border-dashed">
                <p className="text-center text-zinc-500">Isi data di sebelah kiri untuk melihat hasil simulasi.</p>
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
  <div className="space-y-4 border-t border-zinc-700 pt-5 first-of-type:border-t-0 first-of-type:pt-0">
    <h3 className="text-sm font-semibold text-zinc-300 mb-3">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const InputControl: FC<{ label: string; value: string; onChange: (val: string) => void; prefix?: string; note?: string; placeholder?: string }> = ({ label, value, onChange, prefix, note, placeholder }) => (
  <div>
    <label className="text-sm font-medium text-zinc-400 block mb-1.5">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">{prefix}</span>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full p-2.5 rounded-lg bg-zinc-800 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white ${prefix ? "pl-9" : "pl-3"}`}
      />
    </div>
    {note && <p className="text-xs text-zinc-500 mt-1.5">{note}</p>}
  </div>
);

const CurrencyInput: FC<{ label: string; value: string; onChange: (val: string) => void; note?: string }> = ({ label, value, onChange, note }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value.replace(/[^0-9]/g, ""));
  const displayValue = value ? parseInput(value).toLocaleString("id-ID") : "";
  return <InputControl label={label} value={displayValue} onChange={(val) => handleChange({ target: { value: val } } as React.ChangeEvent<HTMLInputElement>)} prefix="Rp" note={note} />;
};

const NumberInput: FC<{ label: string; value: string; onChange: (val: string) => void; note?: string }> = ({ label, value, onChange, note }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value.replace(/[^0-9]/g, ""));
  const displayValue = value ? parseInput(value).toLocaleString("id-ID") : "";
  return <InputControl label={label} value={displayValue} onChange={(val) => handleChange({ target: { value: val } } as React.ChangeEvent<HTMLInputElement>)} note={note} />;
};

const DashboardStat: FC<{ label: string; value: string; unit?: string; subValue?: string; isPrimary?: boolean }> = ({ label, value, unit, subValue, isPrimary }) => (
  <div className={`p-5 rounded-xl text-center h-full flex flex-col justify-center ${isPrimary ? "bg-teal-500/10 border border-teal-500/20" : "bg-zinc-900/50 border border-zinc-700/50"}`}>
    <p className="text-sm text-zinc-400">{label}</p>
    <p className={`text-3xl font-bold mt-1 ${isPrimary ? "text-white" : "text-white"}`}>
      {value} {unit && <span className="text-xl font-medium text-zinc-400">{unit}</span>}
    </p>
    {subValue && <p className="text-xs text-zinc-500 mt-1">{subValue}</p>}
  </div>
);

const ProfitLossCard: FC<{ value: number; percentage: number }> = ({ value, percentage }) => {
  const isProfit = value > 0;
  const isLoss = value < 0;
  const colorClass = isProfit ? "text-green-400" : isLoss ? "text-red-400" : "text-zinc-300";
  const bgClass = isProfit ? "bg-green-500/10 border-green-400/30" : isLoss ? "bg-red-500/10 border-red-400/30" : "bg-zinc-900/50 border-zinc-700/50";
  const icon = isProfit ? <IconArrowUp /> : isLoss ? <IconArrowDown /> : <IconEquals />;

  return (
    <div className={`p-6 rounded-2xl border h-full flex flex-col justify-between ${bgClass}`}>
      <div>
        <p className="text-sm text-zinc-400">Potensi Capital Gain/Loss</p>
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
      <div className="text-zinc-300 text-2xl mt-1 shrink-0">
        <IconLightbulb />
      </div>
      <div>
        <h3 className="font-semibold text-white">Analisis Alokasi</h3>
        <p className="text-sm text-zinc-400 mt-1 whitespace-pre-line">{message}</p>
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
          className="bg-zinc-900 p-6 rounded-2xl max-w-4xl w-full border border-zinc-700 shadow-2xl shadow-cyan-500/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-700">
            <h2 className="text-xl font-bold text-zinc-300">Aturan Penjatahan Terpusat (Bursa)</h2>
            <button onClick={onClose} className="p-2 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
              <IconTimes />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left table-auto">
              <thead className="bg-zinc-800">
                <tr>
                  <th rowSpan={2} className="p-3">
                    Golongan
                  </th>
                  <th rowSpan={2} className="p-3">
                    Nilai Emisi
                  </th>
                  <th colSpan={3} className="p-3 text-center border-l border-zinc-600">
                    Alokasi Pooling Berdasarkan Oversubscription
                  </th>
                </tr>
                <tr className="bg-slate-600/50">
                  <th className="p-3 text-center border-l border-zinc-600">Pemesanan &lt; 10x</th>
                  <th className="p-3 text-center border-l border-zinc-600">10x - 25x</th>
                  <th className="p-3 text-center border-l border-zinc-600">&gt;25x</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                <tr className="border-b border-zinc-700">
                  <td className="p-3 font-semibold">I</td>
                  <td className="p-3">&lt; Rp 250 Miliar</td>
                  <td className="p-3 text-center border-l border-zinc-700">17,50%</td>
                  <td className="p-3 text-center border-l border-zinc-700">20%</td>
                  <td className="p-3 text-center border-l border-zinc-700">25%</td>
                </tr>
                <tr className="border-b border-zinc-700">
                  <td className="p-3 font-semibold">II</td>
                  <td className="p-3">Rp 250 - 500 Miliar</td>
                  <td className="p-3 text-center border-l border-zinc-700">12,50%</td>
                  <td className="p-3 text-center border-l border-zinc-700">15%</td>
                  <td className="p-3 text-center border-l border-zinc-700">20%</td>
                </tr>
                <tr className="border-b border-zinc-700">
                  <td className="p-3 font-semibold">III</td>
                  <td className="p-3">Rp 500 Miliar - 1 Triliun</td>
                  <td className="p-3 text-center border-l border-zinc-700">10%</td>
                  <td className="p-3 text-center border-l border-zinc-700">12,50%</td>
                  <td className="p-3 text-center border-l border-zinc-700">17,50%</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">IV</td>
                  <td className="p-3">&gt; Rp 1 Triliun</td>
                  <td className="p-3 text-center border-l border-zinc-700">5%</td>
                  <td className="p-3 text-center border-l border-zinc-700">7,50%</td>
                  <td className="p-3 text-center border-l border-zinc-700">12,50%</td>
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
          className="bg-zinc-900 p-6 rounded-2xl max-w-4xl w-full border border-zinc-700 shadow-2xl shadow-cyan-500/10 text-zinc-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-700">
            <h2 className="text-xl font-bold text-zinc-300">Panduan Penggunaan & Contoh</h2>
            <button onClick={onClose} className="p-2 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
              <IconTimes />
            </button>
          </div>
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
            <div>
              <h3 className="font-semibold text-lg text-white mb-2">Cara Mengisi Kalkulator</h3>
              <p className="text-sm">Untuk mendapatkan hasil simulasi, Anda perlu mengisi beberapa data yang bisa ditemukan di prospektus IPO atau berita sekuritas.</p>
              <ul className="list-disc list-inside space-y-2 mt-3 text-sm">
                <li>
                  <b>Data IPO:</b> Isi harga, total saham, dan total dana permintaan retail dari prospektus.
                </li>
                <li>
                  <b>Estimasi Jumlah Partisipan Retail (Opsional):</b> Jika Anda ingin mensimulasikan penjatahan "pukul rata" (fixed allotment), masukkan perkiraan jumlah investor retail yang ikut serta. Jika
                  dikosongkan, perhitungan akan bersifat proporsional berdasarkan besar pesanan Anda.
                </li>
                <li>
                  <b>Dana yang Anda Siapkan:</b> Jumlah uang yang Anda rencanakan untuk membeli saham IPO ini.
                </li>
              </ul>
            </div>

            <div className="border-t border-zinc-700 pt-4">
              <h3 className="font-semibold text-lg text-white mb-2">Contoh Simulasi: Saham AADI</h3>
              <p className="text-sm mb-4">Mari kita simulasikan dengan data berikut, sesuai contoh yang Anda berikan:</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-black/50 p-4 rounded-lg">
                <div>
                  <span className="font-semibold text-zinc-400">Harga per Lembar:</span>
                  <br />
                  <span className="text-zinc-300 font-mono">Rp 5.550</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-400">Total Saham IPO:</span>
                  <br />
                  <span className="text-zinc-300 font-mono">778.378.378</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-400">Total Dana Retail:</span>
                  <br />
                  <span className="text-zinc-300 font-mono">Rp 3.000.000.000.000</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-400">Dana Anda:</span>
                  <br />
                  <span className="text-zinc-300 font-mono">Rp 10.000.000</span>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-semibold text-md text-zinc-200 mb-2">Hasil Perhitungan (Proporsional):</h4>
                <p className="text-xs text-zinc-400 mb-2">Jika kolom partisipan dikosongkan, hasil dihitung berdasarkan porsi dana Anda.</p>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-700">
                    <tr className="bg-green-500/10">
                      <td className="p-2 font-bold text-green-300">Estimasi Jatah Anda</td>
                      <td className="p-2 font-mono text-right font-bold text-green-300">~324 Lembar (3 Lot)</td>
                    </tr>
                    <tr>
                      <td className="p-2">Dana Terpakai</td>
                      <td className="p-2 font-mono text-right">Rp 1.798.200</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <h4 className="font-semibold text-md text-zinc-200 mb-2">Hasil Perhitungan ('Pukul Rata'):</h4>
                <p className="text-xs text-zinc-400 mb-2">
                  Jika Anda mengisi <span className="text-zinc-300 font-mono">100.000</span> pada kolom jumlah partisipan retail:
                </p>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-700">
                    <tr className="bg-green-500/10">
                      <td className="p-2 font-bold text-green-300">Estimasi Jatah Anda</td>
                      <td className="p-2 font-mono text-right font-bold text-green-300">~324 Lembar (3 Lot)</td>
                    </tr>
                    <tr>
                      <td className="p-2">Dana Terpakai</td>
                      <td className="p-2 font-mono text-right">Rp 1.798.200</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-zinc-500 mt-2">*Hasil di atas bisa sama atau berbeda tergantung jumlah partisipan yang Anda masukkan. Setiap partisipan dianggap mendapat jatah yang sama.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
