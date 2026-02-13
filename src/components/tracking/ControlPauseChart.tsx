'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, limit, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface CPRecord {
  id: string;
  seconds: number;
  timestamp: Date;
}

export function ControlPauseChart() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState<CPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const loadRecords = async () => {
      if (!currentUser) return;

      try {
        const cpRef = collection(db, 'cpMeasurements');
        let q = query(
          cpRef,
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(100)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            // Handle V1 backwards compatibility: V1 uses "score", V2 uses "seconds"
            seconds: docData.seconds || docData.score || 0,
            timestamp: docData.timestamp.toDate(),
          };
        });

        // Filter by time range
        const now = new Date();
        const filteredData = data.filter(record => {
          const daysDiff = (now.getTime() - record.timestamp.getTime()) / (1000 * 60 * 60 * 24);
          if (timeRange === 'week') return daysDiff <= 7;
          if (timeRange === 'month') return daysDiff <= 30;
          return true;
        }).reverse(); // Oldest first for chart

        setRecords(filteredData);
      } catch (error) {
        console.error('Error loading CP records:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [currentUser, timeRange]);

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze CP meting wilt verwijderen?')) return;

    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'cpMeasurements', id));
      setRecords(records.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting CP measurement:', error);
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

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Nog geen Control Pause metingen
        </h3>
        <p className="text-gray-600 mb-6">
          Start met meten om je vooruitgang te volgen
        </p>
        <a
          href="/exercises"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          <i className="fas fa-stopwatch mr-2"></i>
          Start Control Pause
        </a>
      </div>
    );
  }

  const maxCP = Math.max(...records.map(r => r.seconds));
  const minCP = Math.min(...records.map(r => r.seconds));
  const avgCP = Math.round(records.reduce((sum, r) => sum + r.seconds, 0) / records.length);

  const getLevel = (seconds: number) => {
    if (seconds < 10) return 'Zeer laag';
    if (seconds < 20) return 'Laag';
    if (seconds < 30) return 'Gemiddeld';
    if (seconds < 40) return 'Goed';
    return 'Uitstekend';
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
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-xl text-center">
          <div className="text-sm font-semibold text-gray-600 mb-1">Hoogste</div>
          <div className="text-3xl font-bold text-green-700">{maxCP}s</div>
          <div className="text-xs text-gray-600 mt-1">{getLevel(maxCP)}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl text-center">
          <div className="text-sm font-semibold text-gray-600 mb-1">Gemiddeld</div>
          <div className="text-3xl font-bold text-blue-700">{avgCP}s</div>
          <div className="text-xs text-gray-600 mt-1">{getLevel(avgCP)}</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-xl text-center">
          <div className="text-sm font-semibold text-gray-600 mb-1">Laagste</div>
          <div className="text-3xl font-bold text-orange-700">{minCP}s</div>
          <div className="text-xs text-gray-600 mt-1">{getLevel(minCP)}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="font-bold text-lg mb-6 text-gray-800">Trend Control Pause</h3>

        {/* Chart Container */}
        <div className="relative h-80">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500 pr-2">
            <span>60s</span>
            <span>50s</span>
            <span className="font-semibold text-green-600">40s</span>
            <span className="font-semibold text-yellow-600">30s</span>
            <span className="font-semibold text-orange-600">20s</span>
            <span className="font-semibold text-red-600">10s</span>
            <span>0s</span>
          </div>

          {/* Chart area */}
          <div className="absolute left-14 right-0 top-0 bottom-8 border-l-2 border-b-2 border-gray-300">
            {/* Reference lines */}
            <div className="absolute left-0 right-0 border-t-2 border-dashed border-green-200" style={{ bottom: '66.67%' }}></div>
            <div className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-200" style={{ bottom: '50%' }}></div>
            <div className="absolute left-0 right-0 border-t-2 border-dashed border-orange-200" style={{ bottom: '33.33%' }}></div>
            <div className="absolute left-0 right-0 border-t-2 border-dashed border-red-200" style={{ bottom: '16.67%' }}></div>

            {/* Data line */}
            <svg className="absolute inset-0 w-full h-full">
              {/* Line connecting points */}
              <polyline
                points={records
                  .map((r, i) => {
                    const x = (i / Math.max(1, records.length - 1)) * 100;
                    const y = 100 - (r.seconds / 60) * 100;
                    return `${x}%,${y}%`;
                  })
                  .join(' ')}
                fill="none"
                stroke="url(#cpGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Gradient definition */}
              <defs>
                <linearGradient id="cpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>

              {/* Data points */}
              {records.map((record, i) => {
                const x = (i / Math.max(1, records.length - 1)) * 100;
                const y = 100 - (record.seconds / 60) * 100;

                return (
                  <g key={record.id}>
                    <circle
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="5"
                      fill="#10b981"
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer hover:r-7 transition-all"
                    />
                    <title>
                      {record.seconds}s - {record.timestamp.toLocaleDateString('nl-NL')}
                    </title>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* X-axis labels */}
          <div className="absolute left-14 right-0 bottom-0 flex justify-between text-xs text-gray-500">
            <span>{records[0]?.timestamp.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
            <span>
              {records[Math.floor(records.length / 2)]?.timestamp.toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
            <span>
              {records[records.length - 1]?.timestamp.toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
        <h4 className="font-bold text-gray-800 mb-3">
          <i className="fas fa-lightbulb mr-2 text-yellow-500"></i>
          Inzichten
        </h4>
        <ul className="space-y-2 text-sm text-gray-700">
          {maxCP >= 40 && (
            <li>✅ Uitstekend! Je hebt een CP van {maxCP}s bereikt</li>
          )}
          {avgCP >= 30 && avgCP < 40 && (
            <li>👍 Goed bezig! Gemiddelde CP van {avgCP}s is gezond</li>
          )}
          {avgCP < 20 && (
            <li>💪 Blijf oefenen! Elke verbetering telt</li>
          )}
          <li>
            📈 {records.length} metingen in deze periode
          </li>
          {records.length >= 2 && (
            <li>
              {records[records.length - 1].seconds > records[0].seconds
                ? '⬆️ Positieve trend! Je CP is verbeterd'
                : '⬇️ Tijdelijke dip - normaal bij stress of slaaptekort'}
            </li>
          )}
        </ul>
      </div>

      {/* Records List with Delete */}
      <div className="bg-white rounded-xl p-6">
        <h4 className="font-bold text-gray-800 mb-4 flex items-center">
          <i className="fas fa-list mr-2 text-blue-600"></i>
          Alle metingen
        </h4>
        <div className="space-y-2">
          {records.slice().reverse().map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-blue-600">{record.seconds}s</div>
                <div>
                  <div className="text-sm font-semibold text-gray-700">{getLevel(record.seconds)}</div>
                  <div className="text-xs text-gray-500">
                    {record.timestamp.toLocaleDateString('nl-NL', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(record.id)}
                disabled={deletingId === record.id}
                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Verwijder meting"
              >
                {deletingId === record.id ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-trash"></i>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
