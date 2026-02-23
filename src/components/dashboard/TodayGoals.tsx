'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface Goal {
  id: string;
  label: string;
  icon: string;
  completed: boolean;
}

export function TodayGoals() {
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const [goals, setGoals] = useState<Goal[]>([
    { id: 'cp', label: 'Log Control Pause', icon: 'fa-stopwatch', completed: false },
    { id: 'hrv', label: 'Log HRV', icon: 'fa-heart-pulse', completed: false },
    { id: 'journal', label: 'Log Symptomen', icon: 'fa-notes-medical', completed: false },
  ]);
  const [loading, setLoading] = useState(true);

  // Get today's date string (YYYY-MM-DD)
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Load today's goals from Firestore
  useEffect(() => {
    const loadGoals = async () => {
      if (!currentUser) return;

      try {
        const todayString = getTodayString();
        const goalsRef = doc(db, 'users', currentUser.uid, 'goals', todayString);
        const goalsSnap = await getDoc(goalsRef);

        if (goalsSnap.exists()) {
          const data = goalsSnap.data();
          setGoals(prevGoals => prevGoals.map(goal => ({
            ...goal,
            completed: data[goal.id] || false,
          })));
        }
      } catch (error) {
        console.error('Error loading goals:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [currentUser]);

  const completedCount = goals.filter(g => g.completed).length;
  const totalCount = goals.length;

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 transition-colors">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const getGoalLink = (goalId: string) => {
    switch (goalId) {
      case 'cp':
        return '/journal?tab=cp';
      case 'hrv':
        return '/journal?tab=hrv';
      case 'journal':
        return '/journal?tab=symptomen';
      default:
        return '/exercises';
    }
  };

  const getGoalLabel = (id: string) => {
    switch(id) {
      case 'cp': return t('dashboard.log_cp');
      case 'hrv': return t('dashboard.log_hrv');
      case 'journal': return t('dashboard.log_symptoms');
      default: return id;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {t('dashboard.todays_goals')}
        </h2>
        <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">
          {completedCount} / {totalCount}
        </div>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => (
          <a
            key={goal.id}
            href={getGoalLink(goal.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
              goal.completed
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            }`}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              goal.completed
                ? 'bg-green-500 dark:bg-green-600 border-green-500 dark:border-green-600'
                : 'border-gray-300 dark:border-slate-500'
            }`}>
              {goal.completed && (
                <i className="fas fa-check text-white text-xs"></i>
              )}
            </div>
            <div className={`text-lg ${goal.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
              <i className={`fas ${goal.icon} mr-2`}></i>
              {getGoalLabel(goal.id)}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                {goal.completed ? t('dashboard.completed') : t('dashboard.auto_completed')}
              </div>
              {!goal.completed && (
                <i className="fas fa-arrow-right text-blue-500 dark:text-blue-400"></i>
              )}
            </div>
          </a>
        ))}
      </div>

      {completedCount === totalCount && (
        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg text-center transition-colors">
          <div className="text-2xl mb-1">🎉</div>
          <p className="text-green-800 dark:text-green-300 font-semibold">
            {t('dashboard.all_goals_done')}
          </p>
        </div>
      )}
    </div>
  );
}
