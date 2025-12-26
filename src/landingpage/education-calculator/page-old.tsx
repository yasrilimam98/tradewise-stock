"use client";

import React, { useState, useMemo, FC, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaLightbulb, FaPlus, FaTrash, FaUsers } from "react-icons/fa";

// --- TYPES ---
type EducationStage = {
  id: number;
  levelName: string;
  entryFee: number;
  annualFee: number;
  startAge: number;
  durationYears: number;
};
type Child = {
  id: number;
  name: string;
  currentAge: number;
  plan: EducationStage[];
};
type CalculationResult = {
  totalFutureCost: number;
  requiredMonthlySaving: number;
  timeline: { year: number; cost: number }[];
};

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;
const parseInput = (input: string) => Number(input.replace(/[^0-9]/g, "")) || 0;

// --- MAIN COMPONENT ---
export default function EducationCalculator() {
  const [children, setChildren] = useState<Child[]>([
    {
      id: 1,
      name: "Anak Pertama",
      currentAge: 1,
      plan: [
        { id: 101, levelName: "SD", entryFee: 25_000_000, annualFee: 12_000_000, startAge: 6, durationYears: 6 },
        { id: 102, levelName: "SMP", entryFee: 35_000_000, annualFee: 18_000_000, startAge: 12, durationYears: 3 },
        { id: 103, levelName: "SMA", entryFee: 45_000_000, annualFee: 24_000_000, startAge: 15, durationYears: 3 },
        { id: 104, levelName: "Kuliah S1", entryFee: 100_000_000, annualFee: 30_000_000, startAge: 18, durationYears: 4 },
      ],
    },
  ]);
  const [inflationRate, setInflationRate] = useState<number>(6);
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

  const calculationResult = useMemo<CalculationResult | null>(() => {
    if (children.length === 0) return null;

    const i = inflationRate / 100;
    const timelineMap = new Map<number, number>();
    let totalFutureCost = 0;
    let longestPeriodYears = 0;

    children.forEach((child) => {
      child.plan.forEach((stage) => {
        const yearsToStart = stage.startAge - child.currentAge;
        if (yearsToStart < 0) return;

        const futureEntryFee = stage.entryFee * Math.pow(1 + i, yearsToStart);
        const entryYear = new Date().getFullYear() + yearsToStart;
        timelineMap.set(entryYear, (timelineMap.get(entryYear) || 0) + futureEntryFee);
        totalFutureCost += futureEntryFee;

        for (let j = 0; j < stage.durationYears; j++) {
          const yearsToPayment = yearsToStart + j;
          const futureAnnualFee = stage.annualFee * Math.pow(1 + i, yearsToPayment);
          const paymentYear = new Date().getFullYear() + yearsToPayment;
          timelineMap.set(paymentYear, (timelineMap.get(paymentYear) || 0) + futureAnnualFee);
          totalFutureCost += futureAnnualFee;

          if (yearsToPayment > longestPeriodYears) {
            longestPeriodYears = yearsToPayment;
          }
        }
      });
    });

    const requiredMonthlySaving = longestPeriodYears > 0 ? totalFutureCost / (longestPeriodYears * 12) : 0;

    const timeline = Array.from(timelineMap.entries())
      .map(([year, cost]) => ({ year, cost }))
      .sort((a, b) => a.year - b.year);

    return { totalFutureCost, requiredMonthlySaving, timeline };
  }, [children, inflationRate]);

  const handleAddChild = () => {
    const newId = children.length > 0 ? Math.max(...children.map((c) => c.id)) + 1 : 1;
    setChildren([...children, { id: newId, name: `Anak ke-${newId}`, currentAge: 0, plan: [] }]);
  };

  const handleRemoveChild = (childId: number) => {
    setChildren(children.filter((c) => c.id !== childId));
  };

  const updateChildData = (childId: number, field: keyof Child, value: string | number) => {
    setChildren(children.map((c) => (c.id === childId ? { ...c, [field]: value } : c)));
  };

  const addStageToChild = (childId: number) => {
    const newStage: EducationStage = {
      id: Date.now(),
      levelName: "Jenjang Baru",
      entryFee: 0,
      annualFee: 0,
      startAge: 0,
      durationYears: 0,
    };
    setChildren(children.map((c) => (c.id === childId ? { ...c, plan: [...c.plan, newStage] } : c)));
  };

  const removeStageFromChild = (childId: number, stageId: number) => {
    setChildren(children.map((c) => (c.id === childId ? { ...c, plan: c.plan.filter((p) => p.id !== stageId) } : c)));
  };

  const updateStageData = (childId: number, stageId: number, field: keyof EducationStage, value: string | number) => {
    setChildren(children.map((c) => (c.id === childId ? { ...c, plan: c.plan.map((p) => (p.id === stageId ? { ...p, [field]: value } : p)) } : c)));
  };

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    if (calculationResult && calculationResult.timeline.length > 0 && (window as any).Chart) {
      const canvas = document.getElementById("educationChart") as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          chartRef.current = new (window as any).Chart(ctx, {
            type: "bar",
            data: {
              labels: calculationResult.timeline.map((t) => t.year),
              datasets: [
                {
                  label: "Biaya per Tahun",
                  data: calculationResult.timeline.map((t) => t.cost),
                  backgroundColor: "#2dd4bf",
                  borderRadius: 4,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  ticks: {
                    callback: (v: number | string) => formatCurrency(Number(v)),
                    color: "#94a3b8",
                  },
                  grid: { color: "rgba(100, 116, 139, 0.2)" },
                },
                x: {
                  ticks: { color: "#94a3b8" },
                  grid: { display: false },
                },
              },
            },
          });
        }
      }
    }
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [calculationResult]);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-400">
            Kalkulator Dana Pendidikan
          </motion.h1>
          <p className="mt-2 text-slate-400">Rencanakan masa depan pendidikan anak Anda dengan simulasi inflasi.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 bg-slate-800/60 p-6 rounded-2xl border border-slate-700 space-y-6">
            <ControlGroup title="Parameter Global">
              <SliderControl label="Asumsi Inflasi Tahunan" value={inflationRate} onChange={setInflationRate} min={2} max={15} step={0.5} displayValue={`${inflationRate.toFixed(1)}%`} />
            </ControlGroup>
            <div className="border-t border-slate-700 pt-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                  <FaUsers /> Rencana per Anak
                </h3>
                <motion.button
                  onClick={handleAddChild}
                  whileHover={{ scale: 1.05 }}
                  className="bg-cyan-500/20 text-cyan-300 text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors hover:bg-cyan-500/30"
                >
                  <FaPlus className="w-2.5 h-2.5" />
                  Anak
                </motion.button>
              </div>
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-4 pr-2">
                <AnimatePresence>
                  {children.length > 0 ? (
                    children.map((child) => (
                      <ChildPlanForm
                        key={child.id}
                        child={child}
                        onUpdateChild={updateChildData}
                        onRemoveChild={handleRemoveChild}
                        onAddStage={addStageToChild}
                        onRemoveStage={removeStageFromChild}
                        onUpdateStage={updateStageData}
                      />
                    ))
                  ) : (
                    <div className="text-center py-10 text-slate-500">
                      <p>Belum ada data anak.</p>
                      <p className="text-sm">Klik tombol "+ Anak" untuk memulai.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 space-y-6">
            {calculationResult ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DashboardStat label="Total Dana Pendidikan Diperlukan" value={formatCurrency(calculationResult.totalFutureCost)} isPrimary />
                  <DashboardStat label="Estimasi Tabungan / Bulan" value={formatCurrency(calculationResult.requiredMonthlySaving)} />
                </div>
                <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700">
                  <h3 className="text-xl font-bold text-cyan-300 mb-4">Proyeksi Kebutuhan Dana per Tahun</h3>
                  <div className="h-72 md:h-80">
                    <canvas id="educationChart"></canvas>
                  </div>
                </div>
                <ExplanationCard />
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] bg-slate-800/60 p-10 rounded-2xl border border-slate-700 border-dashed">
                <div className="text-center text-slate-500">
                  <h3 className="text-lg font-semibold text-slate-400">Hasil Simulasi Akan Muncul di Sini</h3>
                  <p>Tambahkan data anak dan rencana pendidikannya untuk melihat hasil.</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </main>
  );
}

// --- SUB-COMPONENTS ---
const ChildPlanForm: FC<{ child: Child; onUpdateChild: Function; onRemoveChild: Function; onAddStage: Function; onRemoveStage: Function; onUpdateStage: Function }> = React.memo(
  ({ child, onUpdateChild, onRemoveChild, onAddStage, onRemoveStage, onUpdateStage }) => (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-4">
      <div className="flex justify-between items-center gap-4">
        <input
          type="text"
          value={child.name}
          onChange={(e) => onUpdateChild(child.id, "name", e.target.value)}
          className="bg-transparent text-lg font-bold text-white focus:outline-none focus:border-b border-cyan-400 w-full"
          placeholder="Nama Anak"
        />
        <motion.button onClick={() => onRemoveChild(child.id)} whileHover={{ scale: 1.1, color: "#f87171" }} className="p-1 text-slate-500 transition-colors flex-shrink-0">
          <FaTrash className="w-3.5 h-3.5" />
        </motion.button>
      </div>
      <InputControl label="Usia Anak Saat Ini (Tahun)" value={child.currentAge.toString()} onChange={(val) => onUpdateChild(child.id, "currentAge", parseInput(val))} />
      <div className="space-y-3 pt-2">
        <h4 className="text-sm font-semibold text-slate-400">Jenjang Pendidikan:</h4>
        <AnimatePresence>
          {child.plan.map((stage) => (
            <motion.div
              key={stage.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, margin: 0, padding: 0 }}
              className="bg-slate-700/50 p-3 rounded-lg space-y-3 relative overflow-hidden"
            >
              <motion.button onClick={() => onRemoveStage(child.id, stage.id)} whileHover={{ scale: 1.1, color: "#f87171" }} className="absolute top-2 right-2 p-1 text-slate-500 transition-colors">
                <FaTrash className="w-3 h-3" />
              </motion.button>
              <InputControl type="text" label="Nama Jenjang" value={stage.levelName} onChange={(val) => onUpdateStage(child.id, stage.id, "levelName", val)} />
              <div className="grid grid-cols-2 gap-3">
                <InputControl label="Biaya Masuk (Kini)" value={stage.entryFee.toString()} onChange={(val) => onUpdateStage(child.id, stage.id, "entryFee", parseInput(val))} prefix="Rp" />
                <InputControl label="SPP / Tahun (Kini)" value={stage.annualFee.toString()} onChange={(val) => onUpdateStage(child.id, stage.id, "annualFee", parseInput(val))} prefix="Rp" />
                <InputControl label="Mulai di Usia" value={stage.startAge.toString()} onChange={(val) => onUpdateStage(child.id, stage.id, "startAge", parseInput(val))} />
                <InputControl label="Durasi (Tahun)" value={stage.durationYears.toString()} onChange={(val) => onUpdateStage(child.id, stage.id, "durationYears", parseInput(val))} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <motion.button
          onClick={() => onAddStage(child.id)}
          whileHover={{ scale: 1.05 }}
          className="w-full text-sm text-cyan-300 border border-dashed border-cyan-500/50 rounded-lg py-2 hover:bg-cyan-500/10 transition"
        >
          + Tambah Jenjang
        </motion.button>
      </div>
    </motion.div>
  )
);

const ControlGroup: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-4">
    <h3 className="text-md font-semibold text-slate-300">{title}</h3>
    {children}
  </div>
);

const InputControl: FC<{ label: string; value: string; onChange: (val: string) => void; prefix?: string; type?: "text" | "number" }> = ({ label, value, onChange, prefix, type = "number" }) => (
  <div>
    <label className="text-xs font-medium text-slate-400">{label}</label>
    <div className="relative mt-1">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
      <input
        type="text"
        value={type === "number" ? parseInput(value).toLocaleString("id-ID") : value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full p-2 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm ${prefix ? "pl-9" : "pl-3"}`}
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
    <div className="flex justify-between items-center text-sm text-slate-400 mb-1">
      <label>{label}</label>
      <span className="font-semibold text-cyan-400 bg-slate-700 px-2 py-0.5 rounded-md text-xs">{displayValue}</span>
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

const DashboardStat: FC<{ label: string; value: string; isPrimary?: boolean }> = ({ label, value, isPrimary }) => (
  <div className={`p-5 rounded-2xl text-center ${isPrimary ? "bg-teal-500/20 border border-teal-500/30" : "bg-slate-800/50 border border-slate-700"}`}>
    <p className="text-sm text-slate-400">{label}</p>
    <p className={`text-2xl md:text-3xl font-bold mt-1 ${isPrimary ? "text-teal-300" : "text-white"}`}>{value}</p>
  </div>
);

const ExplanationCard: FC = () => (
  <div className="bg-cyan-900/20 p-5 rounded-lg border border-cyan-500/30">
    <div className="flex items-start gap-4">
      <div className="text-cyan-400 text-2xl mt-1">
        <FaLightbulb />
      </div>
      <div>
        <h3 className="font-semibold text-cyan-300">Bagaimana Biaya Masa Depan Dihitung?</h3>
        <p className="text-sm text-slate-400 mt-1">
          Kalkulator ini menggunakan <strong>rumus bunga majemuk</strong> untuk memproyeksikan biaya pendidikan di masa depan akibat inflasi. Rumus yang digunakan adalah:
          <br />
          <code className="text-xs bg-slate-800 p-1 rounded-md inline-block mt-1">Biaya Nanti = Biaya Sekarang × (1 + Inflasi) ^ Tahun</code>
          <br />
          <span className="text-xs text-slate-500">
            Di mana <em>'Tahun'</em> adalah jumlah tahun dari sekarang hingga anak mulai masuk jenjang pendidikan tersebut.
          </span>
        </p>
        <p className="text-sm text-slate-400 mt-3">
          Biaya saat ini yang dimasukkan sebaiknya <strong>sudah mencakup semua komponen</strong>, seperti:
        </p>
        <ul className="text-sm text-slate-400 list-disc ml-5 mt-1 space-y-1">
          <li>Uang pangkal / gedung</li>
          <li>SPP tahunan atau bulanan</li>
          <li>Uang seragam, buku, dan perlengkapan sekolah</li>
          <li>Biaya masuk awal (jika ada)</li>
        </ul>
        <p className="text-xs text-slate-500 mt-2">*Jika kamu tidak yakin dengan rinciannya, kamu bisa memperkirakan angka kasarnya dan menambahkan margin cadangan untuk berjaga-jaga.</p>
      </div>
    </div>
  </div>
);
