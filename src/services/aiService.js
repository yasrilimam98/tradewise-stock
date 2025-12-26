// AI Analysis Service using Google Gemini API

const GEMINI_API_KEY = 'AIzaSyBXEnmQCDNuFq2cRYF6ao_IT024B8SRxVs';

// Correct Gemini model names for v1beta API
const GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
];

// Generic AI Analysis function with retry logic
export const analyzeWithAI = async (prompt, context = '') => {
    let lastError = null;

    for (const model of GEMINI_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

            console.log(`Trying AI model: ${model}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${context}\n\n${prompt}\n\nBerikan analisis dalam Bahasa Indonesia yang mudah dipahami. Gunakan bullet points dan emoji untuk memudahkan pembacaan. Jangan terlalu panjang, maksimal 5-7 poin utama.`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    },
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ]
                })
            });

            console.log(`API Response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Model ${model} failed:`, errorText);
                lastError = `${model}: ${response.status} - ${errorText}`;
                continue; // Try next model
            }

            const data = await response.json();
            console.log('API Response:', data);

            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                return {
                    success: true,
                    analysis: data.candidates[0].content.parts[0].text,
                    model: model
                };
            } else if (data.error) {
                lastError = `${model}: ${data.error.message}`;
                continue;
            } else {
                lastError = `${model}: Invalid response format`;
                continue;
            }
        } catch (error) {
            console.error(`AI Analysis Error (${model}):`, error);
            lastError = `${model}: ${error.message}`;
            continue; // Try next model
        }
    }

    // All models failed
    return {
        success: false,
        error: lastError || 'All AI models failed',
        analysis: `⚠️ Tidak dapat menghubungi AI. Error: ${lastError}\n\nSilakan coba lagi dalam beberapa saat atau periksa koneksi internet Anda.`
    };
};

// PVA Analysis Prompt Generator
export const generatePVAPrompt = (data) => {
    const { summary, symbol } = data;

    const context = `Kamu adalah analis saham profesional Indonesia yang ahli dalam Price Volume Analysis (PVA). 
Kamu akan menganalisis saham ${symbol} berdasarkan data berikut:

📊 SUMMARY DATA:
- Trend: ${summary?.overallTrend || 'N/A'}
- Total Net Foreign: Rp ${((summary?.totalNetForeign || 0) / 1e9).toFixed(2)} Miliar
- Akumulasi vs Distribusi: ${summary?.akumulasiCount || 0} vs ${summary?.distribusiCount || 0} periode
- Tektokan terdeteksi: ${summary?.tektokanCount || 0} periode
- Harga terakhir: Rp ${summary?.latest?.close?.toLocaleString() || 'N/A'}
- Volume Trend: ${summary?.volumeTrend || 'N/A'}
- Foreign Flow Trend: ${summary?.foreignFlowTrend || 'N/A'}

📈 Data historis tersedia untuk ${summary?.totalPeriods || 0} periode.`;

    const prompt = `Berdasarkan data PVA di atas untuk saham ${symbol}, berikan analisis profesional mencakup:
1. Kesimpulan utama tentang kondisi saham ini
2. Apakah smart money (asing) sedang akumulasi atau distribusi?
3. Bagaimana kualitas volume transaksi? Ada indikasi tektokan?
4. Rekomendasi trading: BUY, SELL, atau HOLD?
5. Risiko utama yang perlu diperhatikan
6. Target dan stop loss yang disarankan (jika ada)`;

    return { context, prompt };
};

// Value Investing Analysis Prompt Generator
export const generateValueInvestingPrompt = (data) => {
    const { symbol, grahamScore, buffettScore, metrics } = data;

    const context = `Kamu adalah value investor profesional yang mengikuti prinsip Benjamin Graham dan Warren Buffett.
Kamu akan menganalisis saham ${symbol} berdasarkan data fundamental berikut:

📊 SCORING:
- Graham Score: ${grahamScore?.toFixed(0) || 'N/A'}%
- Buffett Score: ${buffettScore?.toFixed(0) || 'N/A'}%

📈 KEY METRICS:
${Object.entries(metrics || {}).map(([key, val]) => `- ${key}: ${val}`).join('\n')}`;

    const prompt = `Berdasarkan data fundamental di atas untuk saham ${symbol}, berikan analisis value investing mencakup:
1. Apakah saham ini layak dibeli menurut kriteria Graham?
2. Apakah saham ini memiliki economic moat menurut kriteria Buffett?
3. Kekuatan dan kelemahan fundamental perusahaan
4. Valuasi: undervalued, fair value, atau overvalued?
5. Rekomendasi untuk investor jangka panjang
6. Risiko fundamental yang perlu diperhatikan`;

    return { context, prompt };
};

// Bandar Detector Analysis Prompt Generator
export const generateBandarPrompt = (data) => {
    const { symbol, brokerSummary, conclusion } = data;

    const context = `Kamu adalah analis teknikal profesional yang ahli dalam menganalisis pergerakan broker (bandar).
Data broker untuk saham ${symbol}:

📊 SUMMARY:
${JSON.stringify(brokerSummary, null, 2)}

Kesimpulan awal: ${conclusion}`;

    const prompt = `Berdasarkan data broker di atas untuk saham ${symbol}, berikan analisis mencakup:
1. Siapa broker dominan yang bermain di saham ini?
2. Apakah ada indikasi akumulasi atau distribusi oleh bandar?
3. Bagaimana pola transaksi lokal vs asing?
4. Apakah ada indikasi market manipulation?
5. Rekomendasi berdasarkan analisis broker flow
6. Timing entry yang tepat berdasarkan aktivitas broker`;

    return { context, prompt };
};

export default {
    analyzeWithAI,
    generatePVAPrompt,
    generateValueInvestingPrompt,
    generateBandarPrompt
};
