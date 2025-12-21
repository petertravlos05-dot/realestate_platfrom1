import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ConfirmAgentConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  propertyId: string;
  agentName: string;
  propertyTitle: string;
}

export default function ConfirmAgentConnectionModal({
  isOpen,
  onClose,
  agentId,
  propertyId,
  agentName,
  propertyTitle,
}: ConfirmAgentConnectionModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/buyer-agent/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          propertyId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm connection');
      }

      router.push('/dashboard/buyer');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Επιβεβαίωση Σύνδεσης</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Θέλετε να συνδεθείτε με τον μεσίτη <strong>{agentName}</strong> για το ακίνητο:
          </p>
          <p className="text-gray-900 font-medium">{propertyTitle}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            disabled={loading}
          >
            Άκυρο
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Επιβεβαίωση...' : 'Επιβεβαίωση'}
          </button>
        </div>
      </div>
    </div>
  );
} 