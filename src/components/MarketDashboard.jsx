import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Activity, RefreshCw, AlertCircle,
  ArrowUpRight, ArrowDownRight, BarChart3, Users, Calendar,
  Zap, DollarSign, PieChart, Clock, ChevronRight, Settings,
  Globe, Building, Banknote, Filter, Eye, TrendingUp as TrendUp
} from 'lucide-react';
import { Card, Button, LoadingSpinner } from './ui';
import {
  getIHSGData, getTopGainer, getTopLoser, getTopValue, getTopVolume,
  getTopFrequency, getNetForeignBuy, getNetForeignSell, getCalendarEvents,
  getScreenerData, hasToken, formatNumber, formatPercentage
} from '../services/stockbitService';

// Demo data for when API is not available
const DEMO_IHSG = {
  data: {
    symbol: 'IHSG',
    name: 'Index Harga Saham Gabungan',
    lastprice: 7245.32,
    change: 45.67,
    percentage_change: 0.63,
    open: 7199.65,
    high: 7268.45,
    low: 7189.23,
    previous: 7199.65,
    volume: 15234567800,
    value: 12456789000000,
    frequency: 1234567,
    up: '285',
    down: '156',
    unchanged: '89',
    domestic: '72.5',
    foreign: '27.5',
    fnet: -125678900000,
    fbuy: 2345678900000,
    fsell: 2471357800000,
    market_data: [
      { label: 'All Market', value: { formatted: '18.5 T' }, volume: { formatted: '25.3 B' }, frequency: { formatted: '1.89 M' } },
      { label: 'Regular', value: { formatted: '12.4 T' }, volume: { formatted: '18.7 B' }, frequency: { formatted: '1.85 M' } },
      { label: 'Nego', value: { formatted: '5.9 T' }, volume: { formatted: '6.4 B' }, frequency: { formatted: '756' } },
      { label: 'Cash', value: { formatted: '189 M' }, volume: { formatted: '245 K' }, frequency: { formatted: '12' } },
    ]
  }
};

const DEMO_MOVERS = {
  data: {
    mover_list: [
      { stock_detail: { code: 'BBRI', name: 'Bank Rakyat Indonesia', icon_url: '' }, price: 4850, change: { value: 125, percentage: 2.65 }, value: { formatted: '1.2 T' }, volume: { formatted: '245 M' } },
      { stock_detail: { code: 'BBCA', name: 'Bank Central Asia', icon_url: '' }, price: 9875, change: { value: 200, percentage: 2.07 }, value: { formatted: '890 B' }, volume: { formatted: '89 M' } },
      { stock_detail: { code: 'TLKM', name: 'Telkom Indonesia', icon_url: '' }, price: 3240, change: { value: 60, percentage: 1.89 }, value: { formatted: '567 B' }, volume: { formatted: '175 M' } },
      { stock_detail: { code: 'ASII', name: 'Astra International', icon_url: '' }, price: 5125, change: { value: 75, percentage: 1.49 }, value: { formatted: '432 B' }, volume: { formatted: '84 M' } },
      { stock_detail: { code: 'BMRI', name: 'Bank Mandiri', icon_url: '' }, price: 6350, change: { value: 100, percentage: 1.60 }, value: { formatted: '678 B' }, volume: { formatted: '107 M' } },
    ]
  }
};

const DEMO_LOSERS = {
  data: {
    mover_list: [
      { stock_detail: { code: 'BUMI', name: 'Bumi Resources', icon_url: '' }, price: 98, change: { value: -7, percentage: -6.67 }, value: { formatted: '89 B' }, volume: { formatted: '912 M' } },
      { stock_detail: { code: 'ANTM', name: 'Aneka Tambang', icon_url: '' }, price: 1450, change: { value: -75, percentage: -4.92 }, value: { formatted: '234 B' }, volume: { formatted: '161 M' } },
      { stock_detail: { code: 'INCO', name: 'Vale Indonesia', icon_url: '' }, price: 4280, change: { value: -180, percentage: -4.04 }, value: { formatted: '178 B' }, volume: { formatted: '41 M' } },
      { stock_detail: { code: 'PTBA', name: 'Bukit Asam', icon_url: '' }, price: 2650, change: { value: -90, percentage: -3.28 }, value: { formatted: '145 B' }, volume: { formatted: '54 M' } },
      { stock_detail: { code: 'ADRO', name: 'Adaro Energy', icon_url: '' }, price: 2340, change: { value: -60, percentage: -2.50 }, value: { formatted: '312 B' }, volume: { formatted: '133 M' } },
    ]
  }
};

const DEMO_EVENTS = {
  data: {
    rups: [
      { company_symbol: 'BRIS', rups_date: '2025-12-24', rups_time: '14:00', rups_venue: 'Online Meeting' },
    ],
    dividend: [],
    pubex: [
      { company_symbol: 'DEWA', puexp_date: '2025-12-24', puexp_time: '16:30', puexp_venue: 'Financial Hall Jakarta' },
    ],
    tender: [],
    warrant: [],
  }
};

const DEMO_SCREENER = {
  data: {
    screen_name: 'Screener Bandar',
    totalrows: 10,
    columns: [
      { id: 14424, name: 'Bandar Value MA 10' },
      { id: 14426, name: 'Bandar Value MA 20' },
      { id: 15490, name: 'Previous Volume' },
      { id: 12464, name: 'Volume MA 20' },
    ],
    calcs: [
      { company: { symbol: 'CASA', name: 'Capital Finance Indonesia Tbk.', icon_url: 'https://assets.stockbit.com/logos/companies/CASA.png' }, results: [{ id: 14424, display: '1,472.29 B' }, { id: 14426, display: '1,471.79 B' }, { id: 15490, display: '1,107,800.00' }, { id: 12464, display: '946,885.00' }] },
      { company: { symbol: 'TCPI', name: 'Transcoal Pacific Tbk.', icon_url: 'https://assets.stockbit.com/logos/companies/TCPI.png' }, results: [{ id: 14424, display: '267.57 B' }, { id: 14426, display: '267.51 B' }, { id: 15490, display: '12,407,600.00' }, { id: 12464, display: '7,583,355.00' }] },
      { company: { symbol: 'EMAS', name: 'Merdeka Gold Resources Tbk.', icon_url: '' }, results: [{ id: 14424, display: '124.36 B' }, { id: 14426, display: '100.34 B' }, { id: 15490, display: '37,756,000.00' }, { id: 12464, display: '32,478,990.00' }] },
      { company: { symbol: 'IMPC', name: 'Impack Pratama Industri Tbk.', icon_url: '' }, results: [{ id: 14424, display: '83.01 B' }, { id: 14426, display: '23.00 B' }, { id: 15490, display: '56,940,700.00' }, { id: 12464, display: '53,856,360.00' }] },
      { company: { symbol: 'TBIG', name: 'Tower Bersama Infrastructure Tbk.', icon_url: '' }, results: [{ id: 14424, display: '57.46 B' }, { id: 14426, display: '55.62 B' }, { id: 15490, display: '11,302,000.00' }, { id: 12464, display: '3,217,565.00' }] },
      { company: { symbol: 'INETsss', name: 'Sinergi Inti Andalan Prima Tbk.', icon_url: '' }, results: [{ id: 14424, display: '53.31 B' }, { id: 14426, display: '33.59 B' }, { id: 15490, display: '1,555,948,000.00' }, { id: 12464, display: '363,819,680.00' }] },
      { company: { symbol: 'CMNT', name: 'Cemindo Gemilang Tbk.', icon_url: '' }, results: [{ id: 14424, display: '50.60 B' }, { id: 14426, display: '49.08 B' }, { id: 15490, display: '27,313,400.00' }, { id: 12464, display: '21,576,315.00' }] },
      { company: { symbol: 'DKFT', name: 'Central Omega Resources Tbk.', icon_url: '' }, results: [{ id: 14424, display: '34.88 B' }, { id: 14426, display: '32.95 B' }, { id: 15490, display: '26,544,600.00' }, { id: 12464, display: '14,872,085.00' }] },
    ]
  }
};

const MarketDashboard = ({ onNavigateToSettings }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Data states
  const [ihsgData, setIhsgData] = useState(null);
  const [topGainers, setTopGainers] = useState([]);
  const [topLosers, setTopLosers] = useState([]);
  const [topValue, setTopValue] = useState([]);
  const [topVolume, setTopVolume] = useState([]);
  const [topFrequency, setTopFrequency] = useState([]);
  const [foreignBuy, setForeignBuy] = useState([]);
  const [foreignSell, setForeignSell] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState(null);
  const [screenerData, setScreenerData] = useState(null);
  
  // Active tabs
  const [activeMoversTab, setActiveMoversTab] = useState('gainer');
  const [activeForeignTab, setActiveForeignTab] = useState('buy');
  const [useDemo, setUseDemo] = useState(false);

  const loadDemoData = useCallback(() => {
    setIhsgData(DEMO_IHSG.data);
    setTopGainers(DEMO_MOVERS.data.mover_list);
    setTopLosers(DEMO_LOSERS.data.mover_list);
    setTopValue(DEMO_MOVERS.data.mover_list);
    setTopVolume(DEMO_MOVERS.data.mover_list);
    setTopFrequency(DEMO_MOVERS.data.mover_list);
    setForeignBuy(DEMO_MOVERS.data.mover_list);
    setForeignSell(DEMO_LOSERS.data.mover_list);
    setCalendarEvents(DEMO_EVENTS.data);
    setScreenerData(DEMO_SCREENER.data);
    setLastUpdated(new Date());
    setUseDemo(true);
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!hasToken()) {
      setError('Token belum diset. Silakan masukkan Bearer Token di Pengaturan.');
      loadDemoData();
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch all data in parallel
      const [
        ihsgRes, gainerRes, loserRes, valueRes, volumeRes, 
        freqRes, fBuyRes, fSellRes, calRes, screenerRes
      ] = await Promise.allSettled([
        getIHSGData(),
        getTopGainer(),
        getTopLoser(),
        getTopValue(),
        getTopVolume(),
        getTopFrequency(),
        getNetForeignBuy(),
        getNetForeignSell(),
        getCalendarEvents(),
        getScreenerData(),
      ]);

      // Process results
      if (ihsgRes.status === 'fulfilled') setIhsgData(ihsgRes.value.data);
      if (gainerRes.status === 'fulfilled') setTopGainers(gainerRes.value.data?.mover_list || []);
      if (loserRes.status === 'fulfilled') setTopLosers(loserRes.value.data?.mover_list || []);
      if (valueRes.status === 'fulfilled') setTopValue(valueRes.value.data?.mover_list || []);
      if (volumeRes.status === 'fulfilled') setTopVolume(volumeRes.value.data?.mover_list || []);
      if (freqRes.status === 'fulfilled') setTopFrequency(freqRes.value.data?.mover_list || []);
      if (fBuyRes.status === 'fulfilled') setForeignBuy(fBuyRes.value.data?.mover_list || []);
      if (fSellRes.status === 'fulfilled') setForeignSell(fSellRes.value.data?.mover_list || []);
      if (calRes.status === 'fulfilled') setCalendarEvents(calRes.value.data);
      if (screenerRes.status === 'fulfilled') setScreenerData(screenerRes.value.data);

      // Check if all failed due to CORS
      const allFailed = [ihsgRes, gainerRes, loserRes].every(r => r.status === 'rejected');
      if (allFailed) {
        const corsError = [ihsgRes, gainerRes, loserRes].some(
          r => r.reason?.message?.includes('CORS')
        );
        if (corsError) {
          setError('CORS Error: API tidak dapat diakses langsung dari browser. Menggunakan data demo.');
          loadDemoData();
        } else {
          setError('Gagal memuat data. Menggunakan data demo.');
          loadDemoData();
        }
      } else {
        setUseDemo(false);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
      loadDemoData();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [loadDemoData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllData();
  };

  // Get movers data based on active tab
  const getActiveMovers = () => {
    switch (activeMoversTab) {
      case 'gainer': return topGainers;
      case 'loser': return topLosers;
      case 'value': return topValue;
      case 'volume': return topVolume;
      case 'frequency': return topFrequency;
      default: return topGainers;
    }
  };

  const getActiveForeign = () => {
    return activeForeignTab === 'buy' ? foreignBuy : foreignSell;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner message="Memuat data market..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-7 h-7" />
            Market Overview
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {lastUpdated ? `Update terakhir: ${lastUpdated.toLocaleTimeString('id-ID')}` : 'Data belum dimuat'}
            {useDemo && <span className="ml-2 text-yellow-500">(Demo Mode)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="secondary"
            size="sm"
            loading={isRefreshing}
            icon={<RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          {(!hasToken() || useDemo) && (
            <Button
              onClick={onNavigateToSettings}
              variant="outline"
              size="sm"
              icon={<Settings size={16} />}
            >
              Set Token
            </Button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-400">{error}</p>
            {!hasToken() && (
              <button 
                onClick={onNavigateToSettings}
                className="text-sm text-yellow-500 hover:text-yellow-400 underline mt-1"
              >
                Klik di sini untuk set Bearer Token
              </button>
            )}
          </div>
        </div>
      )}

      {/* IHSG Main Card */}
      {ihsgData && (
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800/50 to-transparent" />
          <div className="relative p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Main Price Display */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{ihsgData.symbol}</h2>
                    <p className="text-sm text-gray-400">{ihsgData.name}</p>
                  </div>
                </div>
                
                <div className="flex items-end gap-4 mb-6">
                  <span className="text-4xl lg:text-5xl font-bold text-white">
                    {ihsgData.lastprice?.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                  </span>
                  <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                    ihsgData.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {ihsgData.change >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    <span className="font-semibold">
                      {ihsgData.change >= 0 ? '+' : ''}{ihsgData.change?.toFixed(2)}
                    </span>
                    <span className="font-semibold">
                      ({formatPercentage(ihsgData.percentage_change)})
                    </span>
                  </div>
                </div>

                {/* OHLC */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Open', value: ihsgData.open },
                    { label: 'High', value: ihsgData.high },
                    { label: 'Low', value: ihsgData.low },
                    { label: 'Previous', value: ihsgData.previous },
                  ].map((item) => (
                    <div key={item.label} className="bg-black/30 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                      <p className="text-lg font-semibold text-white">
                        {item.value?.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="lg:w-80 space-y-4">
                {/* Up/Down/Unchanged */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                    <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-green-400">{ihsgData.up}</p>
                    <p className="text-xs text-gray-500">Naik</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                    <TrendingDown className="w-5 h-5 text-red-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-red-400">{ihsgData.down}</p>
                    <p className="text-xs text-gray-500">Turun</p>
                  </div>
                  <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-3 text-center">
                    <Activity className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-400">{ihsgData.unchanged}</p>
                    <p className="text-xs text-gray-500">Tetap</p>
                  </div>
                </div>

                {/* Foreign Flow */}
                <div className="bg-black/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400 flex items-center gap-2">
                      <Globe size={16} /> Foreign Flow
                    </span>
                    <span className={`text-sm font-semibold ${
                      ihsgData.fnet >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {ihsgData.fnet >= 0 ? '+' : ''}{formatNumber(ihsgData.fnet)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-blue-500/20 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-400">Domestic</p>
                      <p className="text-sm font-semibold text-blue-400">{ihsgData.domestic}%</p>
                    </div>
                    <div className="flex-1 bg-purple-500/20 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-400">Foreign</p>
                      <p className="text-sm font-semibold text-purple-400">{ihsgData.foreign}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Data */}
            {ihsgData.market_data && (
              <div className="mt-6 pt-6 border-t border-gray-800">
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Market Summary</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {ihsgData.market_data.map((market) => (
                    <div key={market.label} className="bg-black/30 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-2">{market.label}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Value</span>
                          <span className="text-sm font-medium text-white">{market.value?.formatted || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Volume</span>
                          <span className="text-sm font-medium text-gray-300">{market.volume?.formatted || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Freq</span>
                          <span className="text-sm font-medium text-gray-300">{market.frequency?.formatted || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Movers */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Top Movers
            </h3>
          </div>
          
          {/* Tabs */}
          <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-800">
            {[
              { id: 'gainer', label: 'Gainer', icon: TrendingUp, color: 'text-green-400' },
              { id: 'loser', label: 'Loser', icon: TrendingDown, color: 'text-red-400' },
              { id: 'value', label: 'Value', icon: DollarSign, color: 'text-blue-400' },
              { id: 'volume', label: 'Volume', icon: BarChart3, color: 'text-purple-400' },
              { id: 'frequency', label: 'Freq', icon: Activity, color: 'text-cyan-400' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMoversTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all
                           ${activeMoversTab === tab.id 
                             ? `${tab.color} border-b-2 border-current bg-white/5` 
                             : 'text-gray-500 hover:text-gray-300'}`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Movers List */}
          <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
            {getActiveMovers().slice(0, 10).map((stock, index) => (
              <MoverRow key={stock.stock_detail?.code || index} stock={stock} rank={index + 1} type={activeMoversTab} />
            ))}
            {getActiveMovers().length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Tidak ada data</p>
              </div>
            )}
          </div>
        </Card>

        {/* Foreign Flow */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              Net Foreign Flow
            </h3>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveForeignTab('buy')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all
                         ${activeForeignTab === 'buy' 
                           ? 'text-green-400 border-b-2 border-green-400 bg-green-500/5' 
                           : 'text-gray-500 hover:text-gray-300'}`}
            >
              <ArrowUpRight size={16} />
              Net Buy
            </button>
            <button
              onClick={() => setActiveForeignTab('sell')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all
                         ${activeForeignTab === 'sell' 
                           ? 'text-red-400 border-b-2 border-red-400 bg-red-500/5' 
                           : 'text-gray-500 hover:text-gray-300'}`}
            >
              <ArrowDownRight size={16} />
              Net Sell
            </button>
          </div>

          {/* Foreign List */}
          <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
            {getActiveForeign().slice(0, 10).map((stock, index) => (
              <ForeignRow key={stock.stock_detail?.code || index} stock={stock} rank={index + 1} type={activeForeignTab} />
            ))}
            {getActiveForeign().length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Tidak ada data</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Calendar Events */}
      {calendarEvents && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-400" />
              Corporate Events Hari Ini
            </h3>
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* RUPS */}
              {calendarEvents.rups?.length > 0 && (
                <EventCard
                  title="RUPS"
                  icon={Users}
                  color="blue"
                  events={calendarEvents.rups.map(e => ({
                    symbol: e.company_symbol,
                    time: e.rups_time,
                    venue: e.rups_venue
                  }))}
                />
              )}
              
              {/* Public Expose */}
              {calendarEvents.pubex?.length > 0 && (
                <EventCard
                  title="Public Expose"
                  icon={Building}
                  color="purple"
                  events={calendarEvents.pubex.map(e => ({
                    symbol: e.company_symbol,
                    time: e.puexp_time,
                    venue: e.puexp_venue
                  }))}
                />
              )}
              
              {/* Dividend */}
              {calendarEvents.dividend?.length > 0 && (
                <EventCard
                  title="Dividend"
                  icon={Banknote}
                  color="green"
                  events={calendarEvents.dividend.map(e => ({
                    symbol: e.company_symbol,
                    info: e.dividend_amount || 'Pembagian Dividen'
                  }))}
                />
              )}
              
              {/* Tender */}
              {calendarEvents.tender?.length > 0 && (
                <EventCard
                  title="Tender Offer"
                  icon={DollarSign}
                  color="yellow"
                  events={calendarEvents.tender.map(e => ({
                    symbol: e.company_symbol,
                    info: e.tender_price_formatted || e.event_note
                  }))}
                />
              )}

              {/* No Events */}
              {(!calendarEvents.rups?.length && !calendarEvents.pubex?.length && 
                !calendarEvents.dividend?.length && !calendarEvents.tender?.length) && (
                <div className="col-span-full p-8 text-center text-gray-500">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Tidak ada corporate event hari ini</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Screener Section */}
      {screenerData && (
        <ScreenerSection data={screenerData} />
      )}
    </div>
  );
};

// Mover Row Component
const MoverRow = ({ stock, rank, type }) => {
  const isPositive = stock.change?.percentage >= 0;
  const changeColor = type === 'loser' ? 'text-red-400' : (isPositive ? 'text-green-400' : 'text-red-400');
  
  return (
    <div className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors cursor-pointer group">
      <span className="w-6 text-center text-sm font-medium text-gray-500">{rank}</span>
      
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center overflow-hidden">
        {stock.stock_detail?.icon_url ? (
          <img src={stock.stock_detail.icon_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-white">{stock.stock_detail?.code?.slice(0, 2)}</span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{stock.stock_detail?.code}</span>
          {stock.stock_detail?.has_uma && (
            <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded">UMA</span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{stock.stock_detail?.name}</p>
      </div>
      
      <div className="text-right">
        <p className="font-semibold text-white">{stock.price?.toLocaleString('id-ID')}</p>
        <div className={`flex items-center justify-end gap-1 text-sm ${changeColor}`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{formatPercentage(stock.change?.percentage)}</span>
        </div>
      </div>
      
      <ChevronRight size={18} className="text-gray-600 group-hover:text-white transition-colors" />
    </div>
  );
};

// Foreign Row Component
const ForeignRow = ({ stock, rank, type }) => {
  const value = type === 'buy' ? stock.net_foreign_buy : stock.net_foreign_sell;
  const valueColor = type === 'buy' ? 'text-green-400' : 'text-red-400';
  
  return (
    <div className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors cursor-pointer group">
      <span className="w-6 text-center text-sm font-medium text-gray-500">{rank}</span>
      
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center overflow-hidden">
        {stock.stock_detail?.icon_url ? (
          <img src={stock.stock_detail.icon_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-white">{stock.stock_detail?.code?.slice(0, 2)}</span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{stock.stock_detail?.code}</span>
        </div>
        <p className="text-xs text-gray-500 truncate">{stock.stock_detail?.name}</p>
      </div>
      
      <div className="text-right">
        <p className={`font-semibold ${valueColor}`}>{value?.formatted || '-'}</p>
        <p className="text-xs text-gray-500">@ {stock.price?.toLocaleString('id-ID')}</p>
      </div>
      
      <ChevronRight size={18} className="text-gray-600 group-hover:text-white transition-colors" />
    </div>
  );
};

// Event Card Component
const EventCard = ({ title, icon: Icon, color, events }) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  };
  
  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} />
        <span className="font-semibold">{title}</span>
        <span className="ml-auto text-xs bg-white/10 px-2 py-0.5 rounded-full">{events.length}</span>
      </div>
      <div className="space-y-2">
        {events.slice(0, 3).map((event, i) => (
          <div key={i} className="bg-black/20 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">{event.symbol}</span>
              {event.time && (
                <span className="text-xs flex items-center gap-1">
                  <Clock size={12} />
                  {event.time}
                </span>
              )}
            </div>
            {event.venue && (
              <p className="text-xs opacity-70 truncate mt-1">{event.venue}</p>
            )}
            {event.info && (
              <p className="text-xs opacity-70 mt-1">{event.info}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Screener Section Component
const ScreenerSection = ({ data }) => {
  if (!data || !data.calcs || data.calcs.length === 0) {
    return null;
  }

  const columns = data.columns || [];
  
  // Helper to get result value by column id
  const getResultValue = (results, columnId) => {
    const result = results?.find(r => r.id === columnId);
    return result?.display || '-';
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl">
            <Filter className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{data.screen_name || 'Screener'}</h3>
            <p className="text-sm text-gray-500">{data.totalrows || data.calcs?.length || 0} saham ditemukan</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs font-medium text-cyan-400">
            Custom Screener
          </span>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-black/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                #
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Saham
              </th>
              {columns.map((col) => (
                <th key={col.id} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.calcs.map((item, index) => (
              <tr key={item.company?.symbol || index} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-500 font-medium">
                  {index + 1}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.company?.icon_url ? (
                        <img src={item.company.icon_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-white">{item.company?.symbol?.slice(0, 2)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white">{item.company?.symbol}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">{item.company?.name}</p>
                    </div>
                  </div>
                </td>
                {columns.map((col) => (
                  <td key={col.id} className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${
                      col.name.includes('Bandar') ? 'text-cyan-400' : 'text-gray-300'
                    }`}>
                      {getResultValue(item.results, col.id)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
        {data.calcs.map((item, index) => (
          <div key={item.company?.symbol || index} className="p-4 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-6 text-center text-sm font-medium text-gray-500">{index + 1}</span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center overflow-hidden">
                {item.company?.icon_url ? (
                  <img src={item.company.icon_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white">{item.company?.symbol?.slice(0, 2)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white">{item.company?.symbol}</p>
                <p className="text-xs text-gray-500 truncate">{item.company?.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pl-9">
              {columns.map((col) => (
                <div key={col.id} className="bg-black/30 rounded-lg p-2">
                  <p className="text-[10px] text-gray-500 truncate">{col.name}</p>
                  <p className={`text-sm font-medium ${
                    col.name.includes('Bandar') ? 'text-cyan-400' : 'text-gray-300'
                  }`}>
                    {getResultValue(item.results, col.id)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800 bg-black/20">
        <p className="text-xs text-gray-500 text-center">
          Data dari Stockbit Screener • Template ID: {data.screenerid || '-'}
        </p>
      </div>
    </Card>
  );
};

export default MarketDashboard;
