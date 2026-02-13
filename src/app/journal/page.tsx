'use client';

import { Navigation } from '@/components/layout/Navigation';
import { JournalEntries } from '@/components/tracking/JournalEntries';
import { IntensityStats } from '@/components/tracking/IntensityStats';

export default function JournalPage() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen p-8 bg-gradient-to-br from-orange-50 to-yellow-50">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              <i className="fas fa-book text-orange-600 mr-3"></i>
              Ademhalingsdagboek
            </h1>
            <p className="text-gray-600 text-lg">
              Reflecteer op je ademhalingsreis en track symptomen
            </p>
          </div>

          {/* Journal Entries - Most important, top of page */}
          <div className="mb-8">
            <JournalEntries />
          </div>

          {/* Divider */}
          <div className="border-t-4 border-orange-200 my-8"></div>

          {/* Intensity Analysis */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-orange-600 mb-4 flex items-center">
              <i className="fas fa-chart-bar mr-3"></i>
              Intensiteit Analyse
            </h2>
            <p className="text-gray-600 mb-4">
              Hoe evolueert de intensiteit van je symptomen over tijd?
            </p>
            <IntensityStats />
          </div>

          {/* Navigation hint */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
            <p className="text-gray-700 mb-3">
              <i className="fas fa-chart-line text-blue-600 mr-2"></i>
              Wil je je <strong>fysiologische metingen</strong> (HRV, CP, ademhalingssessies) bekijken?
            </p>
            <a
              href="/insights"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <i className="fas fa-arrow-right mr-2"></i>
              Ga naar Inzichten
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
