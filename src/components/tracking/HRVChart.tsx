'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, limit, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';

interface HRVMeasurement {
  id: string;
  value: number;
  heartRate?: number;
  timestamp: Date;
}

export function HRVChart() {
  const { currentUser } = useAuth();
  const [measurements, setMeasurements] = useState<HRVMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [baselineValue, setBaselineValue] = useState<number | null>(null);
  const [autoBaseline, setAutoBaseline] = useState<number | null>(null);
  const [showBaselineInput, setShowBaselineInput] = useState(false);
  const [tempBaseline, setTempBaseline] = useState('');

  useEffect(() => {
    loadMeasurements();
    loadBaseline();
    loadAutoBaseline();
  }, [currentUser]);

  const loadAutoBaseline = async () => {
    if (!currentUser) return;
    try {
      const autoBaselineDoc = await getDocs(
        query(
          collection(db, 'users', currentUser.uid, 'settings'),
          where('type', '==', 'hrv_auto_baseline'),
          limit(1)
        )
      );
      if (!autoBaselineDoc.empty) {
        setAutoBaseline(autoBaselineDoc.docs[0].data().value);
      }
    } catch (error) {
      console.error('Error loading auto baseline:', error);
    }
  };

  const loadMeasurements = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, 'hrv_measurements'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(60)
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        // Handle V1 compatibility - try different field names
        const value = docData.value || docData.rmssd || docData.hrv || docData.measurement || 0;
        // Handle V1 heart rate compatibility
        const heartRate = docData.heartRate || docData.heart_rate || docData.hr || undefined;

        return {
          id: doc.id,
          value: typeof value === 'number' ? value : 0,
          heartRate: heartRate ? (typeof heartRate === 'number' ? heartRate : undefined) : undefined,
          timestamp: docData.timestamp.toDate(),
        };
      }).filter(m => m.value > 0); // Filter out invalid measurements

      setMeasurements(data);
    } catch (error) {
      console.error('Error loading HRV measurements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBaseline = async () => {
    if (!currentUser) return;
    try {
      const baselineDoc = await getDocs(
        query(collection(db, 'users', currentUser.uid, 'settings'), where('type', '==', 'hrv_baseline'), limit(1))
      );
      if (!baselineDoc.empty) {
        setBaselineValue(baselineDoc.docs[0].data().value);
      }
    } catch (error) {
      console.error('Error loading baseline:', error);
    }
  };

  // Calculate and update automatic baseline (30-day median)
  const calculateAutoBaseline = (measurements: HRVMeasurement[]) => {
    if (measurements.length === 0) return null;

    // Get measurements from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMeasurements = measurements
      .filter(m => m.timestamp >= thirtyDaysAgo)
      .map(m => m.value)
      .sort((a, b) => a - b);

    if (recentMeasurements.length === 0) return null;

    // Calculate median (more robust than mean)
    const mid = Math.floor(recentMeasurements.length / 2);
    const median =
      recentMeasurements.length % 2 === 0
        ? Math.round((recentMeasurements[mid - 1] + recentMeasurements[mid]) / 2)
        : recentMeasurements[mid];

    return median;
  };

  // Auto-update baseline weekly
  useEffect(() => {
    const updateAutoBaseline = async () => {
      if (!currentUser || measurements.length === 0) return;

      try {
        // Check if we need to update (weekly)
        const settingsDoc = await getDocs(
          query(
            collection(db, 'users', currentUser.uid, 'settings'),
            where('type', '==', 'hrv_auto_baseline'),
            limit(1)
          )
        );

        const shouldUpdate =
          settingsDoc.empty ||
          (settingsDoc.docs[0].data().lastUpdated &&
            new Date().getTime() - settingsDoc.docs[0].data().lastUpdated.toDate().getTime() >
              7 * 24 * 60 * 60 * 1000); // 7 days

        if (shouldUpdate) {
          const autoBaseline = calculateAutoBaseline(measurements);
          if (autoBaseline) {
            await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'hrv_auto_baseline'), {
              type: 'hrv_auto_baseline',
              value: autoBaseline,
              lastUpdated: new Date(),
              timestamp: new Date(),
            });
          }
        }
      } catch (error) {
        console.error('Error updating auto baseline:', error);
      }
    };

    updateAutoBaseline();
  }, [currentUser, measurements]);

  const saveBaseline = async () => {
    if (!currentUser || !tempBaseline) return;

    const value = Number(tempBaseline);
    if (isNaN(value) || value < 10 || value > 200) {
      alert('Baseline moet tussen 10 en 200 ms zijn');
      return;
    }

    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'hrv_baseline'), {
        type: 'hrv_baseline',
        value: value,
        timestamp: new Date(),
      });
      setBaselineValue(value);
      setShowBaselineInput(false);
      setTempBaseline('');
    } catch (error) {
      console.error('Error saving baseline:', error);
      alert('Fout bij opslaan baseline');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze HRV meting wilt verwijderen?')) return;

    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'hrv_measurements', id));
      setMeasurements(measurements.filter(m => m.id !== id));
    } catch (error) {
      console.error('Error deleting HRV measurement:', error);
      alert('Er ging iets mis bij het verwijderen.');
    } finally {
      setDeletingId(null);
    }
  };

  const getLevel = (value: number) => {
    if (!value || isNaN(value) || value <= 0) return { label: 'Ongeldig', color: 'red' };
    if (value < 20) return { label: 'Zeer laag', color: 'red' };
    if (value < 50) return { label: 'Laag', color: 'orange' };
    if (value < 75) return { label: 'Gemiddeld', color: 'yellow' };
    if (value < 100) return { label: 'Goed', color: 'green' };
    return { label: 'Uitstekend', color: 'emerald' };
  };

  const colorClasses = {
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    emerald: 'bg-emerald-100 text-emerald-800',
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-spinner fa-spin text-4xl text-gray-400 dark:text-gray-500 transition-colors"></i>
      </div>
    );
  }

  if (measurements.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">💓</div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors">
          Nog geen HRV metingen
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 transition-colors">
          Voeg je eerste HRV meting toe via het Oefeningen tabblad
        </p>
        <a
          href="/exercises"
          className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
        >
          <i className="fas fa-plus mr-2"></i>
          Voeg HRV meting toe
        </a>
      </div>
    );
  }

  // Safely calculate statistics
  const validMeasurements = measurements.filter(m => m.value && !isNaN(m.value) && m.value > 0);

  if (validMeasurements.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">💓</div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors">
          Geen geldige HRV metingen
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 transition-colors">
          De opgeslagen metingen bevatten geen geldige waarden. Voeg een nieuwe meting toe via het Oefeningen tabblad.
        </p>
        <a
          href="/exercises"
          className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
        >
          <i className="fas fa-plus mr-2"></i>
          Voeg HRV meting toe
        </a>
      </div>
    );
  }

  const avgHRV = Math.round(validMeasurements.reduce((sum, m) => sum + m.value, 0) / validMeasurements.length);
  const maxHRV = Math.max(...validMeasurements.map(m => m.value));
  const minHRV = Math.min(...validMeasurements.map(m => m.value));
  const latestHRV = validMeasurements[0].value;

  // Calculate trend (last 5 vs previous 5)
  const recent = validMeasurements.slice(0, Math.min(5, validMeasurements.length));
  const older = validMeasurements.slice(5, Math.min(10, validMeasurements.length));
  const recentAvg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
  const olderAvg = older.length > 0 ? older.reduce((sum, m) => sum + m.value, 0) / older.length : recentAvg;
  const trend = recentAvg > olderAvg ? 'up' : recentAvg < olderAvg ? 'down' : 'stable';

  // Prepare data for line chart (oldest first for proper timeline)
  const chartData = validMeasurements.slice(0, 30).reverse();
  const chartMax = Math.max(maxHRV, baselineValue || 0, autoBaseline || 0) + 20;
  const chartMin = Math.max(0, Math.min(minHRV, baselineValue || minHRV, autoBaseline || minHRV) - 10);

  return (
    <div className="space-y-6 px-4">
      {/* Summary Stats - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-900/20 rounded-xl p-3 sm:p-4 transition-colors">
          <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-semibold mb-1 transition-colors">Laatste</div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-900 dark:text-purple-200 transition-colors">{latestHRV}</div>
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1 transition-colors">ms</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 rounded-xl p-3 sm:p-4 transition-colors">
          <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1 transition-colors">Gemiddeld</div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-200 transition-colors">{avgHRV}</div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 transition-colors">ms</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/20 rounded-xl p-3 sm:p-4 transition-colors">
          <div className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-semibold mb-1 break-words transition-colors">
            {autoBaseline ? 'Baseline' : 'Max'}
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-green-900 dark:text-green-200 transition-colors">
            {autoBaseline || maxHRV}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1 transition-colors">{autoBaseline ? '30d' : 'ms'}</div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-700/30 rounded-xl p-3 sm:p-4 transition-colors">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-semibold mb-1 transition-colors">Trend</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1 transition-colors">
            {trend === 'up' && <><i className="fas fa-arrow-up text-green-600 dark:text-green-400 text-sm transition-colors"></i> <span className="text-base sm:text-lg">↑</span></>}
            {trend === 'down' && <><i className="fas fa-arrow-down text-red-600 dark:text-red-400 text-sm transition-colors"></i> <span className="text-base sm:text-lg">↓</span></>}
            {trend === 'stable' && <><i className="fas fa-minus text-gray-600 dark:text-gray-400 text-sm transition-colors"></i> <span className="text-base sm:text-lg">→</span></>}
          </div>
        </div>
      </div>

      {/* Baseline Info */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700 transition-colors">
        <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center mb-3 transition-colors">
          <i className="fas fa-chart-line mr-2 text-green-600 dark:text-green-400 transition-colors"></i>
          Baseline Tracking
        </h4>

        {/* Auto Baseline */}
        {autoBaseline && (
          <div className="mb-3 p-3 bg-white/50 dark:bg-slate-700/50 rounded-lg transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors">
                  <i className="fas fa-robot mr-1 text-blue-600 dark:text-blue-400 transition-colors"></i>
                  Automatische Baseline (30-dagen mediaan)
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors">
                  Wordt wekelijks bijgewerkt op basis van je metingen
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors">{autoBaseline} ms</div>
            </div>
          </div>
        )}

        {/* Manual Baseline */}
        <div className="p-3 bg-white/50 dark:bg-slate-700/50 rounded-lg transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors">
                <i className="fas fa-target mr-1 text-green-600 dark:text-green-400 transition-colors"></i>
                {baselineValue ? 'Persoonlijk Doel' : 'Optioneel: Stel persoonlijk doel in'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors">
                {baselineValue
                  ? `Je persoonlijke doel is ${baselineValue} ms`
                  : 'Gebruik dit als je een specifiek HRV doel wilt nastreven'
                }
              </div>
            </div>
            {baselineValue && !showBaselineInput && (
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mr-4 transition-colors">{baselineValue} ms</div>
            )}
          </div>

          {!showBaselineInput ? (
            <button
              onClick={() => setShowBaselineInput(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm transition-colors"
            >
              {baselineValue ? 'Wijzig doel' : 'Stel doel in'}
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                value={tempBaseline}
                onChange={(e) => setTempBaseline(e.target.value)}
                placeholder="bijv. 75"
                className="flex-1 px-3 py-2 border-2 border-green-300 dark:border-green-600 dark:bg-slate-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-500 transition-colors"
              />
              <button
                onClick={saveBaseline}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <i className="fas fa-check"></i>
              </button>
              <button
                onClick={() => {
                  setShowBaselineInput(false);
                  setTempBaseline('');
                }}
                className="px-3 py-2 bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-slate-500 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg transition-colors">
        <h3 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-gray-100 transition-colors">
          <i className="fas fa-chart-bar text-purple-600 dark:text-purple-400 mr-2 transition-colors"></i>
          HRV Tijdlijn (laatste 30 metingen)
        </h3>

        {/* Chart Container with horizontal scroll on mobile */}
        <div className="relative h-80 overflow-x-auto overflow-y-hidden touch-pan-x">
          <div className="relative h-full" style={{ minWidth: chartData.length > 20 ? `${chartData.length * 24}px` : '100%' }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 pr-2 bg-white dark:bg-slate-800 z-10 transition-colors">
              <span>{chartMax}</span>
              <span>{Math.round((chartMax + chartMin) / 2)}</span>
              <span>{chartMin}</span>
            </div>

            {/* Chart area with bars */}
            <div className="absolute left-14 right-0 top-0 bottom-8 border-l-2 border-b-2 border-gray-300 dark:border-slate-600 transition-colors">
            {/* Auto Baseline line (blue) */}
            {autoBaseline && (
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400 dark:border-blue-500 z-10 transition-colors"
                style={{
                  bottom: `${((autoBaseline - chartMin) / (chartMax - chartMin)) * 100}%`,
                }}
              >
                <span className="absolute right-2 -top-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-1 transition-colors">
                  Baseline: {autoBaseline}ms
                </span>
              </div>
            )}

            {/* Manual Goal line (green) */}
            {baselineValue && (
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-green-500 dark:border-green-500 z-10 transition-colors"
                style={{
                  bottom: `${((baselineValue - chartMin) / (chartMax - chartMin)) * 100}%`,
                }}
              >
                <span className="absolute left-2 -top-2 text-xs font-semibold text-green-600 dark:text-green-400 bg-white dark:bg-slate-800 px-1 transition-colors">
                  Doel: {baselineValue}ms
                </span>
              </div>
            )}

              {/* Bars */}
              <div className="absolute inset-0 flex items-end justify-between gap-1">
                {chartData.map((measurement) => {
                  const height = ((measurement.value - chartMin) / (chartMax - chartMin)) * 100;
                  const level = getLevel(measurement.value);

                  return (
                    <div
                      key={measurement.id}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      style={{ minWidth: '20px' }}
                    >
                      <div
                        className={`w-full bg-gradient-to-t from-purple-400 to-blue-500 rounded-t transition-all hover:opacity-80 cursor-pointer`}
                        style={{ height: `${height}%` }}
                      >
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-2 px-3 whitespace-nowrap transition-opacity pointer-events-none z-20">
                          <div className="font-bold">{measurement.value}ms</div>
                          {measurement.heartRate && (
                            <div className="text-gray-300">HR: {measurement.heartRate} bpm</div>
                          )}
                          <div className="text-gray-300">
                            {measurement.timestamp.toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className={`text-${level.color}-300`}>{level.label}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="absolute left-14 right-0 bottom-0 flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 transition-colors">
              <span>
                {chartData[0]?.timestamp.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
              </span>
              <span className="text-gray-400 dark:text-gray-500 transition-colors">
                {chartData.length} metingen
              </span>
              <span>
                {chartData[chartData.length - 1]?.timestamp.toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile scroll hint */}
        {chartData.length > 20 && (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2 md:hidden transition-colors">
            <i className="fas fa-hand-pointer mr-1"></i>
            Veeg horizontaal om alle metingen te zien
          </div>
        )}
      </div>


      {/* Info card */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 transition-colors">
        <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center transition-colors">
          <i className="fas fa-info-circle mr-2 text-purple-600 dark:text-purple-400 transition-colors"></i>
          Over HRV
        </h4>
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 transition-colors">
          <div className="flex items-start gap-2">
            <i className="fas fa-check text-green-600 dark:text-green-400 mt-1 transition-colors"></i>
            <span>Hogere HRV = beter herstel en minder stress</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-check text-green-600 dark:text-green-400 mt-1 transition-colors"></i>
            <span>Meet 's ochtends direct na het wakker worden</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-check text-green-600 dark:text-green-400 mt-1 transition-colors"></i>
            <span>Resonant breathing (5-5 ademhaling) verhoogt HRV</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-check text-green-600 dark:text-green-400 mt-1 transition-colors"></i>
            <span>Volg trends, niet individuele metingen</span>
          </div>
          {autoBaseline && (
            <div className="flex items-start gap-2 mt-4 pt-4 border-t border-purple-200 dark:border-purple-700 transition-colors">
              <i className="fas fa-robot text-blue-600 dark:text-blue-400 mt-1 transition-colors"></i>
              <span>
                Je automatische baseline is {autoBaseline}ms (30-dagen mediaan) - wordt wekelijks bijgewerkt
              </span>
            </div>
          )}
          {baselineValue && (
            <div className="flex items-start gap-2 mt-2">
              <i className="fas fa-target text-green-600 dark:text-green-400 mt-1 transition-colors"></i>
              <span>Je persoonlijke doel is {baselineValue}ms</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
