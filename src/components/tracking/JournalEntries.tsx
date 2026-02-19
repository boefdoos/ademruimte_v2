'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, getDocs, addDoc, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

interface JournalEntry {
  id?: string;
  techniekGebruikt: string;
  triggers: string[];
  intensiteit: number | null;
  sensaties: string[];
  notities: string;
  timestamp: Date;
  userId: string;
  cpScore?: number;
}

const TECHNIQUES = [
  'Resonant Breathing',
  'Control Pause',
  '4-7-8 Ademhaling',
  'Box Breathing',
  'Buikademhaling',
  'Andere'
];

const COMMON_TRIGGERS = [
  'Stress',
  'Angst',
  'Piekergedachten',
  'Hyperwaakzaamheid',
  'Lichamelijke inspanning',
  'Sociale situaties',
  'Werk/Studie',
  'Relaties',
  'Financiële zorgen',
  'Vermoeidheid',
  'Slaaptekort',
  'Hitte/Kou',
  'Drukke omgeving',
  'Allergie',
  'Voeding/Drinken',
  'Emoties',
  'Conflict',
  'Verandering/Onzekerheid',
  'Geen duidelijke trigger'
];

const COMMON_SENSATIONS = [
  'Kortademigheid',
  'Hyperventilatie',
  'Snelle ademhaling',
  'Beklemmend gevoel',
  'Spanning in borst',
  'Hartkloppingen',
  'Tintelingen',
  'Duizeligheid',
  'Licht in hoofd',
  'Onrust',
  'Paniek',
  'Gespannenheid',
  'Prikkelbaarheid',
  'Vermoeidheid',
  'Concentratieproblemen',
  'Neerslachtigheid',
  'Gevoelloosheid'
];

interface JournalEntriesProps {
  limit?: number;
}

export function JournalEntries({ limit }: JournalEntriesProps = {}) {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'week' | 'month'>('week');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [selectedSensations, setSelectedSensations] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [cpScore, setCpScore] = useState('');

  // Custom tags state
  const [customTriggers, setCustomTriggers] = useState<string[]>([]);
  const [customSensations, setCustomSensations] = useState<string[]>([]);
  const [showAddTrigger, setShowAddTrigger] = useState(false);
  const [showAddSensation, setShowAddSensation] = useState(false);
  const [newTrigger, setNewTrigger] = useState('');
  const [newSensation, setNewSensation] = useState('');

  useEffect(() => {
    loadEntries();
    loadCustomTags();
  }, [currentUser]);

  const loadEntries = async () => {
    if (!currentUser) return;

    try {
      const entriesRef = collection(db, 'dagboekEntries');
      const q = query(
        entriesRef,
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          timestamp: docData.timestamp.toDate(),
          // Handle V1 backwards compatibility: convert trigger (string) to triggers (array)
          triggers: Array.isArray(docData.triggers)
            ? docData.triggers
            : (docData.trigger ? [docData.trigger] : []),
          sensaties: Array.isArray(docData.sensaties) ? docData.sensaties : [],
        };
      }) as JournalEntry[];

      setEntries(data);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomTags = async () => {
    if (!currentUser) return;

    try {
      const customTagsRef = doc(db, 'users', currentUser.uid, 'customTags', 'journal');
      const snapshot = await getDoc(customTagsRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        setCustomTriggers(data.triggers || []);
        setCustomSensations(data.sensaties || []);
      }
    } catch (error) {
      console.error('Error loading custom tags:', error);
    }
  };

  const addCustomTrigger = async () => {
    if (!currentUser || !newTrigger.trim()) return;

    const trimmedTrigger = newTrigger.trim();

    // Check if it already exists
    if (COMMON_TRIGGERS.includes(trimmedTrigger) || customTriggers.includes(trimmedTrigger)) {
      alert('Deze trigger bestaat al');
      return;
    }

    try {
      const updatedTriggers = [...customTriggers, trimmedTrigger];
      const customTagsRef = doc(db, 'users', currentUser.uid, 'customTags', 'journal');

      await setDoc(customTagsRef, {
        triggers: updatedTriggers,
        sensaties: customSensations,
      }, { merge: true });

      setCustomTriggers(updatedTriggers);
      setNewTrigger('');
      setShowAddTrigger(false);
    } catch (error) {
      console.error('Error adding custom trigger:', error);
      alert('Fout bij toevoegen trigger');
    }
  };

  const addCustomSensation = async () => {
    if (!currentUser || !newSensation.trim()) return;

    const trimmedSensation = newSensation.trim();

    // Check if it already exists
    if (COMMON_SENSATIONS.includes(trimmedSensation) || customSensations.includes(trimmedSensation)) {
      alert('Deze sensatie bestaat al');
      return;
    }

    try {
      const updatedSensations = [...customSensations, trimmedSensation];
      const customTagsRef = doc(db, 'users', currentUser.uid, 'customTags', 'journal');

      await setDoc(customTagsRef, {
        triggers: customTriggers,
        sensaties: updatedSensations,
      }, { merge: true });

      setCustomSensations(updatedSensations);
      setNewSensation('');
      setShowAddSensation(false);
    } catch (error) {
      console.error('Error adding custom sensation:', error);
      alert('Fout bij toevoegen sensatie');
    }
  };

  const saveEntry = async () => {
    if (!currentUser) {
      return;
    }

    try {
      const entry: Omit<JournalEntry, 'id'> = {
        techniekGebruikt: '', // Manual entries don't specify technique
        triggers: selectedTriggers,
        intensiteit: intensity,
        sensaties: selectedSensations,
        notities: notes,
        timestamp: new Date(),
        userId: currentUser.uid,
      };

      if (cpScore && !isNaN(parseInt(cpScore))) {
        entry.cpScore = parseInt(cpScore);
      }

      await addDoc(collection(db, 'dagboekEntries'), entry);

      // Auto-complete journal goal
      const today = new Date().toISOString().split('T')[0];
      const goalsRef = doc(db, 'users', currentUser.uid, 'goals', today);
      await setDoc(goalsRef, { journal: true }, { merge: true });

      // Reset form
      setSelectedTriggers([]);
      setIntensity(null);
      setSelectedSensations([]);
      setNotes('');
      setCpScore('');
      setShowForm(false);

      // Reload entries
      await loadEntries();
    } catch (error) {
      console.error('Error saving journal entry:', error);
      alert('Fout bij opslaan');
    }
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers(prev =>
      prev.includes(trigger)
        ? prev.filter(t => t !== trigger)
        : [...prev, trigger]
    );
  };

  const toggleSensation = (sensation: string) => {
    setSelectedSensations(prev =>
      prev.includes(sensation)
        ? prev.filter(s => s !== sensation)
        : [...prev, sensation]
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit wilt verwijderen?')) return;

    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'dagboekEntries', id));
      setEntries(entries.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      alert('Er ging iets mis bij het verwijderen.');
    } finally {
      setDeletingId(null);
    }
  };

  const getFilteredEntries = () => {
    let filtered = entries;

    if (filter !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      if (filter === 'week') {
        cutoff.setDate(now.getDate() - 7);
      } else if (filter === 'month') {
        cutoff.setDate(now.getDate() - 30);
      }

      filtered = entries.filter(e => e.timestamp >= cutoff);
    }

    // Apply limit if specified
    if (limit && limit > 0) {
      return filtered.slice(0, limit);
    }

    return filtered;
  };

  const filteredEntries = getFilteredEntries();
  const hasMore = limit && entries.length > limit;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
        <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Entry Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          <i className={`fas fa-${showForm ? 'times' : 'plus'} mr-2`}></i>
          {showForm ? 'Annuleren' : 'Nieuwe Entry'}
        </button>
      </div>

      {/* Add Entry Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md dark:shadow-lg dark:shadow-black/30 transition-colors">
          <h4 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-100">Nieuwe Symptomen Entry</h4>

          {/* Triggers */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors">
              Triggers (wat veroorzaakte ademhalingsproblemen?)
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_TRIGGERS.map(trigger => (
                <button
                  key={trigger}
                  onClick={() => toggleTrigger(trigger)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTriggers.includes(trigger)
                      ? 'bg-blue-600 text-white dark:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {trigger}
                </button>
              ))}
              {customTriggers.map(trigger => (
                <button
                  key={trigger}
                  onClick={() => toggleTrigger(trigger)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTriggers.includes(trigger)
                      ? 'bg-blue-600 text-white dark:bg-blue-700'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 dark:border-blue-800'
                  }`}
                >
                  {trigger}
                </button>
              ))}
              {!showAddTrigger ? (
                <button
                  onClick={() => setShowAddTrigger(true)}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-white text-blue-600 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition-colors dark:bg-slate-700 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-slate-600 dark:hover:border-blue-700"
                >
                  <i className="fas fa-plus mr-1"></i>
                  Eigen trigger
                </button>
              ) : (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={newTrigger}
                    onChange={(e) => setNewTrigger(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomTrigger()}
                    placeholder="Nieuwe trigger..."
                    className="px-3 py-1 text-sm border border-blue-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-slate-700 dark:border-blue-800 dark:text-gray-100 dark:placeholder-gray-400"
                    autoFocus
                  />
                  <button
                    onClick={addCustomTrigger}
                    className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    <i className="fas fa-check"></i>
                  </button>
                  <button
                    onClick={() => {
                      setShowAddTrigger(false);
                      setNewTrigger('');
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-300 transition-colors dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Intensity Slider with Gradient */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors">
              Intensiteit
            </label>

            {/* Visual intensity indicator */}
            <div className="flex items-center gap-4 mb-3">
              <div
                className="flex-1 h-3 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 to-red-500"
                style={{ opacity: 0.3 }}
              ></div>
              <div
                className={`px-4 py-2 rounded-lg font-bold text-lg min-w-[80px] text-center transition-all ${
                  (intensity || 5) <= 3 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  (intensity || 5) <= 5 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  (intensity || 5) <= 7 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {intensity || 5}
              </div>
            </div>

            {/* Custom styled range input */}
            <div className="relative">
              <style jsx>{`
                .intensity-slider {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 100%;
                  height: 12px;
                  border-radius: 6px;
                  background: linear-gradient(to right,
                    #4ade80 0%,
                    #a3e635 20%,
                    #facc15 40%,
                    #fb923c 60%,
                    #f87171 80%,
                    #ef4444 100%
                  );
                  outline: none;
                  cursor: pointer;
                  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
                }

                .intensity-slider::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  background: white;
                  cursor: pointer;
                  border: 3px solid ${
                    (intensity || 5) <= 3 ? '#22c55e' :
                    (intensity || 5) <= 5 ? '#eab308' :
                    (intensity || 5) <= 7 ? '#f97316' :
                    '#ef4444'
                  };
                  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                  transition: all 0.2s ease;
                }

                .intensity-slider::-webkit-slider-thumb:hover {
                  transform: scale(1.15);
                  box-shadow: 0 3px 12px rgba(0,0,0,0.3);
                }

                .intensity-slider::-webkit-slider-thumb:active {
                  transform: scale(1.05);
                }

                .intensity-slider::-moz-range-thumb {
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  background: white;
                  cursor: pointer;
                  border: 3px solid ${
                    (intensity || 5) <= 3 ? '#22c55e' :
                    (intensity || 5) <= 5 ? '#eab308' :
                    (intensity || 5) <= 7 ? '#f97316' :
                    '#ef4444'
                  };
                  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                  transition: all 0.2s ease;
                }

                .intensity-slider::-moz-range-thumb:hover {
                  transform: scale(1.15);
                  box-shadow: 0 3px 12px rgba(0,0,0,0.3);
                }
              `}</style>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity || 5}
                onChange={(e) => setIntensity(parseInt(e.target.value))}
                className="intensity-slider"
              />
            </div>

            {/* Labels */}
            <div className="flex justify-between text-xs font-medium mt-2 transition-colors">
              <span className="text-green-600 dark:text-green-400 flex items-center gap-1 transition-colors">
                <i className="fas fa-smile"></i>
                Mild
              </span>
              <span className="text-gray-400 dark:text-gray-500 transition-colors">Matig</span>
              <span className="text-red-600 dark:text-red-400 flex items-center gap-1 transition-colors">
                Ernstig
                <i className="fas fa-frown"></i>
              </span>
            </div>
          </div>

          {/* Sensations */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors">
              Sensaties
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SENSATIONS.map(sensation => (
                <button
                  key={sensation}
                  onClick={() => toggleSensation(sensation)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedSensations.includes(sensation)
                      ? 'bg-purple-600 text-white dark:bg-purple-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {sensation}
                </button>
              ))}
              {customSensations.map(sensation => (
                <button
                  key={sensation}
                  onClick={() => toggleSensation(sensation)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedSensations.includes(sensation)
                      ? 'bg-purple-600 text-white dark:bg-purple-700'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 dark:border-purple-800'
                  }`}
                >
                  {sensation}
                </button>
              ))}
              {!showAddSensation ? (
                <button
                  onClick={() => setShowAddSensation(true)}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-white text-purple-600 border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 transition-colors dark:bg-slate-700 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-slate-600 dark:hover:border-purple-700"
                >
                  <i className="fas fa-plus mr-1"></i>
                  Eigen sensatie
                </button>
              ) : (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={newSensation}
                    onChange={(e) => setNewSensation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomSensation()}
                    placeholder="Nieuwe sensatie..."
                    className="px-3 py-1 text-sm border border-purple-300 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors bg-white dark:bg-slate-700 dark:border-purple-800 dark:text-gray-100 dark:placeholder-gray-400"
                    autoFocus
                  />
                  <button
                    onClick={addCustomSensation}
                    className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors dark:bg-purple-700 dark:hover:bg-purple-600"
                  >
                    <i className="fas fa-check"></i>
                  </button>
                  <button
                    onClick={() => {
                      setShowAddSensation(false);
                      setNewSensation('');
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-300 transition-colors dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CP Score (optional) */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors">
              Control Pause Score (optioneel)
            </label>
            <input
              type="number"
              value={cpScore}
              onChange={(e) => setCpScore(e.target.value)}
              placeholder="bijv. 25"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 dark:placeholder-gray-400"
            />
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors">
              Notities
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Extra details over deze sessie..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 dark:placeholder-gray-400"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={saveEntry}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors dark:bg-green-700 dark:hover:bg-green-600"
          >
            <i className="fas fa-save mr-2"></i>
            Opslaan
          </button>
        </div>
      )}

      {/* Filter - Only show if not limited (compact mode) */}
      {!limit && (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setFilter('week')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'week'
                ? 'bg-blue-600 text-white dark:bg-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'month'
                ? 'bg-blue-600 text-white dark:bg-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            Maand
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white dark:bg-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            Alles
          </button>
        </div>
      )}

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl transition-colors dark:shadow-lg dark:shadow-black/30">
          <div className="text-6xl mb-4">📖</div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors">
            Nog geen symptomen gelogd
          </h3>
          <p className="text-gray-600 dark:text-gray-400 transition-colors">
            Begin met je eerste entry om je vooruitgang te volgen
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className={`bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all dark:hover:shadow-lg dark:hover:shadow-black/30 dark:shadow-black/20 ${limit ? 'p-4' : 'p-6'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className={`font-bold text-gray-800 dark:text-gray-100 transition-colors ${limit ? 'text-base' : 'text-lg'}`}>
                      {entry.techniekGebruikt || 'Symptomen Entry'}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                      {entry.timestamp.toLocaleDateString('nl-NL', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.intensiteit && (
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400 transition-colors">
                          {entry.intensiteit}/10
                        </div>
                      </div>
                    )}
                    {!limit && (
                      <button
                        onClick={() => handleDelete(entry.id!)}
                        disabled={deletingId === entry.id}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        title="Verwijder entry"
                      >
                        {deletingId === entry.id ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fas fa-trash"></i>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {entry.triggers && entry.triggers.length > 0 && (
                  <div className="mb-2">
                    <div className="flex flex-wrap gap-1">
                      {entry.triggers.map((trigger, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs dark:bg-blue-900/30 dark:text-blue-300 transition-colors"
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {entry.sensaties && entry.sensaties.length > 0 && (
                  <div className="mb-2">
                    <div className="flex flex-wrap gap-1">
                      {entry.sensaties.map((sensation, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs dark:bg-purple-900/30 dark:text-purple-300 transition-colors"
                        >
                          {sensation}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {entry.cpScore && (
                  <div className="mb-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors">CP: </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 font-medium transition-colors">{entry.cpScore}s</span>
                  </div>
                )}

                {entry.notities && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg transition-colors">
                    <p className={`text-sm text-gray-700 dark:text-gray-300 transition-colors ${limit ? 'line-clamp-2' : ''}`}>
                      {entry.notities}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Show more button if limited */}
          {hasMore && (
            <div className="text-center pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 transition-colors">
                Toont {limit} van {entries.length} entries
              </p>
              <a
                href="/journal"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                <i className="fas fa-book mr-2"></i>
                Bekijk alle entries
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
