'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/contexts/I18nContext';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
}

export function LoginForm({ onSwitchToRegister, onSwitchToReset }: LoginFormProps) {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('🔐 Attempting login with:', email);

    try {
      await signIn(email, password);
      console.log('✅ Login successful! Redirecting to dashboard...');
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('❌ Login error:', err);

      // User-friendly error messages
      let errorMessage = err.message;
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'Geen account gevonden / No account found';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Verkeerd wachtwoord / Wrong password';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Ongeldig e-mailadres / Invalid email';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Te veel pogingen. Probeer later opnieuw / Too many attempts';
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Ongeldige inloggegevens / Invalid credentials';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {t('sign_in')}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('password')}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={loading}
        >
          {loading ? '...' : t('sign_in')}
        </Button>
      </form>

      <div className="mt-4 text-center space-y-2">
        <button
          onClick={onSwitchToReset}
          className="text-sm text-blue-600 hover:underline"
        >
          {t('forgot_password')}
        </button>

        <div className="text-sm text-gray-600">
          {t('no_account')}{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:underline font-semibold"
          >
            {t('create_account')}
          </button>
        </div>
      </div>
    </div>
  );
}
