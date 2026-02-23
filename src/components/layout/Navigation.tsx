'use client';

import { usePathname } from 'next/navigation';
import { useI18n } from '@/contexts/I18nContext';

export function Navigation() {
  const pathname = usePathname();
  const { t } = useI18n();

  // Don't show navigation on auth or privacy pages
  if (pathname === '/auth' || pathname === '/' || pathname === '/privacy') {
    return null;
  }

  const navItems = [
    { href: '/dashboard', label: t('nav_dashboard'), icon: 'fa-home' },
    { href: '/exercises', label: t('nav_exercises'), icon: 'fa-wind' },
    { href: '/insights', label: t('nav_insights'), icon: 'fa-chart-line' },
    { href: '/journal', label: t('nav_tracking'), icon: 'fa-clipboard-list' },
    { href: '/settings', label: t('nav_profile'), icon: 'fa-user' },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Navigation */}
      <nav className="bg-white dark:bg-slate-900 shadow-md dark:shadow-slate-950/50 sticky top-0 z-50 hidden md:block transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <a href="/dashboard" className="flex items-center">
                <img src="/new_icon.png" alt="Ademruimte" className="w-10 h-10 rounded-xl object-cover" />
                <span className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Ademruimte
                </span>
              </a>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center space-x-1">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    pathname === item.href
                      ? 'bg-blue-600 dark:bg-blue-700 text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <i className={`fas ${item.icon} mr-2`}></i>
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header - Logo Only */}
      <div className="md:hidden bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/30 sticky top-0 z-50 px-4 py-3 transition-colors">
        <a href="/dashboard" className="flex items-center">
          <img src="/new_icon.png" alt="Ademruimte" className="w-8 h-8 rounded-lg object-cover" />
          <span className="ml-2 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Ademruimte
          </span>
        </a>
      </div>

      {/* Mobile Bottom Navigation Bar - Fixed */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 shadow-lg dark:shadow-slate-950/50 z-50 safe-area-inset-bottom transition-colors">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[56px] rounded-lg transition-all ${
                pathname === item.href
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-slate-800'
              }`}
            >
              <i className={`fas ${item.icon} text-xl mb-1`}></i>
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* Mobile Bottom Padding - Spacer for fixed bottom nav */}
      <div className="md:hidden h-16"></div>
    </>
  );
}
