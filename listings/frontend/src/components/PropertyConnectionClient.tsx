'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ConfirmAgentConnectionModal } from './ConfirmAgentConnectionModal';
import { fetchFromBackend } from '@/lib/api/client';

interface PropertyConnectionClientProps {
  agentId: string;
  propertyId: string;
  agentName: string;
  propertyTitle: string;
  propertyImage: string;
  propertyLocation: string;
  propertyPrice: number;
  agentEmail: string;
  agentPhone: string;
  agentCompany?: string;
}

export function PropertyConnectionClient({
  agentId,
  propertyId,
  agentName,
  propertyTitle,
  propertyImage,
  propertyLocation,
  propertyPrice,
  agentEmail,
  agentPhone,
  agentCompany,
}: PropertyConnectionClientProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      if (session?.user) {
        try {
          const response = await fetchFromBackend('/buyer-agent/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              agentId,
              propertyId,
            }),
          });

          if (response.ok) {
            const { exists } = await response.json();
            if (exists) {
              router.push('/dashboard/buyer');
              return;
            }
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };

    checkConnection();
  }, [agentId, propertyId, session?.user, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
    }
  }, [status, router]);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Σύνδεση με τον Agent
      </button>

      <ConfirmAgentConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agentId={agentId}
        propertyId={propertyId}
        agentName={agentName}
        propertyTitle={propertyTitle}
        propertyImage={propertyImage}
        propertyLocation={propertyLocation}
        propertyPrice={propertyPrice}
        agentEmail={agentEmail}
        agentPhone={agentPhone}
        agentCompany={agentCompany}
      />
    </>
  );
} 