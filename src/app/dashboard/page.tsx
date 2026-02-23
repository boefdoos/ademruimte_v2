'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { TodayGoals } from '@/components/dashboard/TodayGoals';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { Navigation } from '@/components/layout/Navigation';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export default function DashboardPage() {
  const { currentUser, logout, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [streak, setStreak] = useState(0);
  const [lastCP, setLastCP] = useState<number | null>(null);
  const [lastHRV, setLastHRV] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) return;

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          // Calculate streak
          const today = new Date().toISOString().split('T')[0];
          const lastActive = data.lastActive || '';

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayString = yesterday.toISOString().split('T')[0];

          let newStreak = 1;
          if (lastActive === yesterdayString) {
            newStreak = (data.streak || 0) + 1;
          } else if (lastActive !== today) {
            newStreak = 1;
          } else {
            newStreak = data.streak || 1;
          }

          setStreak(newStreak);

          // Update last active and streak
          if (lastActive !== today) {
            await setDoc(userRef, {
              lastActive: today,
              streak: newStreak,
            }, { merge: true });
          }
        } else {
          // Initialize user document
          const today = new Date().toISOString().split('T')[0];
          await setDoc(userRef, {
            lastActive: today,
            streak: 1,
          });
          setStreak(1);
        }

        // Load latest Control Pause measurement
        const cpRef = collection(db, 'cpMeasurements');
        const cpQuery = query(
          cpRef,
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const cpSnapshot = await getDocs(cpQuery);

        if (!cpSnapshot.empty) {
          const latestCP = cpSnapshot.docs[0].data();
          // Handle V1 backwards compatibility: V1 uses "score", V2 uses "seconds"
          setLastCP(latestCP.seconds || latestCP.score || null);
        }

        // Load latest HRV measurement
        const hrvRef = collection(db, 'hrv_measurements');
        const hrvQuery = query(
          hrvRef,
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const hrvSnapshot = await getDocs(hrvQuery);

        if (!hrvSnapshot.empty) {
          const latestHRV = hrvSnapshot.docs[0].data();
          // Handle V1 backwards compatibility - try different field names
          const value = latestHRV.value || latestHRV.rmssd || latestHRV.hrv || latestHRV.measurement || 0;
          setLastHRV(typeof value === 'number' && value > 0 ? value : null);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [currentUser]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center transition-colors">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">{t('loading')}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <OnboardingModal
        forceOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
      <Navigation />
      <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 transition-colors">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 transition-colors">
              {t('dashboard.welcome_back')}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">{currentUser?.email}</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              icon="fas fa-fire"
              title="Streak"
              value={`${streak} ${streak === 1 ? t('common.day') : t('common.days')}`}
              subtitle={t('dashboard.keep_going')}
              color="orange"
            />
            <StatsCard
              icon="fas fa-heart-pulse"
              title="HRV Laatste"
              value={lastHRV ? `${lastHRV}ms` : '—'}
              subtitle={lastHRV ? t('dashboard.last_measurement') : t('dashboard.no_measurements')}
              color="purple"
            />
            <StatsCard
              icon="fas fa-stopwatch"
              title="Control Pause"
              value={lastCP ? `${lastCP}s` : '—'}
              subtitle={lastCP ? t('dashboard.last_measurement') : t('dashboard.no_measurements')}
              color="green"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <a
            href="/exercises"
            className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition-all text-left cursor-pointer block"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl sm:text-2xl">
                <i className="fas fa-wind"></i>
              </div>
              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                  {t('dashboard.exercises_section')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
                  {t('dashboard.exercises_desc')}
                </p>
              </div>
            </div>
          </a>

          <a
            href="/insights"
            className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition-all text-left cursor-pointer block"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xl sm:text-2xl">
                <i className="fas fa-chart-line"></i>
              </div>
              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                  {t('dashboard.insights_section')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
                  {t('dashboard.insights_desc')}
                </p>
              </div>
            </div>
          </a>

          <a
            href="/journal"
            className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition-all text-left cursor-pointer block"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl sm:text-2xl">
                <i className="fas fa-clipboard-list"></i>
              </div>
              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                  {t('dashboard.tracking_section')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
                  {t('dashboard.tracking_desc')}
                </p>
              </div>
            </div>
          </a>
        </div>

        {/* Today's Goals */}
        <TodayGoals />

        {/* Onboarding herbekijken */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowOnboarding(true)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-2"
          >
            <i className="fas fa-info-circle"></i>
            {t('dashboard.restart_intro')}
          </button>
        </div>
        </div>
      </div>
    </>
  );
}
