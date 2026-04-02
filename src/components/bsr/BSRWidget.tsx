'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/contexts/I18nContext';
import { useBSR } from '@/contexts/BSRContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { BSROnboarding } from './BSROnboarding';

const REFLEX_TYPES = [
  { id: 'yawn', emoji: '🥱' },
  { id: 'sigh', emoji: '😮‍💨' },
];

const CONTEXTS = [
  { id: 'rest', emoji: '🛋️' },
  { id: 'work', emoji: '💻' },
  { id: 'social', emoji: '👥' },
  { id: 'walk', emoji: '🚶' },
  { id: 'eat', emoji: '🍽️' },
  { id: 'session', emoji: '🫁' },
];

export function BSRWidget() {
  const { currentUser } = useAuth();
  const { locale } = useI18n();
  const { logEntry, bsr4h, contextBSR, recentCount } = useBSR();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'score' | 'context'>('score');
  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const [selectedReflex, setSelectedReflex] = useState<string | null>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOnboardingDone(localStorage.getItem('bsr_onboarding_done') === 'true');
    }
  }, []);

  const log = useCallback((contextId: string | null) => {
    if (pendingScore === null) return;

    logEntry(pendingScore, selectedReflex, contextId);

    setFlash(pendingScore);
    setPhase('score');
    setPendingScore(null);
    setSelectedReflex(null);
    setOpen(false);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), 1500);
  }, [pendingScore, selectedReflex, logEntry]);

  const cancel = () => {
    setPhase('score');
    setPendingScore(null);
    setSelectedReflex(null);
    setOpen(false);
  };

  const handleFABClick = () => {
    if (!onboardingDone) {
      setShowOnboarding(true);
      return;
    }
    open ? cancel() : setOpen(true);
  };

  const completeOnboarding = () => {
    localStorage.setItem('bsr_onboarding_done', 'true');
    setOnboardingDone(true);
    setShowOnboarding(false);
    setOpen(true);
  };

  if (!currentUser || !isMounted) return null;
  if (pathname === '/' || pathname === '/auth' || pathname === '/privacy') return null;

  const bsr = bsr4h;
  const bsrColor = bsr === null ? 'text-gray-400 dark:text-gray-500'
    : bsr >= 60 ? 'text-green-500 dark:text-green-400'
    : bsr >= 30 ? 'text-yellow-500 dark:text-yellow-400'
    : 'text-red-500 dark:text-red-400';

  const flashBg = flash === 2 ? 'bg-green-500 border-green-500'
    : flash === 1 ? 'bg-yellow-500 border-yellow-500'
    : flash === 0 ? 'bg-red-500 border-red-500'
    : '';

  const labels: Record<string, string> = locale === 'nl'
    ? { yawn: 'Gaap', sigh: 'Zucht', rest: 'Rust', work: 'Werk', social: 'Sociaal', walk: 'Beweging', eat: 'Eten', session: 'Ademsessie' }
    : { yawn: 'Yawn', sigh: 'Sigh', rest: 'Rest', work: 'Work', social: 'Social', walk: 'Movement', eat: 'Eating', session: 'Session' };

  const scoreOptions = [
    { s: 2, e: '😌', l: locale === 'nl' ? 'Ja' : 'Yes', ring: 'hover:border-green-400 dark:hover:border-green-500' },
    { s: 1, e: '😐', l: locale === 'nl' ? 'Half' : 'Partial', ring: 'hover:border-yellow-400 dark:hover:border-yellow-500' },
    { s: 0, e: '😣', l: locale === 'nl' ? 'Nee' : 'No', ring: 'hover:border-red-400 dark:hover:border-red-500' },
  ];

  return createPortal(
    <>
      {showOnboarding && <BSROnboarding onComplete={completeOnboarding} />}

      {open && (
        <div className="fixed z-[60] bottom-36 md:bottom-6 right-4 w-[300px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 shadow-xl dark:shadow-slate-950/60 animate-slideUp transition-colors">

          {phase === 'score' && (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-3 transition-colors">
                {locale === 'nl' ? 'Gaf het verlichting?' : 'Did it bring relief?'}
              </p>
              <div className="flex gap-2 justify-center">
                {scoreOptions.map(o => (
                  <button
                    key={o.s}
                    onClick={() => { setPendingScore(o.s); setPhase('context'); }}
                    className={`w-[84px] py-3 bg-gray-50 dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 rounded-xl transition-all ${o.ring}`}
                  >
                    <div className="text-3xl">{o.e}</div>
                    <div className={`text-[10px] font-semibold mt-0.5 ${
                      o.s === 2 ? 'text-green-600 dark:text-green-400' :
                      o.s === 1 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-500 dark:text-red-400'
                    }`}>{o.l}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2.5 transition-colors">
                {recentCount} {locale === 'nl' ? 'registraties afgelopen 4u' : 'entries last 4h'}
              </p>
            </>
          )}

          {phase === 'context' && (
            <>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 transition-colors">
                {locale === 'nl' ? 'Wat was het?' : 'What was it?'}
              </p>
              <div className="flex gap-2 mb-3">
                {REFLEX_TYPES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReflex(selectedReflex === r.id ? null : r.id)}
                    className={`flex-1 py-2 rounded-lg text-center transition-colors ${
                      selectedReflex === r.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                        : 'bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600'
                    }`}
                  >
                    <div className="text-xl">{r.emoji}</div>
                    <div className={`text-[10px] mt-0.5 font-medium ${
                      selectedReflex === r.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>{labels[r.id]}</div>
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 transition-colors">
                {locale === 'nl' ? 'Waarbij?' : 'During what?'}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {CONTEXTS.map(c => {
                  const cb = contextBSR[c.id];
                  return (
                    <button
                      key={c.id}
                      onClick={() => log(c.id)}
                      className="py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-center hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                    >
                      <div className="text-base">{c.emoji}</div>
                      <div className="text-[10px] text-gray-700 dark:text-gray-200 mt-0.5 transition-colors">
                        {labels[c.id]}
                      </div>
                      {cb !== null && (
                        <div className={`text-[8px] font-bold mt-0.5 ${
                          cb >= 50 ? 'text-green-600 dark:text-green-400' :
                          cb >= 25 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-500 dark:text-red-400'
                        }`}>{cb}%</div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between mt-2.5">
                <button
                  onClick={() => log(null)}
                  className="text-[10px] text-gray-500 dark:text-gray-400 px-2.5 py-1 border border-gray-200 dark:border-slate-600 rounded-md bg-transparent hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  {locale === 'nl' ? '← sla over' : '← skip'}
                </button>
                <button
                  onClick={() => { setPhase('score'); setPendingScore(null); setSelectedReflex(null); }}
                  className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 bg-transparent border-none cursor-pointer transition-colors"
                >
                  {locale === 'nl' ? 'terug →' : 'back →'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={handleFABClick}
        className={`fixed z-[60] bottom-20 md:bottom-6 right-4 w-14 h-14 rounded-full shadow-lg dark:shadow-slate-950/50 flex flex-col items-center justify-center transition-all duration-300 ${
          flash !== null
            ? `${flashBg} scale-110`
            : 'bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 scale-100'
        }`}
        aria-label="BSR Tracker"
      >
        {flash !== null ? (
          <span className="text-xl">{flash === 2 ? '😌' : flash === 1 ? '😐' : '😣'}</span>
        ) : (
          <>
            <span className={`text-base font-extrabold leading-none ${bsrColor}`}>
              {bsr !== null ? bsr : '—'}
            </span>
            <span className="text-[7px] text-gray-400 dark:text-gray-500 mt-px">BSR</span>
          </>
        )}
      </button>
    </>,
    document.body
  );
}
