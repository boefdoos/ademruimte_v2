'use client';

import { Navigation } from '@/components/layout/Navigation';
import { JournalEntries } from '@/components/tracking/JournalEntries';

export default function JournalPage() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen p-8 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-slate-900 dark:to-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors">
              <i className="fas fa-book text-orange-600 dark:text-orange-400 mr-3 transition-colors"></i>
              Ademhalingsdagboek
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg transition-colors">
              Reflecteer op je ademhalingsreis en track symptomen
            </p>
          </div>

          {/* Journal Entries - Most important, top of page */}
          <div className="mb-8">
            <JournalEntries />
          </div>

          {/* Navigation hint */}
          <div className="bg-blue-50 dark:bg-slate-800 border-2 border-blue-200 dark:border-slate-600 rounded-xl p-6 text-center transition-colors">
            <p className="text-gray-700 dark:text-gray-300 mb-3 transition-colors">
              <i className="fas fa-chart-line text-blue-600 dark:text-blue-400 mr-2"></i>
              Wil je je <strong>fysiologische metingen</strong> (HRV, CP, ademhalingssessies) bekijken?
            </p>
            <a
              href="/insights"
              className="inline-block px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
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
