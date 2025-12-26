import React, { Suspense, lazy } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';

// Lazy load all tool components from their page.tsx files
const DCACalculator = lazy(() => import('./dca-calculator/page.tsx'));
const AverageCalculator = lazy(() => import('./average-calculator/page.tsx'));
const DividenCalculator = lazy(() => import('./dividen-calculator/page.tsx'));
const EducationCalculator = lazy(() => import('./education-calculator/page.tsx'));
const GoldCalculator = lazy(() => import('./gold-calculator/page.tsx'));
const InvestmentPlanner = lazy(() => import('./investment-planner/page.tsx'));
const InvestorQuiz = lazy(() => import('./investor-quiz/page.tsx'));
const IPOCalculator = lazy(() => import('./ipo-calculator/page.tsx'));
const ProfitLossCalculator = lazy(() => import('./profit-loss-calculator/page.tsx'));
const Rule72 = lazy(() => import('./rule-72/page.tsx'));
const SIPCalculator = lazy(() => import('./sip-calculator/page.tsx'));
const SmartLoanSimulator = lazy(() => import('./smartloan-simulator/page.tsx'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="text-center">
      <FaSpinner className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
      <p className="text-zinc-400">Memuat tools...</p>
    </div>
  </div>
);

// Back button wrapper for tools
const ToolWrapper = ({ children }) => {
  const navigate = useNavigate();
  
  return (
    <div className="relative">
      <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-zinc-900/90 backdrop-blur-sm text-white rounded-full border border-zinc-700 hover:bg-zinc-800 transition-all shadow-lg"
      >
        <FaArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Kembali</span>
      </button>
      {children}
    </div>
  );
};

// Main Router Component
const ToolsRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="dca-calculator" element={<ToolWrapper><DCACalculator /></ToolWrapper>} />
        <Route path="average-calculator" element={<ToolWrapper><AverageCalculator /></ToolWrapper>} />
        <Route path="dividen-calculator" element={<ToolWrapper><DividenCalculator /></ToolWrapper>} />
        <Route path="education-calculator" element={<ToolWrapper><EducationCalculator /></ToolWrapper>} />
        <Route path="gold-calculator" element={<ToolWrapper><GoldCalculator /></ToolWrapper>} />
        <Route path="investment-planner" element={<ToolWrapper><InvestmentPlanner /></ToolWrapper>} />
        <Route path="investor-quiz" element={<ToolWrapper><InvestorQuiz /></ToolWrapper>} />
        <Route path="ipo-calculator" element={<ToolWrapper><IPOCalculator /></ToolWrapper>} />
        <Route path="profit-loss-calculator" element={<ToolWrapper><ProfitLossCalculator /></ToolWrapper>} />
        <Route path="rule-72" element={<ToolWrapper><Rule72 /></ToolWrapper>} />
        <Route path="sip-calculator" element={<ToolWrapper><SIPCalculator /></ToolWrapper>} />
        <Route path="smartloan-simulator" element={<ToolWrapper><SmartLoanSimulator /></ToolWrapper>} />
      </Routes>
    </Suspense>
  );
};

export default ToolsRoutes;
