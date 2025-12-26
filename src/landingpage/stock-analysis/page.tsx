"use client";

import React, { useState, useEffect, useCallback, FC, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Toaster, toast } from "react-hot-toast";

// --- SVG ICONS (Inline to remove dependencies) ---
const FaUpload: React.FC<{ className?: string }> = ({ className }) => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M296 384h-80c-13.3 0-24-10.7-24-24V192h-87.7c-17.8 0-26.7-21.5-14.1-34.1L242.3 5.7c7.5-7.5 19.8-7.5 27.3 0l152.2 152.2c12.6 12.6 3.7 34.1-14.1 34.1H320v168c0 13.3-10.7 24-24 24zm216-8v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h136v-32H24c-44.2 0-80 35.8-80 80v112c0 44.2 35.8 80 80 80h464c44.2 0 80-35.8 80-80V376c0-44.2-35.8-80-80-80h-136v32h136c13.3 0 24 10.7 24 24z"></path>
  </svg>
);
const FaChartLine: React.FC<{ className?: string }> = ({ className }) => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M500 384c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12H12c-6.6 0-12-5.4-12-12V76c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v308h436zM309.7 214.3l-79.8 79.8-42.5-42.5c-4.7-4.7-12.3-4.7-17 0L104 318.3c-4.7 4.7-4.7 12.3 0 17l17 17c4.7 4.7 12.3 4.7 17 0l58.5-58.5 42.5 42.5c4.7 4.7 12.3 4.7 17 0l96.8-96.8c4.7-4.7 4.7-12.3 0-17l-17-17c-4.7-4.7-12.3-4.7-17.1 0z"></path>
  </svg>
);
const FaNewspaper: React.FC<{ className?: string }> = ({ className }) => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M552 64H64C28.7 64 0 92.7 0 128v256c0 35.3 28.7 64 64 64h448c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64zM128 384H64v-32h64v32zm0-64H64v-32h64v32zm0-64H64v-32h64v32zm128 128h-64v-32h64v32zm0-64h-64v-32h64v32zm0-64h-64v-32h64v32zm128 128h-64v-32h64v32zm0-64h-64v-32h64v32zm0-64h-64v-32h64v32zm128 128H448v-32h64v32zm0-64H448v-32h64v32zm0-64H448v-32h64v32z"></path>
  </svg>
);
const FaBuilding: React.FC<{ className?: string }> = ({ className }) => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M432 448H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zM64 192v192h64V192h-64zm64 224H64v32h64v-32zm128-224v192h64V192h-64zm-64 224h-64v32h64v-32zm192-224v192h64V192h-64zm-64 224h-64v32h64v-32zm64-256h-16V32h-64V0H160v32H96v128h32V64h32v96h128V64h32v96h32zM160 64h128v32H160V64z"></path>
  </svg>
);
const FaTimes = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path>
  </svg>
);
const FaSignal = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M216 288h-48c-8.8 0-16 7.2-16 16v192c0 8.8 7.2 16 16 16h48c8.8 0 16-7.2 16-16V304c0-8.8-7.2-16-16-16zM88 400H40c-8.8 0-16 7.2-16 16v80c0 8.8 7.2 16 16 16h48c8.8 0 16-7.2 16-16v-80c0-8.8-7.2-16-16-16zm256-192h-48c-8.8 0-16 7.2-16 16v176c0 8.8 7.2 16 16 16h48c8.8 0 16-7.2 16-16V224c0-8.8-7.2-16-16-16zm128-128h-48c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h48c8.8 0 16-7.2 16-16V96c0-8.8-7.2-16-16-16zM0 432c0-8.8 7.2-16 16-16h48c8.8 0 16 7.2 16 16v64c0 8.8-7.2 16-16 16H16c-8.8 0-16-7.2-16-16v-64zm128-80c0-8.8 7.2-16 16-16h48c8.8 0 16 7.2 16 16v160c0 8.8-7.2 16-16 16h-48c-8.8 0-16-7.2-16-16V352zm128-128c0-8.8 7.2-16 16-16h48c8.8 0 16 7.2 16 16v288c0 8.8-7.2 16-16 16h-48c-8.8 0-16-7.2-16-16V224zm128-128c0-8.8 7.2-16 16-16h48c8.8 0 16 7.2 16 16v400c0 8.8-7.2 16-16 16h-48c-8.8 0-16-7.2-16-16V96z"></path>
  </svg>
);
const FaChevronDown = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"></path>
  </svg>
);
const FaFileInvoice = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 384 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M377 105L279 7c-4.5-4.5-10.6-7-17-7H64C28.7 0 0 28.7 0 64v384c0 35.3 28.7 64 64 64h256c35.3 0 64-28.7 64-64V122c0-6.4-2.5-12.5-7-17zM256 128H64V32h176v96zm112 352H64V160h208c8.8 0 16-7.2 16-16V32.5L368 144v336zM112 240c-8.8 0-16 7.2-16 16s7.2 16 16 16h160c8.8 0 16-7.2 16-16s-7.2-16-16-16H112zm160 64H112c-8.8 0-16 7.2-16 16s7.2 16 16 16h160c8.8 0 16-7.2 16-16s-7.2-16-16-16zm0 80H112c-8.8 0-16 7.2-16 16s7.2 16 16 16h160c8.8 0 16-7.2 16-16s-7.2-16-16-16z"></path>
  </svg>
);
const FaCheckCircle: React.FC<{ className?: string }> = ({ className }) => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M504 256c0 136.967-111.033 248-248 248S8 392.967 8 256 119.033 8 256 8s248 111.033 248 248zM227.314 387.314l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.249-16.379-6.249-22.628 0L216 308.118l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.249 16.379 6.249 22.628 0z"></path>
  </svg>
);
const FaInfoCircle = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z"></path>
  </svg>
);
const FaExclamationTriangle: React.FC<{ className?: string }> = ({ className }) => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-60.035-39.993-41.577-71.987L246.423 23.987c18.467-32.006 64.72-31.951 83.154 0l239.94 416.026zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-64.383c-6.884 0-12.356 5.78-11.981 12.654z"></path>
  </svg>
);
const FaSignInAlt = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M416 448h-84c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h84c17.7 0 32-14.3 32-32V160c0-17.7-14.3-32-32-32h-84c-6.6 0-12-5.4-12-12V76c0-6.6 5.4-12 12-12h84c53 0 96 43 96 96v192c0 53-43 96-96 96zm-47-201L201 79c-15-15-41-4.5-41 17v96H24c-13.3 0-24 10.7-24 24v96c0 13.3 10.7 24 24 24h136v96c0 21.5 26 32 41 17l168-168c9.3-9.4 9.3-24.6 0-34z"></path>
  </svg>
);
const FaBullseye = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 448c-110.532 0-200-89.451-200-200 0-110.531 89.468-200 200-200 110.532 0 200 89.469 200 200 0 110.549-89.468 200-200 200zm0-100c-55.229 0-100-44.771-100-100s44.771-100 100-100 100 44.771 100 100-44.771 100-100 100zm0-150c-27.614 0-50 22.386-50 50s22.386 50 50 50 50-22.386 50-50-22.386-50-50-50z"></path>
  </svg>
);
const FaShieldAlt = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M466.5 83.7l-192-80a48.15 48.15 0 0 0-36.9 0l-192 80C27.7 91.1 16 108.6 16 128c0 198.5 114.5 363.2 229.2 416 15.4 7.2 34.2 7.2 49.6 0C411.5 491.2 526 326.5 526 128c0-19.4-11.7-36.9-29.5-44.3zM256 448c-54.9-25.3-125.1-92.4-164-191.6C56 163.6 56 64 256 64s200 99.6 200 292.4c-38.9 99.2-109.1 166.3-164 191.6z"></path>
  </svg>
);
const FaPercentage = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M448 448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64C0 28.7 28.7 0 64 0h320c35.3 0 64 28.7 64 64v384zM112 160c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm224 224c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zM359.31 90.34l-256 256c-6.25 6.25-16.38 6.25-22.63 0l-22.63-22.63c-6.25-6.25-6.25-16.38 0-22.63l256-256c6.25-6.25 16.38-6.25 22.63 0l22.63 22.63c6.25 6.25 6.25 16.38 0 22.63z"></path>
  </svg>
);
const SiMarketo = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" height="1em" width="1em" fill="currentColor">
    <title>Marketo</title>
    <path d="M18.868 3.033H5.132A2.096 2.096 0 0 0 3.035 5.13v13.737a2.096 2.096 0 0 0 2.097 2.097h13.736a2.096 2.096 0 0 0 2.097-2.097V5.13a2.096 2.096 0 0 0-2.097-2.098zM8.19 17.534h2.152V12.91L12.55 15.1l2.208-2.19v4.623h2.152V8.562h-2.152l-2.208 2.19-2.208-2.19H8.19v8.972z" />
  </svg>
);

// --- MOCK AUTH CONTEXT (to remove dependency) ---
const AuthContext = createContext({ isAuthenticated: true });
const useAuth = () => useContext(AuthContext);

// --- INTERFACES ---
interface AnalysisResult {
  sentiment: string;
  confidence: number;
  assetType: "stock" | "crypto" | "unknown";
  currency: string;
  technical: {
    keyPoints: string[];
    recommendations: { action: string; entry?: string; tp?: string; sl?: string; status?: string; description: string; currency?: string }[];
  };
  fundamental: {
    keyPoints: string[];
    recommendations: { action: string; entry?: string; tp?: string; sl?: string; status?: string; description: string; currency?: string }[];
  };
  newsSentiment: {
    keyPoints: string[];
    recommendations: { action: string; entry?: string; tp?: string; sl?: string; status?: string; description: string; currency?: string }[];
  };
  summaryRecommendation: {
    type: string;
    status: string;
    strategy: string;
    entryPrice: string;
    tp1: string;
    tp2: string;
    tp3: string;
    stoploss: string;
    winrate: string;
  };
  rawText?: string;
}

interface TradeSignalData {
  type: string;
  status: string;
  strategy: string;
  entryPrice: string;
  tp1: string;
  tp2: string;
  tp3: string;
  stoploss: string;
  winrate: string;
  confidence: string;
  currency: string;
}

// --- UTILITY & PARSING FUNCTION ---
function parseAnalysis(text: string): AnalysisResult {
  const cleanedText = text.replace(/\*/g, "").trim();
  const lines = cleanedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let sentiment = "Unknown";
  let confidence = 0;
  let assetType: "stock" | "crypto" | "unknown" = "unknown";
  let currency = "Rp";
  const technical = { keyPoints: [] as string[], recommendations: [] as AnalysisResult["technical"]["recommendations"] };
  const fundamental = { keyPoints: [] as string[], recommendations: [] as AnalysisResult["fundamental"]["recommendations"] };
  const newsSentiment = { keyPoints: [] as string[], recommendations: [] as AnalysisResult["newsSentiment"]["recommendations"] };
  const summaryRecommendation: AnalysisResult["summaryRecommendation"] = {
    type: "Tidak tersedia",
    status: "Tidak tersedia",
    strategy: "Tidak tersedia",
    entryPrice: "Tidak tersedia",
    tp1: "Tidak tersedia",
    tp2: "Tidak tersedia",
    tp3: "Tidak tersedia",
    stoploss: "Tidak tersedia",
    winrate: "Tidak tersedia",
  };

  let currentSection: "technical" | "fundamental" | "newsSentiment" | "recommendation" | "summary" | null = null;

  lines.forEach((line) => {
    if (/analisis teknikal/i.test(line)) currentSection = "technical";
    else if (/analisis fundamental/i.test(line)) currentSection = "fundamental";
    else if (/analisis sentimen/i.test(line)) currentSection = "newsSentiment";
    else if (/rekomendasi trading/i.test(line)) currentSection = "recommendation";
    else if (/ringkasan rekomendasi/i.test(line)) currentSection = "summary";

    if (/saham|stock|tbk/i.test(line)) assetType = "stock";
    else if (/kripto|crypto|bitcoin|ethereum|token/i.test(line)) assetType = "crypto";

    if (/Rp/i.test(line)) currency = "Rp";
    else if (/\$/i.test(line)) currency = "$";
    else if (/USDT/i.test(line)) currency = "USDT";

    if (/rekomendasi.*(beli|jual|tahan|tunggu|buy|sell|hold|wait)/i.test(line)) {
      const match = line.match(/(beli|jual|tahan|tunggu|buy|sell|hold|wait)/i);
      if (match) {
        sentiment =
          match[1].toLowerCase() === "beli" || match[1].toLowerCase() === "buy"
            ? "Bullish"
            : match[1].toLowerCase() === "jual" || match[1].toLowerCase() === "sell"
            ? "Bearish"
            : match[1].toLowerCase() === "tahan" || match[1].toLowerCase() === "hold"
            ? "Hold"
            : "Wait";
        confidence = confidence || 80;
      }
    } else if (/sentiment.*(positif|negatif|netral|bullish|bearish)/i.test(line)) {
      if (/bullish|positif/i.test(line)) sentiment = "Bullish";
      else if (/bearish|negatif/i.test(line)) sentiment = "Bearish";
      else if (/netral/i.test(line)) sentiment = "Neutral";
      confidence = confidence || 60;
    }

    if (/confidence|keyakinan/i.test(line)) {
      const match = line.match(/(\d+)%?/);
      if (match) confidence = parseInt(match[1], 10);
    }

    if (currentSection === "technical" && /support|resistance|pola|pattern|trend|volume|breakout|rsi|macd|moving average|bollinger/i.test(line)) {
      technical.keyPoints.push(line);
    } else if (currentSection === "fundamental") {
      if (assetType === "stock" && /laba|pendapatan|rasio|p\/e|eps|debt-to-equity|prospek|risiko|nim|npl|valuasi|katalis/i.test(line)) {
        fundamental.keyPoints.push(line);
      } else if (assetType === "crypto" && /tokenomics|supply|demand|burning|staking|on-chain|adopsi/i.test(line)) {
        fundamental.keyPoints.push(line);
      }
    } else if (currentSection === "newsSentiment" && /berita|sentimen|investor|pasar|geopolitik|makroekonomi/i.test(line)) {
      newsSentiment.keyPoints.push(line);
    }

    if (currentSection === "recommendation" && /beli|jual|tahan|tunggu|buy|sell|hold|wait|stop loss|take profit|skenario|manajemen risiko/i.test(line)) {
      let rec: AnalysisResult["technical"]["recommendations"][0] = { action: "", description: line, currency };
      if (/beli|buy/i.test(line)) rec.action = "Buy";
      else if (/jual|sell/i.test(line)) rec.action = "Sell";
      else if (/tahan|hold/i.test(line)) rec.action = "Hold";
      else if (/tunggu|wait/i.test(line)) rec.action = "Wait";

      const priceRegex = /(?:Rp|\$|USDT)?\s*(\d+(?:[.-]\d+)?(?:[-]\d+(?:[.-]\d+)?)?)/i;
      if (/target|take profit|tp/i.test(line)) {
        const match = line.match(priceRegex);
        if (match) rec.tp = match[1];
      } else if (/stop loss|sl/i.test(line)) {
        const match = line.match(priceRegex);
        if (match) rec.sl = match[1];
      } else if (/entry/i.test(line)) {
        const match = line.match(priceRegex);
        if (match) rec.entry = match[1];
      } else if (/skenario.*(agresif|konservatif)/i.test(line)) {
        rec.status = /agresif/i.test(line) ? "Agresif" : "Konservatif";
      }

      if (rec.action || rec.tp || rec.sl || rec.entry || rec.status) {
        technical.recommendations.push(rec);
      } else if (/stop loss|take profit|entry|skenario/i.test(line)) {
        const lastRec = technical.recommendations[technical.recommendations.length - 1];
        if (lastRec) {
          if (/stop loss|sl/i.test(line)) {
            const match = line.match(priceRegex);
            if (match) lastRec.sl = match[1];
          }
          if (/target|take profit|tp/i.test(line)) {
            const match = line.match(priceRegex);
            if (match) lastRec.tp = match[1];
          }
          if (/entry/i.test(line)) {
            const match = line.match(priceRegex);
            if (match) lastRec.entry = match[1];
          }
          if (/skenario/i.test(line)) lastRec.status = /agresif/i.test(line) ? "Agresif" : "Konservatif";
        }
      }
    }

    if (currentSection === "summary" && line.includes(":")) {
      const [key, value] = line.split(":").map((s) => s.trim());
      switch (key.toLowerCase()) {
        case "jenis aset":
        case "jenis":
          summaryRecommendation.type = value;
          break;
        case "status":
          summaryRecommendation.status = value;
          break;
        case "strategi":
          summaryRecommendation.strategy = value;
          break;
        case "entry price":
          summaryRecommendation.entryPrice = value;
          break;
        case "tp1":
          summaryRecommendation.tp1 = value;
          break;
        case "tp2":
          summaryRecommendation.tp2 = value;
          break;
        case "tp3":
          summaryRecommendation.tp3 = value;
          break;
        case "stoploss":
          summaryRecommendation.stoploss = value;
          break;
        case "winrate":
          summaryRecommendation.winrate = value;
          break;
      }
    }
  });

  if (confidence === 0 && sentiment !== "Unknown") {
    confidence = sentiment === "Neutral" ? 60 : 80;
  }
  if (assetType === "unknown" && /tbk/i.test(text)) assetType = "stock";
  if (technical.recommendations.length === 0) {
    technical.recommendations.push({
      action: "Wait",
      description: "Tidak ada rekomendasi trading yang jelas berdasarkan analisis.",
      currency,
    });
  }

  return { sentiment, confidence, assetType, currency, technical, fundamental, newsSentiment, summaryRecommendation, rawText: text };
}

// --- SUB-COMPONENTS ---

const LoadingSpinner: FC<{ className?: string }> = ({ className }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const AccessDeniedModal: FC<{ show: boolean }> = ({ show }) => (
  <AnimatePresence>
    {show && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 20 }}
          className="bg-zinc-900 p-8 rounded-2xl max-w-md w-full border border-red-500/50 shadow-2xl shadow-red-500/10"
        >
          <h2 className="text-2xl font-bold mb-4 text-center text-red-400 flex items-center justify-center gap-3">
            <FaTimes /> Akses Ditolak
          </h2>
          <p className="text-zinc-300 mb-6 text-center">Anda tidak dapat mengakses halaman ini. Silakan hubungi admin untuk akses.</p>
          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => (window.location.href = "/")}
              className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Kembali ke Beranda
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const SignalRow: FC<{ icon: React.ReactElement; label: string; value: string; valueColor?: string }> = ({ icon, label, value, valueColor = "text-zinc-300" }) => (
  <div className="flex justify-between items-center bg-zinc-800/50 p-3 rounded-lg">
    <span className="text-zinc-300 font-medium flex items-center gap-2">
      {icon} {label}
    </span>
    <span className={`font-semibold text-right ${valueColor}`}>{value}</span>
  </div>
);

const SignalModal: FC<{ show: boolean; onClose: () => void; data: TradeSignalData | null }> = ({ show, onClose, data }) => {
  if (!data) return null;

  const statusColor = data.status.toLowerCase().includes("buy")
    ? "text-green-400"
    : data.status.toLowerCase().includes("sell")
    ? "text-red-400"
    : data.status.toLowerCase().includes("hold")
    ? "text-amber-400"
    : "text-sky-400";

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={onClose}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-zinc-900/80 backdrop-blur-lg p-6 rounded-2xl max-w-md w-full border border-cyan-500/30 shadow-2xl shadow-cyan-500/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-zinc-300 flex items-center gap-3">
                <FaSignal /> Sinyal Trade
              </h3>
              <motion.button whileHover={{ scale: 1.2, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="text-zinc-400 hover:text-red-400">
                <FaTimes />
              </motion.button>
            </div>
            <div className="space-y-3">
              <SignalRow icon={<SiMarketo />} label="Jenis Aset" value={data.type} />
              <SignalRow icon={<FaInfoCircle />} label="Status" value={data.status} valueColor={statusColor} />
              <SignalRow icon={<FaFileInvoice />} label="Strategi" value={data.strategy} />
              <SignalRow icon={<FaSignInAlt />} label="Entry Price" value={data.entryPrice} />
              <SignalRow icon={<FaBullseye />} label="Take Profit 1" value={data.tp1} valueColor="text-green-400" />
              <SignalRow icon={<FaBullseye />} label="Take Profit 2" value={data.tp2} valueColor="text-green-400" />
              <SignalRow icon={<FaBullseye />} label="Take Profit 3" value={data.tp3} valueColor="text-green-400" />
              <SignalRow icon={<FaShieldAlt />} label="Stop Loss" value={data.stoploss} valueColor="text-red-400" />
              <SignalRow icon={<FaChartLine />} label="Winrate" value={data.winrate} />
              <SignalRow icon={<FaPercentage />} label="Confidence Level" value={data.confidence} />
            </div>
            <div className="mt-6 p-3 bg-amber-900/30 rounded-lg text-amber-300 text-center text-sm flex items-center justify-center gap-2">
              <FaExclamationTriangle /> <strong>Disclaimer:</strong> Do Your Own Research (DYOR).
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const AnalysisSection: FC<{ title: string; icon: React.ReactElement; points: string[]; isExpanded: boolean; onToggle: () => void }> = ({ title, icon, points, isExpanded, onToggle }) => (
  <div className="bg-zinc-800/50 p-4 rounded-xl shadow-inner">
    <button onClick={onToggle} className="w-full text-left flex items-center justify-between transition-colors hover:text-white">
      <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-3">
        {icon} {title}
      </h3>
      <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} className="text-zinc-400">
        <FaChevronDown />
      </motion.div>
    </button>
    <AnimatePresence>
      {isExpanded && (
        <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: "auto", opacity: 1, marginTop: "1rem" }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="overflow-hidden">
          <ul className="space-y-2">
            {points.length > 0 ? (
              points.map((point, index) => (
                <motion.li key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="flex items-start text-sm gap-2">
                  <FaCheckCircle className="text-zinc-300 mt-1 flex-shrink-0" />
                  <span className="text-zinc-300">{point}</span>
                </motion.li>
              ))
            ) : (
              <li className="text-zinc-400 text-sm italic">Tidak ada poin utama yang terdeteksi untuk analisis ini.</li>
            )}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// --- MAIN PAGE COMPONENT ---
export default function StockAnalysisPage() {
  const { isAuthenticated } = useAuth();
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [includeSentiment, setIncludeSentiment] = useState(true);
  const [includeRekomendasi, setIncludeRekomendasi] = useState(true);
  const [analysisType, setAnalysisType] = useState<string[]>(["Teknikal", "Fundamental"]);

  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    technical: true,
    fundamental: true,
    newsSentiment: true,
  });
  const [showTradeSignalModal, setShowTradeSignalModal] = useState(false);

  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated) {
      setShowAccessDeniedModal(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    }
    setIsCheckingAuth(false);
  }, [isAuthenticated, isCheckingAuth]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error("Ukuran file maksimal 5MB.", { style: { background: "#475569", color: "#F87171" } });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
  });

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error("Silakan unggah gambar chart terlebih dahulu!", { style: { background: "#475569", color: "#F87171" } });
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("includeSentiment", includeSentiment.toString());
      formData.append("includeRekomendasi", includeRekomendasi.toString());
      formData.append("analysisType", JSON.stringify(analysisType));

      // Ganti URL ini dengan URL API backend Anda
      const res = await fetch("https://tradewise-backend.vercel.app/api/analyze", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menganalisis gambar");
      }
      const data = await res.json();
      const parsed = parseAnalysis(data.analysis || "");
      setAnalysisResult(parsed);
      toast.success("Analisis berhasil!", { style: { background: "#475569", color: "#6EE7B7" } });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(errorMsg);
      toast.error(errorMsg, { style: { background: "#475569", color: "#F87171" } });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalysisTypeChange = (type: string) => {
    setAnalysisType((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getTradeSignalData = (): TradeSignalData | null => {
    if (!analysisResult) return null;
    return {
      type: analysisResult.summaryRecommendation.type || analysisResult.assetType,
      status: analysisResult.summaryRecommendation.status,
      strategy: analysisResult.summaryRecommendation.strategy,
      entryPrice: analysisResult.summaryRecommendation.entryPrice,
      tp1: analysisResult.summaryRecommendation.tp1,
      tp2: analysisResult.summaryRecommendation.tp2,
      tp3: analysisResult.summaryRecommendation.tp3,
      stoploss: analysisResult.summaryRecommendation.stoploss,
      winrate: analysisResult.summaryRecommendation.winrate,
      confidence: `${analysisResult.confidence}%`,
      currency: analysisResult.currency,
    };
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <LoadingSpinner className="w-12 h-12 text-cyan-500" />
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "10px",
            background: "#334155",
            color: "#fff",
          },
        }}
      />
      <AccessDeniedModal show={showAccessDeniedModal} />
      <SignalModal show={showTradeSignalModal} onClose={() => setShowTradeSignalModal(false)} data={getTradeSignalData()} />

      {isAuthenticated && (
        <main className="min-h-screen bg-black text-gray-200 p-4 md:p-6 font-sans">
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; }
          `}</style>

          <div className="container mx-auto max-w-7xl">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-sky-500">AI Asset Analyzer</h1>
              <p className="text-zinc-400 mt-2 max-w-2xl mx-auto">Unggah screenshot chart (saham atau kripto) untuk mendapatkan analisis teknikal, fundamental, dan sentimen pasar secara instan.</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Panel */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-6">
                {/* Options Card */}
                <div className="bg-zinc-900/60 backdrop-blur-sm p-5 rounded-2xl border border-zinc-700">
                  <h2 className="text-lg font-bold mb-4 text-zinc-300 flex items-center gap-2">
                    <FaInfoCircle /> Opsi Analisis
                  </h2>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                      <label htmlFor="includeSentiment" className="flex items-center gap-2 cursor-pointer text-sm text-zinc-200">
                        <input
                          type="checkbox"
                          id="includeSentiment"
                          checked={includeSentiment}
                          onChange={(e) => setIncludeSentiment(e.target.checked)}
                          className="w-4 h-4 rounded text-cyan-500 bg-zinc-800 border-zinc-600 focus:ring-white"
                        />
                        Sentimen Berita
                      </label>
                      <label htmlFor="includeRekomendasi" className="flex items-center gap-2 cursor-pointer text-sm text-zinc-200">
                        <input
                          type="checkbox"
                          id="includeRekomendasi"
                          checked={includeRekomendasi}
                          onChange={(e) => setIncludeRekomendasi(e.target.checked)}
                          className="w-4 h-4 rounded text-cyan-500 bg-zinc-800 border-zinc-600 focus:ring-white"
                        />
                        Rekomendasi
                      </label>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-zinc-300">Jenis Analisis Diminta:</label>
                      <div className="flex flex-wrap gap-2">
                        {["Teknikal", "Fundamental"].map((type) => (
                          <motion.button
                            key={type}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAnalysisTypeChange(type)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                              analysisType.includes(type) ? "bg-cyan-500 text-slate-900 shadow-md shadow-cyan-500/20" : "bg-zinc-800 text-zinc-300 hover:bg-slate-600"
                            }`}
                          >
                            {type}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload Card */}
                <div className="bg-zinc-900/60 backdrop-blur-sm p-5 rounded-2xl border border-zinc-700 flex flex-col">
                  <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed ${isDragActive ? "border-cyan-400 bg-cyan-900/20" : "border-zinc-600"} 
                    rounded-xl p-6 text-center transition-colors duration-300 flex-grow flex flex-col justify-center items-center min-h-[250px]`}
                  >
                    <input {...getInputProps()} />

                    <AnimatePresence>
                      {selectedImage ? (
                        <motion.div
                          key="image"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="relative h-full w-full flex items-center justify-center"
                        >
                          <img src={selectedImage} alt="Selected chart" style={{ objectFit: "contain", width: "100%", height: "100%" }} className="rounded-lg" />
                          <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: "#ef4444" }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImage(null);
                              setSelectedFile(null);
                            }}
                            className="absolute top-2 right-2 bg-zinc-800 text-white p-2 rounded-full z-10 transition-colors"
                          >
                            <FaTimes />
                          </motion.button>
                        </motion.div>
                      ) : (
                        <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-zinc-400 flex flex-col items-center gap-3">
                          <FaUpload className="text-4xl" />
                          <p className="font-semibold">Seret & lepas gambar di sini</p>
                          <p className="text-sm">atau klik untuk memilih file</p>
                          <p className="text-xs text-zinc-500 mt-2">PNG, JPG, WEBP (maks. 5MB)</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <p className="text-xs text-amber-400/80 mt-4 text-center flex items-start gap-2">
                    <FaExclamationTriangle className="mt-0.5 flex-shrink-0" /> <span>Pastikan gambar menyertakan ticker/pair (e.g., ADRO, BTC/USDT) dan timeframe (e.g., 1H, 1D) untuk akurasi terbaik.</span>
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAnalyze}
                  disabled={!selectedImage || isAnalyzing}
                  className="w-full bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold py-3 px-4 rounded-xl transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20 disabled:shadow-none flex items-center justify-center gap-3"
                >
                  {isAnalyzing ? (
                    <>
                      {" "}
                      <LoadingSpinner className="w-5 h-5" /> Menganalisis...{" "}
                    </>
                  ) : (
                    <>
                      {" "}
                      <FaChartLine /> Analisis Chart{" "}
                    </>
                  )}
                </motion.button>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-900/50 text-red-300 p-3 rounded-lg text-center text-sm border border-red-800">
                    {error}
                  </motion.div>
                )}
              </motion.div>

              {/* Right Panel */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 bg-zinc-900/60 backdrop-blur-sm p-2 md:p-4 rounded-2xl border border-zinc-700">
                <div className="h-[calc(100vh-10rem)] overflow-y-auto p-2 pr-1">
                  <div className="flex justify-between items-center sticky top-0 bg-zinc-900/80 backdrop-blur-sm z-10 py-3 px-2 rounded-t-lg mb-4">
                    <h2 className="text-xl font-bold text-zinc-300 flex items-center gap-3">
                      <FaFileInvoice /> Hasil Analisis
                    </h2>
                    {analysisResult && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowTradeSignalModal(true)}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm shadow-md shadow-green-500/20 transition-colors"
                      >
                        <FaSignal /> Sinyal Trade
                      </motion.button>
                    )}
                  </div>

                  {analysisResult ? (
                    <div className="space-y-4 px-2">
                      {/* Summary Card */}
                      {includeSentiment && (
                        <div className="bg-zinc-800/50 p-4 rounded-xl">
                          <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-3">
                            <FaNewspaper className="text-zinc-300" />
                            Ringkasan Sentimen
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                            <div className="p-3 bg-zinc-900/50 rounded-lg">
                              <p className="text-sm text-zinc-400">Sentimen</p>
                              <p
                                className={`font-bold text-lg ${
                                  analysisResult.sentiment === "Bullish"
                                    ? "text-green-400"
                                    : analysisResult.sentiment === "Bearish"
                                    ? "text-red-400"
                                    : analysisResult.sentiment === "Hold"
                                    ? "text-amber-400"
                                    : "text-sky-400"
                                }`}
                              >
                                {analysisResult.sentiment}
                              </p>
                            </div>
                            <div className="p-3 bg-zinc-900/50 rounded-lg">
                              <p className="text-sm text-zinc-400">Keyakinan</p>
                              <p className="font-bold text-lg text-zinc-300">{analysisResult.confidence}%</p>
                            </div>
                            <div className="p-3 bg-zinc-900/50 rounded-lg col-span-2 md:col-span-1">
                              <p className="text-sm text-zinc-400">Jenis Aset</p>
                              <p className="font-bold text-lg text-zinc-300 capitalize">{analysisResult.assetType}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {analysisType.includes("Teknikal") && (
                        <AnalysisSection
                          title="Analisis Teknikal"
                          icon={<FaChartLine className="text-zinc-300" />}
                          points={analysisResult.technical.keyPoints}
                          isExpanded={expandedSections.technical}
                          onToggle={() => toggleSection("technical")}
                        />
                      )}

                      {analysisType.includes("Fundamental") && (
                        <AnalysisSection
                          title="Analisis Fundamental"
                          icon={<FaBuilding className="text-zinc-300" />}
                          points={analysisResult.fundamental.keyPoints}
                          isExpanded={expandedSections.fundamental}
                          onToggle={() => toggleSection("fundamental")}
                        />
                      )}

                      {includeSentiment && (
                        <AnalysisSection
                          title="Sentimen Berita & Pasar"
                          icon={<FaNewspaper className="text-zinc-300" />}
                          points={analysisResult.newsSentiment.keyPoints}
                          isExpanded={expandedSections.newsSentiment}
                          onToggle={() => toggleSection("newsSentiment")}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-zinc-500 py-16 flex flex-col items-center gap-4 h-full justify-center">
                      <FaChartLine className="text-5xl" />
                      <p className="font-semibold text-zinc-400">Menunggu Analisis</p>
                      <p className="text-sm max-w-xs">Unggah gambar chart dan klik tombol "Analisis Chart" untuk melihat hasilnya di sini.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </main>
      )}
    </>
  );
}
