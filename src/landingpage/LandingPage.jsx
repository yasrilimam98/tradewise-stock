import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBalanceScale,
  FaCalculator,
  FaCalendarAlt,
  FaBrain,
  FaMoneyBillWave,
  FaChartBar,
  FaChartPie,
  FaHandHoldingUsd,
  FaTimes,
  FaInstagram,
  FaTiktok,
  FaArrowUp,
  FaArrowDown,
  FaCalendarCheck,
  FaChevronDown,
  FaRocket,
  FaFire,
  FaGoogle,
} from "react-icons/fa";
import ToolsRoutes from "./ToolsRouter";

// --- HELPER FUNCTIONS ---
const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID").format(parseInt(price));
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// --- COMPONENTS ---

// Trending Stock Ticker
const TrendingTicker = ({ stocks }) => {
  if (!stocks.length) return null;

  const duplicatedStocks = [...stocks, ...stocks];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-y border-zinc-700/50 py-3">
      <motion.div
        className="flex gap-8"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 30,
            ease: "linear",
          },
        }}
      >
        {duplicatedStocks.map((stock, index) => {
          const isPositive = !stock.change.startsWith("-");
          const isNeutral = stock.change === "0";
          return (
            <div
              key={`${stock.symbol}-${index}`}
              className="flex items-center gap-3 px-4 py-1.5 bg-zinc-800/50 rounded-lg border border-zinc-700/50 flex-shrink-0 hover:bg-zinc-700/50 transition-colors cursor-pointer"
            >
              <img
                src={stock.icon_url}
                alt={stock.symbol}
                className="w-6 h-6 rounded-full bg-white object-cover"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${stock.symbol}&background=333&color=fff&size=32`;
                }}
              />
              <div className="flex items-center gap-3">
                <span className="font-bold text-white text-sm">{stock.symbol}</span>
                <span className="text-zinc-300 text-sm">Rp {formatPrice(stock.last)}</span>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isNeutral
                      ? "bg-zinc-700 text-zinc-300"
                      : isPositive
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {!isNeutral && (isPositive ? <FaArrowUp className="w-2 h-2" /> : <FaArrowDown className="w-2 h-2" />)}
                  {parseFloat(stock.percent).toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};

// Trending Stocks Section
const TrendingStocksSection = ({ stocks, loading }) => {
  return (
    <section className="py-16 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <FaFire className="text-orange-500 w-6 h-6" />
            <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              Trending Stocks
            </h2>
          </div>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Saham-saham yang sedang trending di pasar Indonesia hari ini
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-zinc-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-zinc-700 rounded w-16 mb-1" />
                    <div className="h-3 bg-zinc-700 rounded w-24" />
                  </div>
                </div>
                <div className="h-6 bg-zinc-700 rounded w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stocks.map((stock, index) => {
              const isPositive = !stock.change.startsWith("-");
              const isNeutral = stock.change === "0";
              return (
                <motion.div
                  key={stock.symbol}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 backdrop-blur-sm rounded-xl p-4 border border-zinc-700/50 hover:border-zinc-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={stock.icon_url}
                      alt={stock.symbol}
                      className="w-10 h-10 rounded-full bg-white object-cover group-hover:scale-110 transition-transform"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${stock.symbol}&background=333&color=fff&size=40`;
                      }}
                    />
                    <div>
                      <h3 className="font-bold text-white">{stock.symbol}</h3>
                      <p className="text-xs text-zinc-400 truncate max-w-[100px]">{stock.name}</p>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-lg font-bold text-white">Rp {formatPrice(stock.last)}</p>
                    </div>
                    <span
                      className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                        isNeutral
                          ? "bg-zinc-700 text-zinc-300"
                          : isPositive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {!isNeutral && (isPositive ? <FaArrowUp className="w-2 h-2" /> : <FaArrowDown className="w-2 h-2" />)}
                      {parseFloat(stock.percent).toFixed(2)}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

// Economic Calendar Section
const EconomicCalendarSection = ({ events, loading }) => {
  return (
    <section className="py-16 bg-gradient-to-b from-zinc-900 to-black relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.02),transparent_50%)]" />
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <FaCalendarCheck className="text-white w-6 h-6" />
            <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              Economic Calendar
            </h2>
          </div>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Jadwal rilis data ekonomi penting Indonesia
          </p>
        </motion.div>

        {loading ? (
          <div className="max-w-4xl mx-auto space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-xl p-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-16 bg-zinc-700 rounded" />
                    <div className="h-5 bg-zinc-700 rounded w-48" />
                  </div>
                  <div className="flex gap-8">
                    <div className="h-5 bg-zinc-700 rounded w-16" />
                    <div className="h-5 bg-zinc-700 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="bg-zinc-800/30 rounded-2xl border border-zinc-700/50 overflow-hidden">
              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-zinc-800/50 border-b border-zinc-700/50 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <div className="col-span-2">Tanggal</div>
                <div className="col-span-4">Event</div>
                <div className="col-span-2 text-center">Actual</div>
                <div className="col-span-2 text-center">Forecast</div>
                <div className="col-span-2 text-center">Previous</div>
              </div>

              {/* Scrollable Events Container */}
              <div className="max-h-[400px] overflow-y-auto">
                {events.map((event, index) => (
                  <motion.div
                    key={event.econcal_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors items-center"
                  >
                    <div className="md:col-span-2">
                      <div className="text-sm font-medium text-white">{formatDate(event.econcal_date)}</div>
                      <div className="text-xs text-zinc-500">{event.econcal_time}</div>
                    </div>
                    <div className="md:col-span-4">
                      <div className="text-sm font-medium text-white">{event.econcal_item}</div>
                      {event.econcal_month && (
                        <div className="text-xs text-zinc-500">{event.econcal_month}</div>
                      )}
                    </div>
                    <div className="md:col-span-2 md:text-center flex md:block items-center gap-2">
                      <span className="text-xs text-zinc-500 md:hidden">Actual:</span>
                      <span
                        className={`inline-block px-2 py-1 rounded text-sm font-semibold ${
                          event.econcal_actual
                            ? "bg-white/10 text-white"
                            : "text-zinc-600"
                        }`}
                      >
                        {event.econcal_actual || "-"}
                      </span>
                    </div>
                    <div className="md:col-span-2 md:text-center flex md:block items-center gap-2">
                      <span className="text-xs text-zinc-500 md:hidden">Forecast:</span>
                      <span className="text-sm text-zinc-400">
                        {event.econcal_forecast || "-"}
                      </span>
                    </div>
                    <div className="md:col-span-2 md:text-center flex md:block items-center gap-2">
                      <span className="text-xs text-zinc-500 md:hidden">Previous:</span>
                      <span className="text-sm text-zinc-400">
                        {event.econcal_previous || "-"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Scroll indicator */}
              {events.length > 5 && (
                <div className="px-4 py-2 bg-zinc-800/50 border-t border-zinc-700/50 text-center text-xs text-zinc-500">
                  Scroll untuk melihat lebih banyak ({events.length} events)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// Tool Card
const ToolCard = ({ tool, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.05 }}
    whileHover={{ y: -8 }}
    className="relative bg-gradient-to-br from-zinc-800/60 to-zinc-900/60 backdrop-blur-sm p-6 rounded-2xl border border-zinc-700/50 h-full flex flex-col group transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-white/5 overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative z-10 flex flex-col h-full">
      <div className="text-white text-4xl mb-4 transition-transform duration-300 group-hover:scale-110">
        {tool.icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-white">{tool.title}</h3>
      <p className="text-zinc-400 mb-4 flex-grow text-sm">{tool.description}</p>
      <a
        href={tool.link}
        className="mt-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-black font-bold py-2.5 px-5 rounded-xl transition-all duration-300"
      >
        Coba Sekarang
        <FaRocket className="w-3 h-3" />
      </a>
    </div>
  </motion.div>
);

// Investment Tools Section
const InvestmentToolsSection = () => {
  const tools = [
    {
      title: "DCA & Lump Sum Calculator",
      description: "Simulasikan hasil investasi antara strategi Dollar Cost Averaging dan Lump Sum dengan grafik hasil.",
      icon: <FaCalculator className="w-10 h-10" />,
      link: "#/tools/dca-calculator",
    },
    {
      title: "Investment Planner",
      description: "Buat rencana investasi jangka pendek hingga panjang sesuai tujuan keuangan dan profil risiko Anda.",
      icon: <FaCalendarAlt className="w-10 h-10" />,
      link: "#/tools/investment-planner",
    },
    {
      title: "Investor Personality Quiz",
      description: "Temukan tipe kepribadian investasi Anda dan dapatkan saran alokasi portofolio yang cocok.",
      icon: <FaBrain className="w-10 h-10" />,
      link: "#/tools/investor-quiz",
    },
    {
      title: "Rule of 72",
      description: "Hitung berapa lama investasi Anda akan berlipat ganda dengan pendekatan sederhana berdasarkan ROI.",
      icon: <FaMoneyBillWave className="w-10 h-10" />,
      link: "#/tools/rule-72",
    },
    {
      title: "SmartLoan Simulator",
      description: "Simulasikan berbagai skenario pinjaman untuk menemukan cicilan dan bunga terbaik sesuai kemampuan.",
      icon: <FaHandHoldingUsd className="w-10 h-10" />,
      link: "#/tools/smartloan-simulator",
    },
    {
      title: "Average Calculator",
      description: "Hitung rata-rata harga beli aset untuk mengetahui break-even point dari total investasi Anda.",
      icon: <FaChartPie className="w-10 h-10" />,
      link: "#/tools/average-calculator",
    },
    {
      title: "IPO Calculator",
      description: "Simulasikan hasil penjatahan saham IPO termasuk oversubscribe retail dan non-retail.",
      icon: <FaChartPie className="w-10 h-10" />,
      link: "#/tools/ipo-calculator",
    },
    {
      title: "Profit / Loss Calculator",
      description: "Hitung secara cepat keuntungan atau kerugian dari transaksi saham, kripto, dan aset lainnya.",
      icon: <FaChartPie className="w-10 h-10" />,
      link: "#/tools/profit-loss-calculator",
    },
    {
      title: "Dividend Calculator",
      description: "Hitung total dividen yang diterima dari saham dan simulasi efek reinvestasi dividen.",
      icon: <FaChartPie className="w-10 h-10" />,
      link: "#/tools/dividen-calculator",
    },
    {
      title: "SIP Calculator",
      description: "Simulasikan hasil investasi bulanan dengan pendekatan Systematic Investment Plan (SIP).",
      icon: <FaChartBar className="w-10 h-10" />,
      link: "#/tools/sip-calculator",
    },
    {
      title: "Education Calculator",
      description: "Rencanakan kebutuhan dana pendidikan anak dengan estimasi inflasi dan hasil investasi.",
      icon: <FaChartBar className="w-10 h-10" />,
      link: "#/tools/education-calculator",
    },
    {
      title: "Gold Calculator",
      description: "Hitung nilai investasi emas Anda berdasarkan harga pasar saat ini dan berat emas.",
      icon: <FaChartBar className="w-10 h-10" />,
      link: "#/tools/gold-calculator",
    },
  ];

  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.03),transparent_50%)]" />
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 mb-4">
            Investment Tools
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Peralatan investasi canggih untuk membantu Anda membuat keputusan finansial yang lebih cerdas
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tools.map((tool, index) => (
            <ToolCard key={index} tool={tool} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

// Hero Section
const HeroSection = ({ onLoginClick }) => {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.05),transparent_50%)]" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Animated Gradient Orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-sm text-zinc-300">
              <FaRocket className="text-white" />
              Platform Investasi Cerdas
            </span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-6 leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-zinc-500">
              Trade
            </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-zinc-400 to-zinc-600">
              Wise
            </span>
          </h1>

          <p className="text-lg md:text-xl mb-10 text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            Platform lengkap dengan tools cerdas, analisis AI, dan wawasan pasar real-time untuk trading dan investasi
            yang lebih pintar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLoginClick}
              className="group relative px-8 py-4 bg-white text-black font-bold rounded-2xl overflow-hidden transition-all duration-300 shadow-xl shadow-white/20 hover:shadow-white/30"
            >
              <span className="relative z-10 flex items-center gap-3">
                <FaGoogle className="w-5 h-5" />
                Masuk dengan Google
              </span>
            </motion.button>

            <motion.a
              href="#tools"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold rounded-2xl transition-all duration-300 backdrop-blur-sm"
            >
              Explore Tools
            </motion.a>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
        >
          {[
            { value: "14+", label: "Investment Tools" },
            { value: "24/7", label: "Market Data" },
            { value: "Free", label: "No Hidden Cost" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Footer
const Footer = () => (
  <footer className="bg-black border-t border-zinc-800 py-12">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">TradeWise AI</h3>
          <p className="text-zinc-500 text-sm">Fortis Fortuna Adiuvat</p>
        </div>
        <div className="md:text-right">
          <div className="flex md:justify-end gap-4 mb-4">
            <a
              href="https://www.tiktok.com/@safirarahmadita?lang=en"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
            >
              <FaTiktok className="w-4 h-4" />
            </a>
            <a
              href="https://www.instagram.com/safirarahmadita"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
            >
              <FaInstagram className="w-4 h-4" />
            </a>
          </div>
          <p className="text-zinc-600 text-sm">© {new Date().getFullYear()} TradeWise AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  </footer>
);

// Login Modal
const LoginModal = ({ isOpen, onClose, onLogin }) => {
  const [accessCode, setAccessCode] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (onLogin) {
      onLogin(accessCode);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-zinc-900 p-8 rounded-2xl max-w-md w-full border border-zinc-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Enter Access Code</h2>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-zinc-400 hover:text-red-400 transition-colors"
              >
                <FaTimes />
              </motion.button>
            </div>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Masukkan kode akses Anda"
                className="w-full p-4 rounded-xl bg-zinc-800 text-white mb-4 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-white focus:border-white placeholder-zinc-500"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-white text-black font-bold py-4 px-4 rounded-xl transition-all hover:bg-zinc-100"
              >
                Akses
              </motion.button>
              <p className="text-xs text-zinc-500 text-center mt-4">
                Untuk mendapatkan akses, silahkan kunjungi{" "}
                <a
                  href="https://lynk.id/safirarahmadita/5g534yk7we1k"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:underline"
                >
                  link ini
                </a>
                .
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- MAIN LANDING PAGE COMPONENT ---
const LandingPage = ({ onGoogleLogin }) => {
  const [trendingStocks, setTrendingStocks] = useState([]);
  const [economicEvents, setEconomicEvents] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);


  useEffect(() => {
    // Get token from localStorage
    const getToken = () => localStorage.getItem('stockbit_bearer_token');
    
    // Helper function to fetch with auth
    const fetchWithAuth = async (url) => {
      const token = getToken();
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      return response.json();
    };
    
    // Fetch Trending Stocks
    const fetchTrendingStocks = async () => {
      try {
        const result = await fetchWithAuth("https://exodus.stockbit.com/emitten/trending");
        if (result.data) {
          setTrendingStocks(result.data);
        }
      } catch (error) {
        console.error("Error fetching trending stocks:", error);
      } finally {
        setLoadingStocks(false);
      }
    };

    // Fetch Economic Calendar
    const fetchEconomicCalendar = async () => {
      try {
        const result = await fetchWithAuth("https://exodus.stockbit.com/corpaction/economic");
        if (result.data?.economic) {
          setEconomicEvents(result.data.economic);
        }
      } catch (error) {
        console.error("Error fetching economic calendar:", error);
      } finally {
        setLoadingCalendar(false);
      }
    };

    fetchTrendingStocks();
    fetchEconomicCalendar();
  }, []);

  // Home content component
  const HomeContent = () => (
    <div className="bg-black text-white font-sans antialiased min-h-screen">
      {/* Trending Ticker */}
      <TrendingTicker stocks={trendingStocks} />

      {/* Hero Section */}
      <HeroSection onLoginClick={onGoogleLogin} />

      {/* Trending Stocks */}
      <TrendingStocksSection stocks={trendingStocks} loading={loadingStocks} />

      {/* Economic Calendar */}
      <EconomicCalendarSection events={economicEvents} loading={loadingCalendar} />

      {/* Investment Tools */}
      <section id="tools">
        <InvestmentToolsSection />
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeContent />} />
        <Route path="/tools/*" element={<ToolsRoutes />} />
      </Routes>
    </HashRouter>
  );
};

export default LandingPage;
