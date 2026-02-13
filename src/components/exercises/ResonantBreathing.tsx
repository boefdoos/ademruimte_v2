'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'idle';

interface BreathPattern {
  name: string;
  inhale: number;
  hold: number;
  exhale: number;
  description: string;
  color: string;
}

const patterns: BreathPattern[] = [
  {
    name: 'Coherent Breathing',
    inhale: 5,
    hold: 0,
    exhale: 5,
    description: '6 ademhalingen/min voor optimale HRV (instelbaar)',
    color: 'blue',
  },
  {
    name: 'Buteyko - Extended Breath Hold',
    inhale: 3,
    hold: 0, // Hold comes AFTER exhale for Buteyko
    exhale: 3,
    description: 'In → Uit → Pauze (verlengde adempauze)',
    color: 'orange',
  },
];

export function ResonantBreathing() {
  const { currentUser } = useAuth();
  const [selectedPattern, setSelectedPattern] = useState(patterns[0]);
  const [customHoldDuration, setCustomHoldDuration] = useState(3);
  const [coherentDuration, setCoherentDuration] = useState(5); // 4-6 seconds range
  const [sessionDuration, setSessionDuration] = useState(10); // minutes
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<BreathPhase>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalNotes, setJournalNotes] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const colorClasses = {
    blue: 'from-blue-400 to-blue-600',
    green: 'from-green-400 to-green-600',
    purple: 'from-purple-400 to-purple-600',
    indigo: 'from-indigo-400 to-indigo-600',
    orange: 'from-orange-400 to-orange-600',
  };

  // Get effective pattern with custom durations
  const getEffectivePattern = () => {
    if (selectedPattern.name === 'Coherent Breathing') {
      const bpm = Math.round(60 / (coherentDuration * 2) * 10) / 10;
      return {
        ...selectedPattern,
        inhale: coherentDuration,
        exhale: coherentDuration,
        description: `${coherentDuration}s in/uit = ${bpm} ademhalingen/min`,
      };
    }
    if (selectedPattern.name === 'Buteyko - Extended Breath Hold') {
      return {
        ...selectedPattern,
        hold: customHoldDuration, // This hold comes AFTER exhale
        description: `3s in → 3s uit → ${customHoldDuration}s pauze`,
      };
    }
    return selectedPattern;
  };

  // Total session tracking with auto-stop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        setTotalSeconds(s => {
          const newTotal = s + 1;
          // Auto-stop when session duration is reached
          if (newTotal >= sessionDuration * 60) {
            stopBreathing();
          }
          return newTotal;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, sessionDuration]);

  // Breathing cycle logic
  useEffect(() => {
    if (!isActive || phase === 'idle') return;

    const effectivePattern = getEffectivePattern();

    const timer = setTimeout(() => {
      setTimeLeft(t => {
        if (t > 1) return t - 1;

        const isButeyko = selectedPattern.name === 'Buteyko - Extended Breath Hold';

        // Buteyko sequence: inhale → exhale → hold → back to inhale
        // Other patterns: inhale → hold (optional) → exhale → back to inhale

        if (isButeyko) {
          // Buteyko: in → out → hold = 1 cycle
          if (phase === 'inhale') {
            setPhase('exhale');
            playSound();
            return effectivePattern.exhale;
          } else if (phase === 'exhale') {
            if (effectivePattern.hold > 0) {
              setPhase('hold');
              playSound();
              return effectivePattern.hold;
            } else {
              // No hold - cycle completes after exhale
              setCycles(c => c + 1);
              setPhase('inhale');
              playSound();
              return effectivePattern.inhale;
            }
          } else if (phase === 'hold') {
            // Cycle completes after hold (in → out → hold = 1 complete cycle)
            setCycles(c => c + 1);
            setPhase('inhale');
            playSound();
            return effectivePattern.inhale;
          }
        } else {
          // Coherent: in → out = 1 cycle
          if (phase === 'inhale') {
            if (effectivePattern.hold > 0) {
              setPhase('hold');
              return effectivePattern.hold;
            } else {
              setPhase('exhale');
              playSound();
              return effectivePattern.exhale;
            }
          } else if (phase === 'hold') {
            setPhase('exhale');
            playSound();
            return effectivePattern.exhale;
          } else if (phase === 'exhale') {
            // Cycle completes after exhale (in → out = 1 complete cycle)
            setCycles(c => c + 1);
            setPhase('inhale');
            playSound();
            return effectivePattern.inhale;
          }
        }

        return 0;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [isActive, phase, timeLeft, selectedPattern, customHoldDuration]);

  const playSound = () => {
    if (!soundEnabled) return; // Skip sound if disabled

    // Simple beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 440;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const startBreathing = () => {
    const effectivePattern = getEffectivePattern();
    setIsActive(true);
    setPhase('inhale');
    setTimeLeft(effectivePattern.inhale);
    setTotalSeconds(0);
    setCycles(0);
    playSound();
  };

  const stopBreathing = async () => {
    setIsActive(false);
    setPhase('idle');
    setTimeLeft(0);

    // Save session to Firebase
    if (currentUser && totalSeconds > 0) {
      try {
        // Save to V1 collection structure
        const sessionsRef = collection(db, 'resonant_sessions');
        await addDoc(sessionsRef, {
          userId: currentUser.uid,
          pattern: selectedPattern.name,
          durationSeconds: totalSeconds,
          cycles,
          timestamp: new Date(),
        });

        // Auto-complete today's goal
        const today = new Date().toISOString().split('T')[0];
        const goalsRef = doc(db, 'users', currentUser.uid, 'goals', today);
        await setDoc(goalsRef, { hrv: true }, { merge: true });

        // Open journal modal
        setShowJournalModal(true);
      } catch (error) {
        console.error('Error saving session:', error);
      }
    }
  };

  const saveJournalEntry = async () => {
    if (!currentUser) return;

    try {
      const entriesRef = collection(db, 'dagboekEntries');
      await addDoc(entriesRef, {
        userId: currentUser.uid,
        techniekGebruikt: selectedPattern.name,
        notities: journalNotes,
        intensiteit: null,
        triggers: [],
        sensaties: [],
        timestamp: new Date(),
      });

      setShowJournalModal(false);
      setJournalNotes('');
    } catch (error) {
      console.error('Error saving journal entry:', error);
      alert('Fout bij opslaan dagboek entry');
    }
  };

  const skipJournal = () => {
    setShowJournalModal(false);
    setJournalNotes('');
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'inhale':
        return 'Inademen / Inhale';
      case 'hold':
        return 'Vasthouden / Hold';
      case 'exhale':
        return 'Uitademen / Exhale';
      default:
        return 'Klaar om te starten';
    }
  };

  const getCircleSize = () => {
    if (phase === 'inhale') return 'scale-150';
    if (phase === 'exhale') return 'scale-75';
    return 'scale-100';
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      {/* Pattern Selection */}
      {!isActive && (
        <div className="mb-8">
          <h3 className="font-bold text-lg mb-4 text-gray-800">
            Kies een adempatroon / Choose Pattern
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patterns.map((pattern) => (
              <button
                key={pattern.name}
                onClick={() => setSelectedPattern(pattern)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedPattern.name === pattern.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-gray-800 mb-1">{pattern.name}</div>
                <div className="text-sm text-gray-600 mb-2">{pattern.description}</div>
                <div className="flex gap-2 text-sm font-mono">
                  {/* Inhale */}
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                    ↑ {pattern.name === 'Coherent Breathing' ? coherentDuration : pattern.inhale}s
                  </span>

                  {/* For Buteyko: exhale comes before hold */}
                  {pattern.name === 'Buteyko - Extended Breath Hold' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      ↓ {pattern.exhale}s
                    </span>
                  )}

                  {/* Hold (after exhale for Buteyko, after inhale for others) */}
                  {pattern.name === 'Buteyko - Extended Breath Hold' && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                      ⊙ {customHoldDuration}s
                    </span>
                  )}

                  {/* For non-Buteyko: normal order */}
                  {pattern.name !== 'Buteyko - Extended Breath Hold' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      ↓ {pattern.name === 'Coherent Breathing' ? coherentDuration : pattern.exhale}s
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Coherent Breathing Duration Slider */}
          {selectedPattern.name === 'Coherent Breathing' && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <label className="font-semibold text-gray-800">
                  Ademhalingstijd / Breath Duration
                </label>
                <span className="text-2xl font-bold text-blue-600">
                  {coherentDuration}s in/uit
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="6"
                step="1"
                value={coherentDuration}
                onChange={(e) => setCoherentDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>4s (7.5 bpm)</span>
                <span>5s (6 bpm)</span>
                <span>6s (5 bpm)</span>
              </div>
              <div className="mt-3 p-3 bg-white rounded border border-blue-100">
                <div className="flex items-start gap-2">
                  <i className="fas fa-heartbeat text-blue-500 mt-1"></i>
                  <p className="text-sm text-gray-700">
                    <strong>Wetenschap:</strong> 5-6 ademhalingen per minuut (5-6s in/uit) is optimaal voor HRV.
                    Dit synchroniseert je ademhaling met je hartslagvariabiliteit.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Buteyko Hold Duration Slider */}
          {selectedPattern.name === 'Buteyko - Extended Breath Hold' && (
            <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-3">
                <label className="font-semibold text-gray-800">
                  Verlengde Adempauze / Extended Pause (na uitademing)
                </label>
                <span className="text-2xl font-bold text-orange-600">{customHoldDuration}s</span>
              </div>
              <input
                type="range"
                min="3"
                max="15"
                value={customHoldDuration}
                onChange={(e) => setCustomHoldDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>3s (Begin)</span>
                <span>9s (Gemiddeld)</span>
                <span>15s (Gevorderd)</span>
              </div>
              <div className="mt-3 p-3 bg-white rounded border border-orange-100">
                <div className="flex items-start gap-2">
                  <i className="fas fa-wind text-orange-500 mt-1"></i>
                  <p className="text-sm text-gray-700">
                    <strong>Extended Breath Hold:</strong> In (3s) → Uit (3s) → Pauze na uitademing.
                    Deze verlengde adempauze verhoogt je CO2-tolerantie en reduceert hyperventilatie volgens de Buteyko methode.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Session Duration Selector */}
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200">
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold text-gray-800">
                <i className="fas fa-clock mr-2 text-green-600"></i>
                Sessieduur / Session Duration
              </label>
              <span className="text-2xl font-bold text-green-600">
                {sessionDuration} min
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={sessionDuration}
              onChange={(e) => setSessionDuration(parseInt(e.target.value))}
              className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>5 min</span>
              <span>15 min</span>
              <span>30 min</span>
            </div>
            <div className="mt-3 p-3 bg-white rounded border border-green-100">
              <div className="flex items-start gap-2">
                <i className="fas fa-info-circle text-green-500 mt-1"></i>
                <p className="text-sm text-gray-700">
                  De oefening stopt automatisch na {sessionDuration} minuten.
                  Kies 10-20 minuten voor optimale HRV training.
                </p>
              </div>
            </div>
          </div>

          {/* Sound Toggle */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <i className={`fas ${soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'} text-gray-600 text-xl`}></i>
                <div>
                  <div className="font-semibold text-gray-800">Geluidssignalen</div>
                  <div className="text-xs text-gray-600">Piep bij fase-overgangen</div>
                </div>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  soundEnabled ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breathing Circle */}
      <div className="flex flex-col items-center justify-center mb-8">
        {/* Circle wrapper - Responsive sizing */}
        <div className="w-full max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg aspect-square flex items-center justify-center p-8 sm:p-12">
          <div
            className={`w-full h-full rounded-full bg-gradient-to-br ${
              colorClasses[selectedPattern.color as keyof typeof colorClasses]
            } flex items-center justify-center shadow-2xl transition-transform ease-in-out`}
            style={{
              transitionDuration: `${
                phase === 'inhale'
                  ? getEffectivePattern().inhale
                  : phase === 'exhale'
                  ? getEffectivePattern().exhale
                  : 1
              }s`,
              transform:
                phase === 'inhale'
                  ? 'scale(1.5)'
                  : phase === 'exhale'
                  ? 'scale(0.75)'
                  : 'scale(1)',
            }}
          >
            <div className="text-center text-white">
              <div className="text-5xl sm:text-6xl md:text-7xl font-bold mb-2">
                {timeLeft ? Math.ceil(timeLeft) : '—'}
              </div>
              <div className="text-sm sm:text-base md:text-lg font-semibold px-2">
                {getPhaseText()}
              </div>
            </div>
          </div>
        </div>

        {/* Stats - Responsive Grid */}
        {isActive && (
          <div className="mt-6 grid grid-cols-3 gap-4 sm:gap-8 w-full max-w-md text-center">
            <div>
              <div className="text-xs sm:text-sm text-gray-600">Cycli</div>
              <div className="text-xl sm:text-2xl font-bold text-gray-800">{cycles}</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-gray-600">Verstreken</div>
              <div className="text-xl sm:text-2xl font-bold text-gray-800">{formatTime(totalSeconds)}</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-gray-600">Resterend</div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {formatTime(Math.max(0, sessionDuration * 60 - totalSeconds))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls - Mobile Friendly */}
      <div className="flex gap-4 justify-center px-4">
        {!isActive ? (
          <button
            onClick={startBreathing}
            className={`w-full sm:w-auto px-8 py-4 min-h-[56px] bg-gradient-to-r ${
              colorClasses[selectedPattern.color as keyof typeof colorClasses]
            } text-white rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-lg text-base sm:text-lg`}
          >
            <i className="fas fa-play mr-2"></i>
            Start Oefening
          </button>
        ) : (
          <button
            onClick={stopBreathing}
            className="w-full sm:w-auto px-8 py-4 min-h-[56px] bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-lg text-base sm:text-lg"
          >
            <i className="fas fa-stop mr-2"></i>
            Stop & Opslaan
          </button>
        )}
      </div>

      {/* Tips */}
      {!isActive && (
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h4 className="font-bold text-gray-800 mb-3">
            <i className="fas fa-lightbulb mr-2 text-yellow-500"></i>
            {selectedPattern.name === 'Coherent Breathing' ? 'Coherent Breathing Tips' : 'Extended Breath Hold Tips'}
          </h4>
          {selectedPattern.name === 'Coherent Breathing' ? (
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-green-600 mt-1"></i>
                <span>Adem langzaam en diep door je neus</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-green-600 mt-1"></i>
                <span>Gebruik je buik (diafragma) - voel je buik uitzetten bij inademen</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-green-600 mt-1"></i>
                <span>Blijf ontspannen, forceer niets - comfort is belangrijker dan perfectie</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-green-600 mt-1"></i>
                <span>10-20 minuten dagelijks verhoogt significant je HRV</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-green-600 mt-1"></i>
                <span>Beste momenten: 's ochtends, voor het slapen, of tijdens stress</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-orange-600 mt-1"></i>
                <span>Adem LICHT en rustig door je neus - minder volume dan normaal</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-orange-600 mt-1"></i>
                <span>De pauze na uitademen moet comfortabel zijn - geen worsteling</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-orange-600 mt-1"></i>
                <span>Je mag een lichte "lucht-honger" voelen - dit is normaal en gezond</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-orange-600 mt-1"></i>
                <span>Start kort en bouw geleidelijk op - overtraining kan hyperventilatie veroorzaken</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-orange-600 mt-1"></i>
                <span>Meet je Control Pause (CP) regelmatig om vooruitgang te volgen</span>
              </li>
            </ul>
          )}
        </div>
      )}

      {/* Journal Modal */}
      {showJournalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              <i className="fas fa-book text-blue-600 mr-2"></i>
              Sessie voltooid! 🎉
            </h3>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4 border border-blue-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-600">Cycli</div>
                  <div className="text-2xl font-bold text-gray-800">{cycles}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Duur</div>
                  <div className="text-2xl font-bold text-gray-800">{formatTime(totalSeconds)}</div>
                </div>
              </div>
            </div>

            <p className="text-gray-700 mb-4">
              Wil je notities toevoegen over deze sessie?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notities (optioneel)
              </label>
              <textarea
                value={journalNotes}
                onChange={(e) => setJournalNotes(e.target.value)}
                placeholder="bijv. Voelde me ontspannen, lichte duizeligheid aan het begin..."
                rows={4}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveJournalEntry}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <i className="fas fa-save mr-2"></i>
                Opslaan
              </button>
              <button
                onClick={skipJournal}
                className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                <i className="fas fa-times mr-2"></i>
                Overslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
