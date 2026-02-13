'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  const [goals, setGoals] = useState<Goal[]>([
    { id: 'cp', label: 'Log Control Pause', icon: 'fa-stopwatch', completed: false },
    { id: 'hrv', label: 'Log HRV', icon: 'fa-heart-pulse', completed: false },
    { id: 'journal', label: 'Log Dagboek / Journal', icon: 'fa-book', completed: false },
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
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Doelen vandaag / Today's Goals
        </h2>
        <div className="text-sm font-semibold text-gray-600">
          {completedCount} / {totalCount}
        </div>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
              goal.completed
                ? 'bg-green-50 border-green-300'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              goal.completed
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300'
            }`}>
              {goal.completed && (
                <i className="fas fa-check text-white text-xs"></i>
              )}
            </div>
            <div className={`text-lg ${goal.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
              <i className={`fas ${goal.icon} mr-2`}></i>
              {goal.label}
            </div>
            <div className="ml-auto text-xs text-gray-500 italic">
              {goal.completed ? 'Voltooid!' : 'Auto-voltooid na oefening'}
            </div>
          </div>
        ))}
      </div>

      {completedCount === totalCount && (
        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg text-center">
          <div className="text-2xl mb-1">🎉</div>
          <p className="text-green-800 font-semibold">
            Alle doelen bereikt! / All goals completed!
          </p>
        </div>
      )}
    </div>
  );
}
