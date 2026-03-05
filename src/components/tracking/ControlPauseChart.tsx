'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, limit, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface CPRecord {
  id: string;
  seconds: number;
  timestamp: Date;
}

export function ControlPauseChart() {
  const { currentUser } = useAuth();
  const { t, locale } = useI18n();
  const [records, setRecords] = useState<CPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cpGoal, setCpGoal] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [activeBar, setActiveBar] = useState<string | null>(null);
  const [activeStatCard, setActiveStatCard] = useState<'max' | 'avg' | 'min' | null>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);

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

  useLayoutEffect(() => {
    if (chartScrollRef.current) {
      chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth;
    }
  }, [records.length]);

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
    if (!confirm(t('cp.confirm_delete'))) return;

    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'cpMeasurements', id));
      setRecords(records.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting CP measurement:', error);
      alert(t('common.error_deleting'));
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
          {t('cp.empty_title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 transition-colors">
          {t('cp.empty_desc')}
        </p>
        <a
          href="/exercises"
          className="inline-block px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          <i className="fas fa-stopwatch mr-2"></i>
          {t('cp.start')}
        </a>
      </div>
    );
  }

  const maxCP = Math.max(...records.map(r => r.seconds));
  const minCP = Math.min(...records.map(r => r.seconds));
  const avgCP = Math.round(records.reduce((sum, r) => sum + r.seconds, 0) / records.length);

  const getLevel = (seconds: number) => {
    if (seconds < 10) return t('common.level_very_low');
    if (seconds < 20) return t('common.level_low');
    if (seconds < 30) return t('common.level_average');
    if (seconds < 40) return t('common.level_good');
    return t('common.level_excellent');
  };

  const maxRecord = records.reduce((best, r) => r.seconds > best.seconds ? r : best, records[0]);
  const minRecord = records.reduce((worst, r) => r.seconds < worst.seconds ? r : worst, records[0]);

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
          {t('common.week')}
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            timeRange === 'month'
              ? 'bg-blue-600 dark:bg-blue-700 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          {t('common.month')}
        </button>
        <button
          onClick={() => setTimeRange('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            timeRange === 'all'
              ? 'bg-blue-600 dark:bg-blue-700 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          {t('common.all')}
        </button>
      </div>

      {/* Stats Summary — tappable for date detail */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl text-center transition-colors relative cursor-pointer select-none"
          onClick={() => setActiveStatCard(prev => prev === 'max' ? null : 'max')}
        >
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 transition-colors">{t('intensity.highest')}</div>
          <div className="text-3xl font-bold text-green-700 dark:text-green-400 transition-colors">{maxCP}s</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors">{getLevel(maxCP)}</div>
          {activeStatCard === 'max' && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1.5 px-2 whitespace-nowrap z-20 pointer-events-none shadow-lg">
              {maxRecord.timestamp.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
        <div
          className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl text-center transition-colors relative cursor-pointer select-none"
          onClick={() => setActiveStatCard(prev => prev === 'avg' ? null : 'avg')}
        >
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 transition-colors">{t('common.level_average')}</div>
          <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 transition-colors">{avgCP}s</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors">{getLevel(avgCP)}</div>
          {activeStatCard === 'avg' && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1.5 px-2 whitespace-nowrap z-20 pointer-events-none shadow-lg">
              {t('cp.avg_n_measurements').replace('{n}', String(records.length))}
            </div>
          )}
        </div>
        <div
          className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-xl text-center transition-colors relative cursor-pointer select-none"
          onClick={() => setActiveStatCard(prev => prev === 'min' ? null : 'min')}
        >
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 transition-colors">{t('intensity.lowest')}</div>
          <div className="text-3xl font-bold text-orange-700 dark:text-orange-400 transition-colors">{minCP}s</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors">{getLevel(minCP)}</div>
          {activeStatCard === 'min' && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1.5 px-2 whitespace-nowrap z-20 pointer-events-none shadow-lg">
              {minRecord.timestamp.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      </div>

      {/* Personal goal setting */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 transition-colors">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <i className="fas fa-bullseye text-blue-600 dark:text-blue-400"></i>
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{t('cp.personal_goal')}</span>
            {cpGoal
              ? <span className="text-blue-700 dark:text-blue-300 font-bold">{cpGoal}s</span>
              : <span className="text-gray-500 dark:text-gray-400 text-sm italic">{t('cp.not_set')}</span>
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
                placeholder={t('cp.seconds_unit')}
                className="w-24 px-3 py-1.5 border-2 border-blue-400 rounded-lg text-sm font-semibold text-center dark:bg-slate-700 dark:text-gray-100 dark:border-blue-500"
              />
              <button onClick={saveGoal} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                {t('save')}
              </button>
              <button onClick={() => setEditingGoal(false)} className="px-3 py-1.5 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors">
                {t('cancel')}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingGoal(true)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              {cpGoal ? t('cp.change') : t('cp.set_goal')}
            </button>
          )}
        </div>
        {cpGoal && records.length > 0 && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {maxCP >= cpGoal
              ? t('cp.goal_reached_detail').replace('{max}', String(maxCP))
              : t('cp.goal_distance').replace('{diff}', String(cpGoal - maxCP)).replace('{goal}', String(cpGoal))
            }
          </div>
        )}
      </div>

      {/* Bar Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg dark:shadow-2xl transition-colors">
        <h3 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-gray-100 transition-colors">
          <i className="fas fa-chart-bar text-green-600 dark:text-green-500 mr-2 transition-colors"></i>
          {t('cp.chart_title')}
        </h3>

        {/* Chart Container — y-axis is sticky (outside scroll), bars scroll */}
        <div className="flex h-80">
          {/* Y-axis — fixed, never scrolls. Tick labels only. */}
          <div className="flex-shrink-0 w-12 sm:w-14 relative pb-8">
            {/* Scale tick labels */}
            {([60, 50, 40, 30, 20, 10, 0] as const).map((val) => {
              const colorClass = val >= 40 ? 'text-green-600 dark:text-green-400'
                : val >= 30 ? 'text-yellow-600 dark:text-yellow-400'
                : val >= 20 ? 'text-orange-600 dark:text-orange-400'
                : val >= 10 ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400';
              return (
                <span
                  key={val}
                  className={`absolute right-1 text-xs sm:text-sm font-medium transition-colors ${colorClass}`}
                  style={{ bottom: `calc(2rem + ${(val / 60) * 18}rem)`, transform: 'translateY(50%)' }}
                >
                  {val}s
                </span>
              );
            })}
          </div>

          {/* Chart wrapper — relative so non-scrolling overlay can be positioned over scroll area */}
          <div className="flex-1 relative">
            {/* Non-scrolling Gem./Doel labels — float over scroll area, never scroll */}
            <div className="absolute left-0 top-0 bottom-8 z-20 pointer-events-none">
              {/* Average label */}
              <div
                className="absolute left-1 text-xs font-bold text-gray-600 dark:text-gray-400 bg-white/95 dark:bg-slate-800/95 whitespace-nowrap px-1 rounded leading-none"
                style={{ bottom: `${(avgCP / 60) * 100}%`, transform: 'translateY(50%)' }}
              >
                {t('cp.gem_abbr')}
              </div>
              {/* Goal label */}
              {cpGoal && cpGoal <= 60 && (
                <div
                  className="absolute left-1 text-xs font-bold text-green-600 dark:text-green-400 bg-white/95 dark:bg-slate-800/95 whitespace-nowrap px-1 rounded leading-none"
                  style={{ bottom: `${(cpGoal / 60) * 100}%`, transform: 'translateY(50%)' }}
                >
                  {t('cp.doel_label')}
                </div>
              )}
            </div>

          {/* Scrollable chart area */}
          <div ref={chartScrollRef} className="h-full overflow-x-auto overflow-y-hidden touch-pan-x">
          <div className="relative h-full" style={{ minWidth: records.length > 20 ? `${records.length * 24}px` : '100%' }}>

            {/* Chart area with bars */}
            <div className="absolute left-0 right-0 top-0 bottom-8 border-l-2 border-b-2 border-gray-300 dark:border-slate-600 transition-colors">
              {/* Reference lines */}
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-green-200 dark:border-green-900/50 transition-colors" style={{ bottom: '66.67%' }}></div>
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-200 dark:border-yellow-900/50 transition-colors" style={{ bottom: '50%' }}></div>
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-orange-200 dark:border-orange-900/50 transition-colors" style={{ bottom: '33.33%' }}></div>
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-red-200 dark:border-red-900/50 transition-colors" style={{ bottom: '16.67%' }}></div>
              
              {/* Average line — label is in the y-axis (always visible) */}
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-gray-400 dark:border-gray-500 z-10 transition-colors"
                style={{ bottom: `${(avgCP / 60) * 100}%` }}
              />

              {/* Goal line — label is in the y-axis (always visible) */}
              {cpGoal && cpGoal <= 60 && (
                <div
                  className="absolute left-0 right-0 border-t-2 border-dashed border-green-500 dark:border-green-400 z-10 transition-colors"
                  style={{ bottom: `${(cpGoal / 60) * 100}%` }}
                />
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
                      className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer"
                      style={{ minWidth: '20px' }}
                      onClick={() => setActiveBar(prev => prev === record.id ? null : record.id)}
                    >
                      {/* Tooltip — conditional render, sibling above bar */}
                      {activeBar === record.id && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 dark:bg-slate-900 text-white text-xs rounded py-1.5 px-2 whitespace-nowrap pointer-events-none z-30 shadow-lg">
                          <div className="font-bold">{record.seconds}s — {getLevel(record.seconds)}</div>
                          <div className="text-gray-300 dark:text-gray-400">
                            {record.timestamp.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                      )}
                      {/* Bar */}
                      <div
                        className={`w-full bg-gradient-to-t ${colorClass} rounded-t dark:opacity-90`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="absolute left-0 right-0 bottom-0 flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300 pt-2 transition-colors font-medium">
              <span>
                {records[0]?.timestamp.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', { day: 'numeric', month: 'short' })}
              </span>
              <span className="text-gray-500 dark:text-gray-400 transition-colors hidden sm:inline">
                {locale === 'nl' ? 'metingen' : 'measurements'}
              </span>
              <span>
                {records[records.length - 1]?.timestamp.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
          </div>
          </div>{/* end scrollable area */}
          </div>{/* end chart wrapper */}
        </div>{/* end flex row */}

        {/* Mobile scroll hint */}
        {records.length > 20 && (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2 md:hidden transition-colors">
            <i className="fas fa-hand-pointer mr-1"></i>
            {t('hrv.scroll_hint')}
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
              {t('common.insights_title')}
            </h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 transition-colors">
              <li>{records.length} {locale === 'nl' ? `meting${records.length !== 1 ? 'en' : ''} in deze periode` : `measurement${records.length !== 1 ? 's' : ''} in this period`}</li>

              {/* Trend vs baseline — only show when enough data */}
              {records.length >= 4 && (
                <li>
                  {trendUp && `${t('cp.insights_positive')} ${t('cp.trend_up_detail').replace('{recent}', String(recentAvg)).replace('{baseline}', String(baseline)).replace('{diff}', String(diff))}`}
                  {trendDown && `${t('cp.insights_decline')} ${t('cp.trend_down_detail').replace('{recent}', String(recentAvg)).replace('{baseline}', String(baseline)).replace('{diff}', String(diff))}`}
                  {trendStable && `${t('cp.insights_stable')} ${t('cp.trend_stable_detail').replace('{recent}', String(recentAvg)).replace('{baseline}', String(baseline))}`}
                </li>
              )}
              {records.length < 4 && records.length >= 2 && (
                <li>{t('cp.need_more_measurements').replace('{n}', String(4 - records.length))}</li>
              )}

              {/* Level feedback */}
              {maxCP >= 40 && <li>{t('cp.excellent_measurement_detail').replace('{n}', String(maxCP))}</li>}
              {avgCP >= 30 && avgCP < 40 && <li>{t('cp.insights_good').replace('{n}', String(avgCP))}</li>}
              {avgCP < 20 && <li>{t('cp.keep_practicing')}</li>}

              {/* Goal progress */}
              {cpGoal && maxCP < cpGoal && (
                <li>{t('cp.goal_progress').replace('{goal}', String(cpGoal)).replace('{pct}', String(Math.round((maxCP / cpGoal) * 100)))}</li>
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
            {t('cp.recent_measurements')}
          </h4>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('cp.last_n_of_total').replace('{shown}', String(Math.min(records.length, 15))).replace('{total}', String(records.length))}
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
                    {record.timestamp.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', {
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
                title={t('cp.delete_tooltip')}
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
