'use client';

import React, { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

type AuthView = 'login' | 'register' | 'reset';

export default function AuthPage() {
  const [view, setView] = useState<AuthView>('login');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 transition-colors">
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
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 transition-colors">
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline transition-colors"
        >
          <i className="fas fa-shield-halved mr-1"></i>
          Privacybeleid / Privacy Policy
        </a>
      </div>
    </div>
  );
}
