import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Search, Calendar, TrendingUp, TrendingDown, BarChart3, RefreshCw, HelpCircle, Info, ArrowRight, ArrowLeft } from 'lucide-react';
import { Card, Button, LoadingSpinner } from './ui';
import { getBrokerDistribution, hasToken } from '../services/stockbitService';

const BROKER_COLORS = {
  'Lokal': '#8b5cf6',
  'Pemerintah': '#22c55e',
  'Asing': '#ef4444',
};

const formatValue = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '-';
  const n = parseFloat(num);
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + ' T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + ' B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + ' M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + ' K';
  return n.toLocaleString('id-ID');
};

// Broker Detail Modal
const BrokerFlowModal = ({ isOpen, onClose, broker, brokerType, allBuyers, mode }) => {
  if (!isOpen || !broker) return null;

  // Mode: 'buyer' = show where this buyer sells to
  // Mode: 'seller' = show who sells to this seller
  
  let sellsTo = [];
  let buysFrom = [];

  if (mode === 'buyer') {
    // This broker is a buyer, show where they sell to
    const buyerData = allBuyers.find(b => b.detail?.code === broker);
    sellsTo = buyerData?.distribute_to || [];
  } else {
    // This broker is a seller, show who buys from them
    allBuyers.forEach(buyer => {
      const match = buyer.distribute_to?.find(s => s.code === broker);
      if (match) {
        buysFrom.push({
          code: buyer.detail.code,
          type: buyer.detail.type,
          amount: match.amount
        });
      }
    });
  }

  const data = mode === 'buyer' ? sellsTo : buysFrom;
  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white" style={{ backgroundColor: BROKER_COLORS[brokerType] }}>
              {broker}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {mode === 'buyer' ? `${broker} Menjual Ke` : `${broker} Membeli Dari`}
              </h3>
              <p className="text-sm" style={{ color: BROKER_COLORS[brokerType] }}>{brokerType} • Total: {formatValue(totalAmount)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-2"><X size={24} /></button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {data.length > 0 ? (
            <div className="space-y-2">
              {data.sort((a, b) => b.amount - a.amount).map((item, i) => {
                const maxAmount = data[0]?.amount || 1;
                const width = (item.amount / maxAmount) * 100;
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                    <span className="w-6 text-xs text-gray-500 text-right">{i + 1}</span>
                    <span className="w-10 font-bold text-sm px-1.5 py-0.5 rounded text-center" style={{ backgroundColor: `${BROKER_COLORS[item.type]}20`, color: BROKER_COLORS[item.type] }}>
                      {item.code}
                    </span>
                    <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                      <div className="h-full rounded flex items-center pl-2" style={{ width: `${width}%`, backgroundColor: BROKER_COLORS[item.type] }}>
                        {width > 30 && <span className="text-xs text-white font-medium">{formatValue(item.amount)}</span>}
                      </div>
                    </div>
                    {width <= 30 && <span className="text-xs text-gray-400 w-16 text-right">{formatValue(item.amount)}</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Tidak ada data</p>
          )}
        </div>

        {/* Legend */}
        <div className="p-3 border-t border-gray-800 flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ backgroundColor: BROKER_COLORS['Lokal'] }} /><span className="text-gray-400">Domestik</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ backgroundColor: BROKER_COLORS['Pemerintah'] }} /><span className="text-gray-400">BUMN</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ backgroundColor: BROKER_COLORS['Asing'] }} /><span className="text-gray-400">Asing</span></div>
        </div>
      </div>
    </div>
  );
};

// Sankey Diagram with clickable brokers
const SankeyDiagram = ({ buyers, onBrokerClick }) => {
  const [hoveredFlow, setHoveredFlow] = useState(null);

  // Calculate seller totals
  const sellersMap = {};
  buyers.forEach(buyer => {
    buyer.distribute_to?.forEach(seller => {
      if (!sellersMap[seller.code]) sellersMap[seller.code] = { ...seller, totalAmount: 0 };
      sellersMap[seller.code].totalAmount += seller.amount;
    });
  });
  const sellers = Object.values(sellersMap).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 12);

  // Calculate positions
  const diagramHeight = 550;
  const gap = 6;
  const totalBuyerAmount = buyers.slice(0, 12).reduce((sum, b) => sum + (b.detail?.amount || 0), 0);
  const totalSellerAmount = sellers.reduce((sum, s) => sum + s.totalAmount, 0);

  let buyerY = 0;
  const buyerPositions = buyers.slice(0, 12).map(buyer => {
    const height = Math.max(35, (buyer.detail.amount / totalBuyerAmount) * (diagramHeight - gap * 12));
    const pos = { ...buyer, y: buyerY, height };
    buyerY += height + gap;
    return pos;
  });

  let sellerY = 0;
  const sellerPositions = sellers.map(seller => {
    const height = Math.max(28, (seller.totalAmount / totalSellerAmount) * (diagramHeight - gap * 12));
    const pos = { ...seller, y: sellerY, height };
    sellerY += height + gap;
    return pos;
  });

  // Generate flows
  const maxBuyerAmount = Math.max(...buyers.map(b => b.detail?.amount || 0));
  const flows = [];
  
  buyerPositions.forEach((buyer, buyerIdx) => {
    let offsetY = 0;
    buyer.distribute_to?.slice(0, 10).forEach(dist => {
      const seller = sellerPositions.find(s => s.code === dist.code);
      if (!seller) return;

      const thickness = Math.max(1, (dist.amount / maxBuyerAmount) * 25);
      const startY = buyer.y + offsetY + thickness / 2;
      
      // Find seller offset
      let sellerOffset = 0;
      for (const b of buyerPositions) {
        if (b.detail.code === buyer.detail.code) break;
        const match = b.distribute_to?.find(d => d.code === dist.code);
        if (match) sellerOffset += Math.max(1, (match.amount / maxBuyerAmount) * 25);
      }
      
      const endY = seller.y + sellerOffset + thickness / 2;
      offsetY += thickness;

      flows.push({
        id: `${buyer.detail.code}-${dist.code}`,
        buyerCode: buyer.detail.code,
        sellerCode: dist.code,
        buyerType: buyer.detail.type,
        sellerType: dist.type,
        startY, endY, thickness,
        amount: dist.amount
      });
    });
  });

  return (
    <div className="relative">
      {/* Headers */}
      <div className="flex justify-between mb-3 px-2">
        <span className="text-green-400 font-bold text-sm">👤 Buyer (klik untuk detail)</span>
        <span className="text-red-400 font-bold text-sm">Seller 👤 (klik untuk detail)</span>
      </div>

      <div className="flex" style={{ minHeight: diagramHeight }}>
        {/* Buyers */}
        <div className="w-[110px] relative">
          {buyerPositions.map((buyer, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 cursor-pointer hover:scale-105 transition-transform"
              style={{ top: buyer.y, height: buyer.height }}
              onClick={() => onBrokerClick(buyer.detail.code, buyer.detail.type, 'buyer')}
            >
              <div className="h-full flex items-center justify-end pr-1 rounded-l-lg border-l-4" 
                style={{ borderLeftColor: BROKER_COLORS[buyer.detail.type], backgroundColor: `${BROKER_COLORS[buyer.detail.type]}10` }}>
                <div className="text-right pr-1">
                  <span className="font-bold text-sm block" style={{ color: BROKER_COLORS[buyer.detail.type] }}>{buyer.detail.code}</span>
                  <span className="text-[10px] text-gray-500">{formatValue(buyer.detail.amount)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SVG Flows */}
        <div className="flex-1 min-w-[180px]">
          <svg width="100%" height={diagramHeight} className="overflow-visible">
            {flows.map((flow, i) => {
              const isHovered = hoveredFlow === flow.id;
              const color = BROKER_COLORS[flow.buyerType];
              return (
                <path
                  key={i}
                  d={`M 0 ${flow.startY} C 45% ${flow.startY}, 55% ${flow.endY}, 100% ${flow.endY}`}
                  stroke={color}
                  strokeWidth={flow.thickness}
                  fill="none"
                  opacity={hoveredFlow ? (isHovered ? 0.9 : 0.15) : 0.5}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredFlow(flow.id)}
                  onMouseLeave={() => setHoveredFlow(null)}
                />
              );
            })}
          </svg>
        </div>

        {/* Sellers */}
        <div className="w-[110px] relative">
          {sellerPositions.map((seller, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 cursor-pointer hover:scale-105 transition-transform"
              style={{ top: seller.y, height: seller.height }}
              onClick={() => onBrokerClick(seller.code, seller.type, 'seller')}
            >
              <div className="h-full flex items-center justify-start pl-1 rounded-r-lg border-r-4"
                style={{ borderRightColor: BROKER_COLORS[seller.type], backgroundColor: `${BROKER_COLORS[seller.type]}10` }}>
                <div className="pl-1">
                  <span className="text-[10px] text-gray-500 block">{formatValue(seller.totalAmount)}</span>
                  <span className="font-bold text-sm" style={{ color: BROKER_COLORS[seller.type] }}>{seller.code}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hover Info */}
      {hoveredFlow && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/95 border border-gray-700 rounded-lg p-2 text-xs z-10">
          {(() => {
            const flow = flows.find(f => f.id === hoveredFlow);
            if (!flow) return null;
            return (
              <div className="flex items-center gap-2">
                <span style={{ color: BROKER_COLORS[flow.buyerType] }} className="font-bold">{flow.buyerCode}</span>
                <ArrowRight className="w-3 h-3 text-gray-500" />
                <span style={{ color: BROKER_COLORS[flow.sellerType] }} className="font-bold">{flow.sellerCode}</span>
                <span className="text-gray-400 ml-2">{formatValue(flow.amount)}</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-gray-800">
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded" style={{ backgroundColor: BROKER_COLORS['Lokal'] }} /><span className="text-sm text-gray-400">Domestic</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded" style={{ backgroundColor: BROKER_COLORS['Pemerintah'] }} /><span className="text-sm text-gray-400">BUMN</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded" style={{ backgroundColor: BROKER_COLORS['Asing'] }} /><span className="text-sm text-gray-400">Foreign</span></div>
      </div>
    </div>
  );
};

const BrokerDistributionView = ({ isOpen, onClose, symbol: initialSymbol, date: initialDate }) => {
  const [symbol, setSymbol] = useState(initialSymbol || '');
  const [symbolInput, setSymbolInput] = useState(initialSymbol || '');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('value');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState(null);
  const [selectedBrokerType, setSelectedBrokerType] = useState(null);
  const [selectedMode, setSelectedMode] = useState('buyer');

  useEffect(() => {
    if (initialSymbol) { setSymbol(initialSymbol); setSymbolInput(initialSymbol); }
    if (initialDate) setDate(initialDate);
  }, [initialSymbol, initialDate]);

  const fetchData = useCallback(async () => {
    if (!symbol) { setError('Masukkan kode saham'); return; }
    if (!hasToken()) { setError('Token tidak ditemukan'); return; }
    setIsLoading(true); setError(null);
    try {
      const res = await getBrokerDistribution({ symbol, date });
      if (res.data) setData(res.data);
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  }, [symbol, date]);

  const handleSearch = () => { const s = symbolInput.trim().toUpperCase(); if (s) setSymbol(s); };

  const handleBrokerClick = (code, type, mode) => {
    setSelectedBroker(code);
    setSelectedBrokerType(type);
    setSelectedMode(mode);
  };

  useEffect(() => { if (symbol && isOpen) fetchData(); }, [symbol, date, isOpen]);

  const processedData = useMemo(() => {
    if (!data) return null;
    const source = viewMode === 'value' ? data.by_value : data.by_volume;
    if (!source) return null;
    const topBuyers = source.top_broker_buy || [];
    const totalBuyValue = topBuyers.reduce((sum, b) => sum + (b.detail?.amount || 0), 0);
    return { topBuyers, totalBuyValue, dateInfo: data.date_info };
  }, [data, viewMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              Broker Distribution {symbol && <span className="text-purple-400">{symbol}</span>}
            </h2>
            <p className="text-sm text-gray-500">Klik broker untuk lihat detail transaksi</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowGuide(!showGuide)} variant="outline" size="sm" icon={<HelpCircle size={14} />}>{showGuide ? 'Tutup' : '?'}</Button>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-2"><X size={24} /></button>
          </div>
        </div>

        {/* Guide */}
        {showGuide && (
          <div className="p-4 border-b border-gray-800 bg-purple-500/5">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div><p className="font-bold text-purple-400 mb-1">📊 Diagram</p><p className="text-gray-400">Kiri=Buyer, Kanan=Seller, Garis=Aliran</p></div>
              <div><p className="font-bold text-green-400 mb-1">🖱️ Klik</p><p className="text-gray-400">Klik broker untuk lihat detail kemana/dari mana transaksi</p></div>
              <div><p className="font-bold text-cyan-400 mb-1">🎨 Warna</p><p className="text-gray-400">Ungu=Domestik, Hijau=BUMN, Merah=Asing</p></div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" value={symbolInput} onChange={(e) => setSymbolInput(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Saham" className="pl-9 pr-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm w-24" />
              </div>
              <Button onClick={handleSearch} variant="primary" size="sm" loading={isLoading} icon={<Search size={14} />}>Cari</Button>
            </div>

            <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
              <button onClick={() => setViewMode('value')} className={`px-3 py-1 rounded text-sm ${viewMode === 'value' ? 'bg-purple-500 text-white' : 'text-gray-400'}`}>Value</button>
              <button onClick={() => setViewMode('volume')} className={`px-3 py-1 rounded text-sm ${viewMode === 'volume' ? 'bg-purple-500 text-white' : 'text-gray-400'}`}>Volume</button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Calendar size={14} className="text-gray-500" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 py-1.5 bg-black border border-gray-800 rounded-lg text-white text-sm" />
              <Button onClick={fetchData} variant="outline" size="sm" loading={isLoading} icon={<RefreshCw size={14} />} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">{error}</div>}
          {isLoading && <div className="py-12"><LoadingSpinner message={`Memuat ${symbol}...`} /></div>}

          {processedData && !isLoading && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 bg-green-500/10 border-green-500/20">
                  <p className="text-xs text-gray-500">Buyer</p>
                  <p className="text-xl font-bold text-green-400">{processedData.topBuyers.length}</p>
                </Card>
                <Card className="p-3 bg-purple-500/10 border-purple-500/20">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-xl font-bold text-purple-400">{formatValue(processedData.totalBuyValue)}</p>
                </Card>
                <Card className="p-3 bg-cyan-500/10 border-cyan-500/20">
                  <p className="text-xs text-gray-500">Tanggal</p>
                  <p className="text-lg font-bold text-cyan-400">{processedData.dateInfo || date}</p>
                </Card>
              </div>

              {/* Sankey */}
              <Card className="p-4">
                <SankeyDiagram buyers={processedData.topBuyers} onBrokerClick={handleBrokerClick} />
              </Card>
            </div>
          )}

          {!data && !isLoading && !error && (
            <div className="py-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">Masukkan kode saham</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {processedData && (
        <BrokerFlowModal
          isOpen={!!selectedBroker}
          onClose={() => setSelectedBroker(null)}
          broker={selectedBroker}
          brokerType={selectedBrokerType}
          allBuyers={processedData.topBuyers}
          mode={selectedMode}
        />
      )}
    </div>
  );
};

export default BrokerDistributionView;
