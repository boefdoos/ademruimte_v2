'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/contexts/I18nContext';

interface BSROnboardingProps {
  onComplete: () => void;
}

export function BSROnboarding({ onComplete }: BSROnboardingProps) {
  const [step, setStep] = useState(0);
  const { locale } = useI18n();

  const steps = locale === 'nl' ? [
    {
      title: 'Breath Satisfaction Ratio',
      text: 'Ken je dat? Je gaapt of zucht, en heel soms geeft het verlichting — de luchthonger stilt even. Maar meestal niet. Het voelt geforceerd, pijnlijk, frustrerend.',
      subtext: 'Die verhouding — hoe vaak het wél werkt versus niet — blijkt een krachtige indicator van hoe je episode verloopt.',
    },
    {
      title: 'Eén getal vertelt het verhaal',
      text: 'De BSR berekent het percentage geslaagde pogingen. Hoe hoger, hoe beter het gaat.',
      subtext: 'Na een paar dagen zie je patronen die je anders nooit zou opmerken.',
    },
    {
      title: 'Twee tikken, klaar',
      text: 'Na elke gaap of zucht: tik op de knop, geef aan of het verlichting gaf, en optioneel wat je aan het doen was. Dat is alles.',
      subtext: null,
    },
    {
      title: 'Patronen worden zichtbaar',
      text: 'Na een paar dagen toont elke situatie zijn eigen BSR. Zo ontdek je wanneer je lichaam wél verlichting vindt — en wanneer niet.',
      subtext: '⚠️ Als het registreren zelf stress geeft, doe het dan minder. Een schatting achteraf is ook waardevol.',
    },
  ] : [
    {
      title: 'Breath Satisfaction Ratio',
      text: "You know the feeling? You yawn or sigh, and very occasionally it brings relief — the air hunger quiets for a moment. But usually it doesn't. It feels forced, painful, frustrating.",
      subtext: "That ratio — how often it works versus doesn't — turns out to be a powerful indicator of how your episode is progressing.",
    },
    {
      title: 'One number tells the story',
      text: 'The BSR calculates the percentage of successful attempts. The higher, the better things are going.',
      subtext: "After a few days you'll see patterns you'd never have noticed otherwise.",
    },
    {
      title: 'Two taps, done',
      text: "After each yawn or sigh: tap the button, indicate if it gave relief, and optionally what you were doing. That's it.",
      subtext: null,
    },
    {
      title: 'Patterns become visible',
      text: "After a few days, each situation shows its own BSR. That's how you discover when your body does find relief — and when it doesn't.",
      subtext: "⚠️ If tracking itself causes stress, do it less. A retrospective estimate is valuable too.",
    },
  ];

  const s = steps[step];
  const isLast = step === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-5 z-[9999] animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden transition-colors">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-5 bg-blue-600 dark:bg-blue-400' :
                i < step ? 'w-1.5 bg-blue-400/60 dark:bg-blue-500/50' :
                'w-1.5 bg-gray-200 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>

        <div className="p-6">
          {/* Title */}
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 text-center mb-4 transition-colors">
            {s.title}
          </h2>

          {/* Step-specific visuals */}
          {step === 0 && (
            <div className="flex justify-center gap-8 py-5">
              <div className="text-center">
                <div className="text-4xl mb-1">😌</div>
                <div className="text-xs font-semibold text-green-600 dark:text-green-400">{locale === 'nl' ? 'Verlichting' : 'Relief'}</div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">{locale === 'nl' ? 'soms' : 'sometimes'}</div>
              </div>
              <div className="w-px bg-gray-200 dark:bg-slate-600" />
              <div className="text-center">
                <div className="text-4xl mb-1">😣</div>
                <div className="text-xs font-semibold text-red-500 dark:text-red-400">{locale === 'nl' ? 'Geen' : 'None'}</div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">{locale === 'nl' ? 'meestal' : 'usually'}</div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex justify-center gap-3 py-4">
              {[
                { pct: '75%', label: locale === 'nl' ? 'Herstel' : 'Recovery', cls: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' },
                { pct: '40%', label: locale === 'nl' ? 'Matig' : 'Moderate', cls: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400' },
                { pct: '12%', label: locale === 'nl' ? 'Ernstig' : 'Severe', cls: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400' },
              ].map(lv => (
                <div key={lv.pct} className={`px-4 py-3 rounded-xl text-center border ${lv.cls} transition-colors`}>
                  <div className="text-xl font-extrabold">{lv.pct}</div>
                  <div className="text-[10px] mt-0.5">{lv.label}</div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 flex flex-col items-center justify-center transition-colors">
                <span className="text-sm font-extrabold text-yellow-500">38</span>
                <span className="text-[7px] text-gray-400">BSR</span>
              </div>
              <i className="fas fa-arrow-right text-gray-300 dark:text-slate-600" />
              <div className="flex gap-1.5">
                {['😌', '😐', '😣'].map(e => (
                  <div key={e} className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center text-lg transition-colors">{e}</div>
                ))}
              </div>
              <i className="fas fa-arrow-right text-gray-300 dark:text-slate-600" />
              <div className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[60px] leading-tight">
                {locale === 'nl' ? 'gaap of zucht + context' : 'yawn or sigh + context'}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex justify-center gap-2 py-4 flex-wrap">
              {[
                { name: locale === 'nl' ? 'Rust' : 'Rest', pct: 45, cls: 'text-yellow-600 dark:text-yellow-400' },
                { name: locale === 'nl' ? 'Werk' : 'Work', pct: 18, cls: 'text-red-500 dark:text-red-400' },
                { name: locale === 'nl' ? 'Sociaal' : 'Social', pct: 8, cls: 'text-red-500 dark:text-red-400' },
                { name: locale === 'nl' ? 'Beweging' : 'Movement', pct: 52, cls: 'text-green-600 dark:text-green-400' },
                { name: locale === 'nl' ? 'Ademsessie' : 'Session', pct: 61, cls: 'text-green-600 dark:text-green-400' },
              ].map(x => (
                <div key={x.name} className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 text-center min-w-[65px] transition-colors">
                  <div className={`text-base font-bold ${x.cls}`}>{x.pct}%</div>
                  <div className="text-[9px] text-gray-400 dark:text-gray-500">{x.name}</div>
                </div>
              ))}
            </div>
          )}

          {/* Text */}
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-1 transition-colors">
            {s.text}
          </p>
          {s.subtext && (
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed mt-2 transition-colors">
              {s.subtext}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-2 mt-5">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                <i className="fas fa-arrow-left mr-1" />
                {locale === 'nl' ? 'Terug' : 'Back'}
              </button>
            )}
            <button
              onClick={() => isLast ? onComplete() : setStep(step + 1)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isLast
                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                  : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              }`}
            >
              {isLast
                ? (locale === 'nl' ? 'Start met registreren' : 'Start tracking')
                : (locale === 'nl' ? 'Volgende' : 'Next')
              }
            </button>
          </div>

          {!isLast && (
            <button
              onClick={onComplete}
              className="block mx-auto mt-3 text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors bg-transparent border-none cursor-pointer"
            >
              {locale === 'nl' ? 'Overslaan' : 'Skip'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
