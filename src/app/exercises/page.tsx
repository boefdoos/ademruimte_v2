'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';

// Lazy load heavy components
const ButeykoExercise = lazy(() => import('@/components/exercises/ButeykoExercise').then(mod => ({ default: mod.ButeykoExercise })));
const ResonantBreathing = lazy(() => import('@/components/exercises/ResonantBreathing').then(mod => ({ default: mod.ResonantBreathing })));
const HRVInput = lazy(() => import('@/components/exercises/HRVInput').then(mod => ({ default: mod.HRVInput })));

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
      <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors">
            Oefeningen
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 transition-colors">
            Verbeter je ademhaling met deze gestructureerde oefeningen
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 overflow-hidden mb-4 sm:mb-6 transition-colors">
          <div className="flex border-b border-gray-200 dark:border-slate-600 transition-colors overflow-x-auto">
            <button
              onClick={() => setActiveTab('buteyko')}
              className={`flex-1 py-3 px-2 sm:py-4 sm:px-4 md:px-6 font-semibold text-xs sm:text-sm md:text-base transition-colors whitespace-nowrap ${
                activeTab === 'buteyko'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
              }`}
            >
              <i className="fas fa-stopwatch mr-1 sm:mr-2"></i>
              <span className="hidden sm:inline">Buteyko Control Pause</span>
              <span className="sm:hidden">Buteyko</span>
            </button>
            <button
              onClick={() => setActiveTab('resonant')}
              className={`flex-1 py-3 px-2 sm:py-4 sm:px-4 md:px-6 font-semibold text-xs sm:text-sm md:text-base transition-colors whitespace-nowrap ${
                activeTab === 'resonant'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
              }`}
            >
              <i className="fas fa-wind mr-1 sm:mr-2"></i>
              Ademhaling
            </button>
            <button
              onClick={() => setActiveTab('hrv')}
              className={`flex-1 py-3 px-2 sm:py-4 sm:px-4 md:px-6 font-semibold text-xs sm:text-sm md:text-base transition-colors whitespace-nowrap ${
                activeTab === 'hrv'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
              }`}
            >
              <i className="fas fa-heart-pulse mr-1 sm:mr-2"></i>
              HRV
            </button>
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">Laden...</p>
                </div>
              </div>
            }>
              {activeTab === 'buteyko' && <ButeykoExercise />}
              {activeTab === 'resonant' && <ResonantBreathing />}
              {activeTab === 'hrv' && <HRVInput />}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
