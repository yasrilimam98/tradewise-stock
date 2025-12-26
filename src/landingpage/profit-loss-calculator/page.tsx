"use client";

import React, { useState, useMemo, FC, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaEquals } from "react-icons/fa";

import { FaPlus, FaTrash, FaArrowUp, FaArrowDown } from "react-icons/fa";

// --- TYPES ---
type Entry = { id: number; price: number; quantity: number };

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;
const formatNumber = (value: number) => value.toLocaleString("id-ID");
const parseInput = (input: string) => Number(input.replace(/[^0-9]/g, "")) || 0;

// --- MAIN COMPONENT ---
export default function ProfitLossCalculator() {
  // --- STATE MANAGEMENT ---
  const [entries, setEntries] = useState<Entry[]>([
    { id: 1, price: 1500, quantity: 10 },
    { id: 2, price: 1400, quantity: 20 },
  ]);
  const [currentPrice, setCurrentPrice] = useState<string>("1600");
  const [newPrice, setNewPrice] = useState<string>("");
  const [newQuantity, setNewQuantity] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const chartRef = useRef<any>(null);

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
    loadScript("https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js", "chartjs-annotation-script");
  }, []);

  // --- MEMOIZED CALCULATIONS ---
  const purchaseSummary = useMemo(() => {
    if (entries.length === 0) return { averagePrice: 0, totalQuantity: 0, totalCost: 0 };
    const totalCost = entries.reduce((sum, entry) => sum + entry.price * entry.quantity, 0);
    const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const averagePrice = totalCost / totalQuantity;
    return { averagePrice, totalQuantity, totalCost };
  }, [entries]);

  const profitLossSummary = useMemo(() => {
    if (entries.length === 0 || parseInput(currentPrice) <= 0) {
      return { status: "pending", amount: 0, percentage: 0 };
    }
    const { totalCost, totalQuantity } = purchaseSummary;
    const marketValue = parseInput(currentPrice) * totalQuantity;
    const amount = marketValue - totalCost;
    const percentage = (amount / totalCost) * 100;
    const status = amount > 0 ? "profit" : amount < 0 ? "loss" : "breakeven";
    return { status, amount, percentage };
  }, [entries, currentPrice, purchaseSummary]);

  // --- EVENT HANDLERS ---
  const handleAddEntry = () => {
    const price = parseInput(newPrice);
    const quantity = parseInput(newQuantity);
    if (price <= 0 || quantity <= 0) {
      setError("Harga dan jumlah harus lebih dari nol.");
      return;
    }
    setError(null);
    setEntries([...entries, { id: Date.now(), price, quantity }]);
    setNewPrice("");
    setNewQuantity("");
  };

  const handleRemoveEntry = (id: number) => setEntries(entries.filter((entry) => entry.id !== id));

  // --- CHART LOGIC ---
  useEffect(() => {
    const canvas = document.getElementById("purchaseChart") as HTMLCanvasElement;
    if (!canvas || !(window as any).Chart) return;

    if (chartRef.current) chartRef.current.destroy();

    if (entries.length > 0) {
      const sortedEntries = [...entries].sort((a, b) => a.price - b.price);
      chartRef.current = new (window as any).Chart(canvas, {
        type: "bar",
        data: {
          labels: sortedEntries.map((e) => formatCurrency(e.price)),
          datasets: [
            {
              label: "Jumlah Unit/Lot",
              data: sortedEntries.map((e) => e.quantity),
              backgroundColor: (ctx: any) => {
                const price = sortedEntries[ctx.dataIndex].price;
                const marketPrice = parseInput(currentPrice);
                if (marketPrice <= 0) return "rgba(45, 212, 191, 0.6)";
                return price < marketPrice ? "rgba(45, 212, 191, 0.6)" : "rgba(244, 114, 182, 0.6)";
              },
              borderColor: (ctx: any) => {
                const price = sortedEntries[ctx.dataIndex].price;
                const marketPrice = parseInput(currentPrice);
                if (marketPrice <= 0) return "rgba(45, 212, 191, 1)";
                return price < marketPrice ? "rgba(45, 212, 191, 1)" : "rgba(244, 114, 182, 1)";
              },
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c: any) => `Jumlah: ${formatNumber(c.raw as number)}` } },
            annotation: {
              annotations: {
                avgLine: {
                  type: "line",
                  yMin: purchaseSummary.averagePrice,
                  yMax: purchaseSummary.averagePrice,
                  borderColor: "#a78bfa",
                  borderWidth: 2,
                  borderDash: [6, 6],
                  label: { content: `AVG: ${formatCurrency(purchaseSummary.averagePrice)}`, enabled: true, position: "start", backgroundColor: "#a78bfa22", color: "#d8b4fe", font: { weight: "bold" } },
                },
                currentPriceLine: {
                  type: "line",
                  yMin: parseInput(currentPrice),
                  yMax: parseInput(currentPrice),
                  borderColor: "#facc15",
                  borderWidth: 2,
                  label: { content: `SAAT INI: ${formatCurrency(parseInput(currentPrice))}`, enabled: true, position: "end", backgroundColor: "#facc1522", color: "#fde047", font: { weight: "bold" } },
                },
              },
            },
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: "Jumlah Unit/Lot" } },
            x: { title: { display: true, text: "Harga Beli" } },
          },
        },
      });
    }
  }, [entries, purchaseSummary, currentPrice]);

  return (
    <main className="min-h-screen bg-black text-zinc-200 p-4 md:p-8 font-sans">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); body { font-family: 'Inter', sans-serif; }`}</style>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 to-gray-900 -z-10"></div>

      <div className="text-center mb-10">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
          Kalkulator Profit & Loss
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-zinc-400 mt-2">
          Analisis potensi keuntungan atau kerugian dari posisi investasi Anda.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* --- Kolom Input --- */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 space-y-6">
          <h2 className="text-xl font-bold text-white">Data Pembelian</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-400">Harga Beli</label>
              <input
                type="text"
                value={newPrice}
                // onChange={(e) => setNewPrice(e.target.value)}
                onChange={(e) => {
                  const value = parseInput(e.target.value);
                  setNewPrice(formatCurrency(value));
                }}
                placeholder="cth: 1500"
                className="w-full mt-1 p-3 rounded-lg bg-zinc-800 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-400">Jumlah Lembar/Unit</label>
              <input
                type="text"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="cth: 10"
                className="w-full mt-1 p-3 rounded-lg bg-zinc-800 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <motion.button
            onClick={handleAddEntry}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-gradient-to-r from-white to-zinc-300 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <FaPlus /> Tambah Posisi Beli
          </motion.button>
          <div className="border-t border-zinc-700 pt-4">
            <h3 className="font-semibold text-zinc-300 mb-2">Daftar Pembelian</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              <AnimatePresence>
                {entries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex justify-between items-center bg-zinc-800/50 p-3 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{formatCurrency(entry.price)}</p>
                      <p className="text-xs text-zinc-400">{formatNumber(entry.quantity)} unit/lot</p>
                    </div>
                    <motion.button onClick={() => handleRemoveEntry(entry.id)} whileHover={{ scale: 1.1 }} className="p-2 text-zinc-500 hover:text-red-400">
                      <FaTrash />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {entries.length === 0 && <p className="text-center text-sm text-zinc-500 py-4">Belum ada data.</p>}
            </div>
          </div>

          {/* alert  */}
          <div className="mt-6 p-4 bg-zinc-900/70 rounded-lg border border-zinc-700">
            <p className="text-sm text-zinc-400">
              <span className="font-semibold text-zinc-200">Catatan:</span> Data pembelian dihitung dalam jumlah lembar. Misalnya, 100 lembar = 1 lot. Jadi, jika Anda membeli 1 lot saham, masukkan 100 lembar.
            </p>
          </div>
        </motion.div>

        {/* --- Kolom Dashboard & Grafik --- */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700">
            <label className="text-xl font-bold text-white">Harga Jual / Saat Ini</label>
            <input
              type="text"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="Masukkan harga saat ini..."
              className="w-full mt-2 p-3 text-lg rounded-lg bg-zinc-800 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PurchaseSummaryCard summary={purchaseSummary} />
            <ProfitLossCard summary={profitLossSummary} />
          </div>

          <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 min-h-[400px]">
            <h3 className="text-lg font-bold text-white mb-4">Grafik Posisi Pembelian vs Harga Saat Ini</h3>
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
const DashboardStat: FC<{ label: string; value: string; small?: boolean }> = ({ label, value, small }) => (
  <div className="bg-zinc-900/50 p-4 rounded-lg">
    <p className={`text-zinc-400 ${small ? "text-xs" : "text-sm"}`}>{label}</p>
    <p className={`font-bold text-white mt-1 ${small ? "text-xl" : "text-2xl"}`}>{value}</p>
  </div>
);
const PurchaseSummaryCard: FC<{ summary: any }> = ({ summary }) => (
  <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-700 space-y-4">
    <h2 className="text-lg font-bold text-white mb-2">Ringkasan Pembelian</h2>
    <DashboardStat small label="Harga Rata-rata" value={formatCurrency(summary.averagePrice)} />
    <DashboardStat small label="Total Unit/Lot" value={formatNumber(summary.totalQuantity)} />
    <DashboardStat small label="Total Modal" value={formatCurrency(summary.totalCost)} />
  </div>
);
const ProfitLossCard: FC<{ summary: any }> = ({ summary }) => {
  const { status, amount, percentage } = summary;
  const isProfit = status === "profit";
  const isLoss = status === "loss";
  const colorClass = isProfit ? "text-green-400" : isLoss ? "text-red-400" : "text-zinc-300";
  const bgColorClass = isProfit ? "bg-green-500/10" : isLoss ? "bg-red-500/10" : "bg-slate-500/10";
  const icon = isProfit ? <FaArrowUp /> : isLoss ? <FaArrowDown /> : <FaEquals />;

  return (
    <div className={`p-6 rounded-2xl border space-y-4 flex flex-col justify-between ${isProfit ? "border-green-400/30" : isLoss ? "border-red-400/30" : "border-zinc-600"} ${bgColorClass}`}>
      <div>
        <h2 className="text-lg font-bold text-white mb-2">Potensi Profit / Loss</h2>
        <div className={`text-4xl font-extrabold flex items-center gap-2 ${colorClass}`}>
          {icon}
          <span>{formatCurrency(amount)}</span>
        </div>
        <p className={`text-lg font-semibold ${colorClass}`}>{percentage.toFixed(2)}%</p>
      </div>
      <p className="text-xs text-zinc-400 mt-4">*Berdasarkan harga jual/saat ini yang Anda masukkan. Belum termasuk biaya transaksi.</p>
    </div>
  );
};
