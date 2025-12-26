import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Award } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, LoadingSpinner, Avatar } from './ui';

const LeaderboardView = ({ db, appId }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch approved users
        const usersRef = collection(db, `artifacts/${appId}/users`);
        const usersQuery = query(usersRef, where("accountStatus", "==", "approved"));
        const usersSnap = await getDocs(usersQuery);
        const usersMap = {};
        usersSnap.forEach(doc => usersMap[doc.id] = doc.data());

        // Fetch public trades
        const tradesRef = collection(db, `artifacts/${appId}/public/data/trades`);
        const tradesQuery = query(tradesRef, where("isPublic", "==", true));
        const tradesSnap = await getDocs(tradesQuery);

        // Calculate stats per user
        const userStats = {};
        tradesSnap.forEach(doc => {
          const trade = doc.data();
          if (!usersMap[trade.userId]) return;

          if (!userStats[trade.userId]) {
            userStats[trade.userId] = { 
              wins: 0, closedTrades: 0, totalTrades: 0, totalROI: 0, 
              user: usersMap[trade.userId] 
            };
          }
          userStats[trade.userId].totalTrades++;
          userStats[trade.userId].totalROI += parseFloat(trade.roi) || 0;
          if (trade.status === 'Win' || trade.status === 'Loss') {
            userStats[trade.userId].closedTrades++;
            if (trade.status === 'Win') userStats[trade.userId].wins++;
          }
        });

        // Calculate win rate and sort
        const calculated = Object.values(userStats)
          .map(stats => ({
            ...stats,
            winRate: stats.closedTrades > 0 ? (stats.wins / stats.closedTrades) * 100 : 0
          }))
          .sort((a, b) => b.winRate - a.winRate || b.totalROI - a.totalROI);

        setLeaderboard(calculated);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db, appId]);

  const getRankIcon = (index) => {
    switch(index) {
      case 0: return <Crown size={24} className="text-yellow-400" />;
      case 1: return <Medal size={24} className="text-gray-400" />;
      case 2: return <Award size={24} className="text-amber-600" />;
      default: return <span className="text-lg font-bold text-gray-500">{index + 1}</span>;
    }
  };

  const getRankBg = (index) => {
    switch(index) {
      case 0: return 'bg-yellow-500/5 border-l-yellow-500';
      case 1: return 'bg-gray-500/5 border-l-gray-400';
      case 2: return 'bg-amber-500/5 border-l-amber-600';
      default: return 'bg-transparent border-l-gray-800';
    }
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-0 animate-fade-in">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-white">
            <Trophy size={24} className="text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Leaderboard</h1>
            <p className="text-sm text-gray-500">Peringkat trader berdasarkan Win Rate</p>
          </div>
        </div>
      </Card>

      {/* Top 3 Podium */}
      {!loading && leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 0, 2].map((idx) => {
            const entry = leaderboard[idx];
            if (!entry) return null;
            const isFirst = idx === 0;
            return (
              <Card key={idx} className={`p-4 text-center ${isFirst ? 'transform -translate-y-2 border-yellow-500/30' : ''}`}>
                <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center
                               ${isFirst ? 'bg-white' : 'bg-gray-800'}`}>
                  {isFirst && <Crown size={28} className="text-black" />}
                  {idx === 1 && <span className="text-2xl font-bold text-gray-400">2</span>}
                  {idx === 2 && <span className="text-2xl font-bold text-gray-400">3</span>}
                </div>
                <p className="font-bold text-white truncate">{entry.user?.displayName}</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{entry.winRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">Win Rate</p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full List */}
      {loading ? (
        <LoadingSpinner message="Menghitung peringkat..." />
      ) : leaderboard.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-bold text-white">Belum Ada Data</h3>
          <p className="text-gray-500">Belum ada trader dengan trade publik</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-gray-800">
            {leaderboard.map((entry, index) => (
              <div key={entry.user?.email || index} 
                   className={`flex items-center justify-between p-4 transition-colors hover:bg-gray-900/50 ${getRankBg(index)} border-l-4`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center">
                    {getRankIcon(index)}
                  </div>
                  <Avatar name={entry.user?.displayName} size="md" />
                  <div>
                    <p className="font-semibold text-white">
                      {entry.user?.displayName}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{entry.totalTrades} trades</span>
                      <span>•</span>
                      <span>{entry.wins}W / {entry.closedTrades - entry.wins}L</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-xl font-bold text-green-400">{entry.winRate.toFixed(1)}%</p>
                  <p className={`text-sm font-medium ${entry.totalROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {entry.totalROI >= 0 ? '+' : ''}{entry.totalROI.toFixed(2)}% ROI
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default LeaderboardView;
