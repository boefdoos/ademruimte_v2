'use client';

import React, { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

type AuthView = 'login' | 'register' | 'reset';

export default function AuthPage() {
  const [view, setView] = useState<AuthView>('login');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full">
        {view === 'login' && (
          <LoginForm
            onSwitchToRegister={() => setView('register')}
            onSwitchToReset={() => setView('reset')}
          />
        )}
        {view === 'register' && (
          <RegisterForm onSwitchToLogin={() => setView('login')} />
        )}
        {view === 'reset' && (
          <ResetPasswordForm onBack={() => setView('login')} />
        )}
      </div>

      {/* Privacy Policy Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-cyan-600 hover:underline"
        >
          <i className="fas fa-shield-halved mr-1"></i>
          Privacybeleid / Privacy Policy
        </a>
      </div>
    </div>
  );
}
