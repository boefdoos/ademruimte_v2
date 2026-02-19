'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 text-center transition-colors">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4 transition-colors">
          Je bent offline
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6 transition-colors">
          Deze pagina is niet beschikbaar offline. Controleer je internetverbinding en probeer het opnieuw.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          <i className="fas fa-refresh mr-2"></i>
          Opnieuw proberen
        </button>
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-600 transition-colors">
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
            <i className="fas fa-info-circle mr-1"></i>
            Beschikbare offline: Dashboard, Oefeningen, Inzichten, Tracking
          </p>
        </div>
      </div>
    </div>
  );
}
