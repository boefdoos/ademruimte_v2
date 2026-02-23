'use client';

import { useState, lazy, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useI18n } from '@/contexts/I18nContext';

// Lazy load components
const JournalEntries = lazy(() => import('@/components/tracking/JournalEntries').then(mod => ({ default: mod.JournalEntries })));
const ButeykoExercise = lazy(() => import('@/components/exercises/ButeykoExercise').then(mod => ({ default: mod.ButeykoExercise })));
const HRVInput = lazy(() => import('@/components/exercises/HRVInput').then(mod => ({ default: mod.HRVInput })));

type TrackingTab = 'symptomen' | 'cp' | 'hrv';

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 dark:border-orange-400 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">Laden...</p>
    </div>
  </div>
);

export default function TrackingPage() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TrackingTab>('symptomen');
  const [visitedTabs, setVisitedTabs] = useState<Set<TrackingTab>>(new Set(['symptomen']));

  const handleTabChange = (tab: TrackingTab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
  };

  useEffect(() => {
    const tab = searchParams.get('tab') as TrackingTab;
    if (tab && ['symptomen', 'cp', 'hrv'].includes(tab)) {
      handleTabChange(tab);
    }
  }, [searchParams]);

  return (
    <>
      <Navigation />
      <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-slate-900 dark:to-slate-800 transition-colors">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors">
              <i className="fas fa-clipboard-list text-orange-600 dark:text-orange-400 mr-2 sm:mr-3 transition-colors"></i>
              {t('tracking.title')}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 transition-colors">
              {t('tracking.subtitle')}
            </p>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 mb-4 sm:mb-6 transition-colors">
            <div className="flex border-b border-gray-200 dark:border-slate-600 transition-colors overflow-x-auto">
              <button
                onClick={() => handleTabChange('symptomen')}
                className={`flex-1 py-3 px-2 sm:py-4 sm:px-4 md:px-6 font-semibold text-xs sm:text-sm md:text-base transition-colors whitespace-nowrap ${
                  activeTab === 'symptomen'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
              >
                <i className="fas fa-notes-medical mr-1 sm:mr-2"></i>
                {t('tracking.tab_symptoms')}
              </button>
              <button
                onClick={() => handleTabChange('cp')}
                className={`flex-1 py-3 px-2 sm:py-4 sm:px-4 md:px-6 font-semibold text-xs sm:text-sm md:text-base transition-colors whitespace-nowrap ${
                  activeTab === 'cp'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
              >
                <i className="fas fa-stopwatch mr-1 sm:mr-2"></i>
                <span className="hidden sm:inline">{t('tracking.tab_cp')}</span>
                <span className="sm:hidden">CP</span>
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
                <span className="hidden sm:inline">{t('tracking.tab_hrv')}</span>
                <span className="sm:hidden">HRV</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 md:p-8">
              {visitedTabs.has('symptomen') && (
                <div className={activeTab !== 'symptomen' ? 'hidden' : ''}>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <JournalEntries />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              )}
              {visitedTabs.has('cp') && (
                <div className={activeTab !== 'cp' ? 'hidden' : ''}>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <ButeykoExercise />
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
              {!visitedTabs.has('symptomen') && activeTab === 'symptomen' && <LoadingFallback />}
              {!visitedTabs.has('cp') && activeTab === 'cp' && <LoadingFallback />}
              {!visitedTabs.has('hrv') && activeTab === 'hrv' && <LoadingFallback />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
