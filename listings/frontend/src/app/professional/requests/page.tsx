'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FaSpinner, FaCheckCircle, FaTimesCircle, FaBuilding, FaCircle } from 'react-icons/fa';
import { getMyRequests, ProfessionalRequest, acceptProfessionalRequest, declineProfessionalRequest } from '@/lib/api/professionals';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import ForbiddenState from '@/components/common/ForbiddenState';
import { createProfessionalSSEClient, SSEEvent, SSESnapshot } from '@/lib/realtime/sseClient';

export default function ProfessionalRequestsPage() {
  const { role, status, isAuthenticated, userId } = useCurrentUser();
  const router = useRouter();
  const [requests, setRequests] = useState<ProfessionalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const sseClientRef = useRef<ReturnType<typeof createProfessionalSSEClient> | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      // Role gating: LAWYER, NOTARY, ENGINEER can access
      if (role !== 'LAWYER' && role !== 'NOTARY' && role !== 'ENGINEER') {
        return;
      }
      fetchRequests();
    }
  }, [status, isAuthenticated, role]);

  // Setup SSE connection for professional events
  useEffect(() => {
    if (!isAuthenticated || (role !== 'LAWYER' && role !== 'NOTARY' && role !== 'ENGINEER')) {
      return;
    }

    const client = createProfessionalSSEClient(
      (event: SSEEvent | SSESnapshot) => {
        if (event.type === 'snapshot') {
          // Initial snapshot received
          return;
        }

        const sseEvent = event as SSEEvent;
        
        if (sseEvent.type === 'request_received') {
          // Refresh requests list when new request arrives
          fetchRequests();
        }
      },
      {
        onConnect: () => {
          setConnectionStatus('connected');
        },
        onError: () => {
          setConnectionStatus('reconnecting');
        },
        onDisconnect: () => {
          setConnectionStatus('disconnected');
        },
      }
    );

    sseClientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      sseClientRef.current = null;
    };
  }, [isAuthenticated, role]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await getMyRequests();
      setRequests(response.requests);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      if (error.message?.includes('404')) {
        toast.error('Δεν βρέθηκε επαγγελματικό προφίλ. Παρακαλώ εγγραφείτε πρώτα.');
        router.push('/professional/profile');
      } else {
        toast.error(error.message || 'Αποτυχία φόρτωσης αιτημάτων');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (dealId: string, requestId: string) => {
    try {
      await acceptProfessionalRequest(dealId, requestId);
      toast.success('Το αίτημα αποδεχτήθηκε');
      fetchRequests();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      toast.error(error.message || 'Αποτυχία αποδοχής αιτήματος');
    }
  };

  const handleDecline = async (dealId: string, requestId: string) => {
    try {
      await declineProfessionalRequest(dealId, requestId);
      toast.success('Το αίτημα απορρίφθηκε');
      fetchRequests();
    } catch (error: any) {
      console.error('Error declining request:', error);
      toast.error(error.message || 'Αποτυχία απόρριψης αιτήματος');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Φόρτωση αιτημάτων...</p>
        </div>
      </div>
    );
  }

  // Role gating: Only LAWYER and NOTARY can access
  if (role !== 'LAWYER' && role !== 'NOTARY') {
    return (
      <ForbiddenState
        title="Δεν έχετε πρόσβαση"
        subtitle="Αυτή η σελίδα είναι διαθέσιμη μόνο για δικηγόρους, συμβολαιογράφους και πολιτικούς μηχανικούς."
        backHref="/"
        backLabel="Επιστροφή στην Αρχική"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Αιτήματα Επαγγελματιών</h1>
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2 text-sm">
              <FaCircle
                className={`text-xs ${
                  connectionStatus === 'connected'
                    ? 'text-green-500'
                    : connectionStatus === 'reconnecting'
                    ? 'text-yellow-500 animate-pulse'
                    : 'text-gray-400'
                }`}
              />
              <span className="text-gray-600">
                {connectionStatus === 'connected'
                  ? 'Συνδεδεμένο'
                  : connectionStatus === 'reconnecting'
                  ? 'Επανασύνδεση...'
                  : 'Αποσυνδεδεμένο'}
              </span>
            </div>
          </div>
          <p className="mt-2 text-gray-600">Διαχειριστείτε τα αιτήματα που έχετε λάβει</p>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FaBuilding className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Δεν υπάρχουν αιτήματα</h3>
            <p className="text-gray-600">Όταν λάβετε νέα αιτήματα, θα εμφανίζονται εδώ</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {request.dealRoom?.property?.title || 'Ακίνητο'}
                      </h2>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          request.status === 'ACCEPTED'
                            ? 'bg-green-100 text-green-800'
                            : request.status === 'DECLINED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {request.status === 'ACCEPTED'
                          ? 'Αποδεκτό'
                          : request.status === 'DECLINED'
                          ? 'Απορριφθέν'
                          : 'Σε αναμονή'}
                      </span>
                    </div>

                    {request.dealRoom?.property && (
                      <div className="text-gray-600 mb-4">
                        <p>
                          {request.dealRoom.property.street} {request.dealRoom.property.number},{' '}
                          {request.dealRoom.property.city}
                        </p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          €{request.dealRoom.property.price.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {request.message && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-700">{request.message}</p>
                      </div>
                    )}

                    {request.requestedBy && (
                      <p className="text-sm text-gray-600">
                        Αίτημα από: <span className="font-medium">{request.requestedBy.name}</span>
                      </p>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(request.createdAt).toLocaleDateString('el-GR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {request.status === 'REQUESTED' && (
                      <>
                        <button
                          onClick={() => handleAccept(request.dealRoomId, request.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                          <FaCheckCircle />
                          Αποδοχή
                        </button>
                        <button
                          onClick={() => handleDecline(request.dealRoomId, request.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                        >
                          <FaTimesCircle />
                          Απόρριψη
                        </button>
                      </>
                    )}
                    {request.status === 'ACCEPTED' && request.dealRoom && (
                      <Link
                        href={`/deals/${request.dealRoom.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
                      >
                        Άνοιγμα Συναλλαγής
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

