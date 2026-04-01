'use client';

import React from 'react';
import { FaTimes } from 'react-icons/fa';
import AdminUserInsightsPanels, { type AdminUserInsights } from './AdminUserInsightsPanels';

export type { AdminUserInsights };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  insights: AdminUserInsights | null;
  loading: boolean;
  referralStats: {
    totalPoints?: number;
    referrerPoints?: number;
    referrals?: unknown[];
    points?: unknown[];
  } | null;
}

export default function AdminUserInsightsModal({ isOpen, onClose, insights, loading, referralStats }: Props) {
  if (!isOpen) return null;

  const u = insights?.user;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <button
          type="button"
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-label="Κλείσιμο"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-start justify-between gap-4 p-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Προφίλ χρήστη (Admin)</h2>
              {u && (
                <div className="text-sm text-gray-600 mt-1 space-y-1">
                  <p>
                    {u.name} · {u.email} · <strong>Ρόλος λογαριασμού:</strong> {u.role}
                    {u.phone ? ` · ${u.phone}` : ''}
                  </p>
                  <p className="text-xs text-gray-500 leading-snug">
                    Παρακάτω εμφανίζονται τα <strong>πλήρη στοιχεία λογαριασμού/εταιρείας</strong> και οι τρεις προβολές
                    δραστηριότητας (αγοραστής, πωλητής, μεσίτης)· όπου δεν υπάρχει δραστηριότητα, τα μετρητά είναι 0.
                  </p>
                </div>
              )}
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4">
            <AdminUserInsightsPanels
              insights={insights}
              loading={loading}
              referralStats={referralStats}
              showAccountAndCompanySections
            />
          </div>
        </div>
      </div>
    </div>
  );
}
