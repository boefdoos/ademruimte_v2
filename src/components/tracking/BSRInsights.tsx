'use client';

import React, { useState, useMemo } from 'react';
import { useBSR } from '@/contexts/BSRContext';
import { useI18n } from '@/contexts/I18nContext';

function calcBSR(arr: { score: number }[]): number | null {
  if (!arr.length) return null;
  return Math.round(arr.reduce((s, e) => s + e.score, 0) / (arr.length * 2) * 100);
}

function formatDate(ts: number, locale: string): string {
  return new Date(ts).toLocaleDateString(locale === 'nl' ? 'nl-BE' : 'en-US', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function formatDateShort(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const CONTEXT_META: Record<string, { emoji: string; nl: string; en: string }> = {
  rest: { emoji: '🛋️', nl: 'Rust', en: 'Rest' },
  work: { emoji: '💻', nl: 'Werk', en: 'Work' },
  social: { emoji: '👥', nl: 'Sociaal', en: 'Social' },
  walk: { emoji: '🚶', nl: 'Beweging', en: 'Movement' },
  eat: { emoji: '🍽️', nl: 'Eten', en: 'Eating' },
  session: { emoji: '🫁', nl: 'Ademsessie', en: 'Session' },
};

const REFLEX_META: Record<string, { emoji: string; nl: string; en: string }> = {
  yawn: { emoji: '🥱', nl: 'Gaap', en: 'Yawn' },
  sigh: { emoji: '😮‍💨', nl: 'Zucht', en: 'Sigh' },
  both: { emoji: '🔄', nl: 'Beide', en: 'Both' },
};

// Simple SVG line chart
function BSRLineChart({ data, height = 180 }: { data: { label: string; bsr: number; count: number }[]; height?: number }) {
  if (data.length < 2) return null;

  const w = 100; // viewBox percentage
  const h = height;
  const padTop = 20;
  const padBottom = 28;
  const padLeft = 32;
  const padRight = 8;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const points = data.map((d, i) => ({
    x: padLeft + (i / (data.length - 1)) * chartW,
    y: padTop + chartH - (d.bsr / 100) * chartH,
    ...d,
  }));

  const pathD = points.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
  }).join(' ');

  const areaD = pathD + ` L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="bsrFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="[stop-color:rgb(96,165,250)] dark:[stop-color:rgb(129,140,248)]" stopOpacity="0.25" />
          <stop offset="100%" className="[stop-color:rgb(96,165,250)] dark:[stop-color:rgb(129,140,248)]" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(v => {
        const y = padTop + chartH - (v / 100) * chartH;
        return (
          <g key={v}>
            <line x1={padLeft} y1={y} x2={w - padRight} y2={y}
              className="stroke-gray-200 dark:stroke-slate-700" strokeWidth="0.15" strokeDasharray="0.5,0.5" />
            {v % 25 === 0 && (
              <text x={padLeft - 1.5} y={y + 1}
                className="fill-gray-400 dark:fill-gray-500" fontSize="2.8" textAnchor="end">{v}%</text>
            )}
          </g>
        );
      })}

      {/* Zone backgrounds */}
      <rect x={padLeft} y={padTop} width={chartW} height={chartH * 0.3}
        className="fill-green-500/5 dark:fill-green-500/5" />
      <rect x={padLeft} y={padTop + chartH * 0.3} width={chartW} height={chartH * 0.3}
        className="fill-yellow-500/5 dark:fill-yellow-500/5" />
      <rect x={padLeft} y={padTop + chartH * 0.6} width={chartW} height={chartH * 0.4}
        className="fill-red-500/5 dark:fill-red-500/5" />

      {/* Area + Line */}
      <path d={areaD} fill="url(#bsrFill)" />
      <path d={pathD} fill="none" className="stroke-blue-500 dark:stroke-indigo-400" strokeWidth="0.5" strokeLinecap="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="1.2"
            className={`${p.bsr >= 60 ? 'fill-green-500' : p.bsr >= 30 ? 'fill-yellow-500' : 'fill-red-500'}`}
            strokeWidth="0.3" className2="stroke-white dark:stroke-slate-800" />
          {/* X label — show every Nth label to avoid crowding */}
          {(i === 0 || i === data.length - 1 || i % Math.max(1, Math.floor(data.length / 5)) === 0) && (
            <text x={p.x} y={padTop + chartH + 6}
              className="fill-gray-400 dark:fill-gray-500" fontSize="2.2" textAnchor="middle">{p.label}</text>
          )}
          {/* Count indicator */}
          {(i === 0 || i === data.length - 1 || i % Math.max(1, Math.floor(data.length / 5)) === 0) && (
            <text x={p.x} y={padTop + chartH + 9}
              className="fill-gray-300 dark:fill-gray-600" fontSize="1.8" textAnchor="middle">{p.count}×</text>
          )}
        </g>
      ))}
    </svg>
  );
}

// Horizontal bar for context breakdown
function ContextBar({ emoji, label, bsr, count, maxCount }: {
  emoji: string; label: string; bsr: number; count: number; maxCount: number;
}) {
  const color = bsr >= 60 ? 'bg-green-500 dark:bg-green-400'
    : bsr >= 30 ? 'bg-yellow-500 dark:bg-yellow-400'
    : 'bg-red-500 dark:bg-red-400';

  const textColor = bsr >= 60 ? 'text-green-600 dark:text-green-400'
    : bsr >= 30 ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-red-500 dark:text-red-400';

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-lg w-8 text-center">{emoji}</span>
      <span className="text-sm text-gray-700 dark:text-gray-200 w-24 transition-colors">{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden transition-colors">
          <div
            className={`h-full rounded-full ${color} transition-all duration-500`}
            style={{ width: `${bsr}%` }}
          />
        </div>
        <span className={`text-sm font-bold w-12 text-right ${textColor} transition-colors`}>{bsr}%</span>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 w-8 text-right transition-colors">{count}×</span>
    </div>
  );
}

export function BSRInsights() {
  const { entries } = useBSR();
  const { locale } = useI18n();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');

  const nl = locale === 'nl';

  // Filter entries by time range
  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = timeRange === 'week' ? now - 7 * 86400000
      : timeRange === 'month' ? now - 30 * 86400000
      : 0;
    return entries.filter(e => e.timestamp > cutoff);
  }, [entries, timeRange]);

  // ---- LAAG 1: Daily BSR timeline ----
  const dailyData = useMemo(() => {
    const byDay: Record<string, { scores: number[]; ts: number }> = {};
    filtered.forEach(e => {
      const key = new Date(e.timestamp).toDateString();
      if (!byDay[key]) byDay[key] = { scores: [], ts: e.timestamp };
      byDay[key].scores.push(e.score);
    });

    return Object.entries(byDay)
      .map(([_, v]) => ({
        label: formatDateShort(v.ts),
        bsr: Math.round(v.scores.reduce((s, x) => s + x, 0) / (v.scores.length * 2) * 100),
        count: v.scores.length,
      }))
      .sort((a, b) => {
        // Sort by the original timestamp
        const aTs = filtered.find(e => formatDateShort(e.timestamp) === a.label)?.timestamp || 0;
        const bTs = filtered.find(e => formatDateShort(e.timestamp) === b.label)?.timestamp || 0;
        return aTs - bTs;
      });
  }, [filtered]);

  // ---- LAAG 2: Context breakdown ----
  const contextData = useMemo(() => {
    const byCtx: Record<string, number[]> = {};
    filtered.forEach(e => {
      if (e.context) {
        if (!byCtx[e.context]) byCtx[e.context] = [];
        byCtx[e.context].push(e.score);
      }
    });

    return Object.entries(byCtx)
      .filter(([_, scores]) => scores.length >= 2)
      .map(([ctx, scores]) => ({
        ctx,
        bsr: Math.round(scores.reduce((s, x) => s + x, 0) / (scores.length * 2) * 100),
        count: scores.length,
      }))
      .sort((a, b) => b.bsr - a.bsr);
  }, [filtered]);

  // ---- LAAG 2b: Reflex breakdown (gaap vs zucht) ----
  const reflexData = useMemo(() => {
    const byReflex: Record<string, number[]> = {};
    filtered.forEach(e => {
      if (e.reflex) {
        if (!byReflex[e.reflex]) byReflex[e.reflex] = [];
        byReflex[e.reflex].push(e.score);
      }
    });

    return Object.entries(byReflex)
      .filter(([_, scores]) => scores.length >= 2)
      .map(([reflex, scores]) => ({
        reflex,
        bsr: Math.round(scores.reduce((s, x) => s + x, 0) / (scores.length * 2) * 100),
        count: scores.length,
      }))
      .sort((a, b) => b.bsr - a.bsr);
  }, [filtered]);

  // Summary stats
  const overallBSR = calcBSR(filtered);
  const totalEntries = filtered.length;
  const good = filtered.filter(e => e.score === 2).length;
  const partial = filtered.filter(e => e.score === 1).length;
  const bad = filtered.filter(e => e.score === 0).length;

  // Trend: compare first half vs second half
  const trend = useMemo(() => {
    if (dailyData.length < 2) return null;
    const mid = Math.floor(dailyData.length / 2);
    const first = dailyData.slice(0, mid);
    const second = dailyData.slice(mid);
    const avgFirst = first.reduce((s, d) => s + d.bsr, 0) / first.length;
    const avgSecond = second.reduce((s, d) => s + d.bsr, 0) / second.length;
    return Math.round(avgSecond - avgFirst);
  }, [dailyData]);

  // Best/worst context
  const bestCtx = contextData.length > 0 ? contextData[0] : null;
  const worstCtx = contextData.length > 1 ? contextData[contextData.length - 1] : null;

  if (totalEntries === 0) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-chart-line text-4xl text-gray-300 dark:text-gray-600 mb-4 transition-colors" />
        <p className="text-gray-500 dark:text-gray-400 transition-colors">
          {nl ? 'Nog geen BSR-registraties.' : 'No BSR entries yet.'}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 transition-colors">
          {nl ? 'Gebruik de BSR-knop rechtsonder om te starten.' : 'Use the BSR button at the bottom right to start.'}
        </p>
      </div>
    );
  }

  const maxCtxCount = contextData.length > 0 ? Math.max(...contextData.map(c => c.count)) : 1;

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex gap-2">
        {(['week', 'month', 'all'] as const).map(r => (
          <button
            key={r}
            onClick={() => setTimeRange(r)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              timeRange === r
                ? 'bg-blue-600 dark:bg-blue-700 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {r === 'week' ? (nl ? '7 dagen' : '7 days')
              : r === 'month' ? (nl ? '30 dagen' : '30 days')
              : (nl ? 'Alles' : 'All')}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 transition-colors">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1 transition-colors">
            {nl ? 'Gemiddelde BSR' : 'Average BSR'}
          </div>
          <div className={`text-3xl font-extrabold ${
            (overallBSR ?? 0) >= 60 ? 'text-green-600 dark:text-green-400'
            : (overallBSR ?? 0) >= 30 ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-red-500 dark:text-red-400'
          } transition-colors`}>
            {overallBSR ?? '—'}%
          </div>
          {trend !== null && (
            <div className={`text-xs font-semibold mt-1 ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'} transition-colors`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% {nl ? 'trend' : 'trend'}
            </div>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-200 dark:border-slate-600 transition-colors">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 transition-colors">
            {nl ? 'Registraties' : 'Entries'}
          </div>
          <div className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 transition-colors">{totalEntries}</div>
          <div className="flex gap-2 mt-1 text-xs">
            <span className="text-green-600 dark:text-green-400">😌{good}</span>
            <span className="text-yellow-600 dark:text-yellow-400">😐{partial}</span>
            <span className="text-red-500 dark:text-red-400">😣{bad}</span>
          </div>
        </div>

        {bestCtx && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800 transition-colors">
            <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1 transition-colors">
              {nl ? 'Beste context' : 'Best context'}
            </div>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-100 transition-colors">
              {CONTEXT_META[bestCtx.ctx]?.emoji} {CONTEXT_META[bestCtx.ctx]?.[locale as 'nl' | 'en'] || bestCtx.ctx}
            </div>
            <div className="text-xl font-extrabold text-green-600 dark:text-green-400 transition-colors">{bestCtx.bsr}%</div>
          </div>
        )}

        {worstCtx && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800 transition-colors">
            <div className="text-xs text-red-500 dark:text-red-400 font-medium mb-1 transition-colors">
              {nl ? 'Moeilijkste context' : 'Hardest context'}
            </div>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-100 transition-colors">
              {CONTEXT_META[worstCtx.ctx]?.emoji} {CONTEXT_META[worstCtx.ctx]?.[locale as 'nl' | 'en'] || worstCtx.ctx}
            </div>
            <div className="text-xl font-extrabold text-red-500 dark:text-red-400 transition-colors">{worstCtx.bsr}%</div>
          </div>
        )}
      </div>

      {/* Daily BSR chart */}
      {dailyData.length >= 2 && (
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 transition-colors">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 transition-colors">
            <i className="fas fa-chart-line mr-2 text-blue-500 dark:text-blue-400 transition-colors" />
            {nl ? 'BSR per dag' : 'BSR per day'}
          </h3>
          <BSRLineChart data={dailyData} />
        </div>
      )}

      {/* Context breakdown */}
      {contextData.length > 0 && (
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 transition-colors">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 transition-colors">
            <i className="fas fa-layer-group mr-2 text-purple-500 dark:text-purple-400 transition-colors" />
            {nl ? 'BSR per context' : 'BSR per context'}
          </h3>
          <div className="space-y-1">
            {contextData.map(c => (
              <ContextBar
                key={c.ctx}
                emoji={CONTEXT_META[c.ctx]?.emoji || '❓'}
                label={CONTEXT_META[c.ctx]?.[locale as 'nl' | 'en'] || c.ctx}
                bsr={c.bsr}
                count={c.count}
                maxCount={maxCtxCount}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reflex breakdown (gaap vs zucht) */}
      {reflexData.length > 0 && (
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700 transition-colors">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 transition-colors">
            <i className="fas fa-exchange-alt mr-2 text-cyan-500 dark:text-cyan-400 transition-colors" />
            {nl ? 'Gaap vs. Zucht' : 'Yawn vs. Sigh'}
          </h3>
          <div className="space-y-1">
            {reflexData.map(r => (
              <ContextBar
                key={r.reflex}
                emoji={REFLEX_META[r.reflex]?.emoji || '❓'}
                label={REFLEX_META[r.reflex]?.[locale as 'nl' | 'en'] || r.reflex}
                bsr={r.bsr}
                count={r.count}
                maxCount={Math.max(...reflexData.map(x => x.count))}
              />
            ))}
          </div>
          {reflexData.length >= 2 && Math.abs(reflexData[0].bsr - reflexData[reflexData.length - 1].bsr) > 15 && (
            <div className="mt-3 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-700 dark:text-cyan-300 transition-colors">
              <i className="fas fa-lightbulb mr-1.5 text-cyan-500" />
              {nl
                ? `${REFLEX_META[reflexData[0].reflex]?.[locale as 'nl' | 'en']} geeft ${reflexData[0].bsr - reflexData[reflexData.length - 1].bsr}% meer verlichting dan ${REFLEX_META[reflexData[reflexData.length - 1].reflex]?.[locale as 'nl' | 'en']?.toLowerCase()}.`
                : `${REFLEX_META[reflexData[0].reflex]?.[locale as 'nl' | 'en']} provides ${reflexData[0].bsr - reflexData[reflexData.length - 1].bsr}% more relief than ${REFLEX_META[reflexData[reflexData.length - 1].reflex]?.[locale as 'nl' | 'en']?.toLowerCase()}.`
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}
