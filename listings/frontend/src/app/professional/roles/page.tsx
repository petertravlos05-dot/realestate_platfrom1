'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DynamicNavbar from '@/components/navigation/DynamicNavbar';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { signOut } from 'next-auth/react';
import ForbiddenState from '@/components/common/ForbiddenState';
import { FaExchangeAlt, FaUserCircle, FaArrowRight, FaHome } from 'react-icons/fa';

export default function ProfessionalRolesPage() {
  const { role, status } = useCurrentUser();
  const router = useRouter();
  const skipUnauthenticatedRedirectRef = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      if (skipUnauthenticatedRedirectRef.current) {
        return;
      }
      router.push('/login?callbackUrl=/professional/roles');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  const isProfessionalRole = role === 'LAWYER' || role === 'NOTARY' || role === 'ENGINEER' || role === 'ACCOUNTANT';
  if (!isProfessionalRole) {
    return (
      <ForbiddenState
        title="Δεν έχετε πρόσβαση"
        subtitle="Η σελίδα αλλαγής ρόλου είναι διαθέσιμη μόνο για επαγγελματίες."
        backHref="/"
        backLabel="Επιστροφή στην Αρχική"
      />
    );
  }

  const handleSwitchRole = async (targetHref: string) => {
    skipUnauthenticatedRedirectRef.current = true;
    await signOut({ redirect: false });
    router.push(targetHref);
    window.setTimeout(() => {
      skipUnauthenticatedRedirectRef.current = false;
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DynamicNavbar />
      <div className="pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <FaExchangeAlt className="text-teal-600" />
              Αλλαγή Ρόλου
            </h1>
            <p className="text-slate-500 mb-7">Επίλεξε ποιο mode θέλεις να χρησιμοποιήσεις τώρα.</p>

            <div className="space-y-4">
              <Link
                href="/buyer"
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-slate-50 transition-all group"
                onClick={(e) => {
                  e.preventDefault();
                  void handleSwitchRole('/buyer');
                }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FaUserCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">Buyer Mode</div>
                  <div className="text-sm text-slate-500">Αναζήτηση ακινήτων και διαχείριση ενδιαφέροντος</div>
                </div>
                <FaArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
              </Link>

              <Link
                href="/agent"
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-slate-50 transition-all group"
                onClick={(e) => {
                  e.preventDefault();
                  void handleSwitchRole('/agent');
                }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FaUserCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">Agent Mode</div>
                  <div className="text-sm text-slate-500">Διαχείριση πελατών, ακινήτων και leads</div>
                </div>
                <FaArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
              </Link>

              <Link
                href="/seller"
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-slate-50 transition-all group"
                onClick={(e) => {
                  e.preventDefault();
                  void handleSwitchRole('/seller');
                }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FaUserCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">Seller Mode</div>
                  <div className="text-sm text-slate-500">Διαχείριση ακινήτων και προσφορών πώλησης</div>
                </div>
                <FaArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
              </Link>
            </div>

            <div className="mt-7 px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-600">
              Τρέχων ρόλος: <span className="font-semibold text-slate-900">{role || 'Professional'}</span>
            </div>

            <div className="mt-5">
              <Link
                href="/professional/dashboard"
                className="inline-flex items-center gap-2 text-sm text-teal-700 hover:text-teal-600 font-medium"
              >
                <FaHome className="text-xs" />
                Επιστροφή στο Professional Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

