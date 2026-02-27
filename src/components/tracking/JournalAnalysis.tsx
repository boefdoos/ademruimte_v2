'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

interface JournalEntry {
  id: string;
  techniekGebruikt: string;
  triggers: string[];
  intensiteit: number | null;
  sensaties: string[];
  notities: string;
  timestamp: Date;
}

type Period = 'week' | 'month' | 'all';

function frequencyMap(items: string[][]): [string, number][] {
  const map: Record<string, number> = {};
  items.flat().forEach(item => { if (item) map[item] = (map[item] || 0) + 1; });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export function JournalAnalysis() {
  const { currentUser } = useAuth();
  const { t, locale } = useI18n();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');

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
        const data = snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            techniekGebruikt: d.techniekGebruikt || '',
            triggers: Array.isArray(d.triggers) ? d.triggers : (d.trigger ? [d.trigger] : []),
            intensiteit: typeof d.intensiteit === 'number' ? d.intensiteit : null,
            sensaties: Array.isArray(d.sensaties) ? d.sensaties : [],
            notities: d.notities || '',
            timestamp: d.timestamp.toDate(),
          } as JournalEntry;
        });
        setEntries(data);
      } catch (e) {
        console.error('Error loading journal entries:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📓</div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{t('journal_analysis.empty_title')}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{t('journal_analysis.empty_desc')}</p>
        <a href="/tracking" className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
          <i className="fas fa-plus mr-2"></i>{t('journal_analysis.empty_button')}
        </a>
      </div>
    );
  }

  // Filter by period
  const now = new Date();
  const filtered = entries.filter(e => {
    if (period === 'week') return (now.getTime() - e.timestamp.getTime()) < 7 * 86400000;
    if (period === 'month') return (now.getTime() - e.timestamp.getTime()) < 30 * 86400000;
    return true;
  });

  // Stats
  const triggerFreq = frequencyMap(filtered.map(e => e.triggers)).slice(0, 8);
  const sensationFreq = frequencyMap(filtered.map(e => e.sensaties)).slice(0, 8);

  // Technique effectiveness
  const techMap: Record<string, number[]> = {};
  filtered.forEach(e => {
    if (e.techniekGebruikt && e.intensiteit !== null) {
      if (!techMap[e.techniekGebruikt]) techMap[e.techniekGebruikt] = [];
      techMap[e.techniekGebruikt].push(e.intensiteit);
    }
  });
  const techStats = Object.entries(techMap)
    .map(([tech, scores]) => ({
      tech,
      avg: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10,
      count: scores.length,
    }))
    .filter(s => s.count >= 2)
    .sort((a, b) => a.avg - b.avg);

  // Intensity trend — weekly buckets
  const withIntensity = filtered.filter(e => e.intensiteit !== null);
  const buckets: Record<string, number[]> = {};
  withIntensity.forEach(e => {
    const d = e.timestamp;
    // Group by ISO week (Mon-Sun)
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const dow = (day.getDay() + 6) % 7; // Mon=0
    day.setDate(day.getDate() - dow);
    const key = day.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', { day: 'numeric', month: 'short' });
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(e.intensiteit as number);
  });
  const trendPoints = Object.entries(buckets)
    .map(([label, vals]) => ({ label, avg: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 }))
    .slice(-8);

  // Trend direction
  let trendKey = 'journal_analysis.insight_trend_stable';
  if (trendPoints.length >= 2) {
    const half = Math.floor(trendPoints.length / 2);
    const recent = trendPoints.slice(-half).reduce((s, p) => s + p.avg, 0) / half;
    const older = trendPoints.slice(0, half).reduce((s, p) => s + p.avg, 0) / half;
    if (recent > older + 0.5) trendKey = 'journal_analysis.insight_trend_up';
    else if (recent < older - 0.5) trendKey = 'journal_analysis.insight_trend_down';
  }

  const maxTriggerCount = triggerFreq[0]?.[1] || 1;
  const maxSensationCount = sensationFreq[0]?.[1] || 1;
  const maxTrendAvg = Math.max(...trendPoints.map(p => p.avg), 1);

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex gap-2 flex-wrap">
        {(['week', 'month', 'all'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              period === p
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {t(`journal_analysis.${p}`)}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400 self-center">
          {filtered.length} {t('journal_analysis.entries')}
        </span>
      </div>

      {/* Insights summary bar */}
      {(triggerFreq.length > 0 || sensationFreq.length > 0 || techStats.length > 0) && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4 space-y-2">
          {triggerFreq.length > 0 && (
            <p className="text-sm text-indigo-800 dark:text-indigo-200">
              {t('journal_analysis.insight_top_trigger')
                .replace('{trigger}', triggerFreq[0][0])
                .replace('{n}', String(triggerFreq[0][1]))}
            </p>
          )}
          {sensationFreq.length > 0 && (
            <p className="text-sm text-indigo-800 dark:text-indigo-200">
              {t('journal_analysis.insight_top_sensation')
                .replace('{sensation}', sensationFreq[0][0])
                .replace('{n}', String(sensationFreq[0][1]))}
            </p>
          )}
          {techStats.length > 0 && (
            <p className="text-sm text-indigo-800 dark:text-indigo-200">
              {t('journal_analysis.insight_best_technique')
                .replace('{technique}', techStats[0].tech)
                .replace('{avg}', String(techStats[0].avg))}
            </p>
          )}
          {trendPoints.length >= 2 && (
            <p className="text-sm text-indigo-800 dark:text-indigo-200">{t(trendKey)}</p>
          )}
        </div>
      )}

      {/* Two-column grid on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Top Triggers */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="text-orange-500">⚡</span>{t('journal_analysis.top_triggers')}
          </h3>
          {triggerFreq.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('journal_analysis.no_triggers')}</p>
          ) : (
            <div className="space-y-2">
              {triggerFreq.map(([trigger, count]) => (
                <div key={trigger}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate pr-2">{trigger}</span>
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{count}{t('journal_analysis.times')}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all"
                      style={{ width: `${(count / maxTriggerCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Sensations */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="text-blue-500">🫁</span>{t('journal_analysis.top_sensations')}
          </h3>
          {sensationFreq.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('journal_analysis.no_sensations')}</p>
          ) : (
            <div className="space-y-2">
              {sensationFreq.map(([sensation, count]) => (
                <div key={sensation}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate pr-2">{sensation}</span>
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{count}{t('journal_analysis.times')}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all"
                      style={{ width: `${(count / maxSensationCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Technique effectiveness */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
            <span className="text-green-500">🏆</span>{t('journal_analysis.technique_effect')}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t('journal_analysis.technique_effect_desc')}</p>
          {techStats.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('journal_analysis.no_technique_data')}</p>
          ) : (
            <div className="space-y-3">
              {techStats.map(({ tech, avg, count }) => (
                <div key={tech}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate pr-2">{tech}</span>
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{avg}/10 · {count}×</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${(avg / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Intensity trend over time */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="text-purple-500">📈</span>{t('journal_analysis.intensity_trend')}
          </h3>
          {trendPoints.length < 2 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('journal_analysis.no_technique_data')}</p>
          ) : (
            <div className="flex items-end gap-1 h-28">
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
                    <div
                      className={`w-full bg-gradient-to-t ${color} rounded-t`}
                      style={{ height: `${heightPct}%`, minHeight: '4px' }}
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate w-full text-center" style={{ fontSize: '9px' }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
