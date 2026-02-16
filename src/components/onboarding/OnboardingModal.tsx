'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface OnboardingStep {
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    title: 'Welkom bij Ademruimte! 🫁',
    titleEn: 'Welcome to Ademruimte!',
    description: 'Je persoonlijke ademhalingstrainer voor betere gezondheid, minder stress, en meer energie. Gebaseerd op de Buteyko methode en resonant breathing.',
    descriptionEn: 'Your personal breathing trainer for better health, less stress, and more energy. Based on the Buteyko method and resonant breathing.',
    icon: 'fas fa-hand-sparkles',
    color: 'from-blue-500 to-purple-500',
  },
  {
    title: 'Control Pause Meting 🎯',
    titleEn: 'Control Pause Measurement',
    description: 'Meet je ademhalingsscore door te testen hoelang je comfortabel je adem kunt inhouden na een normale uitademing. Dit geeft inzicht in je CO2 tolerantie.',
    descriptionEn: 'Measure your breathing score by testing how long you can comfortably hold your breath after a normal exhale. This provides insight into your CO2 tolerance.',
    icon: 'fas fa-stopwatch',
    color: 'from-green-500 to-teal-500',
  },
  {
    title: 'Resonant Breathing 🌊',
    titleEn: 'Resonant Breathing',
    description: 'Oefen met gestructureerde ademhalings patronen om je HRV te verhogen, stress te verminderen, en je autonome zenuwstelsel te balanceren. 5-10 minuten per dag is genoeg!',
    descriptionEn: 'Practice structured breathing patterns to increase HRV, reduce stress, and balance your autonomic nervous system. 5-10 minutes daily is enough!',
    icon: 'fas fa-wind',
    color: 'from-purple-500 to-pink-500',
  },
  {
    title: 'Track Je Vooruitgang 📊',
    titleEn: 'Track Your Progress',
    description: 'Zie je verbetering over tijd met grafieken, inzichten, en statistieken. Elke dag oefenen levert meetbare resultaten op!',
    descriptionEn: 'See your improvement over time with charts, insights, and statistics. Daily practice delivers measurable results!',
    icon: 'fas fa-chart-line',
    color: 'from-orange-500 to-red-500',
  },
  {
    title: 'Dagelijkse Doelen 🎯',
    titleEn: 'Daily Goals',
    description: 'Voltooi je dagelijkse doelen: log je Control Pause, doe een ademsessie, en schrijf in je dagboek. Bouw een streak op!',
    descriptionEn: 'Complete your daily goals: log Control Pause, do a breathing session, and journal. Build your streak!',
    icon: 'fas fa-check-circle',
    color: 'from-blue-500 to-indigo-500',
  },
];

interface OnboardingModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function OnboardingModal({ forceOpen = false, onClose }: OnboardingModalProps = {}) {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists() || !userSnap.data().onboardingCompleted) {
          // Show onboarding for new users
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, [currentUser]);

  // Handle force open
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setCurrentStep(0);
      setLoading(false);
    }
  }, [forceOpen]);

  const completeOnboarding = async () => {
    if (!currentUser) {
      // If no user (force mode), just close
      setIsOpen(false);
      if (onClose) onClose();
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      }, { merge: true });

      setIsOpen(false);
      if (onClose) onClose();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  if (loading || !isOpen) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className={`bg-gradient-to-r ${step.color} p-8 text-white text-center rounded-t-2xl`}>
          <div className="text-6xl mb-4">
            <i className={step.icon}></i>
          </div>
          <h2 className="text-3xl font-bold mb-2">{step.title}</h2>
          <p className="text-sm opacity-90">{step.titleEn}</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-gray-700 text-lg leading-relaxed mb-3">
            {step.description}
          </p>
          <p className="text-gray-500 text-sm leading-relaxed">
            {step.descriptionEn}
          </p>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mt-8 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-blue-600'
                    : index < currentStep
                    ? 'w-2 bg-blue-400'
                    : 'w-2 bg-gray-300'
                }`}
              ></div>
            ))}
          </div>

          {/* Special content for last step */}
          {currentStep === steps.length - 1 && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mt-6">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i className="fas fa-rocket text-blue-600"></i>
                Klaar om te beginnen!
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-green-600"></i>
                  Meet je eerste Control Pause
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-green-600"></i>
                  Probeer een ademsessie van 5-10 minuten
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-green-600"></i>
                  Voltooi je eerste dagelijkse doelen
                </li>
              </ul>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 gap-4">
            <button
              onClick={skipOnboarding}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-semibold transition-colors"
            >
              Overslaan / Skip
            </button>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Vorige
                </button>
              )}
              <button
                onClick={nextStep}
                className={`px-6 py-3 bg-gradient-to-r ${step.color} text-white rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-lg`}
              >
                {currentStep < steps.length - 1 ? (
                  <>
                    Volgende
                    <i className="fas fa-arrow-right ml-2"></i>
                  </>
                ) : (
                  <>
                    Start!
                    <i className="fas fa-check ml-2"></i>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
