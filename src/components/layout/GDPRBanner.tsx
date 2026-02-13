'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function GDPRBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already accepted
    const hasAccepted = localStorage.getItem('gdpr_consent');
    if (!hasAccepted) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('gdpr_consent', 'true');
    localStorage.setItem('gdpr_consent_date', new Date().toISOString());
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-cyan-600 shadow-2xl">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 flex items-center">
              <i className="fas fa-shield-halved text-cyan-600 mr-2"></i>
              Privacy & Cookies
            </h3>
            <p className="text-gray-700 text-sm md:text-base">
              Ademruimte gebruikt alleen essentiële cookies voor authenticatie en functionaliteit.
              We gebruiken geen tracking of marketing cookies. Door verder te gaan, accepteer je ons{' '}
              <Link href="/privacy" className="text-cyan-600 hover:underline font-semibold">
                privacybeleid
              </Link>
              .
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/privacy"
              className="px-4 py-2 border-2 border-cyan-600 text-cyan-600 font-semibold rounded-lg hover:bg-cyan-50 transition-colors whitespace-nowrap"
            >
              Meer info
            </Link>
            <button
              onClick={handleAccept}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all whitespace-nowrap"
            >
              <i className="fas fa-check mr-2"></i>
              Accepteren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
