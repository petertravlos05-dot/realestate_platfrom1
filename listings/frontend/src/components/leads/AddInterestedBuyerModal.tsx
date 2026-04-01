import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaBuilding, FaPaperPlane, FaKey, FaHandshake, FaEye, FaInfoCircle, FaChevronDown, FaSpinner, FaArrowLeft, FaCheck } from 'react-icons/fa';
import PropertyPickerModal, { type PropertyOptionExtended } from './PropertyPickerModal';
import { apiClient } from '@/lib/api/client';

interface AddInterestedBuyerModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (connectionId: string) => void;
  agentId: string;
  propertyId: string;
  properties: PropertyOptionExtended[];
}

const AddInterestedBuyerModal: React.FC<AddInterestedBuyerModalProps> = ({ 
  open, 
  onClose, 
  onSuccess, 
  agentId, 
  propertyId, 
  properties 
}) => {
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [otpMethod, setOtpMethod] = useState<'email' | 'sms'>('email');
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertyId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [agentIdForOtp, setAgentIdForOtp] = useState<string | null>(null);
  const [propertyIdForOtp, setPropertyIdForOtp] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [propertyViewedError, setPropertyViewedError] = useState<any>(null);
  const [interestCancelled, setInterestCancelled] = useState(false);
  const [isPropertyPickerOpen, setIsPropertyPickerOpen] = useState(false);

  useEffect(() => {
    setSelectedPropertyId(propertyId);
  }, [propertyId]);

  // Auto-select first property when only one available and none pre-selected
  useEffect(() => {
    if (properties.length === 1 && !propertyId && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, propertyId, selectedPropertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInterestCancelled(false);
    setPropertyViewedError(null);
    
    try {
      // Πρώτα ελέγχουμε αν υπάρχει ήδη χρήστης με αυτό το email
      const existingUserResponse = await fetch(`/api/users/check-email?email=${encodeURIComponent(buyerEmail)}`);
      let existingUser = null;
      
      if (existingUserResponse.ok) {
        const userData = await existingUserResponse.json();
        existingUser = userData.user;
      }

      // Αν υπάρχει χρήστης, ελέγχουμε αν έχει προβληθεί το ακίνητο
      if (existingUser) {
        // Έλεγχος αν ο χρήστης είναι ο ιδιοκτήτης του ακινήτου
        const propertyResponse = await fetch(`/api/properties/${selectedPropertyId}`);
        if (propertyResponse.ok) {
          const propertyData = await propertyResponse.json();
          if (propertyData.userId === existingUser.id) {
            setPropertyViewedError({
              code: 'PROPERTY_OWNER',
              message: 'Αυτός ο ενδιαφερόμενος είναι ο ιδιοκτήτης του ακινήτου. Δεν μπορείτε να τον καταχωρήσετε ως ενδιαφερόμενο γιατί του ανήκει το ακίνητο.'
            });
            setLoading(false);
            return;
          }
        }

        const viewResponse = await fetch(`/api/properties/${selectedPropertyId}/view?userEmail=${encodeURIComponent(buyerEmail)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (viewResponse.ok) {
          const viewData = await viewResponse.json();
          if (viewData.hasViewed) {
            setPropertyViewedError({
              code: 'PROPERTY_ALREADY_VIEWED',
              message: 'Ο ενδιαφερόμενος έχει ήδη δει τις λεπτομερείες αυτού του ακινήτου. Εκδηλώστε ενδιαφέρον μόνος/μόνη σας.'
            });
            setLoading(false);
            return;
          }
        }
      }

      // Έλεγχος για interestCancelled
      const cancelledRes = await fetch('/api/buyer-agent/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          agentId,
          buyerEmail,
          checkCancelled: true
        })
      });
      if (cancelledRes.ok) {
        const cancelledData = await cancelledRes.json();
        if (cancelledData.interestCancelled) {
          setInterestCancelled(true);
          setLoading(false);
          return;
        }
      }

      const res = await fetch('/api/buyer-agent/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          propertyId: selectedPropertyId,
          buyerName,
          buyerEmail,
          buyerPhone,
          otpMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'PROPERTY_ALREADY_VIEWED') {
          setPropertyViewedError({ code: data.error, message: data.message });
        } else if (data.error && data.error.includes('Δεν μπορείτε να εκδηλώσετε ενδιαφέρον για ακίνητο που έχετε καταχωρήσει εσείς')) {
          setPropertyViewedError({ 
            code: 'PROPERTY_OWNER', 
            message: 'Ο ενδιαφερόμενος είναι ο ιδιοκτήτης του ακινήτου. Δεν μπορείτε να τον προσθέσετε ως ενδιαφερόμενο για το δικό του ακίνητο.' 
          });
        } else {
          setError(data.error || data.message || 'Σφάλμα κατά την καταχώρηση.');
        }
      } else {
        setBuyerId(data.buyerId);
        setAgentIdForOtp(data.agentId);
        setPropertyIdForOtp(data.propertyId);
        setStep('otp');
      }
    } catch (err) {
      setError('Σφάλμα δικτύου.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError(null);
    try {
      const { data } = await apiClient.post('/buyer-agent/verify-otp', {
        buyerId,
        agentId: agentIdForOtp,
        propertyId: propertyIdForOtp,
        otpCode,
      });
      onSuccess(data.connection?.id || '');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Λάθος OTP.';
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  if (interestCancelled) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-8 text-center"
        >
          <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-100">
            <FaHandshake className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Είχατε αφαιρέσει το ενδιαφέρον</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">Για να ξαναενδιαφερθείτε, επικοινωνήστε με την υποστήριξη.</p>
          <button
            onClick={() => { setInterestCancelled(false); onClose(); }}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all duration-200"
          >
            Κλείσιμο
          </button>
        </motion.div>
      </div>
    );
  }

  if (propertyViewedError) {
    const isOwnerError = propertyViewedError.code === 'PROPERTY_OWNER';
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-8 text-center"
        >
          <div className={`mb-5 inline-flex items-center justify-center w-16 h-16 rounded-2xl ${
            isOwnerError ? 'bg-red-50' : 'bg-amber-50'
          }`}>
            {isOwnerError ? (
              <FaInfoCircle className="w-8 h-8 text-red-600" />
            ) : (
              <FaEye className="w-8 h-8 text-amber-600" />
            )}
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {isOwnerError ? 'Δεν μπορείτε να τον καταχωρήσετε' : 'Έχει δει ήδη το ακίνητο'}
          </h2>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            {propertyViewedError.message}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => { setPropertyViewedError(null); onClose(); }}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all"
            >
              Κατάλαβα
            </button>
            <button
              onClick={() => { setPropertyViewedError(null); }}
              className="w-full py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              Δοκιμάστε με άλλον ενδιαφερόμενο
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const inputBase = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 placeholder:text-gray-400';
  const selectedProp = properties.find(p => p.id === selectedPropertyId);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-5 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 text-sm font-bold">
                      {step === 'form' ? '1' : '2'}
                    </span>
                    <span className="text-sm text-white/80">
                      {step === 'form' ? 'Στοιχεία ενδιαφερομένου' : 'Επαλήθευση OTP'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">Προσθήκη Ενδιαφερόμενου</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 -m-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                  aria-label="Κλείσιμο"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              {/* Step progress */}
              <div className="flex gap-2 mt-4">
                <div className={`h-1 flex-1 rounded-full ${step === 'form' ? 'bg-white' : 'bg-white/40'}`} />
                <div className={`h-1 flex-1 rounded-full ${step === 'otp' ? 'bg-white' : 'bg-white/40'}`} />
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {step === 'form' && (
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {properties.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Ακίνητο</label>
                      <button
                        type="button"
                        onClick={() => setIsPropertyPickerOpen(true)}
                        className={`w-full px-4 py-3 rounded-xl border-2 text-left flex items-center justify-between gap-3 transition-all ${selectedPropertyId ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 bg-gray-50/50 hover:border-indigo-200'}`}
                      >
                        <span className={`truncate ${selectedPropertyId ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                          {selectedPropertyId ? (selectedProp?.title ?? 'Επιλέξτε') : 'Επιλέξτε ακίνητο (αναζήτηση, φίλτρα, χάρτης)'}
                        </span>
                        <FaChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </button>
                      <PropertyPickerModal
                        open={isPropertyPickerOpen}
                        onClose={() => setIsPropertyPickerOpen(false)}
                        properties={properties}
                        selectedId={selectedPropertyId}
                        onSelect={(id) => { setSelectedPropertyId(id); setIsPropertyPickerOpen(false); }}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ονοματεπώνυμο</label>
                    <div className="relative">
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={buyerName}
                        onChange={e => setBuyerName(e.target.value)}
                        required
                        className={`${inputBase} pl-11`}
                        placeholder="π.χ. Γιάννης Παπαδόπουλος"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <div className="relative">
                      <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={buyerEmail}
                        onChange={e => setBuyerEmail(e.target.value)}
                        required
                        className={`${inputBase} pl-11`}
                        placeholder="email@παράδειγμα.gr"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Τηλέφωνο</label>
                    <div className="relative">
                      <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={buyerPhone}
                        onChange={e => setBuyerPhone(e.target.value)}
                        required
                        className={`${inputBase} pl-11`}
                        placeholder="69X XXX XXXX"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Αποστολή κωδικού OTP</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setOtpMethod('email')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                          otpMethod === 'email'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 bg-gray-50/50 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <FaEnvelope className="w-4 h-4" />
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => setOtpMethod('sms')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                          otpMethod === 'sms'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 bg-gray-50/50 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <FaPhone className="w-4 h-4" />
                        SMS
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm"
                    >
                      <span className="text-red-500 text-lg flex-shrink-0">⚠</span>
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="submit"
                      disabled={loading || (properties.length > 0 && !selectedPropertyId)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 focus:ring-2 focus:ring-indigo-500/30 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? <><FaSpinner className="w-4 h-4 animate-spin" /> Αποστολή...</> : <><FaCheck /> Καταχώρηση</>}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="button"
                      onClick={onClose}
                      className="px-5 py-3.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                    >
                      Άκυρο
                    </motion.button>
                  </div>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="p-6 space-y-5">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 mb-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Ο κωδικός εστάλη σε</p>
                    <p className="font-semibold text-gray-900">{buyerName}</p>
                    <p className="text-sm text-gray-600">{otpMethod === 'email' ? buyerEmail : buyerPhone}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      8-ψήφιος κωδικός OTP
                    </label>
                    <div className="relative">
                      <FaKey className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        required
                        maxLength={8}
                        className={`${inputBase} pl-11 tracking-[0.4em] text-center text-lg font-mono`}
                        placeholder="12345678"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">Ζητήστε από τον ενδιαφερόμενο τον κωδικό που έλαβε</p>
                  </div>

                  {otpError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 rounded-xl bg-red-50 text-red-600 text-sm"
                    >
                      {otpError}
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="button"
                      onClick={() => setStep('form')}
                      className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                    >
                      <FaArrowLeft /> Πίσω
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="submit"
                      disabled={otpLoading || otpCode.length !== 8}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 focus:ring-2 focus:ring-indigo-500/30 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {otpLoading ? <><FaSpinner className="w-4 h-4 animate-spin" /> Επαλήθευση...</> : 'Επαλήθευση OTP'}
                    </motion.button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddInterestedBuyerModal; 