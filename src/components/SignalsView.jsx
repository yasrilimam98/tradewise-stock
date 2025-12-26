import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Edit, X, Activity, Users, Clock, Upload, Send, MessageCircle,
  TrendingUp, TrendingDown, UserPlus, UserCheck, Eye, Target, Trash2,
  ThumbsUp, AlertCircle, ChevronDown, ChevronUp, MoreHorizontal
} from 'lucide-react';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, 
  doc, serverTimestamp, getDocs, setDoc, query, orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import StockSearch from './StockSearch';
import { Card, Button, StatusBadge, LoadingSpinner, EmptyState, Avatar } from './ui';

const SignalsView = ({ user, isAdmin, db, storage, appId }) => {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSignal, setEditingSignal] = useState(null);
  const [viewingSignal, setViewingSignal] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const signalsRef = collection(db, `artifacts/${appId}/public/data/signals`);
    const unsubscribe = onSnapshot(signalsRef, async (snapshot) => {
      const signalsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const signal = { id: docSnap.id, ...docSnap.data() };
        // Get participants
        const participantsRef = collection(db, `artifacts/${appId}/public/data/signals/${signal.id}/participants`);
        const participantsSnap = await getDocs(participantsRef);
        signal.participants = participantsSnap.docs.map(p => ({ id: p.id, ...p.data() }));
        // Get comments count
        const commentsRef = collection(db, `artifacts/${appId}/public/data/signals/${signal.id}/comments`);
        const commentsSnap = await getDocs(commentsRef);
        signal.commentsCount = commentsSnap.size;
        return signal;
      }));
      signalsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSignals(signalsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db, appId]);

  const handleJoin = async (signalId) => {
    if (user.isAnonymous) {
      alert('Silakan login untuk join signal');
      return;
    }
    const participantRef = doc(db, `artifacts/${appId}/public/data/signals/${signalId}/participants`, user.uid);
    await setDoc(participantRef, {
      participantId: user.uid,
      participantName: user.displayName,
      participantPhoto: user.photoURL || null,
      joinedAt: serverTimestamp(),
      analysis: '',
      trades: []
    });
  };

  const handleLeave = async (signalId) => {
    if (window.confirm('Yakin ingin keluar dari signal ini?')) {
      await deleteDoc(doc(db, `artifacts/${appId}/public/data/signals/${signalId}/participants`, user.uid));
    }
  };

  const filteredSignals = signals.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'ongoing') return s.status === 'Ongoing';
    if (filter === 'completed') return ['Win', 'Loss', 'TP1', 'TP2', 'CL'].includes(s.status);
    if (filter === 'mine') return s.initiatorId === user.uid;
    if (filter === 'joined') return s.participants?.some(p => p.id === user.uid);
    return true;
  });

  return (
    <div className="space-y-4 pb-20 lg:pb-0 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-[#111] border border-gray-800 p-6 text-white">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-xl">
                <Activity size={24} />
              </div>
              Trading Signals
            </h1>
            <p className="text-gray-400 mt-1">Kolaborasi analisa & diskusi trading bersama komunitas</p>
          </div>
          <Button 
            onClick={() => { setEditingSignal(null); setIsFormOpen(true); }}
            disabled={user.isAnonymous}
            className="!bg-white !text-black hover:!bg-gray-100"
            icon={<Plus size={18} />}
          >
            Buat Signal
          </Button>
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-4 gap-3 mt-6">
          {[
            { label: 'Total Signal', value: signals.length, color: 'bg-gray-800' },
            { label: 'Ongoing', value: signals.filter(s => s.status === 'Ongoing').length, color: 'bg-gray-800' },
            { label: 'Win', value: signals.filter(s => ['Win', 'TP1', 'TP2'].includes(s.status)).length, color: 'bg-gray-800 border border-green-800' },
            { label: 'Loss', value: signals.filter(s => ['Loss', 'CL'].includes(s.status)).length, color: 'bg-gray-800 border border-red-800' },
          ].map((stat, i) => (
            <div key={i} className={`${stat.color} rounded-xl p-3 text-center`}>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'ongoing', label: '🟡 Ongoing' },
            { key: 'completed', label: '✅ Selesai' },
            { key: 'mine', label: '👤 Milik Saya' },
            { key: 'joined', label: '🤝 Diikuti' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all
                         ${filter === f.key 
                           ? 'bg-white text-black' 
                           : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Signals Grid */}
      {loading ? (
        <LoadingSpinner message="Memuat trading signals..." />
      ) : filteredSignals.length === 0 ? (
        <Card>
          <EmptyState icon={Activity} title="Belum ada signal"
            description={filter === 'all' 
              ? "Jadilah yang pertama membuat signal!" 
              : "Tidak ada signal yang cocok dengan filter"}
            action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsFormOpen(true)}>Buat Signal</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSignals.map(signal => (
            <SignalCard key={signal.id} signal={signal} currentUser={user} isAdmin={isAdmin}
              onJoin={() => handleJoin(signal.id)}
              onLeave={() => handleLeave(signal.id)}
              onEdit={() => { setEditingSignal(signal); setIsFormOpen(true); }}
              onView={() => setViewingSignal(signal)}
              onDelete={async () => {
                if (window.confirm('Yakin hapus signal ini?')) {
                  await deleteDoc(doc(db, `artifacts/${appId}/public/data/signals`, signal.id));
                }
              }} />
          ))}
        </div>
      )}

      {/* Signal Form Modal */}
      {isFormOpen && (
        <SignalFormModal isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingSignal(null); }}
          user={user} existingSignal={editingSignal} db={db} storage={storage} appId={appId} />
      )}

      {/* Signal Detail Modal */}
      {viewingSignal && (
        <SignalDetailModal signal={viewingSignal} user={user} isAdmin={isAdmin} db={db} storage={storage} appId={appId}
          onClose={() => setViewingSignal(null)}
          onJoin={() => handleJoin(viewingSignal.id)}
          onLeave={() => handleLeave(viewingSignal.id)}
          onEdit={() => { setEditingSignal(viewingSignal); setViewingSignal(null); setIsFormOpen(true); }} />
      )}
    </div>
  );
};

// Signal Card Component
const SignalCard = ({ signal, currentUser, isAdmin, onJoin, onLeave, onEdit, onView, onDelete }) => {
  const canModify = currentUser.uid === signal.initiatorId || isAdmin;
  const isParticipant = signal.participants?.some(p => p.id === currentUser.uid);
  const canJoin = !canModify && !isParticipant && !currentUser.isAnonymous;
  const totalMembers = 1 + (signal.participants?.length || 0);

  const getStatusColor = () => {
    switch (signal.status) {
      case 'Win': case 'TP1': case 'TP2': return 'border-green-800 bg-green-900/20';
      case 'Loss': case 'CL': return 'border-red-800 bg-red-900/20';
      default: return 'border-gray-700 bg-gray-800';
    }
  };

  return (
    <Card className="group overflow-hidden hover:border-gray-600 transition-all duration-300">
      {/* Header */}
      <div className={`${getStatusColor()} border-b p-4 text-white relative`}>
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-2xl font-bold">{signal.stockCode}</h3>
              <span className="px-2 py-0.5 bg-gray-700 rounded-full text-xs font-medium">
                {signal.timeFrame}
              </span>
            </div>
            <p className="text-sm text-gray-400">by {signal.initiatorName}</p>
          </div>
          <StatusBadge status={signal.status || 'Ongoing'} size="sm" />
        </div>

        {/* Members Preview */}
        <div className="relative flex items-center gap-2 mt-3">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center text-xs font-bold">
              {signal.initiatorName?.charAt(0)}
            </div>
            {signal.participants?.slice(0, 3).map((p, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center text-xs font-bold">
                {p.participantName?.charAt(0)}
              </div>
            ))}
            {totalMembers > 4 && (
              <div className="w-7 h-7 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center text-xs font-bold">
                +{totalMembers - 4}
              </div>
            )}
          </div>
          <span className="text-sm text-gray-500">{totalMembers} anggota</span>
        </div>
      </div>

      {/* Screenshot */}
      {signal.screenshotUrls?.length > 0 && (
        <div className="h-36 overflow-hidden">
          <img src={signal.screenshotUrls[0]} alt="Signal" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}
      
      <div className="p-4">
        {/* Analysis Preview */}
        <p className="text-sm text-gray-400 line-clamp-2 mb-3">
          {signal.mainAnalysis}
        </p>

        {/* TP/SL */}
        {(signal.stopLoss || signal.takeProfits?.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {signal.entry && (
              <span className="px-2 py-1 text-xs bg-gray-800 text-white rounded-lg font-medium">
                Entry: {new Intl.NumberFormat('id-ID').format(signal.entry)}
              </span>
            )}
            {signal.stopLoss && (
              <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium">
                SL: {new Intl.NumberFormat('id-ID').format(signal.stopLoss)}
              </span>
            )}
            {signal.takeProfits?.slice(0, 2).map((tp, i) => (
              <span key={i} className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg font-medium">
                TP{i+1}: {new Intl.NumberFormat('id-ID').format(tp)}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="flex items-center gap-1"><MessageCircle size={14} /> {signal.commentsCount || 0}</span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {signal.createdAt?.seconds 
              ? new Date(signal.createdAt.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
              : '-'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center">
        <Button variant="secondary" size="sm" icon={<Eye size={14} />} onClick={onView}>
          Lihat Diskusi
        </Button>
        <div className="flex items-center gap-2">
          {canModify && (
            <>
              <button onClick={onEdit} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <Edit size={16} className="text-slate-400" />
              </button>
              <button onClick={onDelete} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 size={16} className="text-red-400" />
              </button>
            </>
          )}
          {canJoin && (
            <Button variant="primary" size="sm" icon={<UserPlus size={14} />} onClick={onJoin}>Join</Button>
          )}
          {isParticipant && !canModify && (
            <div className="flex items-center gap-1">
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><UserCheck size={14} /> Joined</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Signal Form Modal (same as before but with better styling)
const SignalFormModal = ({ isOpen, onClose, user, existingSignal, db, storage, appId }) => {
  const [formData, setFormData] = useState({
    stockCode: '', mainAnalysis: '', timeFrame: '1H', 
    tipeTrade: [], risk: '', status: 'Ongoing',
    stopLoss: '', takeProfits: [''], entry: '',
    screenshotUrls: []
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  useEffect(() => {
    if (existingSignal) {
      setFormData({ ...formData, ...existingSignal,
        takeProfits: existingSignal.takeProfits?.length > 0 ? existingSignal.takeProfits : ['']
      });
      setPreviewUrls(existingSignal.screenshotUrls || []);
    }
  }, [existingSignal]);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + previewUrls.length > 5) { alert('Maksimal 5 gambar'); return; }
    setImageFiles(prev => [...prev, ...files]);
    setPreviewUrls(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (index) => {
    if (index < (formData.screenshotUrls?.length || 0)) {
      setFormData(prev => ({ ...prev, screenshotUrls: prev.screenshotUrls.filter((_, i) => i !== index) }));
    } else {
      setImageFiles(prev => prev.filter((_, i) => i !== (index - (formData.screenshotUrls?.length || 0))));
    }
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (imageFiles.length === 0) return formData.screenshotUrls || [];
    setUploading(true);
    const urls = [...(formData.screenshotUrls || [])];
    for (const file of imageFiles) {
      const storageRef = ref(storage, `signals/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      urls.push(await getDownloadURL(storageRef));
    }
    setUploading(false);
    return urls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.stockCode || !formData.mainAnalysis) { alert('Kode saham dan analisa wajib diisi'); return; }

    setLoading(true);
    try {
      const screenshotUrls = await uploadImages();
      const data = { ...formData,
        entry: parseFloat(formData.entry) || null,
        stopLoss: parseFloat(formData.stopLoss) || null,
        takeProfits: formData.takeProfits.filter(tp => tp).map(tp => parseFloat(tp)),
        screenshotUrls
      };

      if (existingSignal) {
        await updateDoc(doc(db, `artifacts/${appId}/public/data/signals`, existingSignal.id), { ...data, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, `artifacts/${appId}/public/data/signals`), {
          ...data, initiatorId: user.uid, initiatorName: user.displayName, initiatorPhoto: user.photoURL, createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (error) { console.error(error); alert('Gagal menyimpan'); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-4 py-3.5 bg-black text-white border-2 border-gray-800 rounded-xl hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors placeholder:text-gray-600";
  const selectClass = "w-full px-4 py-3.5 bg-black text-white border-2 border-gray-800 rounded-xl hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="sticky top-0 bg-[#0a0a0a] p-5 border-b border-gray-800 text-white flex justify-between items-center z-10">
            <h2 className="text-xl font-bold">{existingSignal ? '✏️ Edit Signal' : '🚀 Buat Signal Baru'}</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Kode Saham *</label>
              <StockSearch value={formData.stockCode} onSelect={(stock) => setFormData({...formData, stockCode: stock.symbol})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Analisa Utama *</label>
              <textarea value={formData.mainAnalysis} onChange={e => setFormData({...formData, mainAnalysis: e.target.value})}
                rows={4} placeholder="Jelaskan analisa dan alasan Anda..."
                className="w-full px-4 py-3.5 bg-black text-white border-2 border-gray-800 rounded-xl hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors placeholder:text-gray-600 resize-none" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Entry</label>
                <input type="number" value={formData.entry} onChange={e => setFormData({...formData, entry: e.target.value})}
                       placeholder="0" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-red-400 mb-2">Stop Loss</label>
                <input type="number" value={formData.stopLoss} onChange={e => setFormData({...formData, stopLoss: e.target.value})}
                       placeholder="0" className="w-full px-4 py-3.5 bg-black text-white border-2 border-red-900 rounded-xl hover:border-red-800 focus:border-red-700 focus:outline-none transition-colors placeholder:text-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Time Frame</label>
                <select value={formData.timeFrame} onChange={e => setFormData({...formData, timeFrame: e.target.value})}
                        className={selectClass}>
                  {['1M', '5M', '15M', '30M', '1H', '4H', '1D', '1W'].map(tf => <option key={tf} className="bg-black">{tf}</option>)}
                </select>
              </div>
            </div>

            {/* Take Profits */}
            <div>
              <label className="block text-sm font-medium mb-2 text-green-400 flex items-center justify-between">
                <span>Take Profit</span>
                {formData.takeProfits.length < 5 && (
                  <button type="button" onClick={() => setFormData(p => ({...p, takeProfits: [...p.takeProfits, '']}))}
                          className="text-xs px-3 py-1.5 bg-green-900/30 text-green-400 rounded-lg hover:bg-green-900/50 transition-colors">+ Tambah</button>
                )}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {formData.takeProfits.map((tp, i) => (
                  <div key={i} className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-medium text-green-400">TP{i+1}</span>
                    <input type="number" value={tp} onChange={e => setFormData(p => ({
                      ...p, takeProfits: p.takeProfits.map((t, idx) => idx === i ? e.target.value : t)
                    }))} placeholder="0" className="w-full pl-14 pr-10 py-3.5 bg-black text-white border-2 border-green-900 rounded-xl hover:border-green-800 focus:border-green-700 focus:outline-none transition-colors placeholder:text-gray-600" />
                    {formData.takeProfits.length > 1 && (
                      <button type="button" onClick={() => setFormData(p => ({...p, takeProfits: p.takeProfits.filter((_, idx) => idx !== i)}))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-300 transition-colors"><X size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                        className={selectClass}>
                  <option value="Ongoing" className="bg-black">🟡 Ongoing</option>
                  <option value="TP1" className="bg-black">🟢 TP1 Hit</option>
                  <option value="TP2" className="bg-black">🟢 TP2 Hit</option>
                  <option value="Win" className="bg-black">✅ Win</option>
                  <option value="CL" className="bg-black">🔴 Cut Loss</option>
                  <option value="Loss" className="bg-black">❌ Loss</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Risk (%)</label>
                <input type="number" value={formData.risk} onChange={e => setFormData({...formData, risk: e.target.value})}
                       placeholder="0" className={inputClass} />
              </div>
            </div>

            {/* Screenshots */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Screenshot ({previewUrls.length}/5)</label>
              <div className="grid grid-cols-5 gap-2">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border-2 border-gray-800">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)}
                            className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="text-white" />
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
          </div>

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

// Signal Detail Modal with Discussion
const SignalDetailModal = ({ signal, user, isAdmin, db, storage, appId, onClose, onJoin, onLeave, onEdit }) => {
  const canModify = user.uid === signal.initiatorId || isAdmin;
  const isParticipant = signal.participants?.some(p => p.id === user.uid);
  const isMember = signal.initiatorId === user.uid || isParticipant;
  
  const [activeTab, setActiveTab] = useState('discussion');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [showAllScreenshots, setShowAllScreenshots] = useState(false);
  const commentsEndRef = useRef(null);

  // Load comments
  useEffect(() => {
    const commentsRef = collection(db, `artifacts/${appId}/public/data/signals/${signal.id}/comments`);
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [db, appId, signal.id]);

  // Scroll to bottom when new comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSendComment = async () => {
    if (!newComment.trim() || !isMember) return;
    setSending(true);
    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/signals/${signal.id}/comments`), {
        text: newComment.trim(),
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (error) { console.error(error); }
    finally { setSending(false); }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Hapus komentar ini?')) {
      await deleteDoc(doc(db, `artifacts/${appId}/public/data/signals/${signal.id}/comments`, commentId));
    }
  };

  const getStatusBorder = () => {
    switch (signal.status) {
      case 'Win': case 'TP1': case 'TP2': return 'border-green-800';
      case 'Loss': case 'CL': return 'border-red-800';
      default: return 'border-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
           onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={`bg-[#111] p-5 text-white border-b ${getStatusBorder()}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-2xl font-bold text-black">
                {signal.stockCode?.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{signal.stockCode}</h2>
                  <StatusBadge status={signal.status || 'Ongoing'} size="sm" />
                </div>
                <p className="text-gray-400 text-sm">by {signal.initiatorName} • {signal.timeFrame}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Entry/SL/TP Summary */}
          <div className="flex flex-wrap gap-2 mt-4">
            {signal.entry && (
              <span className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm font-medium">
                Entry: {new Intl.NumberFormat('id-ID').format(signal.entry)}
              </span>
            )}
            {signal.stopLoss && (
              <span className="px-3 py-1.5 bg-red-900/50 text-red-400 rounded-lg text-sm font-medium">
                SL: {new Intl.NumberFormat('id-ID').format(signal.stopLoss)}
              </span>
            )}
            {signal.takeProfits?.map((tp, i) => (
              <span key={i} className="px-3 py-1.5 bg-green-900/50 text-green-400 rounded-lg text-sm font-medium">
                TP{i+1}: {new Intl.NumberFormat('id-ID').format(tp)}
              </span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {[
            { key: 'discussion', label: 'Diskusi', icon: MessageCircle, count: comments.length },
            { key: 'analysis', label: 'Analisa', icon: Target },
            { key: 'members', label: 'Anggota', icon: Users, count: 1 + (signal.participants?.length || 0) },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors
                         ${activeTab === tab.key 
                           ? 'text-white border-b-2 border-white bg-gray-900' 
                           : 'text-gray-500 hover:text-white'}`}>
              <tab.icon size={16} />
              {tab.label}
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.5 bg-gray-800 rounded-full text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'discussion' && (
            <div className="flex flex-col h-full">
              {/* Comments */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-[200px] max-h-[400px]">
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <MessageCircle size={48} className="mb-2 opacity-50" />
                    <p className="text-center">Belum ada diskusi</p>
                    <p className="text-sm text-center">Jadilah yang pertama berkomentar!</p>
                  </div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className={`flex gap-3 ${comment.userId === user.uid ? 'flex-row-reverse' : ''}`}>
                      <Avatar name={comment.userName} size="sm" />
                      <div className={`max-w-[75%] ${comment.userId === user.uid ? 'items-end' : ''}`}>
                        <div className={`px-4 py-2.5 rounded-2xl ${
                          comment.userId === user.uid 
                            ? 'bg-white text-black rounded-br-md' 
                            : 'bg-gray-800 text-white rounded-bl-md'
                        }`}>
                          {comment.userId !== user.uid && (
                            <p className="text-xs font-medium text-gray-400 mb-0.5">{comment.userName}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
                        </div>
                        <div className={`flex items-center gap-2 mt-1 text-xs text-slate-400 ${comment.userId === user.uid ? 'justify-end' : ''}`}>
                          <span>
                            {comment.createdAt?.seconds 
                              ? new Date(comment.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                          {(comment.userId === user.uid || isAdmin) && (
                            <button onClick={() => handleDeleteComment(comment.id)} className="hover:text-red-500">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Comment Input */}
              {isMember ? (
                <div className="p-4 border-t border-gray-800 bg-black">
                  <div className="flex gap-2">
                    <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
                           placeholder="Tulis komentar..."
                           onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
                           className="flex-1 px-4 py-3 bg-black text-white border-2 border-gray-800 rounded-xl text-sm placeholder:text-gray-600 hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors" />
                    <Button variant="primary" onClick={handleSendComment} loading={sending} disabled={!newComment.trim()}>
                      <Send size={18} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t border-gray-800 bg-gray-900 text-center">
                  <p className="text-sm text-gray-400 mb-2">
                    <AlertCircle size={16} className="inline mr-1" />
                    Bergabung untuk ikut berdiskusi
                  </p>
                  <Button variant="primary" size="sm" icon={<UserPlus size={14} />} onClick={onJoin}>
                    Join Signal
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="p-4 space-y-4">
              {/* Screenshots */}
              {signal.screenshotUrls?.length > 0 && (
                <div>
                  <h4 className="font-medium text-white mb-2 flex items-center justify-between">
                    <span>📊 Chart Analysis</span>
                    {signal.screenshotUrls.length > 2 && (
                      <button onClick={() => setShowAllScreenshots(!showAllScreenshots)} className="text-sm text-gray-400 hover:text-white transition-colors">
                        {showAllScreenshots ? 'Sembunyikan' : `Lihat semua (${signal.screenshotUrls.length})`}
                      </button>
                    )}
                  </h4>
                  <div className={`grid ${signal.screenshotUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                    {(showAllScreenshots ? signal.screenshotUrls : signal.screenshotUrls.slice(0, 2)).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-video rounded-xl overflow-hidden border-2 border-gray-800">
                        <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Analysis */}
              <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
                <h4 className="font-medium text-white mb-2">📝 Analisa Utama</h4>
                <p className="text-gray-400 whitespace-pre-wrap">{signal.mainAnalysis}</p>
              </div>

              {/* Trade Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {signal.entry && (
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center">
                    <div className="text-xs text-gray-500 mb-1">Entry</div>
                    <div className="text-lg font-bold text-white">{new Intl.NumberFormat('id-ID').format(signal.entry)}</div>
                  </div>
                )}
                {signal.stopLoss && (
                  <div className="p-4 bg-red-900/20 border border-red-900 rounded-xl text-center">
                    <div className="text-xs text-red-400 mb-1">Stop Loss</div>
                    <div className="text-lg font-bold text-red-400">{new Intl.NumberFormat('id-ID').format(signal.stopLoss)}</div>
                  </div>
                )}
                {signal.takeProfits?.map((tp, i) => (
                  <div key={i} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                    <div className="text-xs text-green-500 mb-1">Take Profit {i+1}</div>
                    <div className="text-lg font-bold text-green-600">{new Intl.NumberFormat('id-ID').format(tp)}</div>
                  </div>
                ))}
              </div>

              {/* Meta Tags */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm">{signal.timeFrame}</span>
                {signal.tipeTrade?.map(t => (
                  <span key={t} className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg text-sm">{t}</span>
                ))}
                {signal.risk && <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg text-sm">Risk: {signal.risk}%</span>}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="p-4 space-y-3">
              {/* Initiator */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={signal.initiatorName} size="md" />
                    <div>
                      <p className="font-medium">{signal.initiatorName}</p>
                      <p className="text-xs text-purple-500">👑 Initiator</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Participants */}
              {signal.participants?.length > 0 ? (
                signal.participants.map(p => (
                  <div key={p.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.participantName} size="md" />
                        <div>
                          <p className="font-medium">{p.participantName}</p>
                          <p className="text-xs text-slate-500">
                            Bergabung {p.joinedAt?.seconds 
                              ? new Date(p.joinedAt.seconds * 1000).toLocaleDateString('id-ID')
                              : ''}
                          </p>
                        </div>
                      </div>
                      {p.id === user.uid && (
                        <Button variant="secondary" size="sm" onClick={onLeave}>Keluar</Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Belum ada peserta lain</p>
                </div>
              )}

              {!isMember && (
                <div className="text-center py-4">
                  <Button variant="primary" icon={<UserPlus size={16} />} onClick={onJoin}>
                    Bergabung Sekarang
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {canModify && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <Button variant="secondary" onClick={onEdit} icon={<Edit size={16} />} className="w-full">
              Edit Signal
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalsView;
