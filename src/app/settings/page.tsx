'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useI18n } from '@/contexts/I18nContext';
import { Navigation } from '@/components/layout/Navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import Link from 'next/link';

export default function SettingsPage() {
  const { currentUser, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { locale, setLocale, t } = useI18n();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Export all user data
  const handleExportData = async () => {
    if (!currentUser) return;

    setIsExporting(true);
    try {
      const userData: any = {
        user: {
          email: currentUser.email,
          uid: currentUser.uid,
          createdAt: currentUser.metadata.creationTime,
        },
        exportDate: new Date().toISOString(),
        data: {},
      };

      // Export CP measurements
      const cpSnapshot = await getDocs(
        query(collection(db, 'cpMeasurements'), where('userId', '==', currentUser.uid))
      );
      userData.data.cpMeasurements = cpSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
      }));

      // Export breathing sessions
      const breathingSnapshot = await getDocs(
        query(collection(db, 'resonant_sessions'), where('userId', '==', currentUser.uid))
      );
      userData.data.breathingSessions = breathingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
      }));

      // Export HRV measurements
      const hrvSnapshot = await getDocs(
        query(collection(db, 'hrv_measurements'), where('userId', '==', currentUser.uid))
      );
      userData.data.hrvMeasurements = hrvSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
      }));

      // Export journal entries
      const journalSnapshot = await getDocs(
        query(collection(db, 'dagboekEntries'), where('userId', '==', currentUser.uid))
      );
      userData.data.journalEntries = journalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
      }));

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ademruimte-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('✓ Je data is geëxporteerd! Het bestand is gedownload.');
    } catch (error) {
      console.error('Export error:', error);
      alert('Er ging iets mis bij het exporteren van je data. Probeer het opnieuw.');
    } finally {
      setIsExporting(false);
    }
  };

  // Delete all user data and account
  const handleDeleteAccount = async () => {
    if (!currentUser || deleteConfirmText !== t('settings.delete_confirm_word')) {
      return;
    }

    setIsDeleting(true);
    try {
      // Delete all user data
      const collections = ['cpMeasurements', 'resonant_sessions', 'hrv_measurements', 'dagboekEntries'];

      for (const collectionName of collections) {
        const snapshot = await getDocs(
          query(collection(db, collectionName), where('userId', '==', currentUser.uid))
        );
        const deletePromises = snapshot.docs.map(docSnapshot =>
          deleteDoc(doc(db, collectionName, docSnapshot.id))
        );
        await Promise.all(deletePromises);
      }

      // Delete goals subcollection
      const goalsSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'goals'));
      const goalsDeletePromises = goalsSnapshot.docs.map(docSnapshot =>
        deleteDoc(doc(db, 'users', currentUser.uid, 'goals', docSnapshot.id))
      );
      await Promise.all(goalsDeletePromises);

      // Delete user document
      await deleteDoc(doc(db, 'users', currentUser.uid));

      // Delete Firebase Auth user
      await deleteUser(currentUser);

      alert('Je account en alle data zijn permanent verwijderd.');
      window.location.href = '/';
    } catch (error) {
      console.error('Delete error:', error);
      alert('Er ging iets mis bij het verwijderen van je account. Neem contact op met support.');
      setIsDeleting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 transition-colors">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              {t('settings.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">{t('settings.subtitle')}</p>
          </div>

          {/* Account info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 transition-colors">
            <h2 className="text-2xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
              <i className="fas fa-user text-blue-600 dark:text-blue-400 mr-3"></i>
              Account informatie
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Email adres</label>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{currentUser.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Account aangemaakt</label>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {new Date(currentUser.metadata.creationTime!).toLocaleDateString('nl-NL')}
                </p>
              </div>
            </div>
          </div>

          {/* Language & Preferences */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 transition-colors">
            <h2 className="text-2xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
              <i className="fas fa-palette text-purple-600 dark:text-purple-400 mr-3"></i>
              Voorkeuren
            </h2>
            <div className="space-y-6">
              {/* Dark Mode Toggle */}
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-3">Weergave</label>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl">
                      <i className={`fas fa-${isDarkMode ? 'moon' : 'sun'}`}></i>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {isDarkMode ? 'Donkere weergave actief' : 'Lichte weergave actief'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className={`relative w-16 h-8 rounded-full transition-colors ${
                      isDarkMode ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        isDarkMode ? 'transform translate-x-8' : ''
                      }`}
                    ></div>
                  </button>
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-2">{t('settings.language_label')}</label>
                <select
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as 'nl' | 'en')}
                >
                  <option value="nl">🇳🇱 Nederlands</option>
                  <option value="en">🇬🇧 English</option>
                </select>
              </div>
            </div>
          </div>

          {/* Logout Section */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 transition-colors">
            <h2 className="text-2xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
              <i className="fas fa-sign-out-alt text-orange-600 dark:text-orange-400 mr-3"></i>
              Sessie
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Log uit van je huidige sessie
            </p>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-orange-600 dark:bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors flex items-center gap-2"
            >
              <i className="fas fa-sign-out-alt"></i>
              Uitloggen
            </button>
          </div>

          {/* Privacy & GDPR */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 transition-colors">
            <h2 className="text-2xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
              <i className="fas fa-shield-halved text-cyan-600 dark:text-cyan-400 mr-3"></i>
              Privacy & Gegevensbescherming
            </h2>

            <div className="space-y-4">
              {/* Privacy Policy */}
              <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 bg-gray-50 dark:bg-slate-700">
                <h3 className="font-semibold mb-2 flex items-center text-gray-900 dark:text-gray-100">
                  <i className="fas fa-file-contract text-gray-600 dark:text-gray-400 mr-2"></i>
                  Privacybeleid
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                  Bekijk hoe we je gegevens verzamelen, gebruiken en beschermen.
                </p>
                <Link
                  href="/privacy"
                  className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold text-sm"
                >
                  Lees het volledige privacybeleid →
                </Link>
              </div>

              {/* Data Export */}
              <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 bg-gray-50 dark:bg-slate-700">
                <h3 className="font-semibold mb-2 flex items-center text-gray-900 dark:text-gray-100">
                  <i className="fas fa-download text-green-600 dark:text-green-400 mr-2"></i>
                  Exporteer je gegevens (GDPR Art. 20)
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                  Download al je gegevens in JSON formaat. Dit omvat alle metingen, sessies en dagboek entries.
                </p>
                <button
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Exporteren...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download mr-2"></i>
                      Exporteer alle data
                    </>
                  )}
                </button>
              </div>

              {/* GDPR Rights Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center text-gray-900 dark:text-gray-100">
                  <i className="fas fa-info-circle text-blue-600 dark:text-blue-400 mr-2"></i>
                  Je rechten onder de AVG
                </h3>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <li>✓ <strong>Inzage</strong> - Je kunt al je data bekijken in de app</li>
                  <li>✓ <strong>Rectificatie</strong> - Je kunt je data aanpassen in de app</li>
                  <li>✓ <strong>Verwijdering</strong> - Je kunt je account verwijderen (zie hieronder)</li>
                  <li>✓ <strong>Overdracht</strong> - Je kunt je data exporteren als JSON</li>
                  <li>✓ <strong>Bezwaar</strong> - Neem contact op via troostberg@gmail.com</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border-2 border-red-200 dark:border-red-900 transition-colors">
            <h2 className="text-2xl font-semibold mb-4 flex items-center text-red-600 dark:text-red-400">
              <i className="fas fa-exclamation-triangle mr-3"></i>
              Danger Zone
            </h2>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-2 text-red-800 dark:text-red-300 flex items-center">
                <i className="fas fa-trash mr-2"></i>
                Account permanent verwijderen (GDPR Art. 17)
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                Dit verwijdert <strong>permanent</strong> je account en alle gegevens:
              </p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 mb-4 ml-4">
                <li>• Alle Control Pause metingen</li>
                <li>• Alle ademhalingssessies</li>
                <li>• Alle HRV metingen</li>
                <li>• Alle dagboek entries</li>
                <li>• Je account en email</li>
              </ul>
              <p className="text-red-600 dark:text-red-400 font-semibold text-sm mb-3">
                ⚠️ Deze actie kan NIET ongedaan worden gemaakt!
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white font-semibold rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
                >
                  Account verwijderen
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Type <span className="bg-red-100 dark:bg-red-900 px-2 py-1 rounded">{t('settings.delete_confirm_word')}</span> om te bevestigen:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-red-300 dark:border-red-700 rounded-lg focus:outline-none focus:border-red-500 dark:focus:border-red-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                    placeholder={t('settings.delete_confirm_placeholder')}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== t('settings.delete_confirm_word') || isDeleting}
                      className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Verwijderen...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-trash mr-2"></i>
                          Definitief verwijderen
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
