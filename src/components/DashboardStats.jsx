import React from 'react';
import { TrendingUp, TrendingDown, Target, Activity, BarChart2, Percent } from 'lucide-react';

const DashboardStats = ({ trades = [], signals = [] }) => {
  // Calculate stats
  const totalTrades = trades.length;
  const winTrades = trades.filter(t => t.status === 'Win' || t.status === 'TP1' || t.status === 'TP2').length;
  const lossTrades = trades.filter(t => t.status === 'Loss' || t.status === 'CL').length;
  const winRate = totalTrades > 0 ? ((winTrades / totalTrades) * 100).toFixed(1) : 0;
  
  const totalROI = trades.reduce((sum, t) => sum + (parseFloat(t.roi) || 0), 0);
  const avgROI = totalTrades > 0 ? (totalROI / totalTrades).toFixed(2) : 0;
  
  const openTrades = trades.filter(t => t.status === 'Open').length;
  const activeSignals = signals.filter(s => s.status === 'Ongoing').length;

  const stats = [
    { 
      label: 'Total Trade', 
      value: totalTrades, 
      icon: Activity,
      color: 'border-gray-700'
    },
    { 
      label: 'Win Rate', 
      value: `${winRate}%`, 
      icon: Percent,
      color: 'border-gray-700',
      sublabel: `${winTrades}W / ${lossTrades}L`
    },
    { 
      label: 'Total ROI', 
      value: `${totalROI >= 0 ? '+' : ''}${totalROI.toFixed(1)}%`, 
      icon: totalROI >= 0 ? TrendingUp : TrendingDown,
      color: totalROI >= 0 ? 'border-green-800' : 'border-red-800',
      valueColor: totalROI >= 0 ? 'text-green-400' : 'text-red-400'
    },
    { 
      label: 'Rata-rata ROI', 
      value: `${avgROI >= 0 ? '+' : ''}${avgROI}%`, 
      icon: BarChart2,
      color: avgROI >= 0 ? 'border-green-800' : 'border-red-800',
      valueColor: avgROI >= 0 ? 'text-green-400' : 'text-red-400'
    },
    { 
      label: 'Open Trade', 
      value: openTrades, 
      icon: Target,
      color: 'border-gray-700'
    },
    { 
      label: 'Active Signals', 
      value: activeSignals, 
      icon: Activity,
      color: 'border-gray-700'
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <div 
          key={index}
          className={`bg-[#111] border ${stat.color} rounded-2xl p-4 transition-all duration-300 hover:border-gray-600`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-gray-900 rounded-xl">
              <stat.icon size={18} className="text-gray-400" />
            </div>
          </div>
          <div className={`text-2xl font-bold mb-1 ${stat.valueColor || 'text-white'}`}>
            {stat.value}
          </div>
          <div className="text-sm text-gray-500">{stat.label}</div>
          {stat.sublabel && (
            <div className="text-xs text-gray-600 mt-1">{stat.sublabel}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
