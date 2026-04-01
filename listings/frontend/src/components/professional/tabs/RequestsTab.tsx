'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Inbox,
  MapPin,
  UserCircle2,
  CheckCircle2,
  Loader2,
  ArrowRight,
  User,
  Clock3,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ProfessionalRequest, acceptProfessionalRequest, declineProfessionalRequest } from '@/lib/api/professionals';

interface RequestsTabProps {
  requests: ProfessionalRequest[];
  loading?: boolean;
  onRefresh: () => void;
}

export default function RequestsTab({ requests, loading, onRefresh }: RequestsTabProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (dealId: string, requestId: string) => {
    if (processingId) return;
    setProcessingId(requestId);
    try {
      await acceptProfessionalRequest(dealId, requestId);
      toast.success('Το αίτημα αποδεκτήθηκε');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Αποτυχία αποδοχής αιτήματος');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (dealId: string, requestId: string) => {
    if (processingId) return;
    if (!confirm('Είστε σίγουροι ότι θέλετε να απορρίψετε αυτό το αίτημα;')) return;
    setProcessingId(requestId);
    try {
      await declineProfessionalRequest(dealId, requestId);
      toast.success('Το αίτημα απορρίφθηκε');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Αποτυχία απόρριψης αιτήματος');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Filter requests by status
  const pendingRequests = requests.filter(r => r.status === 'REQUESTED');
  const acceptedRequests = requests.filter(r => r.status === 'ACCEPTED');

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin w-8 h-8 text-teal-600" />
        </div>
      </div>
    );
  }

  const pendingCount = pendingRequests.length;

  return (
    <div className="space-y-8 bg-slate-50">
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Νέα Αιτήματα Συνεργασίας</h2>
            <span className="inline-flex items-center h-6 px-2 rounded-full bg-teal-100 text-teal-800 text-xs font-medium">
              {pendingCount}
            </span>
          </div>
          <button
            onClick={onRefresh}
            className="h-10 px-4 rounded-lg border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm font-medium inline-flex items-center gap-2"
            title="Ανανέωση"
          >
            <RefreshCw className="w-4 h-4" />
            Ανανέωση
          </button>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
            <Inbox className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Κανένα νέο αίτημα</h3>
            <p className="text-slate-500 max-w-xl mx-auto">
              Μόλις κάποιος πελάτης σας επιλέξει για μια συναλλαγή, το αίτημά του θα εμφανιστεί εδώ.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => {
              const isProcessing = processingId === request.id;
              const clientName = request.requestedBy?.name || 'Γιώργος Παπαδόπουλος';
              const propertyTitle = request.dealRoom?.property?.title || 'Διαμέρισμα Παλαιό Φάληρο';
              return (
                <div
                  key={request.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <UserCircle2 className="w-6 h-6 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-slate-900">{clientName}</p>
                          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <User className="w-3.5 h-3.5" />
                            Αγοραστής
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 inline-flex items-center gap-2 text-sm text-slate-700">
                        <MapPin className="w-4 h-4 text-teal-600" />
                        <span className="font-medium">{propertyTitle}</span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Clock3 className="w-3.5 h-3.5" />
                        Νέο αίτημα στις {formatDate(request.createdAt)}
                      </div>

                      {request.message && (
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <p className="text-sm text-slate-600">
                            <span className="font-medium text-slate-700">Μήνυμα πελάτη:</span> {request.message}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row xl:flex-col gap-2.5 xl:w-52 shrink-0">
                      <button
                        onClick={() => handleAccept(request.dealRoomId, request.id)}
                        disabled={isProcessing}
                        className="h-10 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Αποδοχή
                      </button>
                      <button
                        onClick={() => handleDecline(request.dealRoomId, request.id)}
                        disabled={isProcessing}
                        className="h-10 px-4 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Απόρριψη
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Accepted Requests */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Ενεργές Συνεργασίες</h2>
        </div>
        {acceptedRequests.length === 0 ? (
          <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm text-center">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Δεν υπάρχουν ενεργές συνεργασίες</h3>
            <p className="text-slate-500">Τα αποδεκτά αιτήματα θα εμφανιστούν εδώ με άμεση πρόσβαση στο Deal Room.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {acceptedRequests.map((request) => {
              const propertyTitle = request.dealRoom?.property?.title || 'Διαμέρισμα Παλαιό Φάληρο';
              const clientName = request.requestedBy?.name || 'Γ. Παπαδόπουλος';
              return (
                <div
                  key={request.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-teal-300 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{propertyTitle}</p>
                        <p className="text-sm text-slate-500 mt-1">Αποδεκτό στις {formatDate(request.createdAt)}</p>
                      </div>
                    </div>

                    <div className="text-sm text-slate-600 lg:text-center">
                      Πελάτης: <span className="font-medium text-slate-800">{clientName}</span>
                    </div>

                    <div className="lg:ml-auto">
                      <Link
                        href={`/deals/${request.dealRoomId}?tab=overview`}
                        className="h-10 px-4 rounded-lg bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700 font-medium transition-colors inline-flex items-center gap-2"
                      >
                        Μετάβαση στο Deal Room
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
