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
  blue: 'from-blue-50 to-blue-100',
  purple: 'from-purple-50 to-purple-100',
  green: 'from-green-50 to-green-100',
  orange: 'from-orange-50 to-orange-100',
};

const iconColors = {
  blue: 'text-blue-600',
  purple: 'text-purple-600',
  green: 'text-green-600',
  orange: 'text-orange-600',
};

export function StatsCard({ icon, title, value, subtitle, color = 'blue' }: StatsCardProps) {
  return (
    <div className={`bg-gradient-to-br ${colorStyles[color]} p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow`}>
      <div className={`text-4xl mb-3 ${iconColors[color]}`}>
        <i className={icon}></i>
      </div>
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
        {title}
      </h3>
      <p className="text-3xl font-bold text-gray-900 mb-1">
        {value}
      </p>
      {subtitle && (
        <p className="text-sm text-gray-600">
          {subtitle}
        </p>
      )}
    </div>
  );
}
