"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import Navbar from "./Navbar";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedMethod, setSelectedMethod] = useState<"qris" | "bca" | "mandiri">("bca");
  const [copyText, setCopyText] = useState("Salin Rekening");

  const bankDetails = {
    bca: { name: "Bank Central Asia", account: "0113149776", holder: "Safira Rahmadita Ismara" },
    mandiri: { name: "Bank Mandiri", account: "1590004704903", holder: "Safira Rahmadita Ismara" },
    qris: { name: "QRIS", imageUrl: "https://placehold.co/250x250/ffffff/000000?text=QRIS+Coming+Soon" },
  };
  const handleCopy = () => {
    // Only allow copy for methods that have an account number
    if (selectedMethod === "qris" || !("account" in bankDetails[selectedMethod])) return;
    const accountNumber = (bankDetails[selectedMethod] as { account: string }).account;
    navigator.clipboard
      .writeText(accountNumber)
      .then(() => {
        setCopyText("Tersalin!");
        setTimeout(() => setCopyText("Salin Rekening"), 2000);
      })
      .catch((err) => {
        console.error("Gagal menyalin: ", err);
        alert("Gagal menyalin nomor rekening.");
      });
  };

  const handleNavigate = (page: string) => {
    window.scrollTo(0, 0);
    setCurrentPage(page);
  };

  return (
    <>
      <Navbar onDonationClick={() => setIsDonationModalOpen(true)} onNavClick={handleNavigate} />
      {children}
      {/* <AnimatePresence>
        {isDonationModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
            onClick={() => setIsDonationModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-slate-800/80 backdrop-blur-lg p-8 rounded-2xl max-w-sm w-full border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.2, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsDonationModalOpen(false)}
                  className="text-slate-400 hover:text-red-400 absolute top-4 right-4"
                >
                  <FaTimes className="w-5 h-5" />
                </motion.button>
              </div>


              <h2 className="text-2xl font-bold text-cyan-400 mb-2">Dukung Kami</h2>
              <p className="text-slate-300 mb-6">Scan QR code di bawah ini untuk donasi. Dukungan Anda sangat berarti bagi pengembangan platform ini.</p>
              <div className="p-4 bg-white rounded-lg inline-block">
                <img src="https://placehold.co/250x250/ffffff/000000?text=QRIS" alt="QRIS Code for Donation" className="w-full h-full" />
              </div>
              <p className="text-sm text-slate-400 mt-4">Mendukung semua E-Wallet & M-Banking</p>
              <p className="font-bold text-slate-100 text-lg mt-6">Terima Kasih! 🙏</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence> */}

      <AnimatePresence>
        {isDonationModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
            onClick={() => setIsDonationModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-slate-800/80 backdrop-blur-lg p-8 rounded-2xl max-w-sm w-full border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.2, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsDonationModalOpen(false)}
                  className="text-slate-400 hover:text-red-400 absolute top-4 right-4"
                >
                  <FaTimes className="w-5 h-5" />
                </motion.button>
              </div>
              <h2 className="text-2xl font-bold text-cyan-400 mb-2">Dukung Kami</h2>
              <p className="text-slate-300 mb-6 text-center">Dukungan Anda sangat berarti bagi pengembangan platform ini.</p>
              <div className="flex bg-slate-700 p-1 rounded-lg mb-6">
                <button
                  onClick={() => setSelectedMethod("bca")}
                  className={`w-1/3 p-2 rounded-md text-sm font-semibold transition ${selectedMethod === "bca" ? "bg-cyan-500 text-white" : "hover:bg-slate-600"}`}
                >
                  BCA
                </button>
                <button
                  onClick={() => setSelectedMethod("mandiri")}
                  className={`w-1/3 p-2 rounded-md text-sm font-semibold transition ${selectedMethod === "mandiri" ? "bg-cyan-500 text-white" : "hover:bg-slate-600"}`}
                >
                  Mandiri
                </button>
                <button
                  onClick={() => setSelectedMethod("qris")}
                  className={`w-1/3 p-2 rounded-md text-sm font-semibold transition ${selectedMethod === "qris" ? "bg-cyan-500 text-white" : "hover:bg-slate-600"}`}
                >
                  QRIS
                </button>
              </div>
              {/* <div className="p-4 bg-white rounded-lg inline-block">
                <img src="https://placehold.co/250x250/ffffff/000000?text=QRIS" alt="QRIS Code for Donation" className="w-full h-full" />
              </div>
              <p className="text-sm text-slate-400 mt-4">Mendukung semua E-Wallet & M-Banking</p>
              <p className="font-bold text-slate-100 text-lg mt-6">Terima Kasih! 🙏</p> */}

              <AnimatePresence mode="wait">
                <motion.div key={selectedMethod} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="text-center">
                  {selectedMethod === "qris" ? (
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                      <div className="p-2 bg-white rounded-lg inline-block">
                        <img src={bankDetails.qris.imageUrl} alt="QRIS Code for Donation" className="w-48 h-48" />
                      </div>
                      <p className="text-sm text-slate-400 mt-2">Scan dengan E-Wallet/M-Banking Anda.</p>
                    </div>
                  ) : (
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                      <p className="text-sm text-white">{bankDetails[selectedMethod].name}</p>
                      <p className="text-2xl font-bold my-2 tracking-widest text-white">{bankDetails[selectedMethod].account}</p>
                      <p className="text-sm text-white">a/n {bankDetails[selectedMethod].holder}</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {selectedMethod !== "qris" && (
                <motion.button
                  onClick={handleCopy}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full mt-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  {copyText}
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
