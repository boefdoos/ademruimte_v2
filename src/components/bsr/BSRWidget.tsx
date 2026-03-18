'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { usePathname } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { BSROnboarding } from './BSROnboarding';

const REFLEX_TYPES = [
  { id: 'yawn', emoji: '🥱' },
  { id: 'sigh', emoji: '😮‍💨' },
  { id: 'both', emoji: '🔄' },
];

const CONTEXTS = [
  { id: 'rest', emoji: '🛋️' },
  { id: 'work', emoji: '💻' },
  { id: 'social', emoji: '👥' },
  { id: 'walk', emoji: '🚶' },
  { id: 'eat', emoji: '🍽️' },
  { id: 'session', emoji: '🫁' },
];

interface BSREntry {
  score: number; // 0, 1, or 2
  reflex: string | null;
  context: string | null;
  timestamp: Date;
}

function calcBSR(entries: BSREntry[]): number | null {
  if (!entries.length) return null;
  return Math.round(entries.reduce((s, e) => s + e.score, 0) / (entries.length * 2) * 100);
}

export function BSRWidget() {
  const { currentUser } = useAuth();
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'score' | 'context'>('score');
  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const [selectedReflex, setSelectedReflex] = useState<string | null>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const [recentEntries, setRecentEntries] = useState<BSREntry[]>([]);
  const [contextBSR, setContextBSR] = useState<Record<string, number | null>>({});
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  // Check if onboarding was completed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const done = localStorage.getItem('bsr_onboarding_done');
      setOnboardingDone(done === 'true');
    }
  }, []);

  // Load recent entries from Firestore
  useEffect(() => {
    if (!currentUser) return;

    const loadRecent = async () => {
      try {
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
        const q = query(
          collection(db, 'bsrEntries'),
          where('userId', '==', currentUser.uid),
          where('timestamp', '>=', Timestamp.fromDate(fourHoursAgo)),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        const entries: BSREntry[] = snap.docs.map(d => ({
          score: d.data().score,
          reflex: d.data().reflex,
          context: d.data().context,
          timestamp: d.data().timestamp.toDate(),
        }));
        setRecentEntries(entries);

        // Calculate per-context BSR from all recent data
        const ctxMap: Record<string, BSREntry[]> = {};
        // Load more entries for context stats
        const allQ = query(
          collection(db, 'bsrEntries'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(200)
        );
        const allSnap = await getDocs(allQ);
        allSnap.docs.forEach(d => {
          const ctx = d.data().context;
          if (ctx) {
            if (!ctxMap[ctx]) ctxMap[ctx] = [];
            ctxMap[ctx].push({
              score: d.data().score,
              reflex: d.data().reflex,
              context: ctx,
              timestamp: d.data().timestamp.toDate(),
            });
          }
        });
        const ctxBSR: Record<string, number | null> = {};
        CONTEXTS.forEach(c => {
          ctxBSR[c.id] = ctxMap[c.id] && ctxMap[c.id].length >= 3
            ? calcBSR(ctxMap[c.id])
            : null;
        });
        setContextBSR(ctxBSR);
      } catch (err) {
        console.error('Error loading BSR entries:', err);
      }
    };

    loadRecent();
  }, [currentUser, flash]); // Reload after new entry (flash changes)

  const log = useCallback(async (contextId: string | null) => {
    if (!currentUser || pendingScore === null) return;

    try {
      await addDoc(collection(db, 'bsrEntries'), {
        userId: currentUser.uid,
        score: pendingScore,
        reflex: selectedReflex,
        context: contextId,
        timestamp: Timestamp.now(),
      });
    } catch (err) {
      console.error('Error saving BSR entry:', err);
    }

    setFlash(pendingScore);
    setPhase('score');
    setPendingScore(null);
    setSelectedReflex(null);
    setOpen(false);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), 1500);
  }, [currentUser, pendingScore, selectedReflex]);

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
    setOpen(true); // Open widget right after onboarding
  };

  // Don't render on auth, landing, or privacy pages
  if (!currentUser || !isMounted) return null;
  if (pathname === '/' || pathname === '/auth' || pathname === '/privacy') return null;

  const bsr = calcBSR(recentEntries);
  const bsrColor = bsr === null ? 'text-gray-400 dark:text-gray-500'
    : bsr >= 60 ? 'text-green-500 dark:text-green-400'
    : bsr >= 30 ? 'text-yellow-500 dark:text-yellow-400'
    : 'text-red-500 dark:text-red-400';

  const flashBg = flash === 2 ? 'bg-green-500 border-green-500'
    : flash === 1 ? 'bg-yellow-500 border-yellow-500'
    : flash === 0 ? 'bg-red-500 border-red-500'
    : '';

  const labels = {
    yawn: locale === 'nl' ? 'Gaap' : 'Yawn',
    sigh: locale === 'nl' ? 'Zucht' : 'Sigh',
    both: locale === 'nl' ? 'Beide' : 'Both',
    rest: locale === 'nl' ? 'Rust' : 'Rest',
    work: locale === 'nl' ? 'Werk' : 'Work',
    social: locale === 'nl' ? 'Sociaal' : 'Social',
    walk: locale === 'nl' ? 'Beweging' : 'Movement',
    eat: locale === 'nl' ? 'Eten' : 'Eating',
    session: locale === 'nl' ? 'Ademsessie' : 'Session',
  };

  const scoreOptions = [
    { s: 2, e: '😌', l: locale === 'nl' ? 'Ja' : 'Yes', ring: 'hover:border-green-400 dark:hover:border-green-500' },
    { s: 1, e: '😐', l: locale === 'nl' ? 'Half' : 'Partial', ring: 'hover:border-yellow-400 dark:hover:border-yellow-500' },
    { s: 0, e: '😣', l: locale === 'nl' ? 'Nee' : 'No', ring: 'hover:border-red-400 dark:hover:border-red-500' },
  ];

  return createPortal(
    <>
      {showOnboarding && <BSROnboarding onComplete={completeOnboarding} />}

      {/* Popup panel */}
      {open && (
        <div className="fixed z-[60] bottom-24 md:bottom-6 right-4 w-[272px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-xl dark:shadow-slate-950/60 animate-slideUp transition-colors">

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
                    className={`w-[76px] py-2.5 bg-gray-50 dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 rounded-xl transition-all ${o.ring}`}
                  >
                    <div className="text-2xl">{o.e}</div>
                    <div className={`text-[10px] font-semibold mt-0.5 ${
                      o.s === 2 ? 'text-green-600 dark:text-green-400' :
                      o.s === 1 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-500 dark:text-red-400'
                    }`}>{o.l}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2.5 transition-colors">
                {recentEntries.length} {locale === 'nl' ? 'registraties afgelopen 4u' : 'entries last 4h'}
              </p>
            </>
          )}

          {phase === 'context' && (
            <>
              {/* Reflex type */}
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 transition-colors">
                {locale === 'nl' ? 'Wat was het?' : 'What was it?'}
              </p>
              <div className="flex gap-1.5 mb-3">
                {REFLEX_TYPES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReflex(selectedReflex === r.id ? null : r.id)}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-colors ${
                      selectedReflex === r.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                        : 'bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600'
                    }`}
                  >
                    <div className="text-base">{r.emoji}</div>
                    <div className={`text-[9px] mt-0.5 font-medium ${
                      selectedReflex === r.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>{labels[r.id as keyof typeof labels]}</div>
                  </button>
                ))}
              </div>

              {/* Context */}
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
                        {labels[c.id as keyof typeof labels]}
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

              {/* Actions */}
              <div className="flex justify-between mt-2.5">
                <button
                  onClick={() => { setPhase('score'); setPendingScore(null); setSelectedReflex(null); }}
                  className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 bg-transparent border-none cursor-pointer transition-colors"
                >
                  <i className="fas fa-arrow-left mr-1" />
                  {locale === 'nl' ? 'terug' : 'back'}
                </button>
                <button
                  onClick={() => log(null)}
                  className="text-[10px] text-gray-500 dark:text-gray-400 px-2.5 py-1 border border-gray-200 dark:border-slate-600 rounded-md bg-transparent hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  {locale === 'nl' ? 'sla over →' : 'skip →'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB — positioned above mobile bottom nav */}
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
