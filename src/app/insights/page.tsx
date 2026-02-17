'use client';

import { useState, lazy, Suspense } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load heavy chart components
const HRVChart = lazy(() => import('@/components/tracking/HRVChart').then(mod => ({ default: mod.HRVChart })));
const ControlPauseChart = lazy(() => import('@/components/tracking/ControlPauseChart').then(mod => ({ default: mod.ControlPauseChart })));
const BreathingSessionsChart = lazy(() => import('@/components/tracking/BreathingSessionsChart').then(mod => ({ default: mod.BreathingSessionsChart })));
const IntensityStats = lazy(() => import('@/components/tracking/IntensityStats').then(mod => ({ default: mod.IntensityStats })));

type InsightTab = 'overview' | 'measurements' | 'sessions';

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">Laden...</p>
    </div>
  </div>
);

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<InsightTab>('overview');
  // Track which tabs have been visited so they stay mounted
  const [visitedTabs, setVisitedTabs] = useState<Set<InsightTab>>(new Set(['overview']));

  const handleTabChange = (tab: InsightTab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors">
              <i className="fas fa-chart-line text-purple-600 dark:text-purple-400 mr-2 sm:mr-3 transition-colors"></i>
              Inzichten & Analytics
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 transition-colors">
              Je fysiologische vooruitgang en ademhalingspatronen
            </p>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg mb-4 sm:mb-6 transition-colors">
            <div className="flex border-b border-gray-200 dark:border-slate-600 overflow-x-auto transition-colors">
              <button
                onClick={() => handleTabChange('overview')}
                className={`flex-1 py-3 px-3 sm:py-4 sm:px-4 md:px-6 font-semibold text-xs sm:text-sm md:text-base transition-colors whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white dark:bg-blue-700'
                    : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
              >
                <i className="fas fa-chart-bar mr-1 sm:mr-2"></i>
                Overzicht
              </button>
              <button
                onClick={() => handleTabChange('measurements')}
                className={`flex-1 py-3 px-3 sm:py-4 sm:px-4 md:px-6 font-semibold text-xs sm:text-sm md:text-base transition-colors whitespace-nowrap ${
                  activeTab === 'measurements'
                    ? 'bg-purple-600 text-white dark:bg-purple-700'
                    : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
              >
                <i className="fas fa-heart-pulse mr-1 sm:mr-2"></i>
                Metingen
              </button>
              <button
                onClick={() => handleTabChange('sessions')}
                className={`flex-1 py-3 px-3 sm:py-4 sm:px-4 md:px-6 font-semibold text-xs sm:text-sm md:text-base transition-colors whitespace-nowrap ${
                  activeTab === 'sessions'
                    ? 'bg-indigo-600 text-white dark:bg-indigo-700'
                    : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
              >
                <i className="fas fa-wind mr-1 sm:mr-2"></i>
                Sessies
              </button>
            </div>

            <div className="p-4 sm:p-6 md:p-8">
              {/* Keep components mounted once visited; hide inactive with CSS */}
              {visitedTabs.has('overview') && (
                <div className={activeTab !== 'overview' ? 'hidden' : ''}>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600 dark:text-orange-400 mb-3 sm:mb-4 flex items-center transition-colors">
                    <i className="fas fa-chart-bar mr-2 sm:mr-3"></i>
                    Symptoom Intensiteit Overzicht
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 transition-colors">
                    Hoe evolueert de intensiteit van je symptomen over tijd?
                  </p>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <IntensityStats />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              )}

              {visitedTabs.has('measurements') && (
                <div className={activeTab !== 'measurements' ? 'hidden' : ''}>
                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400 mb-3 sm:mb-4 flex items-center transition-colors">
                        <i className="fas fa-heart-pulse mr-2 sm:mr-3"></i>
                        Heart Rate Variability (HRV)
                      </h2>
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <HRVChart />
                        </Suspense>
                      </ErrorBoundary>
                    </div>
                    <div className="border-t-2 border-gray-200 dark:border-slate-600 pt-6 sm:pt-8 transition-colors">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 mb-3 sm:mb-4 flex items-center transition-colors">
                        <i className="fas fa-stopwatch mr-2 sm:mr-3"></i>
                        Control Pause (CP)
                      </h2>
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <ControlPauseChart />
                        </Suspense>
                      </ErrorBoundary>
                    </div>
                  </div>
                </div>
              )}

              {visitedTabs.has('sessions') && (
                <div className={activeTab !== 'sessions' ? 'hidden' : ''}>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-3 sm:mb-4 flex items-center transition-colors">
                    <i className="fas fa-wind mr-2 sm:mr-3"></i>
                    Ademhalingssessies
                  </h2>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <BreathingSessionsChart />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              )}

              {/* Loading for unvisited tabs */}
              {!visitedTabs.has('overview') && activeTab === 'overview' && <LoadingFallback />}
              {!visitedTabs.has('measurements') && activeTab === 'measurements' && <LoadingFallback />}
              {!visitedTabs.has('sessions') && activeTab === 'sessions' && <LoadingFallback />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
