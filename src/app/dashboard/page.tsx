'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { MorningStrip } from '@/components/dashboard/MorningStrip';
import { db } from '@/lib/firebase/config';
import {
  doc, getDoc,
  collection, query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

function getFirstName(email: string | null | undefined): string {
  if (!email) return '';
  return email.split('@')[0].split('.')[0];
}

export default function DashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [lastCP, setLastCP] = useState<number | null>(null);
  const [prevCP, setPrevCP] = useState<number | null>(null);
  const [lastHRV, setLastHRV] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        // Latest 2 CP measurements for delta
        const cpQ = query(
          collection(db, 'cpMeasurements'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(2)
        );
        const cpSnap = await getDocs(cpQ);
        const cpDocs = cpSnap.docs;
        if (cpDocs.length > 0) {
          const latest = cpDocs[0].data();
          setLastCP(latest.seconds || latest.score || null);
        }
        if (cpDocs.length > 1) {
          const prev = cpDocs[1].data();
          setPrevCP(prev.seconds || prev.score || null);
        }

        // Latest HRV
        const hrvQ = query(
          collection(db, 'hrv_measurements'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const hrvSnap = await getDocs(hrvQ);
        if (!hrvSnap.empty) {
          const d = hrvSnap.docs[0].data();
          const val = d.value || d.rmssd || d.hrv || d.measurement || 0;
          setLastHRV(typeof val === 'number' && val > 0 ? Math.round(val) : null);
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 transition-colors">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400" />
        </div>
      </>
    );
  }

  const cpDelta = lastCP !== null && prevCP !== null ? lastCP - prevCP : null;
  const firstName = getFirstName(currentUser?.email);

  return (
    <>
      <OnboardingModal forceOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <Navigation />

      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-24 space-y-5">

          {/* Greeting */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
              {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5 transition-colors">
              {getGreeting()}{firstName ? `, ${firstName}` : ''}
            </h1>
          </div>

          {/* Morning strip */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 transition-colors">
              Ochtendbasislijn
            </p>
            <MorningStrip />
          </div>

          {/* Primary CTA */}
          <a
            href="/exercises"
            className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-center font-semibold text-lg transition-colors shadow-sm"
          >
            <i className="fas fa-wind mr-2" />
            Start ademsessie
          </a>

          {/* Metrics */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 transition-colors">
              Vandaag
            </p>
            <div className="grid grid-cols-3 gap-3">

              {/* BSR — live from widget */}
              <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 text-center transition-colors">
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100 transition-colors" id="bsr-dashboard-val">
                  —
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 transition-colors">BSR 4u</div>
              </div>

              {/* Control Pause */}
              <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 text-center transition-colors">
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100 transition-colors">
                  {lastCP !== null ? `${lastCP}s` : '—'}
                </div>
                {cpDelta !== null && (
                  <div className={`text-[10px] font-semibold mt-0.5 transition-colors ${
                    cpDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                    cpDelta < 0 ? 'text-red-500 dark:text-red-400' :
                    'text-gray-400 dark:text-gray-500'
                  }`}>
                    {cpDelta > 0 ? `+${cpDelta}s ↑` : cpDelta < 0 ? `${cpDelta}s ↓` : '= gelijk'}
                  </div>
                )}
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 transition-colors">
                  Control Pause
                </div>
              </div>

              {/* HRV */}
              <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 text-center transition-colors">
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100 transition-colors">
                  {lastHRV !== null ? `${lastHRV}ms` : '—'}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 transition-colors">HRV</div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 transition-colors">
              Acties
            </p>
            <div className="grid grid-cols-2 gap-3">
              <a href="/insights" className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 transition-colors">
                  <i className="fas fa-chart-line text-blue-600 dark:text-blue-400 text-sm" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 transition-colors">Inzichten</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors">Trends & patronen</div>
                </div>
              </a>

              <a href="/journal?tab=symptomen" className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 transition-colors">
                  <i className="fas fa-notes-medical text-amber-600 dark:text-amber-400 text-sm" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 transition-colors">Journal</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors">Symptomen loggen</div>
                </div>
              </a>

              <a href="/journal?tab=hrv" className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 transition-colors">
                  <i className="fas fa-heart-pulse text-emerald-600 dark:text-emerald-400 text-sm" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 transition-colors">HRV loggen</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors">RMSSD meting</div>
                </div>
              </a>

              <a href="/journal?tab=cp" className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 transition-colors">
                  <i className="fas fa-stopwatch text-purple-600 dark:text-purple-400 text-sm" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 transition-colors">Control Pause</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors">Meting loggen</div>
                </div>
              </a>
            </div>
          </div>

          {/* Onboarding link — discreet */}
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

      {/* BSR live sync — reads from BSR widget state via localStorage */}
      <BsrDashboardSync />
    </>
  );
}

function BsrDashboardSync() {
  useEffect(() => {
    const update = () => {
      try {
        const raw = localStorage.getItem('bsr_entries');
        if (!raw) return;
        const entries: Array<{ score: number; timestamp: number }> = JSON.parse(raw);
        const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
        const recent = entries.filter(e => e.timestamp > fourHoursAgo);
        const el = document.getElementById('bsr-dashboard-val');
        if (!el) return;
        if (recent.length === 0) { el.textContent = '—'; return; }
        const bsr = Math.round(recent.reduce((s, e) => s + e.score, 0) / (recent.length * 2) * 100);
        el.textContent = `${bsr}%`;
        el.style.color = bsr >= 60 ? '#0F6E56' : bsr >= 30 ? '#BA7517' : '#A32D2D';
      } catch {}
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);
  return null;
}
