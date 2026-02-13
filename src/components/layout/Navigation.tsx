'use client';

import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  // Don't show navigation on auth or privacy pages
  if (pathname === '/auth' || pathname === '/' || pathname === '/privacy') {
    return null;
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'fa-home' },
    { href: '/exercises', label: 'Oefeningen', icon: 'fa-wind' },
    { href: '/insights', label: 'Inzichten', icon: 'fa-chart-line' },
    { href: '/journal', label: 'Dagboek', icon: 'fa-book' },
    { href: '/settings', label: 'Profiel', icon: 'fa-user' },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Navigation */}
      <nav className="bg-white shadow-md sticky top-0 z-50 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <a href="/dashboard" className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  A
                </div>
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
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
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
      <div className="md:hidden bg-white shadow-sm sticky top-0 z-50 px-4 py-3">
        <a href="/dashboard" className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <span className="ml-2 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Ademruimte
          </span>
        </a>
      </div>

      {/* Mobile Bottom Navigation Bar - Fixed */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[56px] rounded-lg transition-all ${
                pathname === item.href
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 active:bg-gray-100'
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
