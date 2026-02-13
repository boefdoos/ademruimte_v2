'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, orderBy, limit, getDocs, doc, setDoc } from 'firebase/firestore';

export function ButeykoExercise() {
  const { currentUser } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [lastCP, setLastCP] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ seconds: number; timestamp: Date }>>([]);
  const [showInstructions, setShowInstructions] = useState(true);

  // Load last CP and history
  useEffect(() => {
    const loadHistory = async () => {
      if (!currentUser) return;

      try {
        // Read from V1 collection structure
        const cpRef = collection(db, 'cpMeasurements');
        const q = query(
          cpRef,
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const snapshot = await getDocs(q);

        const records = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            // Handle V1 backwards compatibility: V1 uses "score", V2 uses "seconds"
            seconds: data.seconds || data.score || 0,
            timestamp: data.timestamp.toDate(),
          };
        });

        setHistory(records);
        if (records.length > 0) {
          setLastCP(records[0].seconds);
        }
      } catch (error) {
        console.error('Error loading CP history:', error);
      }
    };

    loadHistory();
  }, [currentUser]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const startTimer = () => {
    setSeconds(0);
    setIsRunning(true);
    setShowInstructions(false);
  };

  const stopTimer = async () => {
    setIsRunning(false);

    // Save to Firebase
    if (currentUser && seconds > 0) {
      try {
        // Save to V1 collection structure
        const cpRef = collection(db, 'cpMeasurements');
        await addDoc(cpRef, {
          userId: currentUser.uid,
          seconds,
          timestamp: new Date(),
        });

        setLastCP(seconds);
        setHistory(prev => [{ seconds, timestamp: new Date() }, ...prev.slice(0, 4)]);

        // Auto-complete today's goal
        const today = new Date().toISOString().split('T')[0];
        const goalsRef = doc(db, 'users', currentUser.uid, 'goals', today);
        await setDoc(goalsRef, { cp: true }, { merge: true });
      } catch (error) {
        console.error('Error saving CP:', error);
      }
    }
  };

  const resetTimer = () => {
    setSeconds(0);
    setIsRunning(false);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const getCPLevel = (secs: number) => {
    if (secs < 10) return { text: 'Zeer laag', color: 'text-red-600', bg: 'bg-red-50' };
    if (secs < 20) return { text: 'Laag', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (secs < 30) return { text: 'Gemiddeld', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (secs < 40) return { text: 'Goed', color: 'text-green-600', bg: 'bg-green-50' };
    return { text: 'Uitstekend', color: 'text-blue-600', bg: 'bg-blue-50' };
  };

  return (
    <div>
      {/* Instructions */}
      {showInstructions && (
        <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-bold text-lg mb-3 text-blue-900">
            <i className="fas fa-info-circle mr-2"></i>
            Hoe meet je je Control Pause?
          </h3>
          <ol className="space-y-2 text-gray-700">
            <li>1. Zit rechtop en ontspan</li>
            <li>2. Adem normaal in en uit door je neus</li>
            <li>3. Na een normale uitademing, knijp je neus dicht</li>
            <li>4. Start de timer</li>
            <li>5. Stop wanneer je de <strong>eerste</strong> drang voelt om te ademen</li>
            <li>6. Dit is je Control Pause (niet maximale adem inhouden!)</li>
          </ol>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center mb-8">
        <div className={`text-8xl font-bold mb-4 ${isRunning ? 'text-blue-600' : 'text-gray-400'}`}>
          {formatTime(seconds)}
        </div>

        {/* Buttons */}
        <div className="flex gap-4 justify-center">
          {!isRunning ? (
            <button
              onClick={startTimer}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              <i className="fas fa-play mr-2"></i>
              Start Control Pause
            </button>
          ) : (
            <>
              <button
                onClick={stopTimer}
                className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
              >
                <i className="fas fa-stop mr-2"></i>
                Stop & Opslaan
              </button>
              <button
                onClick={resetTimer}
                className="px-8 py-4 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors shadow-lg"
              >
                <i className="fas fa-redo mr-2"></i>
                Reset
              </button>
            </>
          )}
        </div>

        {!showInstructions && !isRunning && (
          <button
            onClick={() => setShowInstructions(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 text-sm"
          >
            <i className="fas fa-question-circle mr-1"></i>
            Toon instructies
          </button>
        )}
      </div>

      {/* Last Result */}
      {lastCP !== null && !isRunning && (
        <div className="mb-6 p-6 rounded-lg bg-blue-50 border border-blue-200">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Laatste meting</div>
            <div className="text-4xl font-bold text-blue-600">
              {lastCP}s
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold text-lg mb-4 text-gray-800">
            Recente metingen / Recent Measurements
          </h3>
          <div className="space-y-2">
            {history.map((record, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
              >
                <div className="text-gray-600 text-sm">
                  {record.timestamp.toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-800">
                    {record.seconds}s
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
