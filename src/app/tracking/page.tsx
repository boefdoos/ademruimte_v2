'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TrackingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to journal page
    router.replace('/journal');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center">
        <i className="fas fa-spinner fa-spin text-4xl text-purple-600 mb-4"></i>
        <p className="text-gray-600">Doorverwijzen naar Dagboek...</p>
      </div>
    </div>
  );
}
