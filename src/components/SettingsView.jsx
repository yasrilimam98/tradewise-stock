import React, { useState, useEffect } from 'react';
import { 
  Settings, Key, Eye, EyeOff, Save, RefreshCw, 
  CheckCircle, XCircle, AlertCircle, Wifi, WifiOff,
  Shield, ExternalLink
} from 'lucide-react';
import { Card, Button, Input } from './ui';

const STORAGE_KEY = 'stockbit_bearer_token';

const SettingsView = () => {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'success' | 'error'
  const [connectionMessage, setConnectionMessage] = useState('');
  const [lastTested, setLastTested] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_KEY);
    if (savedToken) {
      setToken(savedToken);
    }
    
    // Check if there's a last tested timestamp
    const lastTestedTime = localStorage.getItem('stockbit_last_tested');
    if (lastTestedTime) {
      setLastTested(new Date(lastTestedTime));
    }
  }, []);

  // Handle save token
  const handleSaveToken = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      // Simulate save delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (token.trim()) {
        localStorage.setItem(STORAGE_KEY, token.trim());
        setSaveMessage('Token berhasil disimpan!');
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setSaveMessage('Token dihapus');
        setConnectionStatus(null);
        setConnectionMessage('');
      }
    } catch (error) {
      setSaveMessage('Gagal menyimpan token');
    } finally {
      setIsSaving(false);
      // Clear save message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Handle test connection
  const handleTestConnection = async () => {
    if (!token.trim()) {
      setConnectionStatus('error');
      setConnectionMessage('Token tidak boleh kosong');
      return;
    }

    setIsTesting(true);
    setConnectionStatus(null);
    setConnectionMessage('Menguji koneksi...');

    try {
      // Test with a sample endpoint - using today's date
      const today = new Date().toISOString().split('T')[0];
      const testUrl = `https://exodus.stockbit.com/order-trade/running-trade?sort=DESC&limit=1&order_by=RUNNING_TRADE_ORDER_BY_TIME&date=${today}`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus('success');
        setConnectionMessage(`Koneksi berhasil! API merespons dengan status ${response.status}`);
        setLastTested(new Date());
        localStorage.setItem('stockbit_last_tested', new Date().toISOString());
      } else if (response.status === 401) {
        setConnectionStatus('error');
        setConnectionMessage('Token tidak valid atau sudah expired. Silakan perbarui token Anda.');
      } else if (response.status === 403) {
        setConnectionStatus('error');
        setConnectionMessage('Akses ditolak. Pastikan token memiliki permission yang diperlukan.');
      } else {
        setConnectionStatus('error');
        setConnectionMessage(`Error: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      // Handle CORS or network errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setConnectionStatus('warning');
        setConnectionMessage('Tidak dapat menguji koneksi langsung karena pembatasan CORS. Token tersimpan dan akan digunakan saat mengakses API melalui backend/proxy.');
      } else {
        setConnectionStatus('error');
        setConnectionMessage(`Gagal menguji koneksi: ${error.message}`);
      }
    } finally {
      setIsTesting(false);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle size={20} className="text-green-400" />;
      case 'error': return <XCircle size={20} className="text-red-400" />;
      case 'warning': return <AlertCircle size={20} className="text-yellow-400" />;
      default: return <Wifi size={20} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0 animate-fade-in">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-gray-900 to-black border border-gray-800 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/10 rounded-xl">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Pengaturan</h2>
          </div>
          <p className="text-gray-400">Kelola konfigurasi dan koneksi API Stockbit</p>
        </div>
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* API Configuration Card */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-800 rounded-xl">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Konfigurasi API Stockbit</h3>
            <p className="text-sm text-gray-500">Bearer Token untuk mengakses data trading</p>
          </div>
        </div>

        {/* Token Input */}
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-white mb-2">
              Bearer Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Masukkan Bearer Token dari Stockbit..."
                className="w-full py-3.5 px-4 pr-24 bg-black text-white
                          border-2 border-gray-800 rounded-xl
                          transition-all duration-300
                          focus:outline-none focus:border-gray-500 focus:shadow-[0_0_0_4px_rgba(255,255,255,0.05)]
                          hover:border-gray-700
                          placeholder:text-gray-600
                          font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
              >
                {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Token akan disimpan secara lokal di browser Anda dan digunakan untuk mengakses API Stockbit.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={handleSaveToken}
              loading={isSaving}
              variant="primary"
              icon={<Save size={18} />}
            >
              Simpan Token
            </Button>
            <Button
              onClick={handleTestConnection}
              loading={isTesting}
              variant="secondary"
              icon={<RefreshCw size={18} className={isTesting ? 'animate-spin' : ''} />}
              disabled={!token.trim()}
            >
              Test Koneksi
            </Button>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl animate-fade-in">
              <CheckCircle size={18} className="text-green-400" />
              <span className="text-sm text-green-400">{saveMessage}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Connection Status Card */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-800 rounded-xl">
            {connectionStatus === 'success' ? (
              <Wifi className="w-5 h-5 text-green-400" />
            ) : connectionStatus === 'error' ? (
              <WifiOff className="w-5 h-5 text-red-400" />
            ) : (
              <Wifi className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Status Koneksi</h3>
            <p className="text-sm text-gray-500">Hasil pengujian koneksi ke API Stockbit</p>
          </div>
        </div>

        {/* Status Display */}
        <div className={`p-4 rounded-xl border ${
          connectionStatus === 'success' ? 'bg-green-500/10 border-green-500/20' :
          connectionStatus === 'error' ? 'bg-red-500/10 border-red-500/20' :
          connectionStatus === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
          'bg-gray-800/50 border-gray-700'
        }`}>
          <div className="flex items-start gap-3">
            {getStatusIcon(connectionStatus)}
            <div className="flex-1">
              <p className={`font-medium ${getStatusColor(connectionStatus)}`}>
                {connectionStatus === 'success' ? 'Terhubung' :
                 connectionStatus === 'error' ? 'Gagal Terhubung' :
                 connectionStatus === 'warning' ? 'Peringatan' :
                 'Belum Diuji'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {connectionMessage || 'Klik "Test Koneksi" untuk menguji koneksi ke API Stockbit'}
              </p>
              {lastTested && (
                <p className="text-xs text-gray-500 mt-2">
                  Terakhir diuji: {lastTested.toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Info Card - How to get token */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-800 rounded-xl">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Cara Mendapatkan Bearer Token</h3>
            <p className="text-sm text-gray-500">Panduan untuk mendapatkan token dari Stockbit</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex gap-3 p-3 bg-gray-900/50 rounded-xl">
            <span className="flex-shrink-0 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold text-xs">1</span>
            <div>
              <p className="text-white font-medium">Login ke Stockbit</p>
              <p>Buka dan login ke akun Stockbit Anda di browser</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-gray-900/50 rounded-xl">
            <span className="flex-shrink-0 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold text-xs">2</span>
            <div>
              <p className="text-white font-medium">Buka Developer Tools</p>
              <p>Tekan F12 atau klik kanan → Inspect → Network tab</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-gray-900/50 rounded-xl">
            <span className="flex-shrink-0 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold text-xs">3</span>
            <div>
              <p className="text-white font-medium">Cari Request API</p>
              <p>Buka halaman trading, cari request ke `exodus.stockbit.com`</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-gray-900/50 rounded-xl">
            <span className="flex-shrink-0 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold text-xs">4</span>
            <div>
              <p className="text-white font-medium">Copy Bearer Token</p>
              <p>Klik request, lihat Headers → Authorization → Copy nilai setelah "Bearer "</p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-400">
              <strong>Penting:</strong> Token bersifat sementara dan mungkin expired. 
              Jika koneksi gagal, coba dapatkan token baru dari Stockbit.
            </p>
          </div>
        </div>
      </Card>

      {/* API Endpoint Info */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-800 rounded-xl">
            <ExternalLink className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Endpoint API yang Digunakan</h3>
            <p className="text-sm text-gray-500">Daftar endpoint yang akan diakses</p>
          </div>
        </div>

        <div className="bg-black p-4 rounded-xl overflow-x-auto">
          <code className="text-xs text-green-400 break-all">
            https://exodus.stockbit.com/order-trade/running-trade?sort=DESC&limit=100000&order_by=RUNNING_TRADE_ORDER_BY_TIME&symbols[]=SYMBOL&date=YYYY-MM-DD
          </code>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Endpoint ini digunakan untuk mengambil data running trade berdasarkan simbol dan tanggal.
        </p>
      </Card>
    </div>
  );
};

export default SettingsView;
