import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, ClipboardCheck, Calendar } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Card, Button, LoadingSpinner, EmptyState } from './ui';

const EvaluationView = ({ user, db, appId }) => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEval, setEditingEval] = useState(null);

  useEffect(() => {
    const evalsRef = collection(db, `artifacts/${appId}/public/data/evaluations`);
    const q = query(evalsRef, where("userId", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const evalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      evalsData.sort((a, b) => (b.entryDate?.seconds || 0) - (a.entryDate?.seconds || 0));
      setEvaluations(evalsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, appId, user.uid]);

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus evaluasi ini?')) {
      await deleteDoc(doc(db, `artifacts/${appId}/public/data/evaluations`, id));
    }
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-0 animate-fade-in">
      {/* Header */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardCheck size={24} />
              Evaluasi Trading
            </h1>
            <p className="text-sm text-gray-500">Tinjau dan pelajari hasil trading Anda</p>
          </div>
          <Button 
            variant="primary" 
            icon={<Plus size={18} />}
            onClick={() => { setEditingEval(null); setIsFormOpen(true); }}
          >
            Tambah Evaluasi
          </Button>
        </div>
      </Card>

      {/* Evaluations List */}
      {loading ? (
        <LoadingSpinner message="Memuat evaluasi..." />
      ) : evaluations.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="Belum ada evaluasi"
            description="Catat evaluasi trading Anda untuk mempelajari pola dan meningkatkan performa"
            action={
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsFormOpen(true)}>
                Tambah Evaluasi Pertama
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {evaluations.map(item => (
            <EvaluationCard 
              key={item.id} 
              item={item} 
              onEdit={() => { setEditingEval(item); setIsFormOpen(true); }}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <EvaluationFormModal
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingEval(null); }}
          user={user}
          existingEval={editingEval}
          db={db}
          appId={appId}
        />
      )}
    </div>
  );
};

const EvaluationCard = ({ item, onEdit, onDelete }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  return (
    <Card className="p-5 hover:border-gray-600 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2">{item.stockName}</h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              Masuk: {formatDate(item.entryDate)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              Keluar: {formatDate(item.exitDate)}
            </span>
          </div>
          <p className="text-gray-400 whitespace-pre-wrap">{item.description}</p>
        </div>
        <div className="flex sm:flex-col gap-2">
          <Button variant="secondary" size="sm" icon={<Edit size={14} />} onClick={onEdit}>Edit</Button>
          <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={onDelete} className="!text-red-400 hover:!bg-red-900/20">Hapus</Button>
        </div>
      </div>
    </Card>
  );
};

const EvaluationFormModal = ({ isOpen, onClose, user, existingEval, db, appId }) => {
  const [formData, setFormData] = useState({
    stockName: '',
    entryDate: new Date().toISOString().split('T')[0],
    exitDate: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingEval) {
      setFormData({
        stockName: existingEval.stockName || '',
        entryDate: existingEval.entryDate?.seconds 
          ? new Date(existingEval.entryDate.seconds * 1000).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        exitDate: existingEval.exitDate?.seconds
          ? new Date(existingEval.exitDate.seconds * 1000).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        description: existingEval.description || ''
      });
    }
  }, [existingEval]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.stockName || !formData.description) {
      alert('Nama saham dan deskripsi wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        entryDate: new Date(formData.entryDate),
        exitDate: new Date(formData.exitDate)
      };

      if (existingEval) {
        await updateDoc(doc(db, `artifacts/${appId}/public/data/evaluations`, existingEval.id), {
          ...data, updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, `artifacts/${appId}/public/data/evaluations`), {
          ...data, userId: user.uid, userName: user.displayName, createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving evaluation:', error);
      alert('Gagal menyimpan evaluasi');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-4 py-3.5 bg-black text-white border-2 border-gray-800 rounded-xl hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors placeholder:text-gray-600";

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-up"
           onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="sticky top-0 bg-[#0a0a0a] p-5 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">{existingEval ? '✏️ Edit Evaluasi' : '📝 Tambah Evaluasi'}</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Nama Saham/Koin</label>
              <input type="text" value={formData.stockName}
                     onChange={e => setFormData({...formData, stockName: e.target.value.toUpperCase()})}
                     placeholder="Contoh: BBCA"
                     className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Tanggal Masuk</label>
                <input type="date" value={formData.entryDate}
                       onChange={e => setFormData({...formData, entryDate: e.target.value})}
                       className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Tanggal Keluar</label>
                <input type="date" value={formData.exitDate}
                       onChange={e => setFormData({...formData, exitDate: e.target.value})}
                       className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Deskripsi Evaluasi</label>
              <textarea value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        rows={6} placeholder="Apa yang berjalan baik? Apa yang bisa diperbaiki? Pelajaran apa yang didapat?"
                        className="w-full px-4 py-3.5 bg-black text-white border-2 border-gray-800 rounded-xl hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors placeholder:text-gray-600 resize-none" />
            </div>
          </div>

          <div className="sticky bottom-0 bg-[#0a0a0a] p-4 border-t border-gray-800 flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Batal</Button>
            <Button type="submit" variant="primary" loading={loading} className="flex-1">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EvaluationView;
