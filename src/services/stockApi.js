// Stock Data Service - Using local IDX data from Excel
// Total: 955 emiten dari Bursa Efek Indonesia

import { IDX_STOCKS } from '../data/stockList';

/**
 * Search stocks by symbol or name
 * @param {string} query - Search query
 * @param {number} limit - Maximum results (default 15)
 * @returns {Array} Filtered stocks
 */
export const searchStocks = (query, limit = 15) => {
    if (!query || query.length < 1) return [];

    const searchTerm = query.toUpperCase().trim();

    // Prioritize exact symbol matches first
    const exactSymbol = IDX_STOCKS.filter(s => s.symbol === searchTerm);

    // Then symbol starts with
    const symbolStartsWith = IDX_STOCKS.filter(s =>
        s.symbol.startsWith(searchTerm) && s.symbol !== searchTerm
    );

    // Then symbol contains (but not starts with)
    const symbolContains = IDX_STOCKS.filter(s =>
        s.symbol.includes(searchTerm) && !s.symbol.startsWith(searchTerm)
    );

    // Then name contains
    const nameContains = IDX_STOCKS.filter(s =>
        s.name.toUpperCase().includes(searchTerm) &&
        !s.symbol.includes(searchTerm)
    );

    return [...exactSymbol, ...symbolStartsWith, ...symbolContains, ...nameContains].slice(0, limit);
};

/**
 * Get all stocks
 * @returns {Array} All IDX stocks (955 emiten)
 */
export const getAllStocks = () => IDX_STOCKS;

/**
 * Get total stock count
 * @returns {number} Total number of stocks
 */
export const getTotalStockCount = () => IDX_STOCKS.length;

/**
 * Get stock info by symbol
 * @param {string} symbol - Stock symbol (e.g., 'BBCA')
 * @returns {Object|null} Stock info or null if not found
 */
export const getStockInfo = (symbol) => {
    if (!symbol) return null;
    return IDX_STOCKS.find(s => s.symbol === symbol.toUpperCase()) || null;
};

/**
 * Get stocks by board
 * @param {string} board - Board name ('Utama', 'Pengembangan', 'Akselerasi', 'Pemantauan Khusus', 'Ekonomi Baru')
 * @returns {Array} Stocks in that board
 */
export const getStocksByBoard = (board) => {
    return IDX_STOCKS.filter(s => s.board === board);
};

/**
 * Get stock counts by board
 * @returns {Object} Counts per board
 */
export const getBoardStats = () => {
    const stats = {};
    IDX_STOCKS.forEach(stock => {
        stats[stock.board] = (stats[stock.board] || 0) + 1;
    });
    return stats;
};

/**
 * Get all unique boards
 * @returns {Array} List of board names
 */
export const getAllBoards = () => {
    const boards = new Set(IDX_STOCKS.map(s => s.board));
    return Array.from(boards);
};

/**
 * Get random stocks for display
 * @param {number} count - Number of stocks to return
 * @returns {Array} Random stocks
 */
export const getRandomStocks = (count = 10) => {
    const shuffled = [...IDX_STOCKS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
};

/**
 * Get popular blue chip stocks
 * @returns {Array} Popular stocks
 */
export const getPopularStocks = () => {
    const popularSymbols = [
        'BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM',
        'ASII', 'UNVR', 'ADRO', 'GOTO', 'BUKA',
        'ICBP', 'INDF', 'KLBF', 'MYOR', 'ANTM'
    ];
    return popularSymbols
        .map(symbol => IDX_STOCKS.find(s => s.symbol === symbol))
        .filter(Boolean);
};

/**
 * Check if a symbol exists
 * @param {string} symbol - Stock symbol
 * @returns {boolean} True if exists
 */
export const isValidStock = (symbol) => {
    if (!symbol) return false;
    return IDX_STOCKS.some(s => s.symbol === symbol.toUpperCase());
};

// Default export
const stockApi = {
    searchStocks,
    getAllStocks,
    getTotalStockCount,
    getStockInfo,
    getStocksByBoard,
    getBoardStats,
    getAllBoards,
    getRandomStocks,
    getPopularStocks,
    isValidStock
};

export default stockApi;
