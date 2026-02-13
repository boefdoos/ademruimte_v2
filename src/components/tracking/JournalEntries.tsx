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
    if (!confirm('Weet je zeker dat je deze dagboek entry wilt verwijderen?')) return;

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
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Entry Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          <i className={`fas fa-${showForm ? 'times' : 'plus'} mr-2`}></i>
          {showForm ? 'Annuleren' : 'Nieuwe Entry'}
        </button>
      </div>

      {/* Add Entry Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h4 className="font-bold text-lg mb-4 text-gray-800">Nieuwe Dagboek Entry</h4>

          {/* Triggers */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Triggers (wat veroorzaakte ademhalingsproblemen?)
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_TRIGGERS.map(trigger => (
                <button
                  key={trigger}
                  onClick={() => toggleTrigger(trigger)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTriggers.includes(trigger)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  {trigger}
                </button>
              ))}
              {!showAddTrigger ? (
                <button
                  onClick={() => setShowAddTrigger(true)}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-white text-blue-600 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
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
                    className="px-3 py-1 text-sm border border-blue-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={addCustomTrigger}
                    className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700"
                  >
                    <i className="fas fa-check"></i>
                  </button>
                  <button
                    onClick={() => {
                      setShowAddTrigger(false);
                      setNewTrigger('');
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-300"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Intensity */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Intensiteit (1-10)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={intensity || 5}
              onChange={(e) => setIntensity(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>1 (Mild)</span>
              <span className="font-bold text-blue-600">{intensity || 5}</span>
              <span>10 (Ernstig)</span>
            </div>
          </div>

          {/* Sensations */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sensaties / Symptomen
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SENSATIONS.map(sensation => (
                <button
                  key={sensation}
                  onClick={() => toggleSensation(sensation)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedSensations.includes(sensation)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  {sensation}
                </button>
              ))}
              {!showAddSensation ? (
                <button
                  onClick={() => setShowAddSensation(true)}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-white text-purple-600 border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 transition-colors"
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
                    className="px-3 py-1 text-sm border border-purple-300 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={addCustomSensation}
                    className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700"
                  >
                    <i className="fas fa-check"></i>
                  </button>
                  <button
                    onClick={() => {
                      setShowAddSensation(false);
                      setNewSensation('');
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-300"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CP Score (optional) */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Control Pause Score (optioneel)
            </label>
            <input
              type="number"
              value={cpScore}
              onChange={(e) => setCpScore(e.target.value)}
              placeholder="bijv. 25"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notities
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Extra details over deze sessie..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={saveEntry}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
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
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Maand
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Alles
          </button>
        </div>
      )}

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <div className="text-6xl mb-4">📖</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Nog geen dagboek entries
          </h3>
          <p className="text-gray-600">
            Begin met je eerste entry om je vooruitgang te volgen
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow ${limit ? 'p-4' : 'p-6'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className={`font-bold text-gray-800 ${limit ? 'text-base' : 'text-lg'}`}>
                      {entry.techniekGebruikt || 'Dagboek Entry'}
                    </h4>
                    <p className="text-xs text-gray-500">
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
                        <div className="text-xl font-bold text-blue-600">
                          {entry.intensiteit}/10
                        </div>
                      </div>
                    )}
                    {!limit && (
                      <button
                        onClick={() => handleDelete(entry.id!)}
                        disabled={deletingId === entry.id}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
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
                          className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs"
                        >
                          {sensation}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {entry.cpScore && (
                  <div className="mb-2">
                    <span className="text-sm font-semibold text-gray-700">CP: </span>
                    <span className="text-sm text-gray-900 font-medium">{entry.cpScore}s</span>
                  </div>
                )}

                {entry.notities && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className={`text-sm text-gray-700 ${limit ? 'line-clamp-2' : ''}`}>
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
              <p className="text-sm text-gray-600 mb-2">
                Toont {limit} van {entries.length} entries
              </p>
              <a
                href="/journal"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
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
