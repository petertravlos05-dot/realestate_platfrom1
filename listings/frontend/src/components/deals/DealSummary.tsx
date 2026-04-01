'use client';

import { DealRoom } from '@/lib/api/deals';
import { FaBuilding, FaUserTie, FaFileAlt, FaCalendarAlt, FaCheckCircle } from 'react-icons/fa';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import CardSection from './ui/CardSection';

interface DealSummaryProps {
  deal: DealRoom;
}

import { isBuyer } from '@/lib/utils/dealRole';
import { useDealRoomTheme } from './useDealRoomTheme';

export default function DealSummary({ deal }: DealSummaryProps) {
  const { userId } = useCurrentUser();
  const { accentIcon } = useDealRoomTheme();
  const isBuyerRole = isBuyer(deal, userId);

  if (!isBuyerRole) {
    return null;
  }

  const property = deal.property;
  const acceptedProfessionals = deal.requests?.filter((r) => r.status === 'ACCEPTED') || [];
  const totalDocs = deal.documents?.length || 0;
  const approvedDocs = deal.documents?.filter((d) => d.status === 'APPROVED').length || 0;
  const upcomingAppointment = deal.appointments?.find(
    (a) => a.status === 'CONFIRMED' && new Date(a.startAt) > new Date()
  );

  // Determine current stage
  const getCurrentStage = () => {
    if (deal.status === 'CLOSED') return 'Ολοκληρώθηκε';
    if (deal.status === 'CANCELLED') return 'Ακυρώθηκε';
    if (acceptedProfessionals.length === 0) return 'Επιλογή Επαγγελματία';
    if (totalDocs === 0) return 'Αναμονή Εγγράφων';
    if (approvedDocs < totalDocs) return 'Εξέταση Εγγράφων';
    if (!upcomingAppointment) return 'Προγραμματισμός Ραντεβού';
    return 'Σε Εξέλιξη';
  };

  return (
    <CardSection title="Σύνοψη">
      <div className="space-y-4">
        {/* Property Snapshot */}
        {property && (
          <div className="flex items-start gap-3 pb-4 border-b-2 border-gray-200">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accentIcon} flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <FaBuilding className="text-white text-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate mb-1">{property.title}</p>
              <p className="text-xs text-gray-600 truncate">
                {property.city}, {property.state}
              </p>
            </div>
          </div>
        )}

        {/* Current Stage */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <FaCheckCircle className="text-white text-xs" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Τρέχον Στάδιο</p>
            <p className="text-sm font-bold text-gray-900">{getCurrentStage()}</p>
          </div>
        </div>

        {/* Selected Professionals */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-200">
          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
            <FaUserTie className="text-white text-xs" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Επαγγελματίες</p>
            <p className="text-sm font-bold text-gray-900">
              {acceptedProfessionals.length > 0
                ? `${acceptedProfessionals.length} επιλεγμένοι`
                : 'Κανένας'}
            </p>
          </div>
        </div>

        {/* Documents Progress */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <FaFileAlt className="text-white text-xs" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Έγγραφα</p>
            <p className="text-sm font-bold text-gray-900">
              {totalDocs > 0 ? `${approvedDocs}/${totalDocs} εγκεκριμένα` : 'Κανένα'}
            </p>
          </div>
        </div>

        {/* Next Appointment */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <FaCalendarAlt className="text-white text-xs" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Επόμενο Ραντεβού</p>
            <p className="text-sm font-bold text-gray-900">
              {upcomingAppointment?.startAt
                ? (() => {
                    const d = new Date(upcomingAppointment.startAt);
                    return !isNaN(d.getTime())
                      ? d.toLocaleDateString('el-GR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Κανένα';
                  })()
                : 'Κανένα'}
            </p>
          </div>
        </div>
      </div>
    </CardSection>
  );
}

