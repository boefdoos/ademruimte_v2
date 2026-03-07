'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { JournalEntryModal } from './JournalEntryModal';

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

interface JournalEntriesProps {
  limit?: number;
}

export function JournalEntries({ limit }: JournalEntriesProps = {}) {
  const { currentUser } = useAuth();
  const { t, locale } = useI18n();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'week' | 'month'>('week');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
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

  const handleDelete = async (id: string) => {
    if (!confirm(t('journal_form.confirm_delete'))) return;

    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'dagboekEntries', id));
      setEntries(entries.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      alert(t('journal_form.delete_error'));
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
          onClick={() => setShowForm(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          <i className="fas fa-plus mr-2"></i>
          {t('journal_form.new_entry_button')}
        </button>
      </div>

      {/* Journal Entry Modal — shared component, identical to post-exercise modal */}
      <JournalEntryModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSaved={loadEntries}
      />

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
            {t('common.week')}
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'month'
                ? 'bg-blue-600 text-white dark:bg-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            {t('common.month')}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white dark:bg-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            {t('common.all')}
          </button>
        </div>
      )}

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl transition-colors dark:shadow-lg dark:shadow-black/30">
          <div className="text-6xl mb-4">📖</div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors">
            {t('journal_form.empty_title')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 transition-colors">
            {t('journal_form.empty_desc')}
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
                      {entry.techniekGebruikt || t('journal_form.symptoms_entry')}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                      {entry.timestamp.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', {
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
                        title={t('journal_form.delete_tooltip')}
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
                {t('journal_form.showing_entries', { shown: limit, total: entries.length })}
              </p>
              <a
                href="/journal"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                <i className="fas fa-book mr-2"></i>
                {t('journal_form.view_all')}
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
