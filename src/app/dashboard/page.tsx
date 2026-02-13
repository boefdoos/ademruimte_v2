'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { TodayGoals } from '@/components/dashboard/TodayGoals';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { Navigation } from '@/components/layout/Navigation';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export default function DashboardPage() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const [streak, setStreak] = useState(0);
  const [lastCP, setLastCP] = useState<number | null>(null);
  const [lastHRV, setLastHRV] = useState<number | null>(null);

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

  return (
    <>
      <OnboardingModal />
      <Navigation />
      <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welkom terug! / Welcome back!
            </h1>
            <p className="text-gray-600 mt-2">{currentUser?.email}</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              icon="fas fa-fire"
              title="Streak"
              value={`${streak} ${streak === 1 ? 'dag' : 'dagen'}`}
              subtitle="Blijf doorgaan!"
              color="orange"
            />
            <StatsCard
              icon="fas fa-heart-pulse"
              title="HRV Laatste"
              value={lastHRV ? `${lastHRV}ms` : '—'}
              subtitle={lastHRV ? 'Laatste meting' : 'Nog geen metingen'}
              color="purple"
            />
            <StatsCard
              icon="fas fa-stopwatch"
              title="Control Pause"
              value={lastCP ? `${lastCP}s` : '—'}
              subtitle={lastCP ? 'Laatste meting' : 'Nog geen metingen'}
              color="green"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <a
            href="/exercises"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow text-left cursor-pointer block"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl">
                <i className="fas fa-wind"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">
                  Oefeningen
                </h3>
                <p className="text-gray-600 text-sm">
                  Buteyko & Breathing
                </p>
              </div>
            </div>
          </a>

          <a
            href="/insights"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow text-left cursor-pointer block"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-2xl">
                <i className="fas fa-chart-line"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">
                  Inzichten
                </h3>
                <p className="text-gray-600 text-sm">
                  Metingen & Analytics
                </p>
              </div>
            </div>
          </a>

          <a
            href="/journal"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow text-left cursor-pointer block"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl">
                <i className="fas fa-book"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">
                  Dagboek
                </h3>
                <p className="text-gray-600 text-sm">
                  Reflecties & Symptomen
                </p>
              </div>
            </div>
          </a>
        </div>

        {/* Today's Goals */}
        <TodayGoals />
        </div>
      </div>
    </>
  );
}
