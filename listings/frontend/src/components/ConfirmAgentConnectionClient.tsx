'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@headlessui/react';
import { apiClient } from '@/lib/api/client';

interface ConfirmAgentConnectionClientProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  propertyId: string;
  agentName: string;
}

export default function ConfirmAgentConnectionClient({
  isOpen,
  onClose,
  agentId,
  propertyId,
  agentName,
}: ConfirmAgentConnectionClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/buyer-agent/connect', {
        agentId,
        propertyId,
      });

      onClose();
      router.refresh();
      router.push('/dashboard/buyer');
    } catch (error) {
      console.error('Error connecting with agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center">
        <div className="fixed inset-0 bg-black/30" />

        <div className="relative mx-auto max-w-md rounded-lg bg-white p-6 shadow-lg">
          <Dialog.Title className="text-lg font-medium">
            Connect with {agentName}
          </Dialog.Title>

          <div className="mt-4">
            <p>
              Would you like to connect with {agentName} regarding this property?
              They will be able to contact you and assist with your inquiry.
            </p>
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={handleConnect}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
} 