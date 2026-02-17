'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

interface JournalEntry {
  id: string;
  techniekGebruikt: string;
  triggers: string[];
  intensiteit: number | null;
  sensaties: string[];
  timestamp: Date;
}

export function IntensityStats() {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    const loadEntries = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        const entriesRef = collection(db, 'dagboekEntries');
        const q = query(
          entriesRef,
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            techniekGebruikt: docData.techniekGebruikt || docData.techniqueUsed || 'Unknown',
            triggers: Array.isArray(docData.triggers)
              ? docData.triggers
              : docData.trigger
              ? [docData.trigger]
              : [],
            intensiteit: docData.intensiteit || null,
            sensaties: Array.isArray(docData.sensaties) ? docData.sensaties : [],
            timestamp: docData.timestamp.toDate(),
          };
        }) as JournalEntry[];

        // Filter by time range
        const now = new Date();
        const filteredData = data.filter(entry => {
          const daysDiff = (now.getTime() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
          if (timeRange === 'week') return daysDiff <= 7;
          if (timeRange === 'month') return daysDiff <= 30;
          return true;
        });

        setEntries(filteredData);
      } catch (error) {
        console.error('Error loading intensity data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, [currentUser, timeRange]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
        <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Nog geen intensiteit data
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Begin met dagboek entries om je intensiteit trends te volgen
        </p>
        <a
          href="/tracking"
          className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
        >
          <i className="fas fa-book mr-2"></i>
          Ga naar Dagboek
        </a>
      </div>
    );
  }

  // Filter entries with intensity data
  const entriesWithIntensity = entries.filter(e => e.intensiteit !== null);

  if (entriesWithIntensity.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📈</div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Geen intensiteit metingen
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Je dagboek entries bevatten geen intensiteit scores
        </p>
      </div>
    );
  }

  // Calculate statistics
  const intensities = entriesWithIntensity.map(e => e.intensiteit!);
  const avgIntensity = Math.round(
    intensities.reduce((sum, val) => sum + val, 0) / intensities.length
  );
  const maxIntensity = Math.max(...intensities);
  const minIntensity = Math.min(...intensities);

  // Trend analysis (compare first half vs second half)
  const midPoint = Math.floor(entriesWithIntensity.length / 2);
  const recentEntries = entriesWithIntensity.slice(0, midPoint);
  const olderEntries = entriesWithIntensity.slice(midPoint);

  const recentAvg = recentEntries.length
    ? Math.round(
        recentEntries.reduce((sum, e) => sum + e.intensiteit!, 0) / recentEntries.length
      )
    : 0;
  const olderAvg = olderEntries.length
    ? Math.round(
        olderEntries.reduce((sum, e) => sum + e.intensiteit!, 0) / olderEntries.length
      )
    : 0;

  const trendDirection = recentAvg < olderAvg ? 'down' : recentAvg > olderAvg ? 'up' : 'stable';

  // Group by technique
  const byTechnique = entriesWithIntensity.reduce((acc, entry) => {
    const tech = entry.techniekGebruikt;
    if (!acc[tech]) acc[tech] = [];
    acc[tech].push(entry.intensiteit!);
    return acc;
  }, {} as Record<string, number[]>);

  const techniqueStats = Object.entries(byTechnique)
    .filter(([tech]) => tech !== 'Unknown') // Filter out Unknown techniques
    .map(([tech, values]) => ({
      technique: tech,
      avg: Math.round(values.reduce((sum, val) => sum + val, 0) / values.length),
      count: values.length,
    })).sort((a, b) => a.avg - b.avg);

  // Group by trigger
  const byTrigger: Record<string, number[]> = {};
  entriesWithIntensity.forEach(entry => {
    entry.triggers.forEach(trigger => {
      if (!byTrigger[trigger]) byTrigger[trigger] = [];
      byTrigger[trigger].push(entry.intensiteit!);
    });
  });

  const triggerStats = Object.entries(byTrigger)
    .map(([trigger, values]) => ({
      trigger,
      avg: Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 10) / 10,
      count: values.length,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  const getIntensityColor = (intensity: number) => {
    if (intensity <= 3) return 'from-green-400 to-green-600';
    if (intensity <= 5) return 'from-yellow-400 to-yellow-600';
    if (intensity <= 7) return 'from-orange-400 to-orange-600';
    return 'from-red-400 to-red-600';
  };

  const getIntensityLabel = (intensity: number) => {
    if (intensity <= 3) return 'Mild';
    if (intensity <= 5) return 'Gemiddeld';
    if (intensity <= 7) return 'Matig';
    return 'Ernstig';
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setTimeRange('week')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
            timeRange === 'week'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
            timeRange === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          Maand
        </button>
        <button
          onClick={() => setTimeRange('all')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
            timeRange === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          Alles
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 p-4 sm:p-6 rounded-xl text-center transition-colors">
          <div className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">Gemiddelde Intensiteit</div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-700 dark:text-blue-300">{avgIntensity}/10</div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">{getIntensityLabel(avgIntensity)}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/20 p-4 sm:p-6 rounded-xl text-center transition-colors">
          <div className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">Laagste</div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-700 dark:text-green-300">{minIntensity}/10</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/20 p-4 sm:p-6 rounded-xl text-center transition-colors">
          <div className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">Hoogste</div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-700 dark:text-red-300">{maxIntensity}/10</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-900/20 p-4 sm:p-6 rounded-xl text-center transition-colors">
          <div className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">Trend</div>
          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-700 dark:text-purple-300">
            {trendDirection === 'down' && (
              <>
                <i className="fas fa-arrow-down mr-2 text-green-600"></i>
                Beter
              </>
            )}
            {trendDirection === 'up' && (
              <>
                <i className="fas fa-arrow-up mr-2 text-red-600"></i>
                Hoger
              </>
            )}
            {trendDirection === 'stable' && (
              <>
                <i className="fas fa-minus mr-2 text-gray-600 dark:text-gray-400"></i>
                Stabiel
              </>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
          <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-gray-100">Intensiteit Trend</h3>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-t from-green-400 to-green-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-300">Mild (1-3)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-t from-yellow-400 to-yellow-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-300">Gemiddeld (4-5)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-t from-orange-400 to-orange-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-300">Matig (6-7)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-t from-red-400 to-red-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-300">Ernstig (8-10)</span>
            </div>
          </div>
        </div>

        {/* Chart with Y-axis and X-axis */}
        {(() => {
          const chartEntries = entriesWithIntensity.slice().reverse().slice(-20);
          const firstDate = chartEntries[0]?.timestamp.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
          const lastDate = chartEntries[chartEntries.length - 1]?.timestamp.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
          return (
            <div className="flex gap-2">
              {/* Y-axis labels */}
              <div className="flex flex-col justify-between text-xs font-medium text-gray-500 dark:text-gray-400 pb-6 w-6 shrink-0 text-right">
                <span>10</span>
                <span>7</span>
                <span>5</span>
                <span>3</span>
                <span>0</span>
              </div>

              {/* Chart area */}
              <div className="flex-1 min-w-0">
                <div className="relative h-56">
                  {/* Horizontal gridlines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[10, 7, 5, 3, 0].map((val) => (
                      <div key={val} className="w-full border-t border-gray-100 dark:border-slate-700"></div>
                    ))}
                  </div>
                  {/* Bars */}
                  <div className="absolute inset-0 flex items-end justify-between gap-1 pb-0">
                    {chartEntries.map((entry, index) => {
                      const height = (entry.intensiteit! / 10) * 100;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-0">
                          <div
                            className={`w-full bg-gradient-to-t ${getIntensityColor(entry.intensiteit!)} rounded-t transition-all hover:opacity-80 cursor-pointer`}
                            style={{ height: `${height}%` }}
                          >
                            {/* Tooltip */}
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-slate-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap transition-opacity pointer-events-none z-10">
                              <div className="font-bold">{entry.intensiteit}/10</div>
                              <div>{entry.timestamp.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</div>
                              <div className="text-gray-300 dark:text-gray-400">{entry.techniekGebruikt}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* X-axis */}
                {chartEntries.length > 1 && (
                  <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 px-0">
                    <span>{firstDate}</span>
                    {chartEntries.length > 4 && (
                      <span className="hidden sm:block text-gray-400 dark:text-gray-500">
                        {chartEntries.length} metingen
                      </span>
                    )}
                    <span>{lastDate}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Trigger Analysis */}
      {triggerStats.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 transition-colors">
          <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-100">
            Triggers met Hoogste Intensiteit
          </h3>
          <div className="space-y-3">
            {triggerStats.map(stat => (
              <div key={stat.trigger} className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 rounded-lg transition-colors">
                <div>
                  <div className="font-semibold text-gray-800 dark:text-gray-100">{stat.trigger}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{stat.count} keer voorgekomen</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stat.avg}/10</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl p-6 transition-colors">
        <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3">
          <i className="fas fa-lightbulb mr-2 text-yellow-500"></i>
          Inzichten
        </h4>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          {trendDirection === 'down' && (
            <li>✅ Positieve trend! Je gemiddelde intensiteit daalt</li>
          )}
          {trendDirection === 'up' && (
            <li>⚠️ Let op: Je intensiteit neemt toe. Overweeg meer oefeningen of professionele hulp</li>
          )}
          {avgIntensity <= 5 && (
            <li>👍 Je gemiddelde intensiteit is goed onder controle</li>
          )}
          {techniqueStats.length > 0 && (
            <li>
              🏆 <strong>{techniqueStats[0].technique}</strong> is jouw meest effectieve techniek
              (gem. {techniqueStats[0].avg}/10)
            </li>
          )}
          <li>📊 {entriesWithIntensity.length} entries geanalyseerd</li>
        </ul>
      </div>
    </div>
  );
}
