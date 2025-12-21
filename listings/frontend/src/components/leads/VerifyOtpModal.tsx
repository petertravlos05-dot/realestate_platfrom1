import React, { useState } from 'react';
import { apiClient } from '@/lib/api/client';

interface VerifyOtpModalProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  onSuccess: () => void;
}

const VerifyOtpModal: React.FC<VerifyOtpModalProps> = ({ open, onClose, connectionId, onSuccess }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/buyer-agent/verify-otp', {
        connectionId,
        otpCode: otp
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Σφάλμα κατά την επιβεβαίωση OTP.');
      setError('Σφάλμα δικτύου.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Επιβεβαίωση OTP</h2>
        <form onSubmit={handleSubmit}>
          <label>OTP Κωδικός</label>
          <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={8} minLength={8} />
          {error && <div className="error">{error}</div>}
          <div style={{ marginTop: 16 }}>
            <button type="submit" disabled={loading}>{loading ? 'Επιβεβαίωση...' : 'Επιβεβαίωση'}</button>
            <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>Άκυρο</button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: #fff;
          padding: 32px;
          border-radius: 8px;
          min-width: 320px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.15);
        }
        .error {
          color: #c00;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
};

export default VerifyOtpModal; 