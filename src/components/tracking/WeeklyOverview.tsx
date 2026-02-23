'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

interface DayData {
  date: string;
  cp: number | null;
  breathingSessions: number;
  hrv: number | null;
  goalsCompleted: number;
}

export function WeeklyOverview() {
  const { currentUser } = useAuth();
  const { t, locale } = useI18n();
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgCP: 0,
    totalSessions: 0,
    goalsStreak: 0,
    avgHRV: 0,
  });

  useEffect(() => {
    const loadWeekData = async () => {
      if (!currentUser) return;

      try {
        // Get last 7 days
        const days: DayData[] = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          const dateString = date.toISOString().split('T')[0];

          days.push({
            date: dateString,
            cp: null,
            breathingSessions: 0,
            hrv: null,
            goalsCompleted: 0,
          });
        }

        // Fetch Control Pause data (last 30 days to avoid composite index)
        const cpRef = collection(db, 'cpMeasurements');
        const cpQuery = query(
          cpRef,
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        const cpSnapshot = await getDocs(cpQuery);

        // Filter to last 7 days in JavaScript
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        cpSnapshot.forEach(doc => {
          const data = doc.data();
          const timestamp = data.timestamp.toDate();

          // Only include if within last 7 days
          if (timestamp >= sevenDaysAgo) {
            const date = timestamp.toISOString().split('T')[0];
            const dayIndex = days.findIndex(d => d.date === date);
            if (dayIndex !== -1) {
              // Handle V1 backwards compatibility: V1 uses "score", V2 uses "seconds"
              const cpValue = data.seconds || data.score || 0;
              // Store the highest CP of the day
              if (!days[dayIndex].cp || cpValue > days[dayIndex].cp!) {
                days[dayIndex].cp = cpValue;
              }
            }
          }
        });

        // Fetch Breathing Sessions data (last 30 days to avoid composite index)
        const sessionsRef = collection(db, 'resonant_sessions');
        const sessionsQuery = query(
          sessionsRef,
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);

        // Filter to last 7 days in JavaScript
        sessionsSnapshot.forEach(doc => {
          const data = doc.data();
          const timestamp = data.timestamp.toDate();

          // Only include if within last 7 days
          if (timestamp >= sevenDaysAgo) {
            const date = timestamp.toISOString().split('T')[0];
            const dayIndex = days.findIndex(d => d.date === date);
            if (dayIndex !== -1) {
              days[dayIndex].breathingSessions++;
            }
          }
        });

        // Calculate stats
        const cpValues = days.filter(d => d.cp !== null).map(d => d.cp!);
        const avgCP = cpValues.length > 0 ? Math.round(cpValues.reduce((a, b) => a + b, 0) / cpValues.length) : 0;
        const totalSessions = days.reduce((sum, d) => sum + d.breathingSessions, 0);

        setWeekData(days);
        setStats({
          avgCP,
          totalSessions,
          goalsStreak: 0, // TODO: Calculate from goals collection
          avgHRV: 0, // TODO: Add HRV integration
        });
      } catch (error) {
        console.error('Error loading week data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWeekData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const getDayName = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', { weekday: 'short' });
  };

  const getActivityColor = (day: DayData) => {
    const hasActivity = day.cp !== null || day.breathingSessions > 0;
    if (!hasActivity) return 'bg-gray-100';
    if (day.cp && day.breathingSessions > 0) return 'bg-green-500';
    if (day.cp || day.breathingSessions > 0) return 'bg-yellow-500';
    return 'bg-gray-100';
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
          <div className="text-sm font-semibold text-gray-600 mb-1">{t('weekly.avg_cp')}</div>
          <div className="text-3xl font-bold text-green-700">{stats.avgCP}s</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
          <div className="text-sm font-semibold text-gray-600 mb-1">{t('weekly.breathing_sessions')}</div>
          <div className="text-3xl font-bold text-blue-700">{stats.totalSessions}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
          <div className="text-sm font-semibold text-gray-600 mb-1">{t('weekly.avg_hrv')}</div>
          <div className="text-3xl font-bold text-purple-700">
            {stats.avgHRV > 0 ? stats.avgHRV : '—'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl">
          <div className="text-sm font-semibold text-gray-600 mb-1">{t('weekly.days_active')}</div>
          <div className="text-3xl font-bold text-orange-700">
            {weekData.filter(d => d.cp || d.breathingSessions > 0).length}/7
          </div>
        </div>
      </div>

      {/* Weekly Activity Grid */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-800">
          {t('weekly.this_week')}
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {weekData.map((day, index) => (
            <div key={index} className="text-center">
              <div className="text-xs font-semibold text-gray-600 mb-2">
                {getDayName(day.date)}
              </div>
              <div
                className={`h-20 rounded-lg ${getActivityColor(day)} flex flex-col items-center justify-center transition-all hover:scale-105`}
              >
                {day.cp && (
                  <div className="text-sm font-bold text-gray-800">{day.cp}s</div>
                )}
                {day.breathingSessions > 0 && (
                  <div className="text-xs text-gray-600">
                    <i className="fas fa-wind"></i> {day.breathingSessions}
                  </div>
                )}
                {!day.cp && day.breathingSessions === 0 && (
                  <div className="text-gray-400">—</div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(day.date + 'T12:00:00').getDate()}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>{t('weekly.full')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>{t('weekly.partial')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 rounded border border-gray-300"></div>
            <span>{t('weekly.no_activity')}</span>
          </div>
        </div>
      </div>

      {/* Day-by-Day Breakdown */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-800">
          {t('weekly.daily_details')}
        </h3>
        <div className="space-y-3">
          {weekData.slice().reverse().map((day, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold text-gray-800">
                  {new Date(day.date + 'T12:00:00').toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
                <div className="text-sm text-gray-600">
                  {day.cp ? `CP: ${day.cp}s` : t('weekly.no_cp')}
                  {day.breathingSessions > 0 && (
                    <> • {day.breathingSessions} {day.breathingSessions === 1 ? t('weekly.session') : t('weekly.sessions')}</>
                  )}
                </div>
              </div>
              <div className={`w-12 h-12 rounded-full ${getActivityColor(day)} flex items-center justify-center`}>
                {(day.cp || day.breathingSessions > 0) ? (
                  <i className="fas fa-check text-white"></i>
                ) : (
                  <i className="fas fa-minus text-gray-400"></i>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
