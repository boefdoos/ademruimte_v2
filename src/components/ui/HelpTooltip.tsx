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
            className="fixed inset-0 z-[60] bg-black bg-opacity-25"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Tooltip Modal - Responsive */}
          <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-20 sm:top-full sm:mt-2 z-[70] w-auto sm:w-80 md:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-2xl border-2 border-blue-200 p-4 max-h-[70vh] sm:max-h-96 overflow-y-auto">
            <div className="flex items-start justify-between mb-3 gap-2">
              <h4 className="font-bold text-sm sm:text-base text-gray-800 flex items-center flex-1 break-words">
                <i className="fas fa-info-circle text-blue-600 mr-2 flex-shrink-0"></i>
                <span className="break-words">{title}</span>
              </h4>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="text-xs sm:text-sm text-gray-700 break-words overflow-wrap-anywhere">
              {typeof content === 'string' ? <p className="break-words">{content}</p> : content}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
