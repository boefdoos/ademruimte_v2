'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load heavy components
const ButeykoExercise = lazy(() => import('@/components/exercises/ButeykoExercise').then(mod => ({ default: mod.ButeykoExercise })));
const ResonantBreathing = lazy(() => import('@/components/exercises/ResonantBreathing').then(mod => ({ default: mod.ResonantBreathing })));
const HRVInput = lazy(() => import('@/components/exercises/HRVInput').then(mod => ({ default: mod.HRVInput })));

type ExerciseTab = 'buteyko' | 'resonant' | 'hrv';

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">Laden...</p>
    </div>
  </div>
);

export default function ExercisesPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ExerciseTab>('buteyko');
  // Track which tabs have been visited so they stay mounted
  const [visitedTabs, setVisitedTabs] = useState<Set<ExerciseTab>>(new Set(['buteyko']));

  const handleTabChange = (tab: ExerciseTab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
  };

  // Set initial tab from URL parameter
  useEffect(() => {
    const tab = searchParams.get('tab') as ExerciseTab;
    if (tab && ['buteyko', 'resonant', 'hrv'].includes(tab)) {
      handleTabChange(tab);
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
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 mb-4 sm:mb-6 transition-colors">
          <div className="flex border-b border-gray-200 dark:border-slate-600 transition-colors overflow-x-auto">
            <button
              onClick={() => handleTabChange('buteyko')}
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
              onClick={() => handleTabChange('resonant')}
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
              onClick={() => handleTabChange('hrv')}
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
            {/* Keep components mounted once visited; hide inactive with CSS */}
            {visitedTabs.has('buteyko') && (
              <div className={activeTab !== 'buteyko' ? 'hidden' : ''}>
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <ButeykoExercise />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
            {visitedTabs.has('resonant') && (
              <div className={activeTab !== 'resonant' ? 'hidden' : ''}>
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <ResonantBreathing />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
            {visitedTabs.has('hrv') && (
              <div className={activeTab !== 'hrv' ? 'hidden' : ''}>
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <HRVInput />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
            {/* Show loading for unvisited tabs */}
            {!visitedTabs.has('buteyko') && activeTab === 'buteyko' && <LoadingFallback />}
            {!visitedTabs.has('resonant') && activeTab === 'resonant' && <LoadingFallback />}
            {!visitedTabs.has('hrv') && activeTab === 'hrv' && <LoadingFallback />}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
