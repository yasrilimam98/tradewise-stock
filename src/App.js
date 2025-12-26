import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getStorage } from "firebase/storage";
import {
  AlignJustify, ChevronDown, ChevronsLeft, LogOut,
  User, Bell, Home, BookOpen, Activity, ClipboardCheck, Trophy, Settings,
  TrendingUp, PieChart, Plus, ExternalLink, LineChart, Users, BarChart3
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

// Import Components
import MobileNavbar from './components/MobileNavbar';
import JournalView from './components/JournalView';
import SignalsView from './components/SignalsView';
import EvaluationView from './components/EvaluationView';
import LeaderboardView from './components/LeaderboardView';
import AdminPanel from './components/AdminPanel';
import SettingsView from './components/SettingsView';
import MarketDashboard from './components/MarketDashboard';
import RunningTradeView from './components/RunningTradeView';
import InsiderView from './components/InsiderView';
import FlowLineView from './components/FlowLineView';
import BandarDetectorView from './components/BandarDetectorView';
import ValueInvestingView from './components/ValueInvestingView';
import PriceVolumeAnalysisView from './components/PriceVolumeAnalysisView';
import LandingPage from './landingpage/LandingPage';
import StockSearch from './components/StockSearch';
import DashboardStats from './components/DashboardStats';
import { Card, Button, LoadingSpinner, Avatar, StatusBadge, ROIBadge } from './components/ui';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

// Firebase Config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const appId = process.env.REACT_APP_FIREBASE_PROJECT_ID || 'default-trading-journal';
const ADMIN_ID = process.env.REACT_APP_ADMIN_ID;

// Firebase Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// Global Styles - Black & White Theme
const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

@keyframes fade -in { from { opacity: 0; } to { opacity: 1; } }
@keyframes scale - up { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes float { 0 %, 100 % { transform: translateY(0); } 50 % { transform: translateY(-10px); } }
  
  .animate - fade -in { animation: fade -in 0.3s ease- out; }
  .animate - scale - up { animation: scale - up 0.3s ease - out; }
  .animate - float { animation: float 6s ease -in -out infinite; }
  
  .safe - area - bottom { padding - bottom: env(safe - area - inset - bottom, 0); }
  
  :: -webkit - scrollbar { width: 6px; height: 6px; }
  :: -webkit - scrollbar - track { background: #1a1a1a; }
  :: -webkit - scrollbar - thumb { background: #444; border - radius: 3px; }
  :: -webkit - scrollbar - thumb:hover { background: #555; }
  
  body {
  background - color: #0a0a0a;
  color: #ffffff;
}
`;

export default function App() {
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = globalStyles;
    document.head.appendChild(styleEl);
    document.documentElement.classList.add('dark');
    return () => styleEl.remove();
  }, []);

  return <MainApp />;
}

function MainApp() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountStatus, setAccountStatus] = useState('loading');
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoadingAuth(true);
      if (currentUser && !currentUser.isAnonymous) {
        const userRef = doc(db, `artifacts / ${appId}/users`, currentUser.uid);
        const userDoc = await getDoc(userRef);
        const userIsAdmin = currentUser.uid === ADMIN_ID;

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setAccountStatus(userData.accountStatus || 'pending');
          if (userIsAdmin && !userData.isAdmin) {
            await updateDoc(userRef, { isAdmin: true, accountStatus: 'approved' });
            setIsAdmin(true);
            setAccountStatus('approved');
          } else {
            setIsAdmin(userData.isAdmin || false);
          }
        } else {
          await setDoc(userRef, {
            displayName: currentUser.displayName,
            email: currentUser.email,
            isAdmin: userIsAdmin,
            accountStatus: userIsAdmin ? 'approved' : 'pending',
            createdAt: serverTimestamp()
          });
          setAccountStatus(userIsAdmin ? 'approved' : 'pending');
          setIsAdmin(userIsAdmin);
        }
        setUser(currentUser);
      } else if (currentUser?.isAnonymous) {
        setUser(currentUser);
        setIsAdmin(false);
        setAccountStatus('approved');
      } else {
        setUser(null);
        setIsAdmin(false);
        setAccountStatus('loading');
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle Google Sign In
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  if (loadingAuth) return <LoadingScreen message="Mempersiapkan aplikasi..." />;
  if (!user) return <LandingPage onGoogleLogin={handleGoogleLogin} />;

  return (
    <div className="bg-[#0a0a0a] min-h-screen font-sans text-white">
      {accountStatus === 'approved' && <TradingJournalLayout user={user} isAdmin={isAdmin} />}
      {accountStatus === 'pending' && <StatusScreen user={user} status="pending" />}
      {accountStatus === 'blocked' && <StatusScreen user={user} status="blocked" />}
    </div>
  );
}

// Login Screen - Black & White
function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    setLoading(true);
    try { await signInWithPopup(auth, provider); }
    catch (e) { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center animate-scale-up">
        {/* Logo */}
        <div className="mb-8">
          <img src="/tradewise.png" alt="TradeWise" className="h-16 mx-auto mb-6" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">TradeWise</h1>
        <p className="text-xl text-gray-400 mb-2">Trading Journal Pro</p>
        <p className="text-gray-500 mb-10">Analisa dan tingkatkan performa trading Anda</p>

        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: TrendingUp, label: 'Tracking', desc: 'Catat semua trade' },
            { icon: PieChart, label: 'Analytics', desc: 'Analisa mendalam' },
            { icon: Activity, label: 'Real-time', desc: 'Data terkini' }
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <item.icon className="w-6 h-6 mx-auto mb-2 text-white" />
              <span className="text-xs text-gray-400 block">{item.label}</span>
            </div>
          ))}
        </div>

        <button onClick={handleLogin} disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold
                     bg-white text-black hover:bg-gray-100 
                     transition-all duration-300 hover:-translate-y-1 disabled:opacity-50
                     border border-white/20 shadow-2xl shadow-white/10">
          {loading ? (
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <GoogleIcon />
              <span>Masuk dengan Google</span>
            </>
          )}
        </button>

        <p className="text-gray-600 text-sm mt-8">
          © 2025 TradeWise. All rights reserved.
        </p>
      </div>
    </div>
  );
}

const GoogleIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 40.791 26.715 42 24 42c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.49 44 30.861 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

function LoadingScreen({ message }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-800 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-white rounded-full animate-spin" />
      </div>
      <p className="mt-6 text-lg text-white">{message}</p>
    </div>
  );
}

function StatusScreen({ user, status }) {
  const isBlocked = status === 'blocked';
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-black">
      <div className="bg-[#111] border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center animate-scale-up">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center
                        ${isBlocked ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
          {isBlocked ? <User size={32} /> : <ClipboardCheck size={32} />}
        </div>
        <h2 className="text-xl font-bold mb-2 text-white">{isBlocked ? 'Akun Diblokir' : 'Menunggu Persetujuan'}</h2>
        <p className="text-gray-400 mb-6">
          {isBlocked ? 'Silakan hubungi administrator' : 'Akun Anda sedang ditinjau oleh admin'}
        </p>
        <div className="flex items-center gap-3 p-3 bg-black border border-gray-800 rounded-xl">
          <Avatar name={user.displayName} />
          <div className="text-left flex-1">
            <p className="font-semibold text-white">{user.displayName}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <button onClick={() => signOut(auth)}
            className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}

function TradingJournalLayout({ user, isAdmin }) {
  const [view, setView] = useState(() => {
    // Persist view state in localStorage
    const saved = localStorage.getItem('currentView');
    return saved || 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleViewChange = (newView) => {
    setView(newView);
    localStorage.setItem('currentView', newView);
    setSidebarOpen(false);
  };

  const renderContent = () => {
    const props = { user, isAdmin, db, storage, appId };
    const navigateToSettings = () => handleViewChange('settings');

    switch (view) {
      case 'dashboard': return <MarketDashboard {...props} onNavigateToSettings={navigateToSettings} />;
      case 'runningTrade': return <RunningTradeView {...props} onNavigateToSettings={navigateToSettings} />;
      case 'insider': return <InsiderView {...props} onNavigateToSettings={navigateToSettings} />;
      case 'flowline': return <FlowLineView {...props} onNavigateToSettings={navigateToSettings} />;
      case 'bandarDetector': return <BandarDetectorView {...props} onNavigateToSettings={navigateToSettings} />;
      case 'valueInvesting': return <ValueInvestingView {...props} onNavigateToSettings={navigateToSettings} />;
      case 'pva': return <PriceVolumeAnalysisView {...props} onNavigateToSettings={navigateToSettings} />;
      case 'journal': return <JournalView {...props} />;
      case 'signals': return <SignalsView {...props} />;
      case 'evaluation': return <EvaluationView {...props} />;
      case 'leaderboard': return <LeaderboardView {...props} />;
      case 'settings': return <SettingsView {...props} />;
      case 'adminPanel': return isAdmin ? <AdminPanel {...props} adminId={ADMIN_ID} /> : null;
      default: return <MarketDashboard {...props} onNavigateToSettings={navigateToSettings} />;
    }
  };

  return (
    <div className="flex min-h-screen relative">
      {/* Desktop Sidebar */}
      <Sidebar user={user} isAdmin={isAdmin} view={view} setView={handleViewChange}
        isOpen={sidebarOpen} setIsOpen={setSidebarOpen}
        isCollapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Header user={user} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 relative">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navbar */}
      <MobileNavbar view={view} setView={handleViewChange} isAdmin={isAdmin} />
    </div>
  );
}

function Sidebar({ user, isAdmin, view, setView, isOpen, setIsOpen, isCollapsed, setCollapsed }) {
  const navItems = [
    { icon: Home, label: 'Dashboard', viewName: 'dashboard' },
    { icon: TrendingUp, label: 'Daily Transaksi', viewName: 'runningTrade' },
    { icon: Users, label: 'Bandar Detector', viewName: 'bandarDetector' },
    { icon: PieChart, label: 'Insider', viewName: 'insider' },
    { icon: LineChart, label: 'FlowLine', viewName: 'flowline' },
    { icon: Activity, label: 'Value Investing', viewName: 'valueInvesting' },
    { icon: BarChart3, label: 'PVA', viewName: 'pva' },
    { icon: BookOpen, label: 'Jurnal Trading', viewName: 'journal' },
    { icon: Activity, label: 'Trading Signals', viewName: 'signals' },
    { icon: ClipboardCheck, label: 'Evaluasi', viewName: 'evaluation' },
    { icon: Trophy, label: 'Leaderboard', viewName: 'leaderboard' },
    { icon: Settings, label: 'Pengaturan', viewName: 'settings' },
  ];
  if (isAdmin) navItems.push({ icon: Settings, label: 'Admin Panel', viewName: 'adminPanel' });

  return (
    <>
      {/* Overlay */}
      <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-30 lg:hidden transition-opacity
                      ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)} />

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-[#0a0a0a] flex flex-col p-5 z-40 
                        border-r border-gray-800 transition-all duration-300
                        ${isCollapsed ? 'w-20' : 'w-64'} 
                        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className={`flex items-center gap-3 mb-8 ${isCollapsed ? 'justify-center' : ''}`}>
          <img src="/tradewise.png" alt="TradeWise" className={`${isCollapsed ? 'h-8' : 'h-10'}`} />
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button key={item.viewName} onClick={() => setView(item.viewName)}
              className={`group flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all
                         ${isCollapsed ? 'justify-center' : ''}
                         ${view === item.viewName
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <item.icon size={20} />
              {!isCollapsed && <span className="ml-3">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="space-y-2 pt-4 border-t border-gray-800">
          <button onClick={() => setCollapsed(!isCollapsed)}
            className={`hidden lg:flex items-center w-full px-4 py-3 text-sm rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white ${isCollapsed ? 'justify-center' : ''}`}>
            <ChevronsLeft size={20} className={`transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
            {!isCollapsed && <span className="ml-3">Collapse</span>}
          </button>

          <button onClick={() => signOut(auth)}
            className={`flex items-center w-full px-4 py-3 text-sm rounded-xl text-red-400 hover:bg-red-500/10 ${isCollapsed ? 'justify-center' : ''}`}>
            <LogOut size={20} />
            {!isCollapsed && <span className="ml-3">Keluar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

function Header({ user, setSidebarOpen }) {
  const [time, setTime] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const greeting = time.getHours() < 12 ? 'Selamat Pagi' : time.getHours() < 18 ? 'Selamat Siang' : 'Selamat Malam';

  return (
    <header className="flex items-center justify-between bg-[#0a0a0a]/80 backdrop-blur-xl p-4 sticky top-0 z-20 border-b border-gray-800">
      <div className="flex items-center gap-4">
        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white">
          <AlignJustify size={24} />
        </button>
        <div className="hidden sm:block">
          <h1 className="text-lg font-bold text-white">{greeting}, <span className="text-gray-300">{user.displayName?.split(' ')[0]}</span>! 👋</h1>
          <p className="text-sm text-gray-500">{time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden lg:block w-56">
          <StockSearch placeholder="Cari saham..." />
        </div>

        <button className="relative p-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-800">
            <Avatar name={user.displayName} size="sm" />
            <ChevronDown size={16} className={`hidden sm:block text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#111] border border-gray-800 rounded-xl shadow-2xl py-2 z-50 animate-scale-up">
              <div className="px-4 py-2 border-b border-gray-800">
                <p className="font-semibold text-sm text-white">{user.displayName}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <button onClick={() => signOut(auth)} className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10">
                <LogOut size={16} className="mr-2" /> Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function DashboardView({ user, db, appId }) {
  const [trades, setTrades] = useState([]);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tradesRef = collection(db, `artifacts/${appId}/public/data/trades`);
    const q = query(tradesRef, where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTrades(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db, appId, user.uid]);

  useEffect(() => {
    const signalsRef = collection(db, `artifacts/${appId}/public/data/signals`);
    const unsubscribe = onSnapshot(signalsRef, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSignals(data.slice(0, 6));
    });
    return () => unsubscribe();
  }, [db, appId]);

  if (loading) return <LoadingSpinner message="Memuat dashboard..." />;

  return (
    <div className="space-y-6 pb-20 lg:pb-0 animate-fade-in">
      {/* Welcome */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-gray-900 to-black border border-gray-800 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-2">Dashboard Trading Anda 📈</h2>
          <p className="text-gray-400 mb-4">Pantau performa trading dan analisa portofolio</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" icon={<Plus size={18} />} className="!bg-white !text-black hover:!bg-gray-100">Tambah Trade</Button>
            <Button variant="secondary" icon={<ExternalLink size={18} />} className="!bg-gray-800 !text-white hover:!bg-gray-700">Lihat Semua</Button>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Stats */}
      <DashboardStats trades={trades} signals={signals} />

      {/* Recent Trades */}
      <div className="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white">Trade Terbaru</h3>
            <p className="text-sm text-gray-500">5 trade terakhir Anda</p>
          </div>
        </div>
        <div className="divide-y divide-gray-800">
          {trades.length > 0 ? trades.slice(0, 5).map(trade => (
            <div key={trade.id} className="flex items-center justify-between p-4 hover:bg-gray-900/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm
                               ${trade.status === 'Win' || trade.status === 'TP1' || trade.status === 'TP2' ? 'bg-green-600' :
                    trade.status === 'Loss' || trade.status === 'CL' ? 'bg-red-600' : 'bg-gray-600'}`}>
                  {trade.code?.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{trade.code}</span>
                    <StatusBadge status={trade.status} size="sm" />
                  </div>
                  <span className="text-sm text-gray-500">{trade.buySell}</span>
                </div>
              </div>
              <ROIBadge value={trade.roi || 0} />
            </div>
          )) : (
            <div className="p-8 text-center text-gray-500">
              <BookOpen className="mx-auto mb-2 text-gray-600" size={32} />
              <p>Belum ada trade</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
