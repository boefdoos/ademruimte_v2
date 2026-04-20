'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { MorningStrip } from '@/components/dashboard/MorningStrip';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

function getFirstName(email: string | null | undefined): string {
  if (!email) return '';
  const name = email.split('@')[0].split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

interface LastSession {
  durationSec: number;
  breathRate: string | null;
  nSigh: number;
  breathRateCV: number;
  createdAt: Date | null;
}

export default function DashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [lastSession, setLastSession] = useState<LastSession | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) router.push('/auth');
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'users', currentUser.uid, 'breathtraceSessions'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0].data();
          setLastSession({
            durationSec:  d.durationSec  ?? 0,
            breathRate:   d.breathRate   ?? null,
            nSigh:        d.nSigh        ?? 0,
            breathRateCV: d.breathRateCV ?? 0,
            createdAt:    d.createdAt?.toDate?.() ?? null,
          });
        }
      } catch (e) {
        console.error('Dashboard load error:', e);
      }
    };
    load();
  }, [currentUser]);

  if (authLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400" />
        </div>
      </>
    );
  }

  const firstName = getFirstName(currentUser?.email);

  return (
    <>
      <OnboardingModal forceOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <Navigation />

      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-24 space-y-5">

          {/* Greeting */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {getGreeting()}{firstName ? `, ${firstName}` : ''}
            </h1>
          </div>

          {/* Morning strip */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Ochtendbasislijn
            </p>
            <MorningStrip />
          </div>

          {/* BreathTrace CTA */}
          <a
            href="/breathtrace"
            className="flex items-center gap-4 bg-slate-900 dark:bg-slate-950 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-wave-square text-emerald-400 text-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">Ademhalingsmeting</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {lastSession
                  ? `Laatste sessie: ${Math.floor(lastSession.durationSec / 60)}m · ${lastSession.nSigh} sigh${lastSession.nSigh !== 1 ? 's' : ''} · BR ${lastSession.breathRate ?? '?'} bpm`
                  : 'Verbind Polar H10 voor patroonanalyse'}
              </div>
            </div>
            <i className="fas fa-chevron-right text-slate-600 group-hover:text-emerald-400 transition-colors text-sm flex-shrink-0" />
          </a>

          {/* Oefeningen CTA */}
          <a
            href="/exercises"
            className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-center font-semibold text-lg transition-colors shadow-sm"
          >
            <i className="fas fa-wind mr-2" />
            Start ademsessie
          </a>

          {/* Quick actions */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Acties
            </p>
            <div className="grid grid-cols-2 gap-3">
              <a href="/insights" className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-chart-line text-blue-600 dark:text-blue-400 text-sm" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Inzichten</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Trends & patronen</div>
                </div>
              </a>

              <a href="/journal?tab=symptomen" className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-notes-medical text-amber-600 dark:text-amber-400 text-sm" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Journal</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Symptomen loggen</div>
                </div>
              </a>

              <a href="/journal?tab=cp" className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-stopwatch text-purple-600 dark:text-purple-400 text-sm" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Control Pause</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Meting loggen</div>
                </div>
              </a>

              <a href="/journal?tab=bsr" className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-circle-half-stroke text-emerald-600 dark:text-emerald-400 text-sm" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">BSR</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Breath Satisfaction</div>
                </div>
              </a>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => setShowOnboarding(true)}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <i className="fas fa-info-circle mr-1" />
              Introductie herbekijken
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
