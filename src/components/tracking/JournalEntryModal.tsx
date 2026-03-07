'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';

const COMMON_TRIGGERS_NL = [
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

const COMMON_TRIGGERS_EN = [
  'Stress',
  'Anxiety',
  'Worrying thoughts',
  'Hypervigilance',
  'Physical exertion',
  'Social situations',
  'Work/Study',
  'Relationships',
  'Financial worries',
  'Fatigue',
  'Sleep deprivation',
  'Heat/Cold',
  'Busy environment',
  'Allergy',
  'Food/Drink',
  'Emotions',
  'Conflict',
  'Change/Uncertainty',
  'No clear trigger'
];

const COMMON_SENSATIONS_NL = [
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

const COMMON_SENSATIONS_EN = [
  'Shortness of breath',
  'Hyperventilation',
  'Rapid breathing',
  'Tightness in chest',
  'Chest tension',
  'Heart palpitations',
  'Tingling',
  'Dizziness',
  'Light-headedness',
  'Restlessness',
  'Panic',
  'Tension',
  'Irritability',
  'Fatigue',
  'Difficulty concentrating',
  'Low mood',
  'Numbness'
];

interface SessionInfo {
  cycles: number;
  durationFormatted: string;
}

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialNotes?: string;
  initialTechnique?: string;
  sessionInfo?: SessionInfo;
}

export function JournalEntryModal({
  isOpen,
  onClose,
  onSaved,
  initialNotes = '',
  initialTechnique = '',
  sessionInfo,
}: JournalEntryModalProps) {
  const { currentUser } = useAuth();
  const { t, locale } = useI18n();
  const [isMounted, setIsMounted] = useState(false);

  const COMMON_TRIGGERS = locale === 'en' ? COMMON_TRIGGERS_EN : COMMON_TRIGGERS_NL;
  const COMMON_SENSATIONS = locale === 'en' ? COMMON_SENSATIONS_EN : COMMON_SENSATIONS_NL;

  // Form state
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [selectedSensations, setSelectedSensations] = useState<string[]>([]);
  const [notes, setNotes] = useState(initialNotes);
  const [cpScore, setCpScore] = useState('');

  // Custom tags state
  const [customTriggers, setCustomTriggers] = useState<string[]>([]);
  const [customSensations, setCustomSensations] = useState<string[]>([]);
  const [showAddTrigger, setShowAddTrigger] = useState(false);
  const [showAddSensation, setShowAddSensation] = useState(false);
  const [newTrigger, setNewTrigger] = useState('');
  const [newSensation, setNewSensation] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset form and load custom tags each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTriggers([]);
      setIntensity(null);
      setSelectedSensations([]);
      setNotes(initialNotes);
      setCpScore('');
      setShowAddTrigger(false);
      setShowAddSensation(false);
      setNewTrigger('');
      setNewSensation('');

      if (currentUser) {
        const load = async () => {
          try {
            const ref = doc(db, 'users', currentUser.uid, 'customTags', 'journal');
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const data = snap.data();
              setCustomTriggers(data.triggers || []);
              setCustomSensations(data.sensaties || []);
            }
          } catch (e) {
            console.error('Error loading custom tags:', e);
          }
        };
        load();
      }
    }
  }, [isOpen, initialNotes, currentUser]);

  const addCustomTrigger = async () => {
    if (!currentUser || !newTrigger.trim()) return;
    const trimmed = newTrigger.trim();
    if (COMMON_TRIGGERS.includes(trimmed) || customTriggers.includes(trimmed)) {
      alert(t('journal_form.trigger_exists'));
      return;
    }
    try {
      const updated = [...customTriggers, trimmed];
      const ref = doc(db, 'users', currentUser.uid, 'customTags', 'journal');
      await setDoc(ref, { triggers: updated, sensaties: customSensations }, { merge: true });
      setCustomTriggers(updated);
      setNewTrigger('');
      setShowAddTrigger(false);
    } catch (e) {
      console.error('Error adding custom trigger:', e);
      alert(t('journal_form.trigger_add_error'));
    }
  };

  const addCustomSensation = async () => {
    if (!currentUser || !newSensation.trim()) return;
    const trimmed = newSensation.trim();
    if (COMMON_SENSATIONS.includes(trimmed) || customSensations.includes(trimmed)) {
      alert(t('journal_form.sensation_exists'));
      return;
    }
    try {
      const updated = [...customSensations, trimmed];
      const ref = doc(db, 'users', currentUser.uid, 'customTags', 'journal');
      await setDoc(ref, { triggers: customTriggers, sensaties: updated }, { merge: true });
      setCustomSensations(updated);
      setNewSensation('');
      setShowAddSensation(false);
    } catch (e) {
      console.error('Error adding custom sensation:', e);
      alert(t('journal_form.sensation_add_error'));
    }
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers(prev =>
      prev.includes(trigger) ? prev.filter(x => x !== trigger) : [...prev, trigger]
    );
  };

  const toggleSensation = (sensation: string) => {
    setSelectedSensations(prev =>
      prev.includes(sensation) ? prev.filter(x => x !== sensation) : [...prev, sensation]
    );
  };

  const saveEntry = async () => {
    if (!currentUser) return;
    try {
      const entry: Record<string, unknown> = {
        techniekGebruikt: initialTechnique || '',
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

      // Write journal goal (local timezone)
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const goalsRef = doc(db, 'users', currentUser.uid, 'goals', today);
      await setDoc(goalsRef, { journal: true }, { merge: true });

      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Error saving journal entry:', error);
      alert(t('journal_form.save_error'));
    }
  };

  if (!isOpen || !isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 sm:p-6 max-w-lg w-full shadow-2xl transition-colors max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 transition-colors">
          <i className="fas fa-book text-blue-600 dark:text-blue-400 mr-2 transition-colors"></i>
          {sessionInfo ? t('resonant.session_complete') : t('journal_form.form_title')}
        </h3>

        {/* Session summary — only shown when opened after an exercise */}
        {sessionInfo && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-4 mb-4 border border-blue-200 dark:border-blue-700 transition-colors">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 transition-colors">{t('resonant.cycles')}</div>
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 transition-colors">{sessionInfo.cycles}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 transition-colors">{t('resonant.duration')}</div>
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 transition-colors">{sessionInfo.durationFormatted}</div>
              </div>
            </div>
          </div>
        )}

        {/* Triggers */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors">
            {t('journal_form.triggers_label')}
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
                {t('journal_form.custom_trigger')}
              </button>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTrigger()}
                  placeholder={t('journal_form.new_trigger_placeholder')}
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
                  onClick={() => { setShowAddTrigger(false); setNewTrigger(''); }}
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
            {t('journal_form.intensity_label')}
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
              {t('common.intensity_mild')}
            </span>
            <span className="text-gray-400 dark:text-gray-500 transition-colors">{t('common.intensity_moderate')}</span>
            <span className="text-red-600 dark:text-red-400 flex items-center gap-1 transition-colors">
              {t('common.intensity_severe')}
              <i className="fas fa-frown"></i>
            </span>
          </div>
        </div>

        {/* Sensations */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors">
            {t('journal_form.sensations_label')}
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
                {t('journal_form.custom_sensation')}
              </button>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newSensation}
                  onChange={(e) => setNewSensation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomSensation()}
                  placeholder={t('journal_form.new_sensation_placeholder')}
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
                  onClick={() => { setShowAddSensation(false); setNewSensation(''); }}
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
            {t('journal_form.cp_score_label')}
          </label>
          <input
            type="number"
            value={cpScore}
            onChange={(e) => setCpScore(e.target.value)}
            placeholder={t('journal_form.cp_placeholder')}
            min={1} max={120}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 dark:placeholder-gray-400"
          />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors">
            {t('journal_form.notes_label')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder={t('journal_form.notes_placeholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 dark:placeholder-gray-400"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={saveEntry}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors dark:bg-green-700 dark:hover:bg-green-600"
          >
            <i className="fas fa-save mr-2"></i>
            {t('journal_form.save')}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
          >
            <i className="fas fa-times mr-2"></i>
            {t('resonant.skip')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
