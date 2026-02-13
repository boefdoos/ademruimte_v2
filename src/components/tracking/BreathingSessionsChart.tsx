'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, limit, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface Session {
  id: string;
  pattern: string;
  durationSeconds: number;
  cycles: number;
  timestamp: Date;
}

export function BreathingSessionsChart() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      if (!currentUser) return;

      try {
        // Read from V1 collection structure
        const sessionsRef = collection(db, 'resonant_sessions');
        const q = query(
          sessionsRef,
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(100)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            // Handle V1 backwards compatibility
            // V1: type = 'resonant_breathing', duration in minutes
            // V2: pattern = pattern name, durationSeconds in seconds
            pattern: docData.pattern || docData.type || 'Resonant Breathing',
            durationSeconds: docData.durationSeconds || (docData.duration ? docData.duration * 60 : 0),
            cycles: docData.cycles || 0,
            timestamp: docData.timestamp.toDate(),
          };
        });

        // Filter by time range
        const now = new Date();
        const filteredData = data.filter(session => {
          const daysDiff = (now.getTime() - session.timestamp.getTime()) / (1000 * 60 * 60 * 24);
          if (timeRange === 'week') return daysDiff <= 7;
          if (timeRange === 'month') return daysDiff <= 30;
          return true;
        }).reverse(); // Oldest first

        setSessions(filteredData);
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [currentUser, timeRange]);

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze ademsessie wilt verwijderen?')) return;

    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'resonant_sessions', id));
      setSessions(sessions.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting breathing session:', error);
      alert('Er ging iets mis bij het verwijderen.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🌊</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Nog geen ademsessies
        </h3>
        <p className="text-gray-600 mb-6">
          Start met Resonant Breathing om je sessies te volgen
        </p>
        <a
          href="/exercises"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          <i className="fas fa-wind mr-2"></i>
          Start Resonant Breathing
        </a>
      </div>
    );
  }

  const totalMinutes = Math.round(sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60);
  const totalCycles = sessions.reduce((sum, s) => sum + s.cycles, 0);
  const avgDuration = Math.round(totalMinutes / sessions.length);

  // Group by pattern
  const patternCounts = sessions.reduce((acc, session) => {
    acc[session.pattern] = (acc[session.pattern] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostUsedPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];

  const patternColors: Record<string, string> = {
    'Coherent Breathing': 'from-blue-400 to-blue-600',
    'Buteyko - Extended Breath Hold': 'from-orange-400 to-orange-600',
    'Extended Breath Hold': 'from-orange-400 to-orange-600', // Legacy
    'Box Breathing': 'from-green-400 to-green-600',
    'Relaxation': 'from-purple-400 to-purple-600',
    '4-7-8 Method': 'from-indigo-400 to-indigo-600',
    // V1 compatibility
    'resonant_breathing': 'from-blue-400 to-blue-600',
    'Resonant Breathing': 'from-blue-400 to-blue-600',
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setTimeRange('week')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            timeRange === 'week'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            timeRange === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Maand
        </button>
        <button
          onClick={() => setTimeRange('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            timeRange === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Alles
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl text-center">
          <div className="text-sm font-semibold text-gray-600 mb-1">Totaal Sessies</div>
          <div className="text-3xl font-bold text-blue-700">{sessions.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-xl text-center">
          <div className="text-sm font-semibold text-gray-600 mb-1">Totale Tijd</div>
          <div className="text-3xl font-bold text-green-700">{totalMinutes}m</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl text-center">
          <div className="text-sm font-semibold text-gray-600 mb-1">Totaal Cycli</div>
          <div className="text-3xl font-bold text-purple-700">{totalCycles}</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-xl text-center">
          <div className="text-sm font-semibold text-gray-600 mb-1">Gem. Sessie</div>
          <div className="text-3xl font-bold text-orange-700">{avgDuration}m</div>
        </div>
      </div>

      {/* Pattern Distribution */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-800">Patronen Verdeling</h3>
        <div className="space-y-3">
          {Object.entries(patternCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([pattern, count]) => {
              const percentage = Math.round((count / sessions.length) * 100);
              return (
                <div key={pattern}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-gray-700">{pattern}</span>
                    <span className="text-sm text-gray-600">
                      {count} {count === 1 ? 'sessie' : 'sessies'} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${patternColors[pattern] || 'from-gray-400 to-gray-600'} transition-all`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-800">Recente Sessies</h3>
        <div className="space-y-3">
          {sessions.slice().reverse().slice(0, 10).map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${patternColors[session.pattern] || 'from-gray-400 to-gray-600'} flex items-center justify-center text-white`}
                >
                  <i className="fas fa-wind"></i>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{session.pattern}</div>
                  <div className="text-sm text-gray-600">
                    {session.timestamp.toLocaleDateString('nl-NL', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-bold text-gray-800">{formatDuration(session.durationSeconds)}</div>
                  <div className="text-sm text-gray-600">{session.cycles} cycli</div>
                </div>
                <button
                  onClick={() => handleDelete(session.id)}
                  disabled={deletingId === session.id}
                  className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Verwijder sessie"
                >
                  {deletingId === session.id ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-trash"></i>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <h4 className="font-bold text-gray-800 mb-3">
          <i className="fas fa-lightbulb mr-2 text-yellow-500"></i>
          Inzichten
        </h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>
            🏆 Je favoriete patroon is <strong>{mostUsedPattern[0]}</strong> ({mostUsedPattern[1]}x gebruikt)
          </li>
          <li>
            ⏱️ Je hebt in totaal <strong>{totalMinutes} minuten</strong> geoefend
          </li>
          {totalMinutes >= 50 && (
            <li>🎯 Geweldig! Je hebt het doel van 50 minuten per week bereikt</li>
          )}
          {avgDuration >= 10 && (
            <li>✅ Perfect! Sessies van 10+ minuten zijn ideaal voor HRV training</li>
          )}
          {sessions.length >= 7 && (
            <li>🔥 Fantastische consistentie! 7+ sessies is uitstekend</li>
          )}
        </ul>
      </div>
    </div>
  );
}
