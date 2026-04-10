'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

interface MorningRecord {
  date: string;
  gevoel: number | null;
  cp: number | null;
  symptoomMin: number | null; // -1 = geen symptomen
  hrv: number | null;
}

function cpColor(s: number): string {
  if (s < 10) return '#ef4444';
  if (s < 20) return '#f97316';
  if (s < 30) return '#eab308';
  if (s < 40) return '#22c55e';
  return '#3b82f6';
}

function Sparkline({
  data,
  min,
  max,
  color,
  dotColor,
}: {
  data: (number | null)[];
  min: number;
  max: number;
  color: string;
  dotColor?: (v: number) => string;
}) {
  const h = 48;
  const w = 100;
  const range = max - min || 1;
  const valid = data.map((v, i) => v !== null ? { i, v: v as number } : null).filter(Boolean) as { i: number; v: number }[];
  if (valid.length < 2) return <div style={{ height: h }} className="flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">Nog onvoldoende data</div>;

  const n = data.length;
  const x = (i: number) => (i / (n - 1)) * w;
  const y = (v: number) => h - ((v - min) / range) * h;

  const d = valid.map((p, idx) =>
    idx === 0 ? `M ${x(p.i)} ${y(p.v)}` : `L ${x(p.i)} ${y(p.v)}`
  ).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height: h }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {valid.map(p => (
        <circle
          key={p.i}
          cx={x(p.i)} cy={y(p.v)} r="2"
          fill={dotColor ? dotColor(p.v) : color}
          stroke="white" strokeWidth="0.8"
        />
      ))}
    </svg>
  );
}

export function MorningTrends() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState<MorningRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        const ref = collection(db, 'users', currentUser.uid, 'morningStrip');
        const snap = await getDocs(ref);

        // Load latest HRV per day from hrv_measurements
        const hrvQ = query(
          collection(db, 'hrv_measurements'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(60)
        );
        const hrvSnap = await getDocs(hrvQ);
        const hrvByDay: Record<string, number> = {};
        hrvSnap.docs.forEach(d => {
          const data = d.data();
          const ts: Date = data.timestamp.toDate();
          const key = `${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}-${String(ts.getDate()).padStart(2,'0')}`;
          const val = data.value || data.rmssd || data.hrv || data.measurement || 0;
          if (!hrvByDay[key] && typeof val === 'number' && val > 0) hrvByDay[key] = Math.round(val);
        });

        const rows: MorningRecord[] = snap.docs.map(d => {
          const data = d.data();
          return {
            date: d.id,
            gevoel: data.gevoel ?? null,
            cp: data.cp ?? null,
            symptoomMin: data.symptoomMin ?? null,
            hrv: hrvByDay[d.id] ?? null,
          };
        })
          .sort((a, b) => a.date.localeCompare(b.date)) // YYYY-MM-DD: alphabetical = chronological
          .slice(-30); // laatste 30 dagen
        setRecords(rows);
      } catch (e) {
        console.error('MorningTrends load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  if (loading) {
    return <div className="animate-pulse h-48 bg-gray-100 dark:bg-slate-700 rounded-xl transition-colors" />;
  }

  if (records.length < 3) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 text-center transition-colors">
        <p className="text-sm text-gray-500 dark:text-gray-400">Vul de ochtendstrip minstens 3 dagen in om trends te zien.</p>
      </div>
    );
  }

  const gevoelData = records.map(r => r.gevoel);
  const cpData = records.map(r => r.cp);
  const hrvData = records.map(r => r.hrv);
  const symptoomData = records.map(r =>
    r.symptoomMin === null ? null :
    r.symptoomMin === -1 ? 240 :
    r.symptoomMin
  );

  const dateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  };

  const first = records[0].date;
  const last = records[records.length - 1].date;

  // Trend richting berekenen (gemiddelde eerste helft vs tweede helft)
  function trend(data: (number | null)[], higherIsBetter = true): { label: string; color: string } | null {
    const valid = data.filter(v => v !== null) as number[];
    if (valid.length < 4) return null;
    const mid = Math.floor(valid.length / 2);
    const first = valid.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const second = valid.slice(mid).reduce((a, b) => a + b, 0) / (valid.length - mid);
    const diff = second - first;
    if (Math.abs(diff) < 0.5) return { label: 'stabiel', color: 'text-gray-500 dark:text-gray-400' };
    const improving = higherIsBetter ? diff > 0 : diff < 0;
    return improving
      ? { label: '↑ beter', color: 'text-emerald-600 dark:text-emerald-400' }
      : { label: '↓ slechter', color: 'text-red-500 dark:text-red-400' };
  }

  const gevoelTrend = trend(gevoelData, true);
  const cpTrend = trend(cpData, true);
  const hrvTrend = trend(hrvData, true);
  const symptoomTrend = trend(symptoomData, true);

  const rows = [
    {
      label: 'Ochtendgevoel',
      sub: 'Subjectief 1–10',
      data: gevoelData,
      min: 1, max: 10,
      color: '#f97316',
      dotColor: (v: number) => v >= 7 ? '#22c55e' : v >= 4 ? '#f97316' : '#ef4444',
      trend: gevoelTrend,
      format: (v: number) => `${v}/10`,
    },
    {
      label: 'Control Pause',
      sub: 'Seconden',
      data: cpData,
      min: 0, max: Math.max(40, ...cpData.filter(Boolean) as number[]),
      color: '#3b82f6',
      dotColor: cpColor,
      trend: cpTrend,
      format: (v: number) => `${v}s`,
    },
    {
      label: 'HRV',
      sub: 'RMSSD in ms',
      data: hrvData,
      min: 0, max: Math.max(60, ...hrvData.filter(Boolean) as number[]),
      color: '#ec4899',
      dotColor: (v: number) => v >= 50 ? '#22c55e' : v >= 30 ? '#f97316' : '#ef4444',
      trend: hrvTrend,
      format: (v: number) => `${v}ms`,
    },
    {
      label: 'Symptoom timing',
      sub: 'Min na waken · hoger = later = beter',
      data: symptoomData,
      min: 0, max: 240,
      color: '#8b5cf6',
      dotColor: (v: number) => v >= 120 ? '#22c55e' : v >= 30 ? '#f97316' : '#ef4444',
      trend: symptoomTrend,
      format: (v: number) => v >= 240 ? 'Geen' : `${v} min`,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 px-1 transition-colors">
        <span>{dateLabel(first)}</span>
        <span>{records.length} dagen</span>
        <span>{dateLabel(last)}</span>
      </div>

      {rows.map(row => {
        const validVals = row.data.filter(v => v !== null) as number[];
        const latest = validVals.length > 0 ? validVals[validVals.length - 1] : null;

        return (
          <div key={row.label} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 transition-colors">{row.label}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 transition-colors">{row.sub}</div>
              </div>
              <div className="text-right">
                {latest !== null && (
                  <div className="text-base font-semibold text-gray-800 dark:text-gray-100 transition-colors">
                    {row.format(latest)}
                  </div>
                )}
                {row.trend && (
                  <div className={`text-xs font-medium transition-colors ${row.trend.color}`}>
                    {row.trend.label}
                  </div>
                )}
              </div>
            </div>
            <Sparkline
              data={row.data}
              min={row.min}
              max={row.max}
              color={row.color}
              dotColor={row.dotColor}
            />
          </div>
        );
      })}
    </div>
  );
}
