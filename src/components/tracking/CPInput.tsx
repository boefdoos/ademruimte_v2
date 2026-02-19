'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, orderBy, limit, getDocs, doc, setDoc } from 'firebase/firestore';

interface CPRecord {
  seconds: number;
  timestamp: Date;
}

const getCPLevel = (secs: number) => {
  if (secs < 10) return { label: 'Zeer laag', color: 'text-red-600 dark:text-red-400' };
  if (secs < 20) return { label: 'Laag', color: 'text-orange-600 dark:text-orange-400' };
  if (secs < 30) return { label: 'Gemiddeld', color: 'text-yellow-600 dark:text-yellow-400' };
  if (secs < 40) return { label: 'Goed', color: 'text-green-600 dark:text-green-400' };
  return { label: 'Uitstekend', color: 'text-blue-600 dark:text-blue-400' };
};

export function CPInput() {
  const { currentUser } = useAuth();
  const [cpValue, setCpValue] = useState('');
  const [lastCP, setLastCP] = useState<number | null>(null);
  const [history, setHistory] = useState<CPRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      if (!currentUser) return;
      try {
        const cpRef = collection(db, 'cpMeasurements');
        const q = query(
          cpRef,
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const records: CPRecord[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            seconds: data.seconds || data.score || 0,
            timestamp: data.timestamp.toDate(),
          };
        }).filter(r => r.seconds > 0);
        setHistory(records);
        if (records.length > 0) setLastCP(records[0].seconds);
      } catch (error) {
        console.error('Error loading CP history:', error);
      }
    };
    loadHistory();
  }, [currentUser]);

  const saveCP = async () => {
    if (!currentUser || !cpValue || isNaN(Number(cpValue))) {
      alert('Voer een geldig getal in');
      return;
    }
    const value = Number(cpValue);
    if (value < 1 || value > 300) {
      alert('CP waarde moet tussen 1 en 300 seconden zijn');
      return;
    }
    setLoading(true);
    try {
      const cpRef = collection(db, 'cpMeasurements');
      await addDoc(cpRef, {
        userId: currentUser.uid,
        seconds: value,
        timestamp: new Date(),
      });

      setLastCP(value);
      setHistory(prev => [{ seconds: value, timestamp: new Date() }, ...prev.slice(0, 4)]);
      setCpValue('');

      // Auto-complete today's goal
      const today = new Date().toISOString().split('T')[0];
      const goalsRef = doc(db, 'users', currentUser.uid, 'goals', today);
      await setDoc(goalsRef, { cp: true }, { merge: true });

      alert('✅ CP meting opgeslagen!');
    } catch (error) {
      console.error('Error saving CP:', error);
      alert('❌ Fout bij opslaan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Uitleg */}
      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6 border border-blue-200 dark:border-blue-700 transition-colors">
        <h3 className="font-bold text-lg mb-3 text-gray-800 dark:text-gray-100 transition-colors">
          <i className="fas fa-stopwatch mr-2 text-blue-600 dark:text-blue-400"></i>
          Control Pause Loggen
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4 transition-colors">
          Log hier je Control Pause meting nadat je hem buiten de app gemeten hebt, of ga naar
          <strong className="ml-1">Oefeningen</strong> voor de begeleide Buteyko timer.
        </p>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 transition-colors">
          <div>• &lt; 10s — Zeer laag</div>
          <div>• 10–19s — Laag</div>
          <div>• 20–29s — Gemiddeld</div>
          <div>• 30–39s — Goed</div>
          <div>• ≥ 40s — Uitstekend</div>
        </div>
      </div>

      {/* Laatste meting */}
      {lastCP !== null && (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-6 text-center border border-blue-200 dark:border-blue-700 transition-colors">
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 transition-colors">Laatste meting</div>
          <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 transition-colors">
            {lastCP}<span className="text-2xl text-gray-500 dark:text-gray-400 ml-1 transition-colors">s</span>
          </div>
          <div className={`text-sm font-semibold mt-2 transition-colors ${getCPLevel(lastCP).color}`}>
            {getCPLevel(lastCP).label}
          </div>
        </div>
      )}

      {/* Invoer */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md transition-colors">
        <h4 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-100 transition-colors">
          Nieuwe CP Meting Invoeren
        </h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 transition-colors">
              Control Pause (seconden) *
            </label>
            <input
              type="number"
              value={cpValue}
              onChange={e => setCpValue(e.target.value)}
              placeholder="bijv. 25"
              min="1"
              max="300"
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              onKeyDown={e => e.key === 'Enter' && saveCP()}
            />
            {cpValue && !isNaN(Number(cpValue)) && Number(cpValue) > 0 && (
              <p className={`text-sm font-semibold mt-2 transition-colors ${getCPLevel(Number(cpValue)).color}`}>
                → {getCPLevel(Number(cpValue)).label}
              </p>
            )}
          </div>
          <button
            onClick={saveCP}
            disabled={loading || !cpValue}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin mr-2"></i>Opslaan...</>
            ) : (
              <><i className="fas fa-save mr-2"></i>Opslaan</>
            )}
          </button>
        </div>
      </div>

      {/* Geschiedenis */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md transition-colors">
          <h4 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-100 transition-colors">
            Recente metingen
          </h4>
          <div className="space-y-3">
            {history.map((record, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg transition-colors">
                <div className="text-sm text-gray-600 dark:text-gray-300 transition-colors">
                  {record.timestamp.toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors">
                    {record.seconds}s
                  </div>
                  <div className={`text-xs font-semibold transition-colors ${getCPLevel(record.seconds).color}`}>
                    {getCPLevel(record.seconds).label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link naar begeleide oefening */}
      <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 text-center border border-gray-200 dark:border-slate-600 transition-colors">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 transition-colors">
          Wil je de begeleide Buteyko timer gebruiken?
        </p>
        <a
          href="/exercises?tab=buteyko"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <i className="fas fa-stopwatch mr-2"></i>
          Ga naar Buteyko Oefening
        </a>
      </div>
    </div>
  );
}
