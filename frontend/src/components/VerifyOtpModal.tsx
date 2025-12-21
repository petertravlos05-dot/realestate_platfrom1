import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { buyerAgentApi } from '@/lib/api/buyer-agent';

interface VerifyOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  relationshipId: string;
  onSuccess: () => void;
}

export default function VerifyOtpModal({ isOpen, onClose, relationshipId, onSuccess }: VerifyOtpModalProps) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await buyerAgentApi.verifyOtp({
        relationshipId,
        otp
      });

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError('Λάθος κωδικός OTP. Παρακαλώ δοκιμάστε ξανά.');
      }
    } catch (err) {
      setError('Παρουσιάστηκε ένα σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Επαλήθευση OTP</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
              Κωδικός OTP
            </label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Εισάγετε τον κωδικό OTP"
              required
            />
          </div>

          {error && (
            <div className="mb-4 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Επαλήθευση...' : 'Επαλήθευση'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 