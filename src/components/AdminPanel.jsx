import React, { useState, useEffect } from 'react';
import { Settings, User, UserCheck, UserX, Clock, Shield, Search } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Card, Button, LoadingSpinner, Avatar } from './ui';

const AdminPanel = ({ db, appId, adminId }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const usersRef = collection(db, `artifacts/${appId}/users`);
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      usersData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setUsers(usersData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db, appId]);

  const filteredUsers = users
    .filter(u => filter === 'all' || u.accountStatus === filter)
    .filter(u => !searchTerm || 
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const stats = {
    total: users.length,
    approved: users.filter(u => u.accountStatus === 'approved').length,
    pending: users.filter(u => u.accountStatus === 'pending').length,
    blocked: users.filter(u => u.accountStatus === 'blocked').length
  };

  const updateStatus = async (userId, newStatus) => {
    if (userId === adminId) {
      alert('Tidak dapat mengubah status admin utama');
      return;
    }
    await updateDoc(doc(db, `artifacts/${appId}/users`, userId), { accountStatus: newStatus });
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: 'bg-green-900/50 text-green-400',
      pending: 'bg-yellow-900/50 text-yellow-400',
      blocked: 'bg-red-900/50 text-red-400'
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-0 animate-fade-in">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-white">
            <Settings size={24} className="text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-sm text-gray-500">Kelola pengguna dan akses aplikasi</p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.total} icon={<User size={20} />} />
        <StatCard label="Approved" value={stats.approved} icon={<UserCheck size={20} />} borderColor="border-green-800" />
        <StatCard label="Pending" value={stats.pending} icon={<Clock size={20} />} borderColor="border-yellow-800" />
        <StatCard label="Blocked" value={stats.blocked} icon={<UserX size={20} />} borderColor="border-red-800" />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 p-1 bg-gray-900 rounded-xl">
            {['all', 'approved', 'pending', 'blocked'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize
                          ${filter === f ? 'bg-white text-black' 
                                        : 'text-gray-400 hover:text-white'}`}>
                {f === 'all' ? 'Semua' : f}
              </button>
            ))}
          </div>
          
          <div className="relative flex-1 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" />
            <input type="text" placeholder="Cari pengguna..."
                   value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                   className="w-full pl-12 pr-4 py-2.5 bg-black border-2 border-gray-800 rounded-xl text-sm text-white 
                             placeholder:text-gray-600 hover:border-gray-700 focus:border-gray-600 focus:outline-none transition-colors" />
          </div>
        </div>
      </Card>

      {/* Users List */}
      {loading ? (
        <LoadingSpinner message="Memuat pengguna..." />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-gray-800">
            {filteredUsers.map(user => (
              <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-gray-900/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar name={user.displayName} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{user.displayName}</p>
                      {user.isAdmin && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-white text-black text-xs font-medium rounded-full">
                          <Shield size={10} /> Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 ml-auto">
                  {getStatusBadge(user.accountStatus)}
                  
                  {user.id !== adminId && (
                    <div className="flex gap-2">
                      {user.accountStatus === 'pending' && (
                        <Button variant="success" size="sm" icon={<UserCheck size={14} />}
                                onClick={() => updateStatus(user.id, 'approved')}>
                          Setujui
                        </Button>
                      )}
                      {user.accountStatus === 'approved' && (
                        <Button variant="danger" size="sm" icon={<UserX size={14} />}
                                onClick={() => updateStatus(user.id, 'blocked')}>
                          Blokir
                        </Button>
                      )}
                      {user.accountStatus === 'blocked' && (
                        <Button variant="success" size="sm" icon={<UserCheck size={14} />}
                                onClick={() => updateStatus(user.id, 'approved')}>
                          Aktifkan
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Tidak ada pengguna ditemukan
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, borderColor = 'border-gray-800' }) => {
  return (
    <Card className={`p-4 border-l-4 ${borderColor}`}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gray-800 text-white">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  );
};

export default AdminPanel;
