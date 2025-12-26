"use client";

import React, { useState, useMemo, FC, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- DYNAMICALLY LOADED LIBRARIES ---
// Chart.js dan plugin anotasi dimuat secara dinamis melalui useEffect.

// --- SVG ICONS ---
const FaPlus = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path>
  </svg>
);
const FaTrash = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16zM53.2 467a48 48 0 0 0 47.9 45h245.8a48 48 0 0 0 47.9-45L416 128H32z"></path>
  </svg>
);
const FaArrowUp = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M34.9 289.5l-22.2-22.2c-9.4-9.4-9.4-24.6 0-33.9L207 39c9.4-9.4 24.6-9.4 33.9 0l194.3 194.3c9.4 9.4 9.4 24.6 0 33.9L413 289.4c-9.5 9.5-25 9.3-34.3-.4L264 168.6V456c0 13.3-10.7 24-24 24h-32c-13.3 0-24-10.7-24-24V168.6L69.2 289.1c-9.3 9.8-24.8 10-34.3.4z"></path>
  </svg>
);
const FaArrowDown = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M413.1 222.5l22.2 22.2c9.4 9.4 9.4 24.6 0 33.9L241 473c-9.4 9.4-24.6 9.4-33.9 0L12.7 278.6c-9.4-9.4-9.4-24.6 0-33.9l22.2-22.2c9.5-9.5 25-9.3 34.3.4L184 343.4V56c0-13.3 10.7-24 24-24h32c13.3 0 24 10.7 24 24v287.4l114.8-120.5c9.3-9.8 24.8-10 34.3-.4z"></path>
  </svg>
);
const FaEquals = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M416 304H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h384c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32zm0-128H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h384c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path>
  </svg>
);

// --- TYPES ---
type AssetType = "stock" | "crypto";
type Entry = { id: number; cost: number; quantity: number };

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;
const formatNumber = (value: number, decimals: number = 2) => value.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: decimals });
const parseInput = (input: string) => Number(String(input).replace(/[^0-9]/g, "")) || 0;
const parseFloatInput = (input: string) => {
  const cleaned = String(input)
    .replace(/[^0-9,]/g, "")
    .replace(",", ".");
  return parseFloat(cleaned) || 0;
};
const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

// --- MAIN COMPONENT ---
export default function AverageCalculatorPro() {
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [entries, setEntries] = useState<Entry[]>([]);

  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");

  const [buyFee, setBuyFee] = useState("0.15");
  const [sellFee, setSellFee] = useState("0.25");
  const [currentPrice, setCurrentPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  const chartRef = useRef<any>(null);

  useEffect(() => {
    setEntries([]);
    setInput1("");
    setInput2("");
    setCurrentPrice("");
  }, [assetType]);

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

  const summary = useMemo(() => {
    if (entries.length === 0) {
      return { averagePrice: 0, totalQuantity: 0, totalCost: 0, profitLoss: { amount: 0, percentage: 0, status: "breakeven" } };
    }

    const rawTotalCost = entries.reduce((sum, entry) => sum + entry.cost, 0);
    const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const pBuyFee = parseFloatInput(buyFee);
    const pSellFee = parseFloatInput(sellFee);
    const totalCostWithFee = rawTotalCost * (1 + pBuyFee / 100);
    const averagePrice = totalQuantity > 0 ? totalCostWithFee / totalQuantity : 0;

    const pCurrentPrice = parseInput(currentPrice);
    let profitLoss = { amount: 0, percentage: 0, status: "breakeven" };
    if (pCurrentPrice > 0) {
      const marketValue = pCurrentPrice * totalQuantity;
      const netMarketValue = marketValue * (1 - pSellFee / 100);
      const amount = netMarketValue - totalCostWithFee;
      const percentage = totalCostWithFee > 0 ? (amount / totalCostWithFee) * 100 : 0;
      const status = amount > 0 ? "profit" : amount < 0 ? "loss" : "breakeven";
      profitLoss = { amount, percentage, status };
    }

    return { averagePrice, totalQuantity, totalCost: totalCostWithFee, profitLoss };
  }, [entries, buyFee, sellFee, currentPrice]);

  const handleAddEntry = () => {
    let cost = 0,
      quantity = 0;

    if (assetType === "stock") {
      const price = parseInput(input1);
      const lots = parseInput(input2);
      if (price <= 0 || lots <= 0) {
        setError("Harga dan jumlah lot harus lebih dari nol.");
        return;
      }
      quantity = lots * 100;
      cost = price * quantity;
    } else {
      cost = parseInput(input1);
      quantity = parseFloatInput(input2); // Use parseFloat for crypto quantity
      if (cost <= 0 || quantity <= 0) {
        setError("Total biaya dan jumlah kripto harus lebih dari nol.");
        return;
      }
    }

    setError(null);
    setEntries([...entries, { id: Date.now(), cost, quantity }]);
    setInput1("");
    setInput2("");
  };

  const handleRemoveEntry = (id: number) => setEntries(entries.filter((e) => e.id !== id));

  useEffect(() => {
    const canvas = document.getElementById("purchaseChart") as HTMLCanvasElement;
    if (!canvas || !(window as any).Chart) return;

    if (chartRef.current) chartRef.current.destroy();

    if (entries.length > 0 && (window as any).Chart.register) {
      const { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Annotation } = (window as any).Chart;
      Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Annotation || {});

      const sortedEntries = [...entries].sort((a, b) => a.cost / a.quantity - b.cost / b.quantity);
      const pCurrentPrice = parseInput(currentPrice);

      chartRef.current = new Chart(canvas, {
        type: "bar",
        data: {
          labels: sortedEntries.map((e) => formatCurrency(e.cost / e.quantity)),
          datasets: [
            {
              label: `Jumlah Aset (${assetType === "stock" ? "Lembar" : "Koin"})`,
              data: sortedEntries.map((e) => e.quantity),
              backgroundColor: "rgba(45, 212, 191, 0.6)",
              borderColor: "rgba(45, 212, 191, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c: any) => `Jumlah: ${formatNumber(c.raw as number, assetType === "crypto" ? 8 : 0)}` } },
            annotation: {
              annotations: {
                avgLine: {
                  type: "line",
                  yMin: summary.averagePrice,
                  yMax: summary.averagePrice,
                  borderColor: "#f472b6",
                  borderWidth: 2,
                  borderDash: [6, 6],
                  label: { content: `AVG: ${formatCurrency(summary.averagePrice)}`, enabled: true, position: "start", backgroundColor: "rgba(244, 114, 182, 0.1)", color: "#f9a8d4", font: { weight: "bold" } },
                },
                currentPriceLine: {
                  type: "line",
                  yMin: pCurrentPrice,
                  yMax: pCurrentPrice,
                  borderColor: "#facc15",
                  borderWidth: 2,
                  display: pCurrentPrice > 0,
                  label: { content: `SAAT INI: ${formatCurrency(pCurrentPrice)}`, enabled: true, position: "end", backgroundColor: "rgba(250, 204, 21, 0.1)", color: "#fde047", font: { weight: "bold" } },
                },
              },
            },
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: "Harga per Aset (Rp)" } },
            x: { title: { display: true, text: "Posisi Pembelian" } },
          },
        },
      });
    }
  }, [entries, summary.averagePrice, currentPrice, assetType]);

  return (
    <main className="min-h-screen bg-black text-zinc-200 p-4 md:p-8 font-sans">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); body { font-family: 'Inter', sans-serif; }`}</style>
      <div className="text-center mb-10">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
          Kalkulator Averaging Pro
        </motion.h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 space-y-6">
          <div className="flex bg-zinc-800 p-1 rounded-lg">
            <TabButton assetType="stock" current={assetType} setAssetType={setAssetType}>
              Saham
            </TabButton>
            <TabButton assetType="crypto" current={assetType} setAssetType={setAssetType}>
              Kripto
            </TabButton>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={assetType} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {assetType === "stock" ? (
                <StockInputForm price={input1} setPrice={setInput1} lots={input2} setLots={setInput2} />
              ) : (
                <CryptoInputForm cost={input1} setCost={setInput1} quantity={input2} setQuantity={setInput2} />
              )}
            </motion.div>
          </AnimatePresence>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <motion.button
            onClick={handleAddEntry}
            whileHover={{ scale: 1.05 }}
            className="w-full bg-gradient-to-r from-white to-zinc-300 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <FaPlus /> Tambah Posisi
          </motion.button>

          <div className="border-t border-zinc-700 pt-4">
            <h3 className="font-semibold text-zinc-300 mb-3">Pengaturan Biaya Transaksi</h3>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="Fee Beli (%)" value={buyFee} onChange={setBuyFee} />
              <NumberInput label="Fee Jual (%)" value={sellFee} onChange={setSellFee} />
            </div>
          </div>

          <div className="border-t border-zinc-700 pt-4">
            <h3 className="font-semibold text-zinc-300 mb-2">Daftar Pembelian</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              <AnimatePresence>
                {entries.map((entry) => (
                  <EntryItem key={entry.id} entry={entry} onRemove={handleRemoveEntry} assetType={assetType} />
                ))}
              </AnimatePresence>
              {entries.length === 0 && <p className="text-center text-sm text-zinc-500 py-4">Belum ada data pembelian.</p>}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfitLossCard summary={summary} />
            <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 space-y-4">
              <h2 className="text-lg font-bold text-white">Posisi Rata-Rata</h2>
              <DashboardStat label="Harga Rata-rata" value={formatCurrency(summary.averagePrice)} />
              <DashboardStat label="Total Modal" value={formatCurrency(summary.totalCost)} note="(termasuk fee beli)" />
              <DashboardStat label={`Total Aset (${assetType === "stock" ? "Lembar" : "Koin"})`} value={formatNumber(summary.totalQuantity, 8)} />
            </div>
          </div>
          <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700">
            <h3 className="text-lg font-bold text-white mb-4">Harga Jual / Saat Ini</h3>
            <CurrencyInput label="Harga Jual / Saat Ini" value={currentPrice} onChange={setCurrentPrice} prefix="Rp" />
          </div>
          <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 min-h-[400px]">
            <h3 className="text-lg font-bold text-white mb-4">Grafik Posisi Pembelian</h3>
            <div className="h-96">
              <canvas id="purchaseChart"></canvas>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

// --- SUB-COMPONENTS ---
const TabButton: FC<{ assetType: AssetType; current: AssetType; setAssetType: Function; children: React.ReactNode }> = ({ assetType, current, setAssetType, children }) => (
  <button onClick={() => setAssetType(assetType)} className={`w-1/2 p-2 rounded-md text-sm font-semibold transition relative`}>
    {current === assetType && <motion.div layoutId="tab-indicator" className="absolute inset-0 bg-cyan-500 rounded-md z-0" />}
    <span className="relative z-10">{children}</span>
  </button>
);
const StockInputForm: FC<{ price: string; setPrice: (val: string) => void; lots: string; setLots: (val: string) => void }> = ({ price, setPrice, lots, setLots }) => (
  <div className="space-y-4">
    <CurrencyInput label="Harga per Lembar" value={price} onChange={setPrice} prefix="Rp" />
    <NumberInput label="Jumlah Lot" value={lots} onChange={setLots} note="1 lot = 100 lembar" />
  </div>
);
const CryptoInputForm: FC<{ cost: string; setCost: (val: string) => void; quantity: string; setQuantity: (val: string) => void }> = ({ cost, setCost, quantity, setQuantity }) => (
  <div className="space-y-4">
    <CurrencyInput label="Total Biaya Beli" value={cost} onChange={setCost} prefix="Rp" />
    <NumberInput label="Jumlah Koin Diterima" value={quantity} onChange={setQuantity} />
  </div>
);
const CurrencyInput: FC<{ label: string; value: string; onChange: (val: string) => void; prefix?: string }> = ({ label, value, onChange, prefix }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericVal = e.target.value.replace(/[^0-9]/g, "");
    onChange(numericVal);
  };
  const displayValue = value ? parseInput(value).toLocaleString("id-ID") : "";
  return <InputControlBase label={label} value={displayValue} onChange={handleChange} prefix={prefix} inputMode="numeric" />;
};
const NumberInput: FC<{ label: string; value: string; onChange: (val: string) => void; note?: string }> = ({ label, value, onChange, note }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^[0-9,.]*$/.test(val)) {
      onChange(val.replace(".", ","));
    }
  };
  return <InputControlBase label={label} value={value} onChange={handleChange} note={note} inputMode="decimal" />;
};
const InputControlBase: FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; prefix?: string; note?: string; inputMode?: "numeric" | "decimal" }> = ({
  label,
  value,
  onChange,
  prefix,
  note,
  inputMode,
}) => (
  <div>
    <label className="text-sm font-medium text-zinc-400">{label}</label>
    <div className="relative mt-1">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">{prefix}</span>}
      <input
        type="text"
        value={value}
        onChange={onChange}
        inputMode={inputMode}
        className={`w-full p-3 rounded-lg bg-zinc-800 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white ${prefix ? "pl-9" : "pl-3"}`}
      />
    </div>
    {note && <p className="text-xs text-zinc-500 mt-1">{note}</p>}
  </div>
);
const EntryItem: FC<{ entry: Entry; onRemove: Function; assetType: AssetType }> = ({ entry, onRemove, assetType }) => {
  const pricePerUnit = entry.cost / entry.quantity;
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="flex justify-between items-center bg-zinc-800/50 p-3 rounded-lg">
      <div>
        <p className="font-semibold">{assetType === "stock" ? formatCurrency(pricePerUnit) : formatCurrency(entry.cost)}</p>
        <p className="text-xs text-zinc-400">{assetType === "stock" ? `${formatNumber(entry.quantity / 100)} lot` : `${formatNumber(entry.quantity, 8)} koin`}</p>
      </div>
      <motion.button onClick={() => onRemove(entry.id)} whileHover={{ scale: 1.1 }} className="p-2 text-zinc-500 hover:text-red-400">
        <FaTrash />
      </motion.button>
    </motion.div>
  );
};
const DashboardStat: FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <div>
    <p className="text-sm text-zinc-400">{label}</p>
    <p className="text-xl font-bold text-white mt-1">{value}</p>
    {note && <p className="text-xs text-zinc-500">{note}</p>}
  </div>
);
const ProfitLossCard: FC<{ summary: any }> = ({ summary }) => {
  const { status, amount, percentage } = summary.profitLoss;
  const colorClass = status === "profit" ? "text-green-400" : status === "loss" ? "text-red-400" : "text-zinc-300";
  const bgColorClass = status === "profit" ? "bg-green-500/10 border-green-400/30" : status === "loss" ? "bg-red-500/10 border-red-400/30" : "bg-slate-500/10 border-zinc-600";
  const icon = status === "profit" ? <FaArrowUp /> : status === "loss" ? <FaArrowDown /> : <FaEquals />;

  return (
    <div className={`p-6 rounded-2xl border ${bgColorClass}`}>
      <p className="text-sm text-zinc-400">Potensi Profit / Loss</p>
      <div className={`text-4xl font-extrabold flex items-center gap-3 mt-2 ${colorClass}`}>
        {icon}
        <span>{formatCurrency(amount)}</span>
      </div>
      <p className={`text-lg font-semibold ${colorClass}`}>{formatPercentage(percentage)}</p>
      <p className="text-xs text-zinc-500 mt-4">*Berdasarkan harga saat ini & sudah dipotong estimasi fee jual.</p>
    </div>
  );
};
