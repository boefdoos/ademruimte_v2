'use client';

import { lazy, Suspense } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const ResonantBreathing = lazy(() => import('@/components/exercises/ResonantBreathing').then(mod => ({ default: mod.ResonantBreathing })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">Laden...</p>
    </div>
  </div>
);

export default function ExercisesPage() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 transition-colors">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors">
              <i className="fas fa-wind text-purple-600 dark:text-purple-400 mr-2 sm:mr-3 transition-colors"></i>
              Oefeningen
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 transition-colors">
              Begeleide resonante ademhalingsoefeningen
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 p-4 sm:p-6 md:p-8 transition-colors">
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <ResonantBreathing />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </>
  );
}
