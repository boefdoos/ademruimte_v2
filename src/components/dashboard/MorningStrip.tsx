'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import {
  doc, getDoc, setDoc, collection, addDoc,
  query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const SLEEP_LABELS = ['', 'Slecht', 'Matig', 'Oké', 'Goed', 'Uitstekend'];
const FLAGS = [
  { id: 'alcohol', label: 'Alcohol gisteren' },
  { id: 'ziek', label: 'Ziek / koorts' },
  { id: 'slecht_geslapen', label: 'Slecht geslapen' },
  { id: 'stress', label: 'Veel stress' },
];

interface MorningData {
  gevoel: number | null;
  slaap: number | null;
  cp: number | null;
  symptoomMin: number | null; // null = not yet filled, -1 = no symptoms
  context: string[];
  savedAt?: Date;
}

type ChipId = 'gevoel' | 'slaap' | 'cp' | 'symptoom' | 'context' | null;

function cpLabel(s: number): string {
  if (s < 10) return 'Zeer laag';
  if (s < 20) return 'Laag';
  if (s < 30) return 'Gemiddeld';
  if (s < 40) return 'Goed';
  return 'Uitstekend';
}

function cpColor(s: number): string {
  if (s < 10) return '#A32D2D';
  if (s < 20) return '#854F0B';
  if (s < 30) return '#3B6D11';
  if (s < 40) return '#0F6E56';
  return '#185FA5';
}

export function MorningStrip() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<MorningData>({
    gevoel: null, slaap: null, cp: null, symptoomMin: null, context: [],
  });
  const [open, setOpen] = useState<ChipId>(null);
  const [loading, setLoading] = useState(true);

  // local form state
  const [gevoelVal, setGevoelVal] = useState(5);
  const [slaapVal, setSlaapVal] = useState(3);
  const [cpVal, setCpVal] = useState('');
  const [symptoomVal, setSymptoomVal] = useState('');
  const [contextFlags, setContextFlags] = useState<string[]>([]);

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        const today = getTodayString();
        const ref = doc(db, 'users', currentUser.uid, 'morningStrip', today);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data() as MorningData;
          setData(d);
          if (d.gevoel !== null) setGevoelVal(d.gevoel);
          if (d.slaap !== null) setSlaapVal(d.slaap);
          if (d.context?.length) setContextFlags(d.context);
        }
      } catch (e) {
        console.error('MorningStrip load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const save = async (patch: Partial<MorningData>) => {
    if (!currentUser) return;
    const today = getTodayString();
    const next = { ...data, ...patch, savedAt: new Date() };
    setData(next);
    try {
      const ref = doc(db, 'users', currentUser.uid, 'morningStrip', today);
      await setDoc(ref, next, { merge: true });
      // mark morning goal done
      const goalsRef = doc(db, 'users', currentUser.uid, 'goals', today);
      await setDoc(goalsRef, { morning: true }, { merge: true });
    } catch (e) {
      console.error('MorningStrip save error:', e);
    }
  };

  const saveCP = async (seconds: number) => {
    if (!currentUser) return;
    // Also write to cpMeasurements for chart compatibility
    await addDoc(collection(db, 'cpMeasurements'), {
      userId: currentUser.uid,
      seconds,
      timestamp: new Date(),
    });
    const today = getTodayString();
    const goalsRef = doc(db, 'users', currentUser.uid, 'goals', today);
    await setDoc(goalsRef, { cp: true }, { merge: true });
  };

  const toggle = (id: ChipId) => {
    setOpen(prev => prev === id ? null : id);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
  };

  const doneCount = [
    data.gevoel !== null,
    data.slaap !== null,
    data.cp !== null,
    data.symptoomMin !== null,
    data.context.length > 0,
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="animate-pulse flex gap-2">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex-1 h-16 bg-gray-100 dark:bg-slate-700 rounded-lg transition-colors" />
        ))}
      </div>
    );
  }

  const chipBase = 'flex-1 rounded-lg py-2 px-1 text-center border cursor-pointer select-none transition-all';
  const chipDone = 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700';
  const chipPending = 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700';
  const chipEmpty = 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500';

  return (
    <div>
      {/* Strip */}
      <div className="flex gap-1.5">

        {/* Gevoel */}
        <button
          onClick={() => toggle('gevoel')}
          className={`${chipBase} ${data.gevoel !== null ? chipDone : chipEmpty}`}
        >
          <div className="text-sm leading-none mb-1">
            {data.gevoel !== null ? (
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{data.gevoel}/10</span>
            ) : (
              <span className="text-gray-400 dark:text-slate-500">—</span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">Gevoel</div>
        </button>

        {/* Slaap */}
        <button
          onClick={() => toggle('slaap')}
          className={`${chipBase} ${data.slaap !== null ? chipDone : chipEmpty}`}
        >
          <div className="text-[11px] leading-none mb-1">
            {data.slaap !== null ? (
              <span className="text-emerald-600 dark:text-emerald-400">{'★'.repeat(data.slaap)}</span>
            ) : (
              <span className="text-gray-400 dark:text-slate-500">—</span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">Slaap</div>
        </button>

        {/* CP */}
        <button
          onClick={() => toggle('cp')}
          className={`${chipBase} ${data.cp !== null ? chipDone : chipEmpty}`}
        >
          <div className="text-sm leading-none mb-1">
            {data.cp !== null ? (
              <span className="font-semibold" style={{ color: cpColor(data.cp) }}>{data.cp}s</span>
            ) : (
              <span className="text-gray-400 dark:text-slate-500">—</span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">CP</div>
        </button>

        {/* Symptoom */}
        <button
          onClick={() => toggle('symptoom')}
          className={`${chipBase} ${data.symptoomMin !== null ? chipDone : chipPending}`}
        >
          <div className="text-[11px] leading-none mb-1">
            {data.symptoomMin === null ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">Later</span>
            ) : data.symptoomMin === -1 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">Geen</span>
            ) : (
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {data.symptoomMin === 0 ? 'Direct' : `${data.symptoomMin}m`}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">Symptoom</div>
        </button>

        {/* Context */}
        <button
          onClick={() => toggle('context')}
          className={`${chipBase} ${data.context.length > 0 ? chipDone : chipEmpty}`}
        >
          <div className="text-[11px] leading-none mb-1">
            {data.context.length > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                {data.context.includes('geen') ? 'Geen' : `${data.context.length}×`}
              </span>
            ) : (
              <span className="text-gray-400 dark:text-slate-500 text-base leading-none">+</span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">Context</div>
        </button>
      </div>

      {/* Progress hint */}
      {doneCount < 5 && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 text-right transition-colors">
          {doneCount}/5 ingevuld
          {data.symptoomMin === null && doneCount >= 2 && ' · vul symptoom in zodra je het weet'}
        </p>
      )}

      {/* Inline forms */}
      <div ref={formRef}>

        {/* Gevoel form */}
        {open === 'gevoel' && (
          <div className="mt-3 bg-gray-50 dark:bg-slate-700 rounded-xl p-4 transition-colors">
            <style>{`
              .gevoel-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 10px; border-radius: 5px; outline: none; cursor: pointer; background: linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #22c55e); }
              .gevoel-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%; background: white; border: 3px solid #6b7280; box-shadow: 0 2px 6px rgba(0,0,0,0.2); cursor: pointer; transition: border-color .15s; }
              .gevoel-slider::-moz-range-thumb { width: 26px; height: 26px; border-radius: 50%; background: white; border: 3px solid #6b7280; box-shadow: 0 2px 6px rgba(0,0,0,0.2); cursor: pointer; }
            `}</style>
            <input
              type="range" min="1" max="10" step="1"
              value={gevoelVal}
              onChange={e => setGevoelVal(Number(e.target.value))}
              className="gevoel-slider mt-1"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>Slecht (1)</span>
              <span className="font-semibold text-gray-800 dark:text-gray-100">{gevoelVal}/10</span>
              <span>Goed (10)</span>
            </div>
            <button
              onClick={() => { save({ gevoel: gevoelVal }); toggle(null); }}
              className="mt-3 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Opslaan
            </button>
          </div>
        )}

        {/* Slaap form */}
        {open === 'slaap' && (
          <div className="mt-3 bg-gray-50 dark:bg-slate-700 rounded-xl p-4 transition-colors">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Slaapkwaliteit</p>
            <div className="flex gap-2 justify-center mb-1">
              {[1,2,3,4,5].map(q => (
                <button
                  key={q}
                  onClick={() => setSlaapVal(q)}
                  className={`text-2xl transition-all ${q <= slaapVal ? 'text-amber-400 scale-110' : 'text-gray-300 dark:text-slate-500'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-3">{SLEEP_LABELS[slaapVal]}</p>
            <button
              onClick={() => { save({ slaap: slaapVal }); toggle(null); }}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Opslaan
            </button>
          </div>
        )}

        {/* CP form */}
        {open === 'cp' && (
          <div className="mt-3 bg-gray-50 dark:bg-slate-700 rounded-xl p-4 transition-colors">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Rustig uitademen, neus dichtknijpen, meten tot eerste ademdrang.
            </p>
            <div className="relative mt-2">
              <input
                type="number"
                value={cpVal}
                onChange={e => setCpVal(e.target.value)}
                placeholder="seconden"
                min="1" max="300"
                className="w-full px-4 py-2.5 pr-10 text-lg border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">s</span>
            </div>
            {cpVal && !isNaN(Number(cpVal)) && Number(cpVal) > 0 && (
              <p className="text-xs font-semibold mt-1.5 transition-colors" style={{ color: cpColor(Number(cpVal)) }}>
                → {cpLabel(Number(cpVal))}
              </p>
            )}
            <button
              onClick={async () => {
                const n = Number(cpVal);
                if (!cpVal || isNaN(n) || n < 1) return;
                await save({ cp: n });
                await saveCP(n);
                toggle(null);
              }}
              disabled={!cpVal || isNaN(Number(cpVal)) || Number(cpVal) < 1}
              className="mt-3 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Opslaan
            </button>
          </div>
        )}

        {/* Symptoom form */}
        {open === 'symptoom' && (
          <div className="mt-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 transition-colors">
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
              Hoeveel minuten na het wakker worden voelde je het eerste symptoom?
            </p>
            <div className="relative">
              <input
                type="number"
                value={symptoomVal}
                onChange={e => setSymptoomVal(e.target.value)}
                placeholder="minuten"
                min="0" max="720"
                className="w-full px-4 py-2.5 pr-12 text-lg border-2 border-amber-200 dark:border-amber-800 dark:bg-slate-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">min</span>
            </div>
            {/* Quick buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[0, 15, 30, 60, 90, 120].map(m => (
                <button
                  key={m}
                  onClick={() => setSymptoomVal(String(m))}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    symptoomVal === String(m)
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                  }`}
                >
                  {m === 0 ? 'Direct' : `${m} min`}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  const n = Number(symptoomVal);
                  if (symptoomVal === '' || isNaN(n)) return;
                  save({ symptoomMin: n });
                  toggle(null);
                }}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Opslaan
              </button>
              <button
                onClick={() => { save({ symptoomMin: -1 }); toggle(null); }}
                className="flex-1 py-2.5 bg-white dark:bg-slate-700 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-semibold transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                Geen symptomen
              </button>
            </div>
          </div>
        )}

        {/* Context form */}
        {open === 'context' && (
          <div className="mt-3 bg-gray-50 dark:bg-slate-700 rounded-xl p-4 transition-colors">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Helpt om meetwaarden te interpreteren — bv. alcohol verlaagt CO₂-setpoint tijdelijk.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {FLAGS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setContextFlags(prev =>
                    prev.includes(f.id)
                      ? prev.filter(x => x !== f.id)
                      : [...prev.filter(x => x !== 'geen'), f.id]
                  )}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium text-left transition-colors ${
                    contextFlags.includes(f.id)
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-slate-600 border-gray-200 dark:border-slate-500 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                const flags = contextFlags.length === 0 ? ['geen'] : contextFlags;
                save({ context: flags });
                toggle(null);
              }}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {contextFlags.length === 0 ? 'Geen bijzonders' : 'Opslaan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
