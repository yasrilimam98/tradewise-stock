"use client";

import React, { useState, FC } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronDown, FaChevronUp, FaSpinner, FaChartLine, FaFilePdf, FaShieldAlt, FaLightbulb, FaBullseye, FaUserCheck, FaRedo, FaUser } from "react-icons/fa";

// --- DATA ---
const beginnerQuestions = [
  {
    id: "b1",
    text: "Apa motivasi utama Anda untuk mulai berinvestasi?",
    options: [
      { text: "Menabung untuk kebutuhan jangka pendek (liburan, DP rumah)", score: 1 },
      { text: "Membangun kekayaan bertahap untuk masa depan (pendidikan anak)", score: 2 },
      { text: "Mencapai keuntungan besar untuk mempercepat tujuan keuangan", score: 3 },
    ],
  },
  {
    id: "b2",
    text: "Seberapa nyaman Anda dengan nilai investasi yang bisa naik-turun?",
    options: [
      { text: "Saya lebih suka nilai stabil, walau keuntungan kecil", score: 1 },
      { text: "Saya bisa menerima fluktuasi kecil untuk keuntungan lebih", score: 2 },
      { text: "Saya siap hadapi fluktuasi besar demi potensi keuntungan tinggi", score: 3 },
    ],
  },
  {
    id: "b3",
    text: "Berapa lama Anda bersedia dana tidak dapat diakses?",
    options: [
      { text: "Saya butuh akses dana kapan saja (kurang dari 1 tahun)", score: 1 },
      { text: "Saya bisa menunggu 3-5 tahun untuk hasil yang baik", score: 2 },
      { text: "Saya fokus pada jangka panjang, 7 tahun atau lebih", score: 3 },
    ],
  },
  {
    id: "b4",
    text: "Jika investasi Anda rugi 15% dalam 6 bulan, apa yang Anda lakukan?",
    options: [
      { text: "Panik dan ingin segera menarik seluruh dana", score: 1 },
      { text: "Tetap tenang dan menunggu pasar pulih kembali", score: 2 },
      { text: "Melihatnya sebagai peluang untuk menambah investasi", score: 3 },
    ],
  },
  {
    id: "b5",
    text: "Berapa banyak waktu yang Anda siapkan untuk belajar investasi?",
    options: [
      { text: "Minimal, saya ingin yang mudah dan tidak rumit", score: 1 },
      { text: "Cukup, saya bersedia belajar dasar-dasarnya", score: 2 },
      { text: "Banyak, saya antusias memahami pasar dan strategi baru", score: 3 },
    ],
  },
  {
    id: "b6",
    text: "Seberapa penting diversifikasi (membagi dana) bagi Anda?",
    options: [
      { text: "Fokus pada satu jenis investasi yang saya anggap aman", score: 1 },
      { text: "Punya beberapa jenis investasi untuk keseimbangan portofolio", score: 2 },
      { text: "Suka mencoba berbagai jenis investasi untuk potensi maksimal", score: 3 },
    ],
  },
];
const experiencedQuestions = [
  {
    id: "e1",
    text: "Bagaimana Anda mendefinisikan portofolio Anda saat ini?",
    options: [
      { text: "Sebagian besar di instrumen rendah risiko (deposito, obligasi)", score: 1 },
      { text: "Campuran seimbang antara risiko rendah dan sedang (saham blue chip, reksa dana)", score: 2 },
      { text: "Didominasi oleh instrumen berisiko tinggi (saham growth, crypto)", score: 3 },
    ],
  },
  {
    id: "e2",
    text: "Seberapa sering Anda melakukan rebalancing pada portofolio?",
    options: [
      { text: "Jarang, saya menerapkan strategi pasif jangka panjang", score: 1 },
      { text: "Sesekali, saat terjadi perubahan signifikan di pasar", score: 2 },
      { text: "Sering, saya aktif menyesuaikan dengan tren pasar terkini", score: 3 },
    ],
  },
  {
    id: "e3",
    text: "Bagaimana Anda menangani volatilitas pasar yang tinggi?",
    options: [
      { text: "Mengurangi eksposur pada instrumen berisiko tinggi", score: 1 },
      { text: "Mempertahankan posisi dan memantau peluang yang muncul", score: 2 },
      { text: "Memanfaatkan volatilitas untuk trading jangka pendek", score: 3 },
    ],
  },
  {
    id: "e4",
    text: "Apa prioritas Anda dalam memilih instrumen investasi baru?",
    options: [
      { text: "Keamanan modal dan imbal hasil yang stabil", score: 1 },
      { text: "Pertumbuhan moderat dengan risiko yang terkontrol", score: 2 },
      { text: "Potensi return tinggi walaupun berisiko lebih besar", score: 3 },
    ],
  },
  {
    id: "e5",
    text: "Berapa persen pendapatan Anda yang diinvestasikan setiap bulan?",
    options: [
      { text: "Kurang dari 10%, saya memprioritaskan tabungan", score: 1 },
      { text: "Antara 10-25%, porsi yang seimbang untuk investasi", score: 2 },
      { text: "Lebih dari 25%, saya agresif dalam menambah portofolio", score: 3 },
    ],
  },
  {
    id: "e6",
    text: "Bagaimana Anda mengevaluasi kinerja portofolio Anda?",
    options: [
      { text: "Fokus pada stabilitas dan pelestarian nilai modal", score: 1 },
      { text: "Membandingkan dengan benchmark pasar (misalnya, IHSG)", score: 2 },
      { text: "Mengejar alpha (keuntungan di atas rata-rata pasar) secara aktif", score: 3 },
    ],
  },
];

// --- TYPES ---
type Result = { personality: string; description: string; suggestedInstruments: string[]; strategy: string };
type AIResult = { recommendation: string; rationale: string };

// --- MAIN COMPONENT ---
export default function InvestorQuiz() {
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "experienced" | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [analyzeWithAI, setAnalyzeWithAI] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);

  const questions = experienceLevel === "beginner" ? beginnerQuestions : experiencedQuestions;

  const handleExperienceSelection = (level: "beginner" | "experienced") => {
    setExperienceLevel(level);
  };

  const handleAnswer = (score: number, index: number) => {
    setSelectedOption(index);
    setTimeout(() => {
      const newAnswers = [...answers];
      newAnswers[currentQuestion] = score;
      setAnswers(newAnswers);
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        // Automatically calculate result on the last question
        calculateResult(newAnswers);
      }
      setSelectedOption(null);
    }, 300);
  };

  const calculateResult = (finalAnswers: number[]) => {
    setIsLoading(true);
    setTimeout(() => {
      // Simulating API latency
      const totalScore = finalAnswers.reduce((sum, score) => sum + score, 0);
      let personality = "",
        description = "",
        suggestedInstruments: string[] = [],
        strategy = "";

      if (totalScore <= 10) {
        personality = "Konservatif";
        description = "Anda lebih memilih keamanan dan stabilitas. Fokus utama Anda adalah melindungi modal dari risiko kerugian.";
        suggestedInstruments = ["Reksa Dana Pasar Uang", "Obligasi Negara (ORI/SBR)", "Deposito"];
        strategy = "Alokasi mayoritas pada instrumen berpendapatan tetap untuk meminimalkan volatilitas.";
      } else if (totalScore <= 14) {
        personality = "Moderat";
        description = "Anda mencari keseimbangan antara pertumbuhan dan keamanan. Anda bersedia mengambil risiko yang terukur untuk imbal hasil lebih baik.";
        suggestedInstruments = ["Saham Blue Chip", "Reksa Dana Campuran", "Properti"];
        strategy = "Alokasi seimbang antara saham dan instrumen pendapatan tetap untuk pertumbuhan jangka menengah.";
      } else {
        personality = "Agresif";
        description = "Anda tidak takut risiko dan fokus pada potensi keuntungan maksimal. Anda siap menghadapi volatilitas pasar demi pertumbuhan aset yang cepat.";
        suggestedInstruments = ["Saham Growth/Teknologi", "Cryptocurrency", "Equity Crowdfunding"];
        strategy = "Alokasi dominan pada saham atau aset berisiko tinggi lainnya untuk memaksimalkan potensi return.";
      }
      setResult({ personality, description, suggestedInstruments, strategy });

      if (analyzeWithAI) {
        // Mock AI analysis based on result
        setAiResult({
          recommendation: `Berdasarkan profil **${personality}** Anda, kami menyarankan fokus pada **${suggestedInstruments[0]}**. Instrumen ini sejalan dengan preferensi Anda terhadap ${
            personality === "Konservatif" ? "keamanan modal" : personality === "Moderat" ? "pertumbuhan seimbang" : "keuntungan tinggi"
          }.`,
          rationale:
            "AI mempertimbangkan jawaban Anda mengenai toleransi risiko, jangka waktu, dan reaksi terhadap kerugian untuk memberikan rekomendasi yang paling sesuai. Strategi yang disarankan dirancang untuk mengoptimalkan potensi return sesuai tingkat kenyamanan Anda.",
        });
      }
      setIsLoading(false);
    }, 1500);
  };

  const resetQuiz = () => {
    setExperienceLevel(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setResult(null);
    setAiResult(null);
    setSelectedOption(null);
    setAnalyzeWithAI(false);
  };

  const progress = questions && questions.length > 0 ? (currentQuestion / questions.length) * 100 : 0;

  return (
    <div className="bg-black text-zinc-200 min-h-screen font-sans flex items-center justify-center p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>
      <div className="container mx-auto max-w-2xl">
        <AnimatePresence mode="wait">
          {!experienceLevel ? (
            <motion.div key="selection" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Temukan Profil Investor Anda</h1>
              <p className="text-center text-zinc-400 mb-8">Jawab beberapa pertanyaan singkat untuk mengetahui kepribadian investasi Anda.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ExperienceCard level="beginner" title="Saya Pemula" description="Baru memulai dan ingin tahu langkah pertama." onSelect={handleExperienceSelection} />
                <ExperienceCard level="experienced" title="Saya Berpengalaman" description="Sudah aktif berinvestasi dan ingin validasi." onSelect={handleExperienceSelection} />
              </div>
            </motion.div>
          ) : !result ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-zinc-900/60 backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-zinc-700 shadow-2xl shadow-teal-500/10"
            >
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2 text-sm text-zinc-400">
                  <span>Progress</span>
                  <span>
                    {currentQuestion + 1} / {questions.length}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2.5">
                  <motion.div className="bg-gradient-to-r from-teal-400 to-sky-500 h-2.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={currentQuestion} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  <h2 className="text-xl font-semibold mb-6 text-zinc-100">{questions[currentQuestion].text}</h2>
                  <div className="space-y-3">
                    {questions[currentQuestion].options.map((option, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.02, x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAnswer(option.score, index)}
                        className={`w-full p-4 rounded-lg text-left transition-all duration-200 border-2 ${
                          selectedOption === index ? "border-teal-400 bg-teal-500/20" : "border-zinc-600 bg-zinc-800/50 hover:border-teal-500/50"
                        }`}
                      >
                        {option.text}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="bg-zinc-900/60 backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-zinc-700 shadow-2xl shadow-teal-500/10">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, transition: { delay: 0.2, type: "spring" } }}
                    className="w-24 h-24 bg-gradient-to-br from-teal-400 to-sky-500 rounded-full mx-auto flex items-center justify-center text-slate-800 text-5xl mb-4"
                  >
                    <FaUserCheck />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-zinc-100">
                    Profil Anda: <span className="text-zinc-300">{result.personality}</span>
                  </h2>
                  <p className="text-zinc-400 mt-2 mb-6">{result.description}</p>
                </div>
                <div className="space-y-3 text-sm border-t border-zinc-700 pt-6">
                  <p className="flex items-start gap-3">
                    <FaShieldAlt className="text-zinc-300 mt-1" /> <strong>Instrumen Disarankan:</strong> <span className="text-zinc-300">{result.suggestedInstruments.join(", ")}</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <FaLightbulb className="text-zinc-300 mt-1" /> <strong>Strategi:</strong> <span className="text-zinc-300">{result.strategy}</span>
                  </p>
                </div>
                {aiResult && (
                  <div className="mt-6 border-t border-zinc-700 pt-6">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <FaUserCheck /> Rekomendasi Cerdas AI
                    </h3>
                    <div className="bg-zinc-800/50 p-4 rounded-lg space-y-3">
                      <p className="text-zinc-300" dangerouslySetInnerHTML={{ __html: aiResult.recommendation }} />
                      <p className="text-xs text-zinc-400 italic">{aiResult.rationale}</p>
                    </div>
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetQuiz}
                  className="w-full mt-8 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FaRedo /> Ulangi Kuis
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* AI Checkbox and Loading Spinner */}
          <AnimatePresence>
            {experienceLevel && !result && !isLoading && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center justify-center mt-6">
                <input
                  type="checkbox"
                  id="analyzeWithAI"
                  checked={analyzeWithAI}
                  onChange={(e) => setAnalyzeWithAI(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-500 bg-slate-600 border-slate-500 focus:ring-white cursor-pointer"
                />
                <label htmlFor="analyzeWithAI" className="ml-3 text-sm font-medium text-zinc-400 cursor-pointer flex items-center gap-2">
                  <FaShieldAlt className="text-zinc-300" /> Sertakan Analisis AI pada Hasil
                </label>
              </motion.div>
            )}
            {isLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center mt-8">
                <FaSpinner className="text-4xl text-zinc-300 mx-auto" />
                <p className="text-zinc-400 mt-2">Menganalisis jawaban Anda...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </AnimatePresence>
      </div>
    </div>
  );
}

const ExperienceCard: FC<{ level: "beginner" | "experienced"; title: string; description: string; onSelect: (level: "beginner" | "experienced") => void }> = ({ level, title, description, onSelect }) => (
  <motion.button
    onClick={() => onSelect(level)}
    whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0, 255, 255, 0.1)" }}
    className="bg-zinc-900 p-6 rounded-xl border border-zinc-700 text-left h-full flex flex-col items-start"
  >
    <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-4 text-2xl text-zinc-300">{level === "beginner" ? <FaUser /> : <FaUserCheck />}</div>
    <h3 className="text-lg font-bold text-zinc-100">{title}</h3>
    <p className="text-zinc-400 text-sm mt-1 flex-grow">{description}</p>
    <span className="mt-4 text-zinc-300 font-semibold text-sm">Pilih →</span>
  </motion.button>
);
