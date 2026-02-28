'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';

interface JournalEntry {
  id: string;
  triggers: string[];
  intensiteit: number | null;
  sensaties: string[];
  notities: string;
  timestamp: Date;
}

type Period = 'week' | 'month' | 'all';

interface SavedInsight {
  text: string;
  generatedAt: string;
  period: string;
  entryCount: number;
}

export function JournalAnalysis() {
  const { currentUser } = useAuth();
  const { t, locale } = useI18n();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [insight, setInsight] = useState<SavedInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState(false);
  const insightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        const q = query(
          collection(db, 'dagboekEntries'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(q);
        setEntries(snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            triggers: Array.isArray(d.triggers) ? d.triggers : (d.trigger ? [d.trigger] : []),
            intensiteit: typeof d.intensiteit === 'number' ? d.intensiteit : null,
            sensaties: Array.isArray(d.sensaties) ? d.sensaties : [],
            notities: d.notities || '',
            timestamp: d.timestamp.toDate(),
          };
        }));
      } catch (e) {
        console.error('Error loading journal entries:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  // Filter entries by period — computed here so generateInsight can use it
  const now = new Date();
  const filtered = entries.filter(e => {
    if (period === 'week') return (now.getTime() - e.timestamp.getTime()) < 7 * 86400000;
    if (period === 'month') return (now.getTime() - e.timestamp.getTime()) < 30 * 86400000;
    return true;
  });

  // Load saved insight from Firestore when period changes
  useEffect(() => {
    if (!currentUser) return;
    const loadInsight = async () => {
      try {
        const ref = doc(db, 'users', currentUser.uid, 'journalInsights', period);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setInsight(snap.data() as SavedInsight);
        } else {
          setInsight(null);
        }
      } catch (e) {
        console.error('Error loading insight:', e);
      }
    };
    loadInsight();
  }, [currentUser, period]);

  const generateInsight = async () => {
    if (!currentUser || filtered.length === 0) return;
    setInsightLoading(true);
    setInsightError(false);
    try {
      const payload = {
        entries: filtered.map(e => ({
          triggers: e.triggers,
          intensiteit: e.intensiteit,
          sensaties: e.sensaties,
          notities: e.notities,
          timestamp: e.timestamp.toISOString(),
        })),
        period,
        locale,
      };
      const res = await fetch('/api/journal-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const saved: SavedInsight = {
        text: data.insight,
        generatedAt: data.generatedAt,
        period,
        entryCount: filtered.length,
      };
      // Persist to Firestore
      await setDoc(doc(db, 'users', currentUser.uid, 'journalInsights', period), saved);
      setInsight(saved);
      setTimeout(() => insightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      console.error('Insight generation error:', e);
      setInsightError(true);
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 dark:border-teal-400"></div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📓</div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{t('journal_analysis.empty_title')}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{t('journal_analysis.empty_desc')}</p>
        <a href="/tracking" className="inline-block px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors">
          <i className="fas fa-plus mr-2"></i>{t('journal_analysis.empty_button')}
        </a>
      </div>
    );
  }

  // --- 1. Trigger frequency ---
  const triggerCount: Record<string, number> = {};
  filtered.forEach(e => e.triggers.forEach(tr => { triggerCount[tr] = (triggerCount[tr] || 0) + 1; }));
  const topTriggers = Object.entries(triggerCount).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // --- 2. Sensation frequency ---
  const sensationCount: Record<string, number> = {};
  filtered.forEach(e => e.sensaties.forEach(s => { sensationCount[s] = (sensationCount[s] || 0) + 1; }));
  const topSensations = Object.entries(sensationCount).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // --- 3. Triggers by average intensity (only entries WITH intensity scores) ---
  const triggerIntensity: Record<string, number[]> = {};
  filtered.forEach(e => {
    if (e.intensiteit === null) return;
    e.triggers.forEach(tr => {
      if (!triggerIntensity[tr]) triggerIntensity[tr] = [];
      triggerIntensity[tr].push(e.intensiteit as number);
    });
  });
  const triggerSeverity = Object.entries(triggerIntensity)
    .filter(([, vals]) => vals.length >= 2)
    .map(([tr, vals]) => ({
      trigger: tr,
      avg: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
      count: vals.length,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 7);

  // --- 4. Sensations by average intensity ---
  const sensationIntensity: Record<string, number[]> = {};
  filtered.forEach(e => {
    if (e.intensiteit === null) return;
    e.sensaties.forEach(s => {
      if (!sensationIntensity[s]) sensationIntensity[s] = [];
      sensationIntensity[s].push(e.intensiteit as number);
    });
  });
  const sensationSeverity = Object.entries(sensationIntensity)
    .filter(([, vals]) => vals.length >= 2)
    .map(([s, vals]) => ({
      sensation: s,
      avg: Math.round((vals.reduce((sv, v) => sv + v, 0) / vals.length) * 10) / 10,
      count: vals.length,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 7);

  // --- 5. Day of week distribution ---
  const dayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  filtered.forEach(e => { dayCount[e.timestamp.getDay()]++; });
  const maxDay = Math.max(...dayCount, 1);

  // --- 6. Intensity trend (weekly buckets) ---
  const withScore = filtered.filter(e => e.intensiteit !== null);
  const weekBuckets: Record<string, number[]> = {};
  withScore.forEach(e => {
    const d = new Date(e.timestamp);
    d.setHours(0, 0, 0, 0);
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    const key = d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', { day: 'numeric', month: 'short' });
    if (!weekBuckets[key]) weekBuckets[key] = [];
    weekBuckets[key].push(e.intensiteit as number);
  });
  const trendPoints = Object.entries(weekBuckets)
    .map(([label, vals]) => ({ label, avg: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 }))
    .slice(-8);

  // Trend direction
  let trendKey = 'journal_analysis.insight_trend_stable';
  if (trendPoints.length >= 3) {
    const half = Math.floor(trendPoints.length / 2);
    const recent = trendPoints.slice(-half).reduce((s, p) => s + p.avg, 0) / half;
    const older = trendPoints.slice(0, half).reduce((s, p) => s + p.avg, 0) / half;
    if (recent > older + 0.5) trendKey = 'journal_analysis.insight_trend_up';
    else if (recent < older - 0.5) trendKey = 'journal_analysis.insight_trend_down';
  }

  const maxTriggerCount = topTriggers[0]?.[1] || 1;
  const maxSensationCount = topSensations[0]?.[1] || 1;
  const maxTrendAvg = Math.max(...trendPoints.map(p => p.avg), 1);

  const dayLabels = locale === 'en'
    ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    : ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex gap-2 flex-wrap items-center">
        {(['week', 'month', 'all'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              period === p
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {t(`journal_analysis.${p}`)}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {filtered.length} {t('journal_analysis.entries')}
        </span>
      </div>

      {/* Insights summary */}
      {(topTriggers.length > 0 || topSensations.length > 0) && (
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-xl p-4 space-y-1.5">
          {topTriggers.length > 0 && (
            <p className="text-sm text-teal-800 dark:text-teal-200">
              {t('journal_analysis.insight_top_trigger')
                .replace('{trigger}', topTriggers[0][0])
                .replace('{n}', String(topTriggers[0][1]))}
            </p>
          )}
          {topSensations.length > 0 && (
            <p className="text-sm text-teal-800 dark:text-teal-200">
              {t('journal_analysis.insight_top_sensation')
                .replace('{sensation}', topSensations[0][0])
                .replace('{n}', String(topSensations[0][1]))}
            </p>
          )}
          {triggerSeverity.length > 0 && (
            <p className="text-sm text-teal-800 dark:text-teal-200">
              {t('journal_analysis.insight_worst_trigger')
                .replace('{trigger}', triggerSeverity[0].trigger)
                .replace('{avg}', String(triggerSeverity[0].avg))}
            </p>
          )}
          {trendPoints.length >= 3 && (
            <p className="text-sm text-teal-800 dark:text-teal-200">{t(trendKey)}</p>
          )}
        </div>
      )}

      {/* Row 1: Trigger frequency + Sensation frequency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Top Triggers by frequency */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="text-orange-500">⚡</span>{t('journal_analysis.top_triggers')}
          </h3>
          {topTriggers.length === 0 ? (
            <p className="text-sm text-gray-400">{t('journal_analysis.no_triggers')}</p>
          ) : (
            <div className="space-y-2.5">
              {topTriggers.map(([trigger, count]) => (
                <div key={trigger}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate pr-2">{trigger}</span>
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{count}{t('journal_analysis.times')}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full" style={{ width: `${(count / maxTriggerCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Sensations by frequency */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="text-blue-500">🫁</span>{t('journal_analysis.top_sensations')}
          </h3>
          {topSensations.length === 0 ? (
            <p className="text-sm text-gray-400">{t('journal_analysis.no_sensations')}</p>
          ) : (
            <div className="space-y-2.5">
              {topSensations.map(([sensation, count]) => (
                <div key={sensation}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate pr-2">{sensation}</span>
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{count}{t('journal_analysis.times')}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" style={{ width: `${(count / maxSensationCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Triggers by severity + Sensations by severity */}
      {(triggerSeverity.length > 0 || sensationSeverity.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Triggers ranked by average intensity */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
              <span className="text-red-500">🔥</span>{t('journal_analysis.trigger_severity')}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t('journal_analysis.trigger_severity_desc')}</p>
            <div className="space-y-2.5">
              {triggerSeverity.map(({ trigger, avg, count }) => {
                const color = avg >= 7 ? 'from-red-400 to-red-500'
                  : avg >= 4 ? 'from-orange-400 to-yellow-400'
                  : 'from-green-400 to-emerald-400';
                return (
                  <div key={trigger}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 dark:text-gray-300 font-medium truncate pr-2">{trigger}</span>
                      <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{avg}/10 · {count}×</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${color} rounded-full`} style={{ width: `${(avg / 10) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sensations ranked by average intensity */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
              <span className="text-purple-500">💢</span>{t('journal_analysis.sensation_severity')}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t('journal_analysis.sensation_severity_desc')}</p>
            {sensationSeverity.length === 0 ? (
              <p className="text-sm text-gray-400">{t('journal_analysis.no_severity_data')}</p>
            ) : (
              <div className="space-y-2.5">
                {sensationSeverity.map(({ sensation, avg, count }) => {
                  const color = avg >= 7 ? 'from-red-400 to-red-500'
                    : avg >= 4 ? 'from-orange-400 to-yellow-400'
                    : 'from-green-400 to-emerald-400';
                  return (
                    <div key={sensation}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-700 dark:text-gray-300 font-medium truncate pr-2">{sensation}</span>
                        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{avg}/10 · {count}×</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${color} rounded-full`} style={{ width: `${(avg / 10) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Row 3: Day of week + Intensity trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Day of week distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
            <span className="text-indigo-500">📅</span>{t('journal_analysis.day_of_week')}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t('journal_analysis.day_of_week_desc')}</p>
          <div className="flex items-end gap-1 h-24">
            {dayCount.map((count, i) => {
              const heightPct = maxDay > 0 ? (count / maxDay) * 100 : 0;
              const isWeekend = i === 0 || i === 6;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className={`w-full rounded-t transition-all ${isWeekend ? 'bg-indigo-300 dark:bg-indigo-600' : 'bg-indigo-500 dark:bg-indigo-400'}`}
                    style={{ height: `${heightPct}%`, minHeight: count > 0 ? '4px' : '0' }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{dayLabels[i]}</span>
                  {count > 0 && <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{count}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Intensity trend */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="text-purple-500">📈</span>{t('journal_analysis.intensity_trend')}
          </h3>
          {trendPoints.length < 2 ? (
            <p className="text-sm text-gray-400">{t('journal_analysis.no_trend_data')}</p>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {trendPoints.map(({ label, avg }) => {
                const heightPct = (avg / (maxTrendAvg + 1)) * 100;
                const color = avg <= 3 ? 'from-green-400 to-emerald-500'
                  : avg <= 6 ? 'from-yellow-400 to-orange-400'
                  : 'from-red-400 to-orange-500';
                return (
                  <div key={label} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10 pointer-events-none">
                      {avg}/10 · {label}
                    </div>
                    <div className={`w-full bg-gradient-to-t ${color} rounded-t`} style={{ height: `${heightPct}%`, minHeight: '4px' }} />
                    <span className="mt-1 text-gray-400 dark:text-gray-500" style={{ fontSize: '9px' }}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI Insight Section */}
      <div ref={insightRef} className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span>✨</span>{t('journal_analysis.ai_title')}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('journal_analysis.ai_disclaimer')}</p>
          </div>
          <button
            onClick={generateInsight}
            disabled={insightLoading || filtered.length === 0}
            className="flex-shrink-0 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {insightLoading
              ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>{t('journal_analysis.ai_generating')}</>
              : <><span>🔍</span>{insight ? t('journal_analysis.ai_regenerate') : t('journal_analysis.ai_generate')}</>
            }
          </button>
        </div>

        {insightError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
            {t('journal_analysis.ai_error')}
          </div>
        )}

        {insight && !insightError && (
          <div className="space-y-3">
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 border border-teal-100 dark:border-teal-800 rounded-xl p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line text-sm">
                {insight.text}
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('journal_analysis.ai_generated_at')
                .replace('{date}', new Date(insight.generatedAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }))
                .replace('{n}', String(insight.entryCount))}
            </p>
          </div>
        )}

        {!insight && !insightError && !insightLoading && (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('journal_analysis.ai_empty')}</p>
        )}
      </div>
    </div>
  );
}
