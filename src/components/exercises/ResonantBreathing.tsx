'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { JournalEntryModal } from '@/components/tracking/JournalEntryModal';
import { useWakeLock } from '@/hooks/useWakeLock';

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
    name: 'Resonant Breathing',
    inhale: 5,
    hold: 0,
    exhale: 5,
    description: '', // Will be populated from i18n
    color: 'blue',
  },
  {
    name: 'Buteyko - Extended Breath Hold',
    inhale: 3,
    hold: 0, // Hold comes AFTER exhale for Buteyko
    exhale: 3,
    description: '', // Will be populated from i18n
    color: 'orange',
  },
];

export function ResonantBreathing() {
  const { currentUser } = useAuth();
  const { t, locale } = useI18n();
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
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
  const [prefilledNotes, setPrefilledNotes] = useState('');

  // Ref keeps totalSeconds always up-to-date inside async/callback closures
  const totalSecondsRef = useRef(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const circleRef = useRef<HTMLDivElement>(null);

  const colorClasses = {
    blue: 'from-blue-400 to-blue-600',
    green: 'from-green-400 to-green-600',
    purple: 'from-purple-400 to-purple-600',
    indigo: 'from-indigo-400 to-indigo-600',
    orange: 'from-orange-400 to-orange-600',
  };

  // Get effective pattern with custom durations
  const getEffectivePattern = () => {
    if (selectedPattern.name === 'Resonant Breathing') {
      const bpm = Math.round(60 / (coherentDuration * 2) * 10) / 10;
      return {
        ...selectedPattern,
        inhale: coherentDuration,
        exhale: coherentDuration,
        description: t('resonant.pattern_coherent_detail', { duration: coherentDuration, bpm }),
      };
    }
    if (selectedPattern.name === 'Buteyko - Extended Breath Hold') {
      return {
        ...selectedPattern,
        hold: customHoldDuration, // This hold comes AFTER exhale
        description: t('resonant.pattern_buteyko_detail', { hold: customHoldDuration }),
      };
    }
    return selectedPattern;
  };

  // Total session tracking — keep ref in sync so stopBreathing never reads stale state
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        setTotalSeconds(s => {
          const newTotal = s + 1;
          totalSecondsRef.current = newTotal;
          return newTotal;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  // Auto-stop when session duration is reached — separate effect avoids stale closure
  useEffect(() => {
    if (isActive && totalSeconds >= sessionDuration * 60) {
      stopBreathing();
    }
  }, [totalSeconds, isActive, sessionDuration]);

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

  const startBreathing = async () => {
    const effectivePattern = getEffectivePattern();
    setIsActive(true);
    setPhase('inhale');
    setTimeLeft(effectivePattern.inhale);
    setTotalSeconds(0);
    totalSecondsRef.current = 0;
    setCycles(0);
    playSound();

    // Request wake lock to keep screen on
    await requestWakeLock();

    // Circle is now a fixed fullscreen overlay — no scroll needed
  };

  const handleCircleClick = () => {
    if (isActive) {
      stopBreathing();
    } else {
      startBreathing();
    }
  };

  const stopBreathing = async () => {
    setIsActive(false);
    setPhase('idle');
    setTimeLeft(0);

    // Release wake lock
    await releaseWakeLock();

    // Use ref to avoid stale closure — totalSeconds state may lag behind
    const finalSeconds = totalSecondsRef.current;

    // Save session to Firebase
    if (currentUser && finalSeconds > 0) {
      try {
        // Save to V1 collection structure
        const sessionsRef = collection(db, 'resonant_sessions');
        await addDoc(sessionsRef, {
          userId: currentUser.uid,
          pattern: selectedPattern.name,
          durationSeconds: finalSeconds,
          cycles,
          timestamp: new Date(),
        });

        // Pre-fill journal notes with session info
        let prefilledNotes = `${t('resonant.prefill_pattern')}: ${selectedPattern.name}\n`;
        prefilledNotes += `${t('resonant.duration')}: ${formatTime(finalSeconds)}\n`;
        prefilledNotes += `${t('resonant.cycles')}: ${cycles}\n`;

        if (selectedPattern.name === 'Buteyko - Extended Breath Hold') {
          prefilledNotes += `${t('resonant.prefill_breathpause')}: ${customHoldDuration}s\n`;
        } else if (selectedPattern.name === 'Resonant Breathing') {
          prefilledNotes += `${t('resonant.prefill_breathtime')}: ${coherentDuration}s in/uit\n`;
        }

        // Include recent CP measurement if available
        const lastCPStr = localStorage.getItem('lastCPMeasurement');
        if (lastCPStr) {
          try {
            const lastCP = JSON.parse(lastCPStr);
            const cpDate = new Date(lastCP.timestamp);
            const now = new Date();
            const hoursSinceCP = (now.getTime() - cpDate.getTime()) / (1000 * 60 * 60);

            // Only include if CP was measured within last 24 hours
            if (hoursSinceCP < 24) {
              prefilledNotes += `\nControl Pause: ${lastCP.seconds}s (${lastCP.level})\n`;
            }
          } catch (e) {
            console.error('Error parsing CP measurement:', e);
          }
        }

        prefilledNotes += `\n`;
        setPrefilledNotes(prefilledNotes);

        // Open journal modal
        setShowJournalModal(true);
      } catch (error) {
        console.error('Error saving session:', error);
      }
    }
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'inhale':
        return t('resonant.phase_inhale');
      case 'hold':
        return t('resonant.phase_hold');
      case 'exhale':
        return t('resonant.phase_exhale');
      default:
        return t('resonant.phase_done');
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
        <div className="mb-8 px-4">
          <h3 className="font-bold text-base sm:text-lg mb-4 text-gray-800 dark:text-gray-100 transition-colors">
            {t('resonant.choose_pattern')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {patterns.map((pattern) => {
              const patternDesc = pattern.name === 'Resonant Breathing'
                ? t('resonant.pattern_coherent_desc')
                : t('resonant.pattern_buteyko_desc');
              return (
              <button
                key={pattern.name}
                onClick={() => setSelectedPattern(pattern)}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all text-left ${
                  selectedPattern.name === pattern.name
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600'
                    : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 bg-white dark:bg-slate-700 active:bg-gray-50 dark:active:bg-slate-600'
                }`}
              >
                <div className="font-bold text-sm sm:text-base text-gray-800 dark:text-gray-100 mb-1 break-words transition-colors">{pattern.name}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2 break-words transition-colors">{patternDesc}</div>
                <div className="flex flex-wrap gap-2 text-xs sm:text-sm font-mono">
                  {/* Inhale */}
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded whitespace-nowrap">
                    ↑ {pattern.name === 'Resonant Breathing' ? coherentDuration : pattern.inhale}s
                  </span>

                  {/* For Buteyko: exhale comes before hold */}
                  {pattern.name === 'Buteyko - Extended Breath Hold' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded whitespace-nowrap">
                      ↓ {pattern.exhale}s
                    </span>
                  )}

                  {/* Hold (after exhale for Buteyko, after inhale for others) */}
                  {pattern.name === 'Buteyko - Extended Breath Hold' && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded whitespace-nowrap">
                      ⊙ {customHoldDuration}s
                    </span>
                  )}

                  {/* For non-Buteyko: normal order */}
                  {pattern.name !== 'Buteyko - Extended Breath Hold' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded whitespace-nowrap">
                      ↓ {pattern.name === 'Resonant Breathing' ? coherentDuration : pattern.exhale}s
                    </span>
                  )}
                </div>
              </button>
            );
            })}
          </div>

          {/* Coherent Breathing Duration Slider */}
          {selectedPattern.name === 'Resonant Breathing' && (
            <div className="mt-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <label className="font-semibold text-sm sm:text-base text-gray-800 dark:text-gray-100 transition-colors">
                  {t('resonant.breath_time_label')}
                </label>
                <span className="text-xl sm:text-2xl font-bold text-blue-600">
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
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2 transition-colors">
                <span>4s (7.5 bpm)</span>
                <span>5s (6 bpm)</span>
                <span>6s (5 bpm)</span>
              </div>
              <div className="mt-3 p-3 bg-white dark:bg-slate-700 rounded border border-blue-100 dark:border-blue-800 transition-colors">
                <div className="flex items-start gap-2">
                  <i className="fas fa-heartbeat text-blue-500 dark:text-blue-400 mt-1 transition-colors"></i>
                  <p className="text-sm text-gray-700 dark:text-gray-300 transition-colors">
                    <strong>{t('resonant.science_label')}</strong> 5-6 ademhalingen per minuut (5-6s in/uit) is optimaal voor HRV.
                    {t('resonant.science_text')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Buteyko Hold Duration Slider */}
          {selectedPattern.name === 'Buteyko - Extended Breath Hold' && (
            <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <label className="font-semibold text-gray-800 dark:text-gray-100 transition-colors">
                  {t('resonant.breath_pause_label')}
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
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2 transition-colors">
                <span>{t('resonant.hold_begin')}</span>
                <span>{t('resonant.hold_avg')}</span>
                <span>{t('resonant.hold_advanced')}</span>
              </div>
              <div className="mt-3 p-3 bg-white dark:bg-slate-700 rounded border border-orange-100 dark:border-orange-800 transition-colors">
                <div className="flex items-start gap-2">
                  <i className="fas fa-wind text-orange-500 dark:text-orange-400 mt-1 transition-colors"></i>
                  <p className="text-sm text-gray-700 dark:text-gray-300 transition-colors">
                    <strong>Extended Breath Hold:</strong> {t('resonant.extended_hold_desc')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Session Duration Selector */}
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 rounded-lg border-2 border-green-200 dark:border-green-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold text-gray-800 dark:text-gray-100 transition-colors">
                <i className="fas fa-clock mr-2 text-green-600 dark:text-green-400 transition-colors"></i>
                {t('resonant.session_duration')}
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
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2 transition-colors">
              <span>5 min</span>
              <span>15 min</span>
              <span>30 min</span>
            </div>
            <div className="mt-3 p-3 bg-white dark:bg-slate-700 rounded border border-green-100 dark:border-green-800 transition-colors">
              <div className="flex items-start gap-2">
                <i className="fas fa-info-circle text-green-500 dark:text-green-400 mt-1 transition-colors"></i>
                <p className="text-sm text-gray-700 dark:text-gray-300 transition-colors">
                  {t('resonant.duration_hint').replace('{n}', sessionDuration.toString())}
                  {' '}{t('resonant.duration_optimal')}
                </p>
              </div>
            </div>
          </div>

          {/* Sound Toggle */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <i className={`fas ${soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'} text-gray-600 dark:text-gray-300 text-xl transition-colors`}></i>
                <div>
                  <div className="font-semibold text-gray-800 dark:text-gray-100 transition-colors">{t('resonant.sound_cues')}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 transition-colors">{t('resonant.sound_desc')}</div>
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
      {isActive ? (
        /* Active: fullscreen breathing view — no scrolling needed */
        <div
          ref={circleRef}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 transition-colors"
        >
          {/* Circle container — large enough to contain scale(1.4) */}
          <div
            className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 cursor-pointer select-none"
            onClick={handleCircleClick}
            role="button"
            aria-label={t('resonant.stop_save')}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCircleClick(); }}
          >
            <div
              className={`absolute inset-[10%] rounded-full bg-gradient-to-br ${
                colorClasses[selectedPattern.color as keyof typeof colorClasses]
              } flex items-center justify-center shadow-2xl transition-transform ease-in-out will-change-transform`}
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
                    ? 'scale(1.25)'
                    : phase === 'exhale'
                    ? 'scale(0.7)'
                    : 'scale(1)',
              }}
            >
              <div className="text-center text-white px-2">
                <div className="text-5xl sm:text-6xl md:text-7xl font-bold mb-1">
                  {timeLeft ? Math.ceil(timeLeft) : '—'}
                </div>
                <div className="text-sm sm:text-base font-semibold whitespace-nowrap">
                  {getPhaseText()}
                </div>
              </div>
            </div>
          </div>

          {/* Stats below circle */}
          <div className="mt-6 grid grid-cols-3 gap-4 sm:gap-8 w-full max-w-sm px-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 transition-colors">{t('resonant.cycles')}</div>
              <div className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 transition-colors">{cycles}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 transition-colors">{t('resonant.elapsed')}</div>
              <div className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 transition-colors">{formatTime(totalSeconds)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 transition-colors">{t('resonant.remaining')}</div>
              <div className="text-lg sm:text-xl font-bold text-green-600">
                {formatTime(Math.max(0, sessionDuration * 60 - totalSeconds))}
              </div>
            </div>
          </div>

          {/* Tap hint */}
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 transition-colors">
            <i className="fas fa-hand-pointer mr-1" />
            {locale === 'nl' ? 'Tik op de cirkel om te stoppen' : 'Tap the circle to stop'}
          </p>
        </div>
      ) : (
        /* Idle: circle as start button, centered in flow */
        <div ref={circleRef} className="flex flex-col items-center justify-center py-6 px-4 mb-8">
          <div
            className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 cursor-pointer select-none"
            onClick={handleCircleClick}
            role="button"
            aria-label={t('resonant.start')}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCircleClick(); }}
          >
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${
                colorClasses[selectedPattern.color as keyof typeof colorClasses]
              } flex items-center justify-center shadow-2xl hover:shadow-blue-300/40 dark:hover:shadow-blue-500/20 transition-all hover:scale-105 active:scale-95`}
            >
              <div className="text-center text-white px-2">
                <i className="fas fa-play text-3xl sm:text-4xl mb-2 opacity-90" />
                <div className="text-xs sm:text-sm font-semibold opacity-80">
                  {t('resonant.start')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      {!isActive && (
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors">
          <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 transition-colors">
            <i className="fas fa-lightbulb mr-2 text-yellow-500 dark:text-yellow-400 transition-colors"></i>
            {selectedPattern.name === 'Resonant Breathing' ? 'Resonant Breathing Tips' : 'Extended Breath Hold Tips'}
          </h4>
          {selectedPattern.name === 'Resonant Breathing' ? (
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 transition-colors">
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-green-600 mt-1"></i>
                <span>{t('resonant.tip_coherent_1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-green-600 mt-1"></i>
                <span>{t('resonant.tip_coherent_2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-green-600 mt-1"></i>
                <span>{t('resonant.tip_coherent_3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-green-600 mt-1"></i>
                <span>{t('resonant.tip_coherent_4')}</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-green-600 mt-1"></i>
                <span>{t('resonant.tip_coherent_5')}</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 transition-colors">
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-orange-600 mt-1"></i>
                <span>{t('resonant.tip_buteyko_1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-orange-600 mt-1"></i>
                <span>{t('resonant.tip_buteyko_2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-orange-600 mt-1"></i>
                <span>{t('resonant.tip_buteyko_3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-orange-600 mt-1"></i>
                <span>{t('resonant.tip_buteyko_4')}</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-orange-600 mt-1"></i>
                <span>{t('resonant.tip_buteyko_5')}</span>
              </li>
            </ul>
          )}
        </div>
      )}

      {/* Journal Modal — shared component, identical to manual journal entry */}
      <JournalEntryModal
        isOpen={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        onSaved={() => setShowJournalModal(false)}
        initialNotes={prefilledNotes}
        initialTechnique={selectedPattern.name}
        sessionInfo={{ cycles, durationFormatted: formatTime(totalSeconds) }}
      />
    </div>
  );
}
