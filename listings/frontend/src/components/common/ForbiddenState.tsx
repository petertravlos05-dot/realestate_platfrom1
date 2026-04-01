'use client';

import Link from 'next/link';
import { FaLock, FaArrowLeft } from 'react-icons/fa';

interface ForbiddenStateProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
}

export default function ForbiddenState({
  title = 'Δεν έχετε πρόσβαση',
  subtitle = 'Δεν έχετε τα απαραίτητα δικαιώματα για να δείτε αυτή τη σελίδα.',
  backHref = '/',
  backLabel = 'Επιστροφή στην Αρχική',
}: ForbiddenStateProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaLock className="text-3xl text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{subtitle}</p>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FaArrowLeft />
          {backLabel}
        </Link>
      </div>
    </div>
  );
}


