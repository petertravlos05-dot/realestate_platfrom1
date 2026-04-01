'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaTimes, FaSpinner, FaCircle } from 'react-icons/fa';
import { getDeal, DealRoom } from '@/lib/api/deals';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { createDealSSEClient, SSEEvent, SSESnapshot } from '@/lib/realtime/sseClient';
import PurchaseGuideStepper from './PurchaseGuideStepper';
import StageContent from './StageContent';
import DealRoomHeader from './DealRoomHeader';

interface DealRoomModalProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * DealRoomModal - Full-screen drawer for Deal Room
 * 
 * Architecture:
 * - Opens as full-screen overlay from Buyer Dashboard
 * - Shows stage-based purchase guide on left
 * - Shows stage-specific content on right
 * - Handles SSE connection for real-time updates
 */
export default function DealRoomModal({ dealId, isOpen, onClose }: DealRoomModalProps) {
  const router = useRouter();
  const { isAuthenticated } = useCurrentUser();
  const [deal, setDeal] = useState<DealRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [sseEvents, setSseEvents] = useState<SSEEvent[]>([]);
  const sseClientRef = useRef<ReturnType<typeof createDealSSEClient> | null>(null);

  // Fetch deal data
  useEffect(() => {
    if (!isOpen || !isAuthenticated || !dealId) return;

    const fetchDeal = async () => {
      try {
        setLoading(true);
        const dealData = await getDeal(dealId);
        setDeal(dealData);
      } catch (err: any) {
        console.error('Error fetching deal:', err);
        toast.error(err.message || 'Αποτυχία φόρτωσης συναλλαγής');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchDeal();
  }, [isOpen, isAuthenticated, dealId, onClose]);

  // Setup SSE connection
  useEffect(() => {
    if (!isOpen || !isAuthenticated || !dealId || !deal) return;

    const client = createDealSSEClient(
      dealId,
      (event: SSEEvent | SSESnapshot) => {
        if (event.type === 'snapshot') {
          return;
        }

        const sseEvent = event as SSEEvent;
        setSseEvents((prev) => [...prev, sseEvent].slice(-30));

        // Refresh deal data on important events
        if (
          sseEvent.type === 'document_uploaded' ||
          sseEvent.type === 'document_reviewed' ||
          sseEvent.type === 'appointment_confirmed' ||
          sseEvent.type === 'professional_accepted'
        ) {
          getDeal(dealId).then(setDeal).catch(console.error);
        }
      },
      {
        onConnect: () => setConnectionStatus('connected'),
        onError: () => setConnectionStatus('reconnecting'),
        onDisconnect: () => setConnectionStatus('disconnected'),
      }
    );

    sseClientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      sseClientRef.current = null;
    };
  }, [isOpen, isAuthenticated, dealId, deal]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    if (!dealId) return;
    try {
      const dealData = await getDeal(dealId);
      setDeal(dealData);
    } catch (err: any) {
      console.error('Error refreshing deal:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="absolute inset-0 flex flex-col bg-white">
        {/* Header */}
        {deal && (
          <div className="flex-shrink-0 border-b border-gray-200 bg-white">
            <DealRoomHeader
              deal={deal}
              onRefresh={handleRefresh}
              connectionStatus={connectionStatus}
              onClose={onClose}
            />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Φόρτωση συναλλαγής...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && deal && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Purchase Guide Stepper */}
            <div className="w-80 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-gray-50">
              <PurchaseGuideStepper deal={deal} />
            </div>

            {/* Right: Stage Content */}
            <div className="flex-1 overflow-y-auto bg-white">
              <StageContent
                deal={deal}
                sseEvents={sseEvents}
                onRefresh={handleRefresh}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

