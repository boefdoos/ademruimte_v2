'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, limit, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface CPRecord {
  id: string;
  seconds: number;
  timestamp: Date;
}

export function ControlPauseChart() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState<CPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cpGoal, setCpGoal] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);

  // Load/save personal goal from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('cpGoal');
    if (stored) {
      const val = parseInt(stored, 10);
      if (!isNaN(val) && val > 0) {
        setCpGoal(val);
        setGoalInput(String(val));
      }
    }
  }, []);

  const saveGoal = () => {
    const val = parseInt(goalInput, 10);
    if (!isNaN(val) && val > 0 && val <= 120) {
      setCpGoal(val);
      localStorage.setItem('cpGoal', String(val));
      setEditingGoal(false);
    }
  };

  useEffect(() => {
    const loadRecords = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        const cpRef = collection(db, 'cpMeasurements');
        let q = query(
          cpRef,
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(100)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            // Handle V1 backwards compatibility: V1 uses "score", V2 uses "seconds"
            seconds: docData.seconds || docData.score || 0,
            timestamp: docData.timestamp.toDate(),
          };
        });

        // Filter by time range
        const now = new Date();
        const filteredData = data.filter(record => {
          const daysDiff = (now.getTime() - record.timestamp.getTime()) / (1000 * 60 * 60 * 24);
          if (timeRange === 'week') return daysDiff <= 7;
          if (timeRange === 'month') return daysDiff <= 30;
          return true;
        }).reverse(); // Oldest first for chart

        setRecords(filteredData);
      } catch (error) {
        console.error('Error loading CP records:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [currentUser, timeRange]);

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze CP meting wilt verwijderen?')) return;

    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'cpMeasurements', id));
      setRecords(records.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting CP measurement:', error);
      alert('Er ging iets mis bij het verwijderen.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded transition-colors"></div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors">
          Nog geen Control Pause metingen
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 transition-colors">
          Start met meten om je vooruitgang te volgen
        </p>
        <a
          href="/exercises"
          className="inline-block px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          <i className="fas fa-stopwatch mr-2"></i>
          Start Control Pause
        </a>
      </div>
    );
  }

  const maxCP = Math.max(...records.map(r => r.seconds));
  const minCP = Math.min(...records.map(r => r.seconds));
  const avgCP = Math.round(records.reduce((sum, r) => sum + r.seconds, 0) / records.length);

  const getLevel = (seconds: number) => {
    if (seconds < 10) return 'Zeer laag';
    if (seconds < 20) return 'Laag';
    if (seconds < 30) return 'Gemiddeld';
    if (seconds < 40) return 'Goed';
    return 'Uitstekend';
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setTimeRange('week')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            timeRange === 'week'
              ? 'bg-blue-600 dark:bg-blue-700 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            timeRange === 'month'
              ? 'bg-blue-600 dark:bg-blue-700 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          Maand
        </button>
        <button
          onClick={() => setTimeRange('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            timeRange === 'all'
              ? 'bg-blue-600 dark:bg-blue-700 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          Alles
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl text-center transition-colors">
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 transition-colors">Hoogste</div>
          <div className="text-3xl font-bold text-green-700 dark:text-green-400 transition-colors">{maxCP}s</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors">{getLevel(maxCP)}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl text-center transition-colors">
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 transition-colors">Gemiddeld</div>
          <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 transition-colors">{avgCP}s</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors">{getLevel(avgCP)}</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-xl text-center transition-colors">
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 transition-colors">Laagste</div>
          <div className="text-3xl font-bold text-orange-700 dark:text-orange-400 transition-colors">{minCP}s</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors">{getLevel(minCP)}</div>
        </div>
      </div>

      {/* Personal goal setting */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 transition-colors">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <i className="fas fa-bullseye text-blue-600 dark:text-blue-400"></i>
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">Persoonlijk doel:</span>
            {cpGoal
              ? <span className="text-blue-700 dark:text-blue-300 font-bold">{cpGoal}s</span>
              : <span className="text-gray-500 dark:text-gray-400 text-sm italic">nog niet ingesteld</span>
            }
          </div>
          {editingGoal ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveGoal()}
                min={5} max={120}
                placeholder="seconden"
                className="w-24 px-3 py-1.5 border-2 border-blue-400 rounded-lg text-sm font-semibold text-center dark:bg-slate-700 dark:text-gray-100 dark:border-blue-500"
              />
              <button onClick={saveGoal} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                Opslaan
              </button>
              <button onClick={() => setEditingGoal(false)} className="px-3 py-1.5 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors">
                Annuleer
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingGoal(true)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              {cpGoal ? 'Wijzigen' : 'Instellen'}
            </button>
          )}
        </div>
        {cpGoal && records.length > 0 && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {maxCP >= cpGoal
              ? `✅ Doel bereikt! Je beste meting (${maxCP}s) ligt boven je doel.`
              : `Je bent ${cpGoal - maxCP}s verwijderd van je doel van ${cpGoal}s.`
            }
          </div>
        )}
      </div>

      {/* Bar Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg dark:shadow-2xl transition-colors">
        <h3 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-gray-100 transition-colors">
          <i className="fas fa-chart-bar text-green-600 dark:text-green-500 mr-2 transition-colors"></i>
          Control Pause Tijdlijn
        </h3>

        {/* Chart Container with horizontal scroll on mobile */}
        <div className="relative h-80 overflow-x-auto overflow-y-hidden touch-pan-x">
          <div className="relative h-full" style={{ minWidth: records.length > 20 ? `${records.length * 24}px` : '100%' }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-10 sm:w-12 flex flex-col justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300 pr-1 sm:pr-2 bg-white dark:bg-slate-800 z-10 transition-colors font-medium">
              <span>60s</span>
              <span>50s</span>
              <span className="font-semibold text-green-600 dark:text-green-400 transition-colors">40s</span>
              <span className="font-semibold text-yellow-600 dark:text-yellow-400 transition-colors">30s</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400 transition-colors">20s</span>
              <span className="font-semibold text-red-600 dark:text-red-400 transition-colors">10s</span>
              <span>0s</span>
            </div>

            {/* Chart area with bars */}
            <div className="absolute left-10 sm:left-12 md:left-14 right-0 top-0 bottom-8 border-l-2 border-b-2 border-gray-300 dark:border-slate-600 transition-colors">
              {/* Reference lines */}
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-green-200 dark:border-green-900/50 transition-colors" style={{ bottom: '66.67%' }}></div>
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-200 dark:border-yellow-900/50 transition-colors" style={{ bottom: '50%' }}></div>
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-orange-200 dark:border-orange-900/50 transition-colors" style={{ bottom: '33.33%' }}></div>
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-red-200 dark:border-red-900/50 transition-colors" style={{ bottom: '16.67%' }}></div>
              {/* Personal goal line */}
              {cpGoal && (
                <div
                  className="absolute left-0 right-0 border-t-2 border-dashed border-blue-500 dark:border-blue-400 z-10 transition-colors"
                  style={{ bottom: `${(cpGoal / 60) * 100}%` }}
                >
                  <span className="absolute right-0 -top-4 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-1">
                    Doel {cpGoal}s
                  </span>
                </div>
              )}

              {/* Bars */}
              <div className="absolute inset-0 flex items-end justify-between gap-1">
                {records.map((record) => {
                  const height = (record.seconds / 60) * 100;
                  const colorClass = record.seconds >= 40
                    ? 'from-green-400 to-emerald-500'
                    : record.seconds >= 30
                    ? 'from-yellow-400 to-green-500'
                    : record.seconds >= 20
                    ? 'from-orange-400 to-yellow-500'
                    : 'from-red-400 to-orange-500';

                  return (
                    <div
                      key={record.id}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      style={{ minWidth: '20px' }}
                    >
                      <div
                        className={`w-full bg-gradient-to-t ${colorClass} rounded-t transition-all hover:opacity-80 cursor-pointer dark:opacity-90 dark:hover:opacity-100`}
                        style={{ height: `${height}%` }}
                      >
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-slate-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap transition-opacity pointer-events-none z-20">
                          <div className="font-bold">{record.seconds}s</div>
                          <div className="text-gray-300 dark:text-gray-400 transition-colors">
                            {record.timestamp.toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-gray-300 dark:text-gray-400 transition-colors">{getLevel(record.seconds)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="absolute left-10 sm:left-12 md:left-14 right-0 bottom-0 flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300 pt-2 transition-colors font-medium">
              <span>
                {records[0]?.timestamp.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
              </span>
              <span className="text-gray-500 dark:text-gray-400 transition-colors hidden sm:inline">
                {records.length} metingen
              </span>
              <span>
                {records[records.length - 1]?.timestamp.toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile scroll hint */}
        {records.length > 20 && (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2 md:hidden transition-colors">
            <i className="fas fa-hand-pointer mr-1"></i>
            Veeg horizontaal om alle metingen te zien
          </div>
        )}
      </div>

      {/* Insights with proper baseline comparison */}
      {(() => {
        // Baseline = median of the older half; Recent = average of last 3
        const sorted = [...records]; // already oldest-first
        const recentN = Math.min(3, sorted.length);
        const recentRecords = sorted.slice(-recentN);
        const olderRecords = sorted.slice(0, Math.max(1, sorted.length - recentN));

        const recentAvg = Math.round(recentRecords.reduce((s, r) => s + r.seconds, 0) / recentRecords.length);
        const olderValues = olderRecords.map(r => r.seconds).sort((a, b) => a - b);
        const mid = Math.floor(olderValues.length / 2);
        const baseline = olderValues.length > 0
          ? (olderValues.length % 2 === 0
            ? Math.round((olderValues[mid - 1] + olderValues[mid]) / 2)
            : olderValues[mid])
          : recentAvg;

        const diff = recentAvg - baseline;
        const THRESHOLD = 2; // seconds

        const trendUp = records.length >= 4 && diff >= THRESHOLD;
        const trendDown = records.length >= 4 && diff <= -THRESHOLD;
        const trendStable = records.length >= 4 && !trendUp && !trendDown;

        return (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl p-6 transition-colors">
            <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 transition-colors">
              <i className="fas fa-lightbulb mr-2 text-yellow-500 dark:text-yellow-400 transition-colors"></i>
              Inzichten
            </h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 transition-colors">
              <li>📈 {records.length} meting{records.length !== 1 ? 'en' : ''} in deze periode</li>

              {/* Trend vs baseline — only show when enough data */}
              {records.length >= 4 && (
                <li>
                  {trendUp && `⬆️ Positieve trend! Recente gem. ${recentAvg}s vs basislijn ${baseline}s (+${diff}s)`}
                  {trendDown && `⬇️ Lichte daling: recente gem. ${recentAvg}s vs basislijn ${baseline}s (${diff}s). Normaal bij stress of slaaptekort.`}
                  {trendStable && `➡️ Stabiel: recente gem. ${recentAvg}s — vergelijkbaar met je basislijn van ${baseline}s.`}
                </li>
              )}
              {records.length < 4 && records.length >= 2 && (
                <li>📊 Meet nog {4 - records.length}× meer voor een betrouwbare trendanalyse.</li>
              )}

              {/* Level feedback */}
              {maxCP >= 40 && <li>✅ Uitstekend! Je beste meting ({maxCP}s) duidt op een gezonde ademhaling.</li>}
              {avgCP >= 30 && avgCP < 40 && <li>👍 Goed bezig! Gemiddelde CP van {avgCP}s is een gezond niveau.</li>}
              {avgCP < 20 && <li>💪 Blijf oefenen! Elke seconde verbetering telt — dat zal je merken in je klachten.</li>}

              {/* Goal progress */}
              {cpGoal && maxCP < cpGoal && (
                <li>🎯 Doel van {cpGoal}s: je bent er al op {Math.round((maxCP / cpGoal) * 100)}%.</li>
              )}
            </ul>
          </div>
        );
      })()}

      {/* Records List with Delete — max 15 most recent */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-gray-800 dark:text-gray-100 flex items-center transition-colors">
            <i className="fas fa-list mr-2 text-blue-600 dark:text-blue-400 transition-colors"></i>
            Recente metingen
          </h4>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Laatste {Math.min(records.length, 15)} van {records.length}
          </span>
        </div>
        <div className="space-y-2">
          {records.slice().reverse().slice(0, 15).map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors">{record.seconds}s</div>
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">{getLevel(record.seconds)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                    {record.timestamp.toLocaleDateString('nl-NL', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(record.id)}
                disabled={deletingId === record.id}
                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                title="Verwijder meting"
              >
                {deletingId === record.id ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-trash"></i>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
