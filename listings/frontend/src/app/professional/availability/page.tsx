'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { setAvailability } from '@/lib/api/professionals';
import { FaSpinner, FaSave } from 'react-icons/fa';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import ForbiddenState from '@/components/common/ForbiddenState';

export default function ProfessionalAvailabilityPage() {
  const { role, status, isAuthenticated } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  const [loading, setLoading] = useState(false);
  const [weeklyRules, setWeeklyRules] = useState<any>({});
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [meetingTypes, setMeetingTypes] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('Europe/Athens');

  const handleSave = async () => {
    try {
      setLoading(true);
      await setAvailability({
        weeklyRules,
        exceptions,
        meetingTypes,
        timezone,
      });
      toast.success('Η διαθεσιμότητα ενημερώθηκε επιτυχώς');
    } catch (error: any) {
      console.error('Error saving availability:', error);
      toast.error(error.message || 'Αποτυχία αποθήκευσης διαθεσιμότητας');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }

  // Role gating: Only LAWYER and NOTARY can access
  if (role !== 'LAWYER' && role !== 'NOTARY') {
    return (
      <ForbiddenState
        title="Δεν έχετε πρόσβαση"
        subtitle="Αυτή η σελίδα είναι διαθέσιμη μόνο για δικηγόρους και συμβολαιογράφους."
        backHref="/"
        backLabel="Επιστροφή στην Αρχική"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Διαθεσιμότητα</h1>
          <p className="mt-2 text-gray-600">Ορίστε τις ώρες διαθεσιμότητάς σας</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ζώνη Ώρας</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="Europe/Athens">Europe/Athens</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Εβδομαδιαίοι Κανόνες (JSON)
              </label>
              <textarea
                value={JSON.stringify(weeklyRules, null, 2)}
                onChange={(e) => {
                  try {
                    setWeeklyRules(JSON.parse(e.target.value));
                  } catch {}
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                rows={10}
                placeholder='{"monday": {"start": "09:00", "end": "17:00"}, ...}'
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Εξαιρέσεις (JSON Array)
              </label>
              <textarea
                value={JSON.stringify(exceptions, null, 2)}
                onChange={(e) => {
                  try {
                    setExceptions(JSON.parse(e.target.value));
                  } catch {}
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                rows={5}
                placeholder='[{"date": "2024-01-01", "start": "10:00", "end": "14:00"}, ...]'
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Τύποι Συνάντησης (JSON Array)
              </label>
              <textarea
                value={JSON.stringify(meetingTypes, null, 2)}
                onChange={(e) => {
                  try {
                    setMeetingTypes(JSON.parse(e.target.value));
                  } catch {}
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                rows={3}
                placeholder='["Σύσκεψη", "Υπογραφή", "Σύσκεψη Online"]'
              />
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
              Αποθήκευση
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

