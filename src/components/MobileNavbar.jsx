import React from 'react';
import { Home, BookOpen, Activity, ClipboardCheck, Trophy, Settings, TrendingUp, Users, LineChart, Calculator } from 'lucide-react';

const MobileNavbar = ({ view, setView, isAdmin }) => {
  const navItems = [
    { icon: Home, label: 'Home', viewName: 'dashboard' },
    { icon: TrendingUp, label: 'Trade', viewName: 'runningTrade' },
    { icon: Users, label: 'Bandar', viewName: 'bandarDetector' },
    { icon: Calculator, label: 'Value', viewName: 'valueInvesting' },
    { icon: Settings, label: 'Setting', viewName: 'settings' },
  ];
  
  if (isAdmin) {
    navItems.push({ icon: Settings, label: 'Admin', viewName: 'adminPanel' });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-gray-800 lg:hidden z-30 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = view === item.viewName;
          return (
            <button
              key={item.viewName}
              onClick={() => setView(item.viewName)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200
                         ${isActive 
                           ? 'bg-white text-black' 
                           : 'text-gray-500 hover:text-white'}`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-black' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavbar;
