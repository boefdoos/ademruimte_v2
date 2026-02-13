'use client';

import { useState } from 'react';

interface HelpTooltipProps {
  title: string;
  content: string | React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function HelpTooltip({ title, content, size = 'md' }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-blue-500 hover:text-blue-700 transition-colors ml-2"
        title="Meer informatie"
      >
        <i className={`fas fa-circle-question ${sizeClasses[size]}`}></i>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Tooltip Modal */}
          <div className="absolute right-0 top-full mt-2 z-[70] w-72 max-w-[90vw] bg-white rounded-lg shadow-2xl border-2 border-blue-200 p-4 max-h-96 overflow-y-auto">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-bold text-gray-800 flex items-center">
                <i className="fas fa-info-circle text-blue-600 mr-2"></i>
                {title}
              </h4>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="text-sm text-gray-700">
              {typeof content === 'string' ? <p>{content}</p> : content}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
