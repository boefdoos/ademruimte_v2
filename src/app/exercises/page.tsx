'use client';

import { useState } from 'react';
import { ButeykoExercise } from '@/components/exercises/ButeykoExercise';
import { ResonantBreathing } from '@/components/exercises/ResonantBreathing';
import { HRVInput } from '@/components/exercises/HRVInput';
import { Navigation } from '@/components/layout/Navigation';
import { HelpTooltip } from '@/components/ui/HelpTooltip';

type ExerciseTab = 'buteyko' | 'resonant' | 'hrv';

export default function ExercisesPage() {
  const [activeTab, setActiveTab] = useState<ExerciseTab>('buteyko');

  return (
    <>
      <Navigation />
      <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Oefeningen / Exercises
          </h1>
          <p className="text-gray-600">
            Verbeter je ademhaling met deze gestructureerde oefeningen
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="flex border-b">
            <div className="flex-1 relative">
              <button
                onClick={() => setActiveTab('buteyko')}
                className={`w-full py-4 px-6 font-semibold transition-colors ${
                  activeTab === 'buteyko'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <i className="fas fa-stopwatch mr-2"></i>
                Buteyko Control Pause
              </button>
              <div className="absolute top-1/2 -translate-y-1/2 right-2">
                <HelpTooltip
                  title="Control Pause & Bohr Effect"
                  content={
                    <div className="space-y-3">
                      <p>
                        De <strong>Control Pause (CP)</strong> meet je CO2 tolerantie - een directe indicator van je
                        ademhalingsefficiëntie.
                      </p>
                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <p className="font-semibold text-blue-900 mb-2">Het Bohr Effect 🔬</p>
                        <p className="text-sm">
                          CO2 in je bloed helpt zuurstof vrijgeven aan je cellen. Te veel ademhalen verlaagt CO2,
                          waardoor zuurstof VASTHOUDT aan rode bloedcellen → minder zuurstof naar organen → symptomen
                          zoals duizeligheid, tintelingen, vermoeidheid.
                        </p>
                      </div>
                      <p className="text-sm">
                        <strong>Doel:</strong> Verhoog je CP naar 40+ seconden door minder en efficiënter te ademen.
                        Hogere CP = betere zuurstoflevering = minder symptomen.
                      </p>
                      <div className="text-sm">
                        <strong>CP Niveaus:</strong>
                        <ul className="list-disc ml-4 mt-1">
                          <li>&lt;10s: Ernstig - medische aandacht</li>
                          <li>10-20s: Laag - dagelijkse symptomen</li>
                          <li>20-30s: Gemiddeld - soms symptomen</li>
                          <li>30-40s: Goed - zeldzaam symptomen</li>
                          <li>40s+: Uitstekend - optimale gezondheid</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
              </div>
            </div>
            <div className="flex-1 relative">
              <button
                onClick={() => setActiveTab('resonant')}
                className={`w-full py-4 px-6 font-semibold transition-colors ${
                  activeTab === 'resonant'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <i className="fas fa-wind mr-2"></i>
                Ademhaling / Breathing
              </button>
              <div className="absolute top-1/2 -translate-y-1/2 right-2">
                <HelpTooltip
                  title="Ademhalingsoefeningen"
                  content={
                    <div className="space-y-3">
                      <p>
                        Twee wetenschappelijk onderbouwde ademhalingstechnieken voor optimale gezondheid en HRV.
                      </p>
                      <div className="space-y-3 text-sm">
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <p className="font-semibold text-blue-900 mb-1">🌊 Coherent Breathing</p>
                          <p className="mb-2">5-6 ademhalingen per minuut (instelbaar: 4-6s in/uit)</p>
                          <p className="text-xs">
                            <strong>Effect:</strong> Verhoogt HRV significant, synchroniseert ademhaling met hartslagvariabiliteit,
                            balanceert sympathisch/parasympathisch zenuwstelsel. Wetenschappelijk bewezen meest effectief voor HRV training.
                          </p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded border border-orange-200">
                          <p className="font-semibold text-orange-900 mb-1">🫁 Buteyko - Extended Breath Hold</p>
                          <p className="mb-2">In (3s) → Uit (3s) → Pauze (instelbaar: 3-15s)</p>
                          <p className="text-xs">
                            <strong>Effect:</strong> Verhoogt CO2-tolerantie, reduceert hyperventilatie, verbetert zuurstoflevering
                            via het Bohr effect. Lichte ademhaling met comfortabele pauzes na uitademing.
                          </p>
                        </div>
                      </div>
                      <p className="text-sm bg-purple-50 p-2 rounded">
                        <strong>Tip:</strong> Begin met 10-20 minuten per dag. Coherent Breathing voor HRV, Buteyko voor CO2-tolerantie.
                        Beide technieken versterken elkaar!
                      </p>
                    </div>
                  }
                />
              </div>
            </div>
            <div className="flex-1 relative">
              <button
                onClick={() => setActiveTab('hrv')}
                className={`w-full py-4 px-6 font-semibold transition-colors ${
                  activeTab === 'hrv'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <i className="fas fa-heart-pulse mr-2"></i>
                HRV
              </button>
              <div className="absolute top-1/2 -translate-y-1/2 right-2">
                <HelpTooltip
                  title="Heart Rate Variability (HRV)"
                  content={
                    <div className="space-y-3">
                      <p>
                        <strong>HRV</strong> meet de variatie in tijd tussen opeenvolgende hartslagen - een krachtige
                        indicator van je autonome zenuwstelsel en stressbestendigheid.
                      </p>
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="font-semibold text-green-900 mb-2">Wat betekent HRV? 💓</p>
                        <p className="text-sm">
                          Hogere HRV = je lichaam kan snel schakelen tussen rust en actie = beter herstel, minder
                          stress, gezonder. Lagere HRV = je systeem is "gestrest" of vermoeid.
                        </p>
                      </div>
                      <div className="text-sm">
                        <strong>HRV waarden (RMSSD in ms):</strong>
                        <ul className="list-disc ml-4 mt-1">
                          <li>&lt;20ms: Zeer laag - verhoogd stressniveau</li>
                          <li>20-50ms: Laag tot gemiddeld</li>
                          <li>50-75ms: Gemiddeld tot goed</li>
                          <li>75-100ms: Goed tot uitstekend</li>
                          <li>100ms+: Uitstekend - topsporter niveau</li>
                        </ul>
                      </div>
                      <p className="text-sm bg-purple-50 p-2 rounded">
                        <strong>Verbetering:</strong> Coherent breathing (5-5 patroon) is wetenschappelijk bewezen om
                        HRV te verhogen!
                      </p>
                    </div>
                  }
                />
              </div>
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'buteyko' && <ButeykoExercise />}
            {activeTab === 'resonant' && <ResonantBreathing />}
            {activeTab === 'hrv' && <HRVInput />}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
