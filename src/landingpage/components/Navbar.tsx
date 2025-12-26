"use client";

import { motion } from "framer-motion";
import { FaHeart, FaArrowUp, FaArrowDown, FaExclamation, FaExclamationTriangle } from "react-icons/fa";
import { FC } from "react";
import { useRouter } from "next/navigation";

interface NavbarProps {
  onDonationClick: () => void;
  onNavClick: (page: string) => void;
}

const Marquee: FC<{ items: any[] }> = ({ items }) => (
  <div className="relative flex overflow-hidden border-y border-slate-700/50 bg-slate-800/20 py-2">
    <motion.div className="flex" animate={{ x: ["-100%", "0%"] }} transition={{ ease: "linear", duration: 30, repeat: Infinity }}>
      {[...items, ...items].map((item, index) => (
        <div key={index} className="flex-shrink-0 flex items-center mx-4">
          <span className="text-sm font-semibold text-slate-300">{item.name}</span>
          <span className="text-sm font-mono mx-2 text-slate-100">{item.price}</span>
          <div className={`flex items-center text-xs font-bold ${item.change.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
            {item.change.startsWith("+") ? <FaArrowUp className="w-3 h-3 mr-1" /> : <FaArrowDown className="w-3 h-3 mr-1" />}
            {item.change.substring(1)}
          </div>
        </div>
      ))}
    </motion.div>
  </div>
);

const Navbar: FC<NavbarProps> = ({ onDonationClick }) => {
  const router = useRouter();
  const tickerItems = [
    { name: "BTC/USD", price: "68,420.10", change: "+1.25%" },
    { name: "ETH/USD", price: "3,512.80", change: "-0.50%" },
    { name: "BBCA.JK", price: "9,350", change: "+0.81%" },
    { name: "GOTO.JK", price: "53", change: "-1.85%" },
    { name: "DOW JONES", price: "38,852.27", change: "+0.18%" },
    { name: "S&P 500", price: "5,354.03", change: "+1.18%" },
  ];

  return (
    <motion.header initial={{ y: -100 }} animate={{ y: 0 }} className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
      <div className="container mx-auto flex justify-between items-center py-4 px-4 md:px-8">
        <button onClick={() => router.push("/")} className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-sky-500">
          TradeWise AI
        </button>
        <div className="hidden md:block text-sm text-red-400 font-semibold bg-red-900/50 px-3 py-1 rounded-lg">
          <FaExclamationTriangle className="inline mr-1" /> Data Ticker masih statis dan belum terintegrasi dengan API real-time.
        </div>
        <div className="flex items-center gap-4">
          {/* <nav className="hidden md:flex items-center gap-6">
            <a href="#tools" onClick={() => router.push("/")} className="text-slate-300 hover:text-cyan-400 transition-colors duration-300 font-medium">
              Tools
            </a>
            <a href="#ebooks" onClick={() => router.push("/")} className="text-slate-300 hover:text-cyan-400 transition-colors duration-300 font-medium">
              eBooks
            </a>
            <button onClick={() => router.push("/")} className="text-slate-300 hover:text-cyan-400 transition-colors duration-300 font-medium">
              Blog
            </button>
          </nav> */}
          <motion.button
            onClick={onDonationClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 font-bold py-2 px-4 rounded-lg transition-colors duration-300"
          >
            <FaHeart className="w-4 h-4" /> <span className="hidden sm:inline">Donasi</span>
          </motion.button>
        </div>
      </div>
      <Marquee items={tickerItems} />
    </motion.header>
  );
};

export default Navbar;
