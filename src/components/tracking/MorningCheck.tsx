'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, orderBy, limit, getDocs, doc, setDoc } from 'firebase/firestore';

interface MorningCheckRecord {
  id?: string;
  cp: number | null;
  minsToSymptoms: number | null;
  morningScore: number;
  sleepQuality: number;
  contextFlags: string[];
  timestamp: Date;
}

const CONTEXT_FLAGS = [
  { id: 'alcohol', label: 'Alcohol gisteren', icon: '🍷' },
  { id: 'ziek', label: 'Ziek / koorts', icon: '🤒' },
  { id: 'slecht_geslapen', label: 'Slecht geslapen', icon: '😴' },
  { id: 'stress', label: 'Veel stress', icon: '⚡' },
];

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function MorningCheck() {
  const { currentUser } = useAuth();

  const [alreadyDone, setAlreadyDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<MorningCheckRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Form state
  const [cp, setCp] = useState('');
  const [minsToSymptoms, setMinsToSymptoms] = useState('');
  const [morningScore, setMorningScore] = useState(5);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [contextFlags, setContextFlags] = useState<string[]>([]);
  const [step, setStep] = useState(0); // 0=score, 1=cp, 2=context

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        const today = getTodayString();
        const ref = collection(db, 'morningChecks');
        const q = query(
          ref,
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(14)
        );
        const snap = await getDocs(q);
        const records: MorningCheckRecord[] = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            cp: data.cp ?? null,
            minsToSymptoms: data.minsToSymptoms ?? null,
            morningScore: data.morningScore ?? 5,
            sleepQuality: data.sleepQuality ?? 3,
            contextFlags: data.contextFlags ?? [],
            timestamp: data.timestamp.toDate(),
          };
        });
        setHistory(records);

        // Check if already done today
        if (records.length > 0) {
          const latest = records[0].timestamp;
          const latestStr = `${latest.getFullYear()}-${String(latest.getMonth() + 1).padStart(2, '0')}-${String(latest.getDate()).padStart(2, '0')}`;
          if (latestStr === today) setAlreadyDone(true);
        }
      } catch (e) {
        console.error('Error loading morning checks:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const toggleFlag = (id: string) => {
    setContextFlags(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const save = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const entry = {
        userId: currentUser.uid,
        cp: cp ? Number(cp) : null,
        minsToSymptoms: minsToSymptoms ? Number(minsToSymptoms) : null,
        morningScore,
        sleepQuality,
        contextFlags,
        timestamp: new Date(),
      };
      await addDoc(collection(db, 'morningChecks'), entry);

      // Mark morning goal as done
      const today = getTodayString();
      const goalsRef = doc(db, 'users', currentUser.uid, 'goals', today);
      await setDoc(goalsRef, { morning: true }, { merge: true });

      setAlreadyDone(true);
      setHistory(prev => [{ ...entry, timestamp: new Date() }, ...prev]);
    } catch (e) {
      console.error('Error saving morning check:', e);
    } finally {
      setSaving(false);
    }
  };

  const getCPLabel = (secs: number) => {
    if (secs < 10) return { label: 'Zeer laag', color: 'text-red-500' };
    if (secs < 20) return { label: 'Laag', color: 'text-orange-500' };
    if (secs < 30) return { label: 'Gemiddeld', color: 'text-yellow-500' };
    if (secs < 40) return { label: 'Goed', color: 'text-green-500' };
    return { label: 'Uitstekend', color: 'text-blue-500' };
  };

  const getScoreEmoji = (score: number) => {
    if (score <= 2) return '😰';
    if (score <= 4) return '😔';
    if (score <= 6) return '😐';
    if (score <= 8) return '🙂';
    return '😊';
  };

  const getSleepLabel = (q: number) => {
    const labels = ['', 'Slecht', 'Matig', 'Oké', 'Goed', 'Uitstekend'];
    return labels[q] || '';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 animate-pulse transition-colors">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4" />
        <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  if (alreadyDone) {
    const latest = history[0];
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden transition-colors">
        {/* Done banner */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fas fa-check text-sm" />
            </div>
            <div>
              <div className="font-bold">Ochtendcheck gedaan</div>
              <div className="text-emerald-100 text-xs">
                {latest?.timestamp.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {/* Today's summary */}
        {latest && (
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center transition-colors">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {getScoreEmoji(latest.morningScore)} {latest.morningScore}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ochtendgevoel</div>
            </div>
            {latest.cp !== null && (
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center transition-colors">
                <div className={`text-2xl font-bold ${getCPLabel(latest.cp).color}`}>
                  {latest.cp}s
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Control Pause</div>
              </div>
            )}
            {latest.minsToSymptoms !== null && (
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center transition-colors">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {latest.minsToSymptoms}min
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tot eerste symptoom</div>
              </div>
            )}
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center transition-colors">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {'★'.repeat(latest.sleepQuality)}{'☆'.repeat(5 - latest.sleepQuality)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Slaap: {getSleepLabel(latest.sleepQuality)}</div>
            </div>
          </div>
        )}

        {/* History toggle */}
        {history.length > 1 && (
          <div className="px-4 pb-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <i className={`fas fa-chevron-${showHistory ? 'up' : 'down'} text-xs`} />
              {showHistory ? 'Verberg' : 'Toon'} recente basislijn ({history.length} metingen)
            </button>
            {showHistory && (
              <div className="mt-3 space-y-2">
                {history.slice(0, 7).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700 last:border-0 transition-colors">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {r.timestamp.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-700 dark:text-gray-300">{getScoreEmoji(r.morningScore)} {r.morningScore}/10</span>
                      {r.cp !== null && (
                        <span className={`font-semibold ${getCPLabel(r.cp).color}`}>{r.cp}s</span>
                      )}
                      {r.minsToSymptoms !== null && (
                        <span className="text-gray-500 dark:text-gray-400">{r.minsToSymptoms}m</span>
                      )}
                      {r.contextFlags.length > 0 && (
                        <span className="text-xs">{r.contextFlags.map(f => CONTEXT_FLAGS.find(c => c.id === f)?.icon).join('')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Multi-step form
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden transition-colors">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🌅</div>
          <div>
            <div className="font-bold text-lg">Ochtendcheck</div>
            <div className="text-amber-100 text-xs">Dagelijkse basislijn — max. 1 minuut</div>
          </div>
        </div>
        {/* Step indicator */}
        <div className="flex gap-1.5 mt-3">
          {[0, 1, 2].map(s => (
            <div
              key={s}
              className={`h-1 rounded-full flex-1 transition-all ${s <= step ? 'bg-white' : 'bg-white/30'}`}
            />
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Step 0: Subjectieve scores */}
        {step === 0 && (
          <div className="space-y-5">
            {/* Ochtendgevoel */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 transition-colors">
                Hoe voel je je nu? <span className="text-2xl ml-1">{getScoreEmoji(morningScore)}</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 transition-colors">
                Vóór koffie, vóór je dag begint — puur je baseline.
              </p>
              <input
                type="range"
                min="1"
                max="10"
                value={morningScore}
                onChange={e => setMorningScore(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1 transition-colors">
                <span>Slecht (1)</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-base">{morningScore}</span>
                <span>Goed (10)</span>
              </div>
            </div>

            {/* Slaapkwaliteit */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors">
                Slaapkwaliteit
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(q => (
                  <button
                    key={q}
                    onClick={() => setSleepQuality(q)}
                    className={`flex-1 py-2 rounded-lg text-lg transition-all ${
                      sleepQuality >= q
                        ? 'text-amber-500 scale-110'
                        : 'text-gray-300 dark:text-slate-600'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                {getSleepLabel(sleepQuality)}
              </div>
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
            >
              Verder <i className="fas fa-arrow-right ml-2" />
            </button>
          </div>
        )}

        {/* Step 1: Meetwaarden */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Control Pause */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 transition-colors">
                Control Pause <span className="font-normal text-gray-400">(optioneel)</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 transition-colors">
                Rustig uitademen, neus dichtknijpen, meten tot eerste ademdrang.
              </p>
              <div className="relative">
                <input
                  type="number"
                  value={cp}
                  onChange={e => setCp(e.target.value)}
                  placeholder="bv. 18"
                  min="1" max="300"
                  className="w-full px-4 py-3 pr-12 text-lg border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">s</span>
              </div>
              {cp && !isNaN(Number(cp)) && Number(cp) > 0 && (
                <p className={`text-sm font-semibold mt-1.5 transition-colors ${getCPLabel(Number(cp)).color}`}>
                  → {getCPLabel(Number(cp)).label}
                </p>
              )}
            </div>

            {/* Tijd tot eerste symptoom */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 transition-colors">
                Tijd tot eerste symptoom <span className="font-normal text-gray-400">(optioneel)</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 transition-colors">
                Hoeveel minuten na het wakker worden begon je iets te voelen?
              </p>
              <div className="relative">
                <input
                  type="number"
                  value={minsToSymptoms}
                  onChange={e => setMinsToSymptoms(e.target.value)}
                  placeholder="bv. 30"
                  min="0" max="720"
                  className="w-full px-4 py-3 pr-16 text-lg border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">min</span>
              </div>
              {minsToSymptoms === '0' && (
                <p className="text-xs text-orange-500 mt-1">Direct bij het wakker worden — noteer dit.</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(0)}
                className="px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                <i className="fas fa-arrow-left" />
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
              >
                Verder <i className="fas fa-arrow-right ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Context */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 transition-colors">
                Bijzondere context?
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 transition-colors">
                Helpt om meetwaarden te interpreteren — bv. alcohol verlaagt CO₂-setpoint tijdelijk.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CONTEXT_FLAGS.map(flag => (
                  <button
                    key={flag.id}
                    onClick={() => toggleFlag(flag.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      contextFlags.includes(flag.id)
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                        : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <span className="text-lg">{flag.icon}</span>
                    <span>{flag.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                <i className="fas fa-arrow-left" />
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
              >
                {saving ? (
                  <><i className="fas fa-spinner fa-spin mr-2" />Opslaan...</>
                ) : (
                  <><i className="fas fa-check mr-2" />Opslaan</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
