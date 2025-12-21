import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaBuilding, FaPaperPlane, FaKey, FaHandshake, FaEye, FaInfoCircle } from 'react-icons/fa';

interface PropertyOption {
  id: string;
  title: string;
}

interface AddInterestedBuyerModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (connectionId: string) => void;
  agentId: string;
  propertyId: string;
  properties: PropertyOption[];
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

  useEffect(() => {
    setSelectedPropertyId(propertyId);
  }, [propertyId]);

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
      const res = await fetch('/api/buyer-agent/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId,
          agentId: agentIdForOtp,
          propertyId: propertyIdForOtp,
          otpCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || data.message || 'Λάθος OTP.');
      } else {
        onSuccess(data.connection?.id || '');
      }
    } catch (err) {
      setOtpError('Σφάλμα δικτύου.');
    } finally {
      setOtpLoading(false);
    }
  };

  if (interestCancelled) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-8 text-center">
          <div className="mb-6">
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
              <FaHandshake className="w-10 h-10 text-blue-600" />
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Είχατε εκδηλώσει ενδιαφέρον για αυτό το ακίνητο και το αφαιρέσατε</h2>
          <p className="text-gray-700 mb-6">Αν θέλετε να ξαναενδιαφερθείτε, επικοινωνήστε με τους admin.</p>
          <button
            onClick={() => { setInterestCancelled(false); onClose(); }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Κλείσιμο
          </button>
        </div>
      </div>
    );
  }

  if (propertyViewedError) {
    const isOwnerError = propertyViewedError.code === 'PROPERTY_OWNER';
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.4
            }}
            className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden p-6 text-center"
          >
            <div className="mb-4">
              <span className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
                isOwnerError ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
              }`}>
                {isOwnerError ? (
                  <FaInfoCircle className="w-8 h-8" />
                ) : (
                  <FaEye className="w-8 h-8" />
                )}
              </span>
            </div>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">
              {isOwnerError ? 'Δεν μπορείτε να καταχωρήσετε αυτόν τον ενδιαφερόμενο' : 'Ο ενδιαφερόμενος έχει δει ήδη αυτό το ακίνητο'}
            </h2>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              {propertyViewedError.message}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setPropertyViewedError(null); onClose(); }}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Κατάλαβα
              </button>
              <button
                onClick={() => { setPropertyViewedError(null); }}
                className="w-full bg-gray-600 text-white py-2.5 rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
              >
                Δοκιμάστε με άλλον ενδιαφερόμενο
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#001f3f] text-white p-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Προσθήκη Ενδιαφερόμενου</h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Form */}
            {step === 'form' && (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {properties.length > 1 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      <FaBuilding className="inline-block mr-2" />
                      Επιλέξτε Ακίνητο
                    </label>
                    <select
                      value={selectedPropertyId}
                      onChange={e => setSelectedPropertyId(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f3f] focus:border-[#001f3f] outline-none transition-all duration-200"
                    >
                      <option value="">Επιλέξτε ακίνητο</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <FaUser className="inline-block mr-2" />
                    Ονοματεπώνυμο
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f3f] focus:border-[#001f3f] outline-none transition-all duration-200"
                    placeholder="Εισάγετε το ονοματεπώνυμο"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <FaEnvelope className="inline-block mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={e => setBuyerEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f3f] focus:border-[#001f3f] outline-none transition-all duration-200"
                    placeholder="Εισάγετε το email"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <FaPhone className="inline-block mr-2" />
                    Κινητό
                  </label>
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={e => setBuyerPhone(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f3f] focus:border-[#001f3f] outline-none transition-all duration-200"
                    placeholder="Εισάγετε το κινητό"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <FaPaperPlane className="inline-block mr-2" />
                    Αποστολή OTP μέσω:
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="otpMethod"
                        value="email"
                        checked={otpMethod === 'email'}
                        onChange={() => setOtpMethod('email')}
                        className="w-4 h-4 text-[#001f3f] focus:ring-[#001f3f]"
                      />
                      <span className="text-sm text-gray-700">Email</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="otpMethod"
                        value="sms"
                        checked={otpMethod === 'sms'}
                        onChange={() => setOtpMethod('sms')}
                        className="w-4 h-4 text-[#001f3f] focus:ring-[#001f3f]"
                      />
                      <span className="text-sm text-gray-700">SMS</span>
                    </label>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-xl text-sm font-medium shadow-md"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-red-500 text-lg">⚠️</span>
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}

                <div className="flex space-x-4 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading || (properties.length > 1 && !selectedPropertyId)}
                    className="flex-1 px-6 py-3 bg-[#001f3f] text-white rounded-lg font-medium hover:bg-[#001f3f]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#001f3f] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? 'Αποστολή...' : 'Καταχώρηση'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#001f3f] transition-all duration-200"
                  >
                    Άκυρο
                  </motion.button>
                </div>
              </form>
            )}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <FaKey className="inline-block mr-2" />
                    Εισάγετε τον 8-ψήφιο OTP κωδικό που στάλθηκε στον αγοραστή
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    required
                    maxLength={8}
                    minLength={8}
                    pattern="[0-9]{8}"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f3f] focus:border-[#001f3f] outline-none transition-all duration-200 tracking-widest text-lg text-center"
                    placeholder="π.χ. 12345678"
                  />
                </div>
                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 text-red-600 p-3 rounded-lg text-sm"
                  >
                    {otpError}
                  </motion.div>
                )}
                <div className="flex space-x-4 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={otpLoading || otpCode.length !== 8}
                    className="flex-1 px-6 py-3 bg-[#001f3f] text-white rounded-lg font-medium hover:bg-[#001f3f]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#001f3f] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {otpLoading ? 'Επαλήθευση...' : 'Επαλήθευση OTP'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#001f3f] transition-all duration-200"
                  >
                    Άκυρο
                  </motion.button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddInterestedBuyerModal; 