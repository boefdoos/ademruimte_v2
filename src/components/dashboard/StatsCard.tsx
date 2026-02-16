'use client';

import React from 'react';

interface StatsCardProps {
  icon: string;
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'purple' | 'green' | 'orange';
}

const colorStyles = {
  blue: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30',
  purple: 'from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30',
  green: 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30',
  orange: 'from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30',
};

const iconColors = {
  blue: 'text-blue-600 dark:text-blue-400',
  purple: 'text-purple-600 dark:text-purple-400',
  green: 'text-green-600 dark:text-green-400',
  orange: 'text-orange-600 dark:text-orange-400',
};

export function StatsCard({ icon, title, value, subtitle, color = 'blue' }: StatsCardProps) {
  return (
    <div className={`bg-gradient-to-br ${colorStyles[color]} p-6 rounded-xl shadow-md hover:shadow-lg transition-all`}>
      <div className={`text-4xl mb-3 ${iconColors[color]}`}>
        <i className={icon}></i>
      </div>
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">
        {title}
      </h3>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        {value}
      </p>
      {subtitle && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {subtitle}
        </p>
      )}
    </div>
  );
}
