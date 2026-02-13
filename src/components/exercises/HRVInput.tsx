'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, orderBy, limit, getDocs, doc, setDoc } from 'firebase/firestore';

export function HRVInput() {
  const { currentUser } = useAuth();
  const [hrvValue, setHrvValue] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [lastHRV, setLastHRV] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ value: number; heartRate?: number; timestamp: Date }>>([]);
  const [loading, setLoading] = useState(false);

  // Load HRV history
  useEffect(() => {
    const loadHistory = async () => {
      if (!currentUser) return;

      try {
        const hrvRef = collection(db, 'hrv_measurements');
        const q = query(
          hrvRef,
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const snapshot = await getDocs(q);

        const records = snapshot.docs.map(doc => {
          const data = doc.data();
          // Handle V1 backwards compatibility - try different field names
          const value = data.value || data.rmssd || data.hrv || data.measurement || 0;

          return {
            value: typeof value === 'number' ? value : 0,
            heartRate: data.heartRate,
            timestamp: data.timestamp.toDate(),
          };
        }).filter(record => record.value > 0); // Filter out invalid measurements

        setHistory(records);
        if (records.length > 0) {
          setLastHRV(records[0].value);
        }
      } catch (error) {
        console.error('Error loading HRV history:', error);
      }
    };

    loadHistory();
  }, [currentUser]);

  const saveHRV = async () => {
    if (!currentUser || !hrvValue || isNaN(Number(hrvValue))) {
      alert('Voer een geldig HRV getal in');
      return;
    }

    const value = Number(hrvValue);
    if (value < 10 || value > 200) {
      alert('HRV waarde moet tussen 10 en 200 zijn');
      return;
    }

    // Validate heart rate if provided
    const hr = heartRate ? Number(heartRate) : undefined;
    if (heartRate && (isNaN(hr!) || hr! < 30 || hr! > 220)) {
      alert('Hartslag moet tussen 30 en 220 bpm zijn');
      return;
    }

    setLoading(true);

    try {
      const hrvRef = collection(db, 'hrv_measurements');
      const docData: any = {
        userId: currentUser.uid,
        value: value,
        timestamp: new Date(),
      };

      // Only add heart rate if provided
      if (hr) {
        docData.heartRate = hr;
      }

      await addDoc(hrvRef, docData);

      setLastHRV(value);
      setHistory(prev => [{ value, heartRate: hr, timestamp: new Date() }, ...prev.slice(0, 4)]);
      setHrvValue('');
      setHeartRate('');

      // Auto-complete today's goal
      const today = new Date().toISOString().split('T')[0];
      const goalsRef = doc(db, 'users', currentUser.uid, 'goals', today);
      await setDoc(goalsRef, { hrv: true }, { merge: true });

      alert('✅ HRV opgeslagen!');
    } catch (error) {
      console.error('Error saving HRV:', error);
      alert('❌ Fout bij opslaan');
    } finally {
      setLoading(false);
    }
  };

  const getHRVLevel = (value: number) => {
    if (value < 30) return { label: 'Zeer laag', color: 'text-red-600' };
    if (value < 50) return { label: 'Laag', color: 'text-orange-600' };
    if (value < 70) return { label: 'Gemiddeld', color: 'text-yellow-600' };
    if (value < 90) return { label: 'Goed', color: 'text-green-600' };
    return { label: 'Uitstekend', color: 'text-blue-600' };
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-bold text-lg mb-3 text-gray-800">
          <i className="fas fa-heart-pulse mr-2 text-blue-600"></i>
          HRV Meting / HRV Measurement
        </h3>
        <p className="text-gray-700 mb-4">
          Heart Rate Variability (HRV) meet je variatie tussen hartslagen. Een hogere HRV duidt op een beter
          functionerend autonoom zenuwstelsel en betere stressbestendigheid.
        </p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Meet HRV met een smartwatch, hartslagmeter of app</li>
          <li>• Meet bij voorkeur 's ochtends na het wakker worden</li>
          <li>• Normale waarden liggen tussen 30-100 ms</li>
        </ul>
      </div>

      {/* Last Measurement */}
      {lastHRV && (
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center border border-purple-200">
          <div className="text-sm font-semibold text-gray-600 mb-2">Laatste meting / Last</div>
          <div className="text-5xl font-bold text-purple-600">
            {lastHRV} <span className="text-2xl text-gray-500">ms</span>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h4 className="font-bold text-lg mb-4 text-gray-800">Nieuwe HRV Meting</h4>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                HRV Waarde (ms) *
              </label>
              <input
                type="number"
                value={hrvValue}
                onChange={(e) => setHrvValue(e.target.value)}
                placeholder="bijv. 65"
                min="10"
                max="200"
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Hartslag (bpm) <span className="text-gray-400 font-normal">optioneel</span>
              </label>
              <input
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="bijv. 72"
                min="30"
                max="220"
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={saveHRV}
            disabled={loading || !hrvValue}
            className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Opslaan...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                Opslaan
              </>
            )}
          </button>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h4 className="font-bold text-lg mb-4 text-gray-800">
            Recente metingen / Recent Measurements
          </h4>
          <div className="space-y-3">
            {history.map((record, index) => {
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">
                      {record.timestamp.toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {record.heartRate && (
                      <div className="text-xs text-gray-500 mt-1">
                        <i className="fas fa-heart text-red-500 mr-1"></i>
                        {record.heartRate} bpm
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">{record.value} ms</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
