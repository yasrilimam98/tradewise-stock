import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, List, Grid, Edit, Trash2, Eye, X, Upload, Image as ImageIcon,
  TrendingUp, TrendingDown, Target, Clock, Calendar, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertCircle, DollarSign
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, 
  doc, serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import StockSearch from './StockSearch';
import { Card, Button, StatusBadge, ROIBadge, LoadingSpinner, EmptyState } from './ui';

const JournalView = ({ user, isAdmin, db, storage, appId }) => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [viewingTrade, setViewingTrade] = useState(null);
  const [viewMode, setViewMode] = useState('myTrades');
  const [layout, setLayout] = useState('grid');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    const tradesRef = collection(db, `artifacts/${appId}/public/data/trades`);
    let q;

    if (viewMode === 'myTrades') {
      q = query(tradesRef, where("userId", "==", user.uid));
    } else {
      q = query(tradesRef, where("isPublic", "==", true));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tradesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      tradesData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTrades(tradesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, appId, user.uid, viewMode]);

  const filteredTrades = useMemo(() => {
    return trades
      .filter(t => statusFilter === 'all' || t.status === statusFilter)
      .filter(t => !searchTerm || t.code?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [trades, statusFilter, searchTerm]);

  const handleDelete = async (tradeId) => {
    if (window.confirm('Yakin ingin menghapus trade ini?')) {
      await deleteDoc(doc(db, `artifacts/${appId}/public/data/trades`, tradeId));
    }
  };

  // Quick Close Position Handler
  const handleQuickClose = async (trade, status, exitPrice) => {
    const statusLabel = status.startsWith('TP') ? 'Win' : 'Loss';
    const confirmMsg = status.startsWith('TP') 
      ? `Close posisi ${trade.code} dengan ${status}? (Exit: ${new Intl.NumberFormat('id-ID').format(exitPrice)})`
      : `Close posisi ${trade.code} dengan Cut Loss? (Exit: ${new Intl.NumberFormat('id-ID').format(exitPrice)})`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const entry = parseFloat(trade.entry);
      const exit = parseFloat(exitPrice);
      const roi = trade.buySell === 'Buy' 
        ? ((exit - entry) / entry) * 100 
        : ((entry - exit) / entry) * 100;

      await updateDoc(doc(db, `artifacts/${appId}/public/data/trades`, trade.id), {
        exit: exit,
        roi: roi.toFixed(2),
        status: status, // TP1, TP2, CL, etc.
        closedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error closing position:', error);
      alert('Gagal close posisi');
    }
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-0 animate-fade-in">
      {/* Header */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">📔 Jurnal Trading</h1>
            <p className="text-sm text-gray-500">Catat dan analisa semua trade Anda</p>
          </div>
          <Button 
            variant="primary" 
            icon={<Plus size={18} />}
            onClick={() => { setEditingTrade(null); setIsFormOpen(true); }}
          >
            <span className="hidden sm:inline">Tambah Trade</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* View Mode Toggle */}
          <div className="flex gap-1 p-1 bg-gray-900 rounded-xl">
            <button onClick={() => setViewMode('myTrades')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all
                         ${viewMode === 'myTrades' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
              Jurnal Saya
            </button>
            <button onClick={() => setViewMode('public')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all
                         ${viewMode === 'public' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
              Publik
            </button>
          </div>

          {/* Status Filter */}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-black border-2 border-gray-800 rounded-xl text-sm text-white hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors">
            <option value="all" className="bg-black">Semua Status</option>
            <option value="Open" className="bg-black">Open</option>
            <option value="Win" className="bg-black">Win</option>
            <option value="Loss" className="bg-black">Loss</option>
            <option value="TP1" className="bg-black">TP1</option>
            <option value="TP2" className="bg-black">TP2</option>
            <option value="CL" className="bg-black">Cut Loss</option>
            <option value="Breakeven" className="bg-black">Breakeven</option>
          </select>

          {/* Search */}
          <div className="relative flex-1 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" />
            <input type="text" placeholder="Cari kode saham..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-black border-2 border-gray-800 rounded-xl text-sm text-white placeholder:text-gray-600 hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors" />
          </div>

          {/* Layout Toggle */}
          <div className="flex gap-1 p-1 bg-gray-900 rounded-xl">
            <button onClick={() => setLayout('grid')}
              className={`p-2 rounded-lg transition-colors ${layout === 'grid' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
              <Grid size={18} />
            </button>
            <button onClick={() => setLayout('list')}
              className={`p-2 rounded-lg transition-colors ${layout === 'list' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
              <List size={18} />
            </button>
          </div>
        </div>
      </Card>


      {/* Trades */}
      {loading ? (
        <LoadingSpinner message="Memuat data trade..." />
      ) : filteredTrades.length === 0 ? (
        <Card>
          <EmptyState icon={Target} title="Belum ada trade"
            description={viewMode === 'myTrades' ? "Mulai catat trading Anda" : "Belum ada trade publik"}
            action={viewMode === 'myTrades' && (
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsFormOpen(true)}>
                Tambah Trade Pertama
              </Button>
            )}
          />
        </Card>
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTrades.map(trade => (
            <TradeCard key={trade.id} trade={trade} user={user} isAdmin={isAdmin}
              onEdit={() => { setEditingTrade(trade); setIsFormOpen(true); }}
              onDelete={() => handleDelete(trade.id)}
              onView={() => setViewingTrade(trade)}
              onQuickClose={handleQuickClose} />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-gray-800">
            {filteredTrades.map(trade => (
              <TradeListItem key={trade.id} trade={trade} user={user} isAdmin={isAdmin}
                onEdit={() => { setEditingTrade(trade); setIsFormOpen(true); }}
                onDelete={() => handleDelete(trade.id)}
                onView={() => setViewingTrade(trade)}
                onQuickClose={handleQuickClose} />
            ))}
          </div>
        </Card>
      )}

      {/* Trade Form Modal */}
      {isFormOpen && (
        <TradeFormModal isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingTrade(null); }}
          user={user} existingTrade={editingTrade} db={db} storage={storage} appId={appId} />
      )}

      {/* Trade Detail Modal */}
      {viewingTrade && (
        <TradeDetailModal trade={viewingTrade} user={user} isAdmin={isAdmin} db={db} appId={appId}
          onClose={() => setViewingTrade(null)}
          onEdit={() => { setEditingTrade(viewingTrade); setViewingTrade(null); setIsFormOpen(true); }} />
      )}
    </div>
  );
};

// Trade Card Component
const TradeCard = ({ trade, user, isAdmin, onEdit, onDelete, onView, onQuickClose }) => {
  const canModify = user.uid === trade.userId || isAdmin;
  const isOpen = trade.status === 'Open';

  return (
    <Card className="group hover:border-gray-600 transition-all duration-300 overflow-hidden" hover>
      {/* Screenshot Preview */}
      {trade.screenshotUrls?.length > 0 && (
        <div className="h-32 overflow-hidden">
          <img src={trade.screenshotUrls[0]} alt="Trade" className="w-full h-full object-cover" />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full
                              ${trade.buySell === 'Buy' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {trade.buySell}
              </span>
              <StatusBadge status={trade.status} size="sm" />
            </div>
            <h3 className="text-xl font-bold text-white">{trade.code}</h3>
          </div>
          <ROIBadge value={trade.roi || 0} size="lg" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div className="text-gray-500">Entry</div>
          <div className="text-right font-mono font-medium text-white">{new Intl.NumberFormat('id-ID').format(trade.entry || 0)}</div>
          <div className="text-gray-500">Exit</div>
          <div className="text-right font-mono font-medium text-white">{trade.exit ? new Intl.NumberFormat('id-ID').format(trade.exit) : '-'}</div>
        </div>

        {/* TP/SL Display */}
        {(trade.stopLoss || trade.takeProfits?.length > 0) && (
          <div className="flex flex-wrap gap-1 mb-3">
            {trade.stopLoss && (
              <span className="px-2 py-0.5 text-xs bg-red-900/30 text-red-400 rounded">
                SL: {new Intl.NumberFormat('id-ID').format(trade.stopLoss)}
              </span>
            )}
            {trade.takeProfits?.map((tp, i) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-green-900/30 text-green-400 rounded">
                TP{i+1}: {new Intl.NumberFormat('id-ID').format(tp)}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar size={12} />
          {trade.date?.seconds ? new Date(trade.date.seconds * 1000).toLocaleDateString('id-ID') : '-'}
          {trade.screenshotUrls?.length > 0 && (
            <span className="ml-2 flex items-center gap-1"><ImageIcon size={12} /> {trade.screenshotUrls.length}</span>
          )}
        </div>
      </div>

      {/* Quick Actions for Open Trades */}
      {canModify && isOpen && (
        <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-800">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 mr-1">Quick Close:</span>
            {trade.takeProfits?.map((tp, i) => (
              <button 
                key={i}
                onClick={() => onQuickClose(trade, `TP${i+1}`, tp)}
                className="px-2 py-1 text-xs bg-green-900/30 text-green-400 rounded hover:bg-green-800/50 transition-colors font-medium"
              >
                TP{i+1}
              </button>
            ))}
            {trade.stopLoss && (
              <button 
                onClick={() => onQuickClose(trade, 'CL', trade.stopLoss)}
                className="px-2 py-1 text-xs bg-red-900/30 text-red-400 rounded hover:bg-red-800/50 transition-colors font-medium"
              >
                CL
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 bg-black/50 border-t border-gray-800 flex justify-between">
        <Button variant="secondary" size="sm" icon={<Eye size={14} />} onClick={onView}>Detail</Button>
        {canModify && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<Edit size={14} />} onClick={onEdit} />
            <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={onDelete} className="!text-red-400 hover:!bg-red-900/20" />
          </div>
        )}
      </div>
    </Card>
  );
};

// Trade List Item
const TradeListItem = ({ trade, user, isAdmin, onEdit, onDelete, onView, onQuickClose }) => {
  const canModify = user.uid === trade.userId || isAdmin;
  const isOpen = trade.status === 'Open';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-900/50 gap-3 border-b border-gray-800">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold bg-white text-black text-sm">
          {trade.code?.slice(0, 2)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{trade.code}</span>
            <StatusBadge status={trade.status} size="sm" />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{trade.buySell}</span>
            <span>•</span>
            <span>Entry: {new Intl.NumberFormat('id-ID').format(trade.entry || 0)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 flex-wrap">
        {/* Quick Actions for Open Trades */}
        {canModify && isOpen && (trade.takeProfits?.length > 0 || trade.stopLoss) && (
          <div className="flex items-center gap-1.5">
            {trade.takeProfits?.map((tp, i) => (
              <button 
                key={i}
                onClick={() => onQuickClose(trade, `TP${i+1}`, tp)}
                className="px-2 py-1 text-xs bg-green-900/30 text-green-400 rounded hover:bg-green-800/50 transition-colors font-medium"
              >
                TP{i+1}
              </button>
            ))}
            {trade.stopLoss && (
              <button 
                onClick={() => onQuickClose(trade, 'CL', trade.stopLoss)}
                className="px-2 py-1 text-xs bg-red-900/30 text-red-400 rounded hover:bg-red-800/50 transition-colors font-medium"
              >
                CL
              </button>
            )}
          </div>
        )}
        
        <ROIBadge value={trade.roi || 0} />
        <Button variant="secondary" size="sm" icon={<Eye size={14} />} onClick={onView}>Detail</Button>
        {canModify && (
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <Edit size={16} className="text-gray-400" />
            </button>
            <button onClick={onDelete} className="p-2 hover:bg-red-900/30 rounded-lg transition-colors">
              <Trash2 size={16} className="text-red-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Trade Form Modal
const TradeFormModal = ({ isOpen, onClose, user, existingTrade, db, storage, appId }) => {
  const [formData, setFormData] = useState({
    code: '', date: new Date().toISOString().split('T')[0], buySell: 'Buy',
    entry: '', exit: '', roi: '', status: 'Open', isPublic: true,
    setup: '', alasan: '', tradeNote: '',
    stopLoss: '', takeProfits: [''], screenshotUrls: []
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  useEffect(() => {
    if (existingTrade) {
      setFormData({
        ...formData,
        ...existingTrade,
        date: existingTrade.date?.seconds 
          ? new Date(existingTrade.date.seconds * 1000).toISOString().split('T')[0]
          : existingTrade.date || formData.date,
        takeProfits: existingTrade.takeProfits?.length > 0 ? existingTrade.takeProfits : ['']
      });
      setPreviewUrls(existingTrade.screenshotUrls || []);
    }
  }, [existingTrade]);

  // Auto calculate ROI
  useEffect(() => {
    const entry = parseFloat(formData.entry);
    const exit = parseFloat(formData.exit);
    if (!isNaN(entry) && !isNaN(exit) && entry !== 0) {
      const roi = formData.buySell === 'Buy' 
        ? ((exit - entry) / entry) * 100 
        : ((entry - exit) / entry) * 100;
      setFormData(prev => ({ ...prev, roi: roi.toFixed(2) }));
    }
  }, [formData.entry, formData.exit, formData.buySell]);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + previewUrls.length > 5) {
      alert('Maksimal 5 gambar');
      return;
    }
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImageFiles(prev => [...prev, ...files]);
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    if (index < (formData.screenshotUrls?.length || 0)) {
      setFormData(prev => ({
        ...prev,
        screenshotUrls: prev.screenshotUrls.filter((_, i) => i !== index)
      }));
    } else {
      const adjustedIndex = index - (formData.screenshotUrls?.length || 0);
      setImageFiles(prev => prev.filter((_, i) => i !== adjustedIndex));
    }
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (imageFiles.length === 0) return formData.screenshotUrls || [];
    
    setUploading(true);
    const uploadedUrls = [...(formData.screenshotUrls || [])];
    
    for (const file of imageFiles) {
      const fileName = `trades/${user.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      uploadedUrls.push(url);
    }
    
    setUploading(false);
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.entry) {
      alert('Kode saham dan harga entry wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const screenshotUrls = await uploadImages();
      
      const data = {
        ...formData,
        userId: user.uid,
        userName: user.displayName,
        entry: parseFloat(formData.entry) || 0,
        exit: parseFloat(formData.exit) || 0,
        roi: parseFloat(formData.roi) || 0,
        stopLoss: parseFloat(formData.stopLoss) || null,
        takeProfits: formData.takeProfits.filter(tp => tp).map(tp => parseFloat(tp)),
        date: new Date(formData.date),
        screenshotUrls
      };

      if (existingTrade) {
        await updateDoc(doc(db, `artifacts/${appId}/public/data/trades`, existingTrade.id), {
          ...data, updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, `artifacts/${appId}/public/data/trades`), {
          ...data, createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving trade:', error);
      alert('Gagal menyimpan trade');
    } finally {
      setLoading(false);
    }
  };

  const addTakeProfit = () => {
    if (formData.takeProfits.length < 5) {
      setFormData(prev => ({ ...prev, takeProfits: [...prev.takeProfits, ''] }));
    }
  };

  const removeTakeProfit = (index) => {
    setFormData(prev => ({
      ...prev,
      takeProfits: prev.takeProfits.filter((_, i) => i !== index)
    }));
  };

  const updateTakeProfit = (index, value) => {
    setFormData(prev => ({
      ...prev,
      takeProfits: prev.takeProfits.map((tp, i) => i === index ? value : tp)
    }));
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-4 py-3.5 bg-black text-white border-2 border-gray-800 rounded-xl hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors placeholder:text-gray-600";
  const selectClass = "w-full px-4 py-3.5 bg-black text-white border-2 border-gray-800 rounded-xl hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" 
           onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-[#0a0a0a] p-5 border-b border-gray-800 flex justify-between items-center z-10">
            <h2 className="text-xl font-bold text-white">{existingTrade ? '✏️ Edit Trade' : '➕ Tambah Trade Baru'}</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <div className="p-5 space-y-5">
            {/* Stock Code */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Kode Saham *</label>
              <StockSearch value={formData.code} onSelect={(stock) => setFormData({...formData, code: stock.symbol})} />
            </div>

            {/* Date & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Tanggal</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                       className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Tipe</label>
                <select value={formData.buySell} onChange={e => setFormData({...formData, buySell: e.target.value})}
                        className={selectClass}>
                  <option value="Buy" className="bg-black">Buy (Long)</option>
                  <option value="Sell" className="bg-black">Sell (Short)</option>
                </select>
              </div>
            </div>

            {/* Entry & Exit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Entry *</label>
                <input type="number" value={formData.entry} onChange={e => setFormData({...formData, entry: e.target.value})}
                       placeholder="0" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Exit</label>
                <input type="number" value={formData.exit} onChange={e => setFormData({...formData, exit: e.target.value})}
                       placeholder="0" className={inputClass} />
              </div>
            </div>

            {/* Stop Loss */}
            <div>
              <label className="block text-sm font-medium mb-2 text-red-400 flex items-center gap-1">
                <TrendingDown size={14} /> Stop Loss (SL)
              </label>
              <input type="number" value={formData.stopLoss} onChange={e => setFormData({...formData, stopLoss: e.target.value})}
                     placeholder="Harga stop loss" 
                     className="w-full px-4 py-3.5 bg-black text-white border-2 border-red-900 rounded-xl hover:border-red-800 focus:border-red-700 focus:outline-none transition-colors placeholder:text-gray-600" />
            </div>

            {/* Take Profits */}
            <div>
              <label className="block text-sm font-medium mb-2 text-green-400 flex items-center justify-between">
                <span className="flex items-center gap-1"><TrendingUp size={14} /> Take Profit (TP)</span>
                {formData.takeProfits.length < 5 && (
                  <button type="button" onClick={addTakeProfit} className="text-xs px-3 py-1.5 bg-green-900/30 text-green-400 rounded-lg hover:bg-green-900/50 transition-colors">
                    + Tambah TP
                  </button>
                )}
              </label>
              <div className="space-y-2">
                {formData.takeProfits.map((tp, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-medium text-green-400">TP{index + 1}</span>
                      <input type="number" value={tp} onChange={e => updateTakeProfit(index, e.target.value)}
                             placeholder={`Take Profit ${index + 1}`}
                             className="w-full pl-14 pr-4 py-3.5 bg-black text-white border-2 border-green-900 rounded-xl hover:border-green-800 focus:border-green-700 focus:outline-none transition-colors placeholder:text-gray-600" />
                    </div>
                    {formData.takeProfits.length > 1 && (
                      <button type="button" onClick={() => removeTakeProfit(index)}
                              className="p-3.5 text-red-400 hover:bg-red-900/20 rounded-xl transition-colors">
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ROI & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">ROI (%)</label>
                <input type="text" value={formData.roi} readOnly placeholder="Otomatis"
                       className="w-full px-4 py-3.5 bg-gray-900 text-gray-400 border-2 border-gray-800 rounded-xl cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                        className={selectClass}>
                  <option value="Open" className="bg-black">🟡 Open</option>
                  <option value="TP1" className="bg-black">🟢 TP1 Hit</option>
                  <option value="TP2" className="bg-black">🟢 TP2 Hit</option>
                  <option value="Win" className="bg-black">✅ Win</option>
                  <option value="CL" className="bg-black">🔴 Cut Loss</option>
                  <option value="Loss" className="bg-black">❌ Loss</option>
                  <option value="Breakeven" className="bg-black">⚪ Breakeven</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Catatan / Alasan Trade</label>
              <textarea value={formData.tradeNote} onChange={e => setFormData({...formData, tradeNote: e.target.value})}
                        rows={3} placeholder="Alasan masuk, setup yang digunakan, dll..."
                        className="w-full px-4 py-3.5 bg-black text-white border-2 border-gray-800 rounded-xl hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors placeholder:text-gray-600 resize-none" />
            </div>

            {/* Screenshots */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Screenshot ({previewUrls.length}/5)</label>
              <div className="grid grid-cols-5 gap-2 mb-2">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden group border-2 border-gray-800">
                    <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(index)}
                            className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={20} className="text-white" />
                    </button>
                  </div>
                ))}
                {previewUrls.length < 5 && (
                  <label className="aspect-square border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-white transition-colors group">
                    <Upload size={20} className="text-gray-600 group-hover:text-white mb-1 transition-colors" />
                    <span className="text-xs text-gray-600 group-hover:text-white transition-colors">Upload</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Public Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={formData.isPublic} onChange={e => setFormData({...formData, isPublic: e.target.checked})}
                     className="w-5 h-5 rounded border-2 border-gray-700 bg-black text-white checked:bg-white checked:border-white" />
              <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Tampilkan di jurnal publik</span>
            </label>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-[#0a0a0a] p-4 border-t border-gray-800 flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Batal</Button>
            <Button type="submit" variant="primary" loading={loading || uploading} className="flex-1">
              {uploading ? 'Uploading...' : loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Trade Detail Modal
const TradeDetailModal = ({ trade, user, isAdmin, db, appId, onClose, onEdit }) => {
  const canModify = user.uid === trade.userId || isAdmin;
  const [closing, setClosing] = useState(false);
  const [closeData, setCloseData] = useState({ exit: '', status: 'Win' });

  const handleClosePosition = async () => {
    if (!closeData.exit) {
      alert('Masukkan harga exit');
      return;
    }

    setClosing(true);
    try {
      const entry = parseFloat(trade.entry);
      const exit = parseFloat(closeData.exit);
      const roi = trade.buySell === 'Buy' 
        ? ((exit - entry) / entry) * 100 
        : ((entry - exit) / entry) * 100;

      await updateDoc(doc(db, `artifacts/${appId}/public/data/trades`, trade.id), {
        exit: exit,
        roi: roi.toFixed(2),
        status: closeData.status,
        closedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      console.error('Error closing position:', error);
      alert('Gagal close posisi');
    } finally {
      setClosing(false);
    }
  };

  const getStatusBorder = () => {
    switch (trade.status) {
      case 'Win': case 'TP1': case 'TP2': return 'border-green-800';
      case 'Loss': case 'CL': return 'border-red-800';
      default: return 'border-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`sticky top-0 bg-[#111] p-5 border-b ${getStatusBorder()} flex justify-between items-center`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white text-black font-bold">
              {trade.code?.slice(0, 2)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{trade.code}</h2>
              <div className="flex items-center gap-2">
                <StatusBadge status={trade.status} />
                <span className="text-sm text-gray-500">{trade.buySell}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Screenshots */}
          {trade.screenshotUrls?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {trade.screenshotUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-video rounded-xl overflow-hidden border-2 border-gray-800">
                  <img src={url} alt={`Screenshot ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </a>
              ))}
            </div>
          )}

          {/* Price Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center">
              <div className="text-xs text-gray-500 mb-1">Entry</div>
              <div className="text-lg font-bold text-white">{new Intl.NumberFormat('id-ID').format(trade.entry || 0)}</div>
            </div>
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center">
              <div className="text-xs text-gray-500 mb-1">Exit</div>
              <div className="text-lg font-bold text-white">{trade.exit ? new Intl.NumberFormat('id-ID').format(trade.exit) : '-'}</div>
            </div>
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center">
              <div className="text-xs text-gray-500 mb-1">ROI</div>
              <div className={`text-lg font-bold ${(trade.roi || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(trade.roi || 0) >= 0 ? '+' : ''}{trade.roi || 0}%
              </div>
            </div>
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center">
              <div className="text-xs text-gray-500 mb-1">Tanggal</div>
              <div className="text-sm font-medium text-white">
                {trade.date?.seconds ? new Date(trade.date.seconds * 1000).toLocaleDateString('id-ID') : '-'}
              </div>
            </div>
          </div>

          {/* SL & TP */}
          {(trade.stopLoss || trade.takeProfits?.length > 0) && (
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
              <h4 className="font-medium text-white mb-3">Target & Stop Loss</h4>
              <div className="flex flex-wrap gap-2">
                {trade.stopLoss && (
                  <div className="px-3 py-2 bg-red-900/30 border border-red-900 rounded-lg">
                    <div className="text-xs text-red-400">Stop Loss</div>
                    <div className="font-bold text-red-400">{new Intl.NumberFormat('id-ID').format(trade.stopLoss)}</div>
                  </div>
                )}
                {trade.takeProfits?.map((tp, i) => (
                  <div key={i} className="px-3 py-2 bg-green-900/30 border border-green-900 rounded-lg">
                    <div className="text-xs text-green-400">Take Profit {i+1}</div>
                    <div className="font-bold text-green-400">{new Intl.NumberFormat('id-ID').format(tp)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {trade.tradeNote && (
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
              <h4 className="font-medium text-white mb-2">Catatan</h4>
              <p className="text-gray-400 whitespace-pre-wrap">{trade.tradeNote}</p>
            </div>
          )}

          {/* Close Position Form */}
          {canModify && trade.status === 'Open' && (
            <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
              <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                <Target size={18} className="text-white" />
                Close Posisi
              </h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-white mb-1">Harga Exit</label>
                  <input type="number" value={closeData.exit} onChange={e => setCloseData({...closeData, exit: e.target.value})}
                         placeholder="0" className="w-full px-3 py-2.5 bg-black text-white border-2 border-gray-800 rounded-lg text-sm hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-white mb-1">Hasil</label>
                  <select value={closeData.status} onChange={e => setCloseData({...closeData, status: e.target.value})}
                          className="w-full px-3 py-2.5 bg-black text-white border-2 border-gray-800 rounded-lg text-sm hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors">
                    <option value="Win" className="bg-black">✅ Win</option>
                    <option value="TP1" className="bg-black">🟢 TP1 Hit</option>
                    <option value="TP2" className="bg-black">🟢 TP2 Hit</option>
                    <option value="CL" className="bg-black">🔴 Cut Loss</option>
                    <option value="Loss" className="bg-black">❌ Loss</option>
                    <option value="Breakeven" className="bg-black">⚪ Breakeven</option>
                  </select>
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={handleClosePosition} loading={closing} className="w-full">
                {closing ? 'Processing...' : 'Close Position'}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {canModify && (
          <div className="p-4 border-t border-gray-800 flex gap-3">
            <Button variant="secondary" onClick={onEdit} icon={<Edit size={16} />} className="flex-1">Edit Trade</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalView;

