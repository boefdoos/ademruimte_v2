'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { HRVChart } from '@/components/tracking/HRVChart';
import { ControlPauseChart } from '@/components/tracking/ControlPauseChart';
import { BreathingSessionsChart } from '@/components/tracking/BreathingSessionsChart';
import { IntensityStats } from '@/components/tracking/IntensityStats';

type InsightTab = 'overview' | 'measurements' | 'sessions';

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<InsightTab>('overview');

  return (
    <>
      <Navigation />
      <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors">
              <i className="fas fa-chart-line text-purple-600 dark:text-purple-400 mr-3 transition-colors"></i>
              Inzichten & Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg transition-colors">
              Je fysiologische vooruitgang en ademhalingspatronen
            </p>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden mb-6 transition-colors">
            <div className="flex border-b border-gray-200 dark:border-slate-600 overflow-x-auto transition-colors">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-4 px-6 font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white dark:bg-blue-700'
                    : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
              >
                <i className="fas fa-chart-bar mr-2"></i>
                Overzicht
              </button>
              <button
                onClick={() => setActiveTab('measurements')}
                className={`flex-1 py-4 px-6 font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'measurements'
                    ? 'bg-purple-600 text-white dark:bg-purple-700'
                    : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
              >
                <i className="fas fa-heart-pulse mr-2"></i>
                Metingen
              </button>
              <button
                onClick={() => setActiveTab('sessions')}
                className={`flex-1 py-4 px-6 font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'sessions'
                    ? 'bg-indigo-600 text-white dark:bg-indigo-700'
                    : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
              >
                <i className="fas fa-wind mr-2"></i>
                Sessies
              </button>
            </div>

            <div className="p-8">
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-4 flex items-center transition-colors">
                    <i className="fas fa-chart-bar mr-3"></i>
                    Symptoom Intensiteit Overzicht
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">
                    Hoe evolueert de intensiteit van je symptomen over tijd?
                  </p>
                  <IntensityStats />
                </div>
              )}
              {activeTab === 'measurements' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-4 flex items-center transition-colors">
                      <i className="fas fa-heart-pulse mr-3"></i>
                      Heart Rate Variability (HRV)
                    </h2>
                    <HRVChart />
                  </div>
                  <div className="border-t-2 border-gray-200 dark:border-slate-600 pt-8 transition-colors">
                    <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4 flex items-center transition-colors">
                      <i className="fas fa-stopwatch mr-3"></i>
                      Control Pause (CP)
                    </h2>
                    <ControlPauseChart />
                  </div>
                </div>
              )}
              {activeTab === 'sessions' && (
                <div>
                  <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center transition-colors">
                    <i className="fas fa-wind mr-3"></i>
                    Ademhalingssessies
                  </h2>
                  <BreathingSessionsChart />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
