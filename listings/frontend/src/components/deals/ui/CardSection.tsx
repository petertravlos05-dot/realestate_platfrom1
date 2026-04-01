'use client';

import { ReactNode } from 'react';

interface CardSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

/**
 * CardSection - Consistent card wrapper for sections
 */
export default function CardSection({
  title,
  children,
  className = '',
  headerAction,
}: CardSectionProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden ${className}`}>
      {title && (
        <div className="px-5 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className={title ? 'p-5' : 'p-5'}>{children}</div>
    </div>
  );
}

