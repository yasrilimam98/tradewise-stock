import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';
import { getAllStocks, getStocksByBoard, getBoardStats } from '../services/stockApi';

const MarketOverview = () => {
  const [activeTab, setActiveTab] = useState('popular');
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = () => {
    setLoading(true);
    
    // Get stocks based on active tab
    let stockList = [];
    if (activeTab === 'popular') {
      // Get popular blue chip stocks
      const popularSymbols = ['BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII', 'UNVR', 'ADRO', 'GOTO', 'BUKA', 'AMMN'];
      const allStocks = getAllStocks();
      stockList = popularSymbols
        .map(symbol => allStocks.find(s => s.symbol === symbol))
        .filter(Boolean)
        .slice(0, 8);
    } else if (activeTab === 'utama') {
      stockList = getStocksByBoard('Utama').slice(0, 8);
    } else if (activeTab === 'new') {
      stockList = getStocksByBoard('Ekonomi Baru').slice(0, 8);
    }

    // Add simulated price data
    stockList = stockList.map(stock => ({
      ...stock,
      price: Math.floor(Math.random() * 10000) + 500,
      change: (Math.random() - 0.5) * 10
    }));

    setStocks(stockList);
    setLoading(false);
  };

  const tabs = [
    { key: 'popular', label: 'Populer', icon: Activity },
    { key: 'utama', label: 'Papan Utama', icon: TrendingUp },
    { key: 'new', label: 'Ekonomi Baru', icon: TrendingDown },
  ];

  const boardStats = getBoardStats();

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl 
                    shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50
                    border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
            📊 Market Overview
          </h3>
          <button 
            onClick={loadData}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={16} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Board Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{boardStats['Utama'] || 0}</div>
            <div className="text-[10px] text-blue-500">Utama</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{boardStats['Pengembangan'] || 0}</div>
            <div className="text-[10px] text-green-500">Pengembangan</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{getAllStocks().length}</div>
            <div className="text-[10px] text-purple-500">Total</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg transition-all
                         ${activeTab === tab.key 
                           ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' 
                           : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <tab.icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stock List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {loading ? (
          <div className="p-8 flex justify-center">
            <RefreshCw size={24} className="text-blue-500 animate-spin" />
          </div>
        ) : stocks.length > 0 ? (
          stocks.map((stock, index) => (
            <div 
              key={stock.symbol}
              className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold
                               ${index < 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 
                                 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{stock.symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                      {stock.board}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                    {stock.name}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {new Intl.NumberFormat('id-ID').format(stock.price)}
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium justify-end
                                ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {stock.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            Tidak ada data
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200/50 dark:border-slate-700/50 
                      bg-slate-50/50 dark:bg-slate-900/30 text-center">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Data dari 955 emiten IDX (harga simulasi)
        </span>
      </div>
    </div>
  );
};

export default MarketOverview;
