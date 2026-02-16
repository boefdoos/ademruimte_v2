'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ButeykoExercise } from '@/components/exercises/ButeykoExercise';
import { ResonantBreathing } from '@/components/exercises/ResonantBreathing';
import { HRVInput } from '@/components/exercises/HRVInput';
import { Navigation } from '@/components/layout/Navigation';

type ExerciseTab = 'buteyko' | 'resonant' | 'hrv';

export default function ExercisesPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ExerciseTab>('buteyko');

  // Set initial tab from URL parameter
  useEffect(() => {
    const tab = searchParams.get('tab') as ExerciseTab;
    if (tab && ['buteyko', 'resonant', 'hrv'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <>
      <Navigation />
      <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors">
            Oefeningen
          </h1>
          <p className="text-gray-600 dark:text-gray-300 transition-colors">
            Verbeter je ademhaling met deze gestructureerde oefeningen
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 overflow-hidden mb-6 transition-colors">
          <div className="flex border-b border-gray-200 dark:border-slate-600 transition-colors">
            <button
              onClick={() => setActiveTab('buteyko')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'buteyko'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
              }`}
            >
              <i className="fas fa-stopwatch mr-2"></i>
              Buteyko Control Pause
            </button>
            <button
              onClick={() => setActiveTab('resonant')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'resonant'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
              }`}
            >
              <i className="fas fa-wind mr-2"></i>
              Ademhaling
            </button>
            <button
              onClick={() => setActiveTab('hrv')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'hrv'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
              }`}
            >
              <i className="fas fa-heart-pulse mr-2"></i>
              HRV
            </button>
          </div>

          <div className="p-8">
            {activeTab === 'buteyko' && <ButeykoExercise />}
            {activeTab === 'resonant' && <ResonantBreathing />}
            {activeTab === 'hrv' && <HRVInput />}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
