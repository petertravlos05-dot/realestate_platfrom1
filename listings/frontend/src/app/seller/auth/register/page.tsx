'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaHome, FaArrowRight, FaShieldAlt, FaCheckCircle, FaSearch, FaEnvelope, FaInfoCircle, FaQuestionCircle, FaUserCircle, FaChevronDown, FaExchangeAlt, FaCog, FaComments, FaSignOutAlt, FaPhone, FaBuilding, FaUserPlus, FaCrown, FaCheck, FaTimes, FaCreditCard } from 'react-icons/fa';
import Image from 'next/image';
import SellerNotificationBell from '@/components/notifications/SellerNotificationBell';
import { apiClient } from '@/lib/api/client';

function SellerRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  
  // Νέα state για τον τύπο χρήστη και τα πλάνα
  const [userType, setUserType] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');
  const [showPlans, setShowPlans] = useState(false);

  // Λήψη του callback URL από τα query parameters
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard/seller';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Φόρτωση συνδρομητικών πλάνων
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data: plans } = await apiClient.get('/subscription-plans');
        setSubscriptionPlans(plans);
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
      }
    };

    fetchPlans();
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const handleChangeRole = () => {
    router.push('/');
  };

  const handleStripeCheckout = async (planId: string) => {
    try {
      setLoading(true);
      const { data } = await apiClient.post('/stripe/create-checkout-session', {
        planId,
        billingCycle,
      });

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Σφάλμα κατά τη δημιουργία της πληρωμής');
      }
    } catch (error: any) {
      setError(error?.response?.data?.error || 'Σφάλμα κατά τη σύνδεση με το σύστημα πληρωμών');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);

    const data = {
      // For individual users, use the basic fields
      // For company users, use the company name as the main user name
      name: userType === 'COMPANY' 
        ? formData.get('companyName')?.toString() || ''
        : formData.get('name')?.toString() || '',
      email: userType === 'COMPANY'
        ? formData.get('contactPersonEmail')?.toString() || ''
        : formData.get('email')?.toString() || '',
      password: formData.get('password')?.toString() || '',
      confirmPassword: formData.get('confirmPassword')?.toString() || '',
      phone: userType === 'COMPANY'
        ? formData.get('contactPersonPhone')?.toString() || ''
        : formData.get('phone')?.toString() || '',
      companyName: formData.get('companyName')?.toString() || '',
      companyTitle: formData.get('companyTitle')?.toString() || '',
      companyTaxId: formData.get('companyTaxId')?.toString() || '',
      companyDou: formData.get('companyDou')?.toString() || '',
      companyPhone: formData.get('companyPhone')?.toString() || '',
      companyEmail: formData.get('companyEmail')?.toString() || '',
      companyHeadquarters: formData.get('companyHeadquarters')?.toString() || '',
      companyWebsite: formData.get('companyWebsite')?.toString() || '',
      companyWorkingHours: formData.get('companyWorkingHours')?.toString() || '',
      contactPersonName: formData.get('contactPersonName')?.toString() || '',
      contactPersonEmail: formData.get('contactPersonEmail')?.toString() || '',
      contactPersonPhone: formData.get('contactPersonPhone')?.toString() || '',
      companyLogo: formData.get('companyLogo')?.toString() || '',
      role: 'SELLER',
      userType: userType,
    };

    try {
      const { data: result } = await apiClient.post('/auth/register', data);

      // Αυτόματη σύνδεση μετά την εγγραφή
      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        role: data.role,
        redirect: false,
      });

      if (signInResult?.error) {
        setError(signInResult.error);
      } else {
        // Ανακατεύθυνση στο callback URL ή στο dashboard
        router.push(callbackUrl);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: FaShieldAlt,
      title: 'Ασφαλής Εγγραφή',
      description: 'Τα δεδομένα σας προστατεύονται με κρυπτογράφηση SSL'
    },
    {
      icon: FaCheckCircle,
      title: 'Γρήγορη Δημιουργία',
      description: 'Δημιουργήστε λογαριασμό σε λίγα δευτερόλεπτα'
    },
    {
      icon: FaHome,
      title: 'Διαχείριση Ακινήτων',
      description: 'Ξεκινήστε να πουλάτε και να διαχειρίζεστε τα ακίνητά σας'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Enhanced Header */}
      <header className="fixed w-full z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Link href="/seller" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-sm" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  RealEstate
                </span>
              </Link>
              
              <div className="relative" ref={roleMenuRef}>
                <button
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-full shadow-md transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                >
                  <FaUserCircle className="mr-2" />
                  Seller Mode
                  <FaChevronDown className="ml-2 text-xs" />
                </button>
                {isRoleMenuOpen && (
                  <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Αλλαγή Ρόλου</p>
                    </div>
                    <Link
                      href="/buyer"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                    >
                      <FaExchangeAlt className="mr-3 text-green-500" />
                      Buyer Mode
                    </Link>
                    <Link
                      href="/agent"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                    >
                      <FaExchangeAlt className="mr-3 text-green-500" />
                      Agent Mode
                    </Link>
                    <Link
                      href="/"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                    >
                      <FaExchangeAlt className="mr-3 text-green-500" />
                      Επιλογή Ρόλου
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              <Link
                href="/seller"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-700 hover:bg-green-50 hover:text-green-600"
              >
                <FaHome className="mr-2" />
                Αρχική
              </Link>
              <Link
                href="/add-listing"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-700 hover:bg-green-50 hover:text-green-600"
              >
                <FaSearch className="mr-2" />
                Προσθήκη Ακινήτου
              </Link>
              <Link
                href="/seller/contact"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-700 hover:bg-green-50 hover:text-green-600"
              >
                <FaEnvelope className="mr-2" />
                Επικοινωνία
              </Link>
              <Link
                href="/seller/about"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-700 hover:bg-green-50 hover:text-green-600"
              >
                <FaInfoCircle className="mr-2" />
                Σχετικά
              </Link>
              <Link
                href="/seller/how-it-works"
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-700 hover:bg-green-50 hover:text-green-600"
              >
                <FaQuestionCircle className="mr-2" />
                Πώς Λειτουργεί
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              {status === 'authenticated' ? (
                <>
                  <Link
                    href="/dashboard/seller"
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-md bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                  >
                    Dashboard
                  </Link>
                  <SellerNotificationBell />
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                    >
                      <FaUser className="w-4 h-4" />
                    </button>
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl py-2 border border-gray-100">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{session?.user?.name || 'Χρήστης'}</p>
                          <p className="text-xs text-gray-500">{session?.user?.email}</p>
                        </div>
                        <Link
                          href="/dashboard/seller/profile"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                        >
                          <FaCog className="mr-3 text-green-500" />
                          Ρυθμίσεις
                        </Link>
                        <Link
                          href="/dashboard/seller/messages"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                        >
                          <FaComments className="mr-3 text-green-500" />
                          Μηνύματα
                        </Link>
                        <Link
                          href="/seller/how-it-works#faq"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                        >
                          <FaQuestionCircle className="mr-3 text-green-500" />
                          Συχνές Ερωτήσεις
                        </Link>
                        <div className="border-t border-gray-100 my-1"></div>
                        <Link
                          href="/"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors duration-200"
                        >
                          <FaExchangeAlt className="mr-3 text-green-500" />
                          Αλλαγή Ρόλων
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                        >
                          <FaSignOutAlt className="mr-3" />
                          Αποσύνδεση
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/seller/auth/login"
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-700 hover:bg-gray-100"
                  >
                    Σύνδεση
                  </Link>
                  <Link
                    href="/seller/auth/register"
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-md bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                  >
                    Εγγραφή
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Centered Content */}
            <div className="max-w-6xl mx-auto">
              {/* Header Section */}
        <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-12"
              >
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                    Ξεκινήστε να πουλάτε με την <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">RealEstate</span>
                  </h1>
                <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                    Δημιουργήστε λογαριασμό πωλητή για να ξεκινήσετε να πουλάτε ακίνητα και να φτάσετε σε ενδιαφερομένους αγοραστές
              </p>
              </motion.div>

              {/* Features Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
              >
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                    className="text-center p-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
                      <feature.icon className="w-8 h-8 text-white" />
                      </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                        <p className="text-gray-600">{feature.description}</p>
                    </motion.div>
                  ))}
              </motion.div>

              {/* Register Form Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="w-full max-w-5xl mx-auto"
              >
                <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
                  {/* Επιλογή Τύπου Χρήστη */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 backdrop-blur-sm rounded-2xl p-8 border border-blue-200/50 shadow-xl"
                  >
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Τύπος Εγγραφής</h3>
                      <p className="text-gray-600">Επιλέξτε πώς θέλετε να εγγραφείτε στην πλατφόρμα</p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setUserType('INDIVIDUAL');
                          setShowPlans(false);
                        }}
                        className={`relative p-8 rounded-2xl border-2 transition-all duration-300 ${
                          userType === 'INDIVIDUAL'
                            ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl transform scale-105'
                            : 'border-gray-200 bg-white shadow-lg hover:shadow-xl hover:border-green-300'
                        }`}
                      >
                        <div className="text-center">
                          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                            userType === 'INDIVIDUAL'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            <FaUser className="w-8 h-8" />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 mb-2">Ιδιώτης</h4>
                          <p className="text-sm text-gray-600 mb-4">Εγγραφή ως ιδιώτης πωλητής</p>
                          <div className="space-y-2 text-sm text-gray-500">
                            <div className="flex items-center justify-center">
                              <FaCheck className="w-4 h-4 text-green-500 mr-2" />
                              <span>Δωρεάν εγγραφή</span>
                            </div>
                            <div className="flex items-center justify-center">
                              <FaCheck className="w-4 h-4 text-green-500 mr-2" />
                              <span>Απεριόριστα ακίνητα</span>
                            </div>
                            <div className="flex items-center justify-center">
                              <FaCheck className="w-4 h-4 text-green-500 mr-2" />
                              <span>Βασικά χαρακτηριστικά</span>
                            </div>
                          </div>
                        </div>
                        {userType === 'INDIVIDUAL' && (
                          <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-2">
                            <FaCheck className="w-4 h-4" />
                          </div>
                        )}
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setUserType('COMPANY');
                          setShowPlans(true);
                        }}
                        className={`relative p-8 rounded-2xl border-2 transition-all duration-300 ${
                          userType === 'COMPANY'
                            ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl transform scale-105'
                            : 'border-gray-200 bg-white shadow-lg hover:shadow-xl hover:border-green-300'
                        }`}
                      >
                        <div className="text-center">
                          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                            userType === 'COMPANY'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-purple-100 text-purple-600'
                          }`}>
                            <FaBuilding className="w-8 h-8" />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 mb-2">Μεσιτική Εταιρεία</h4>
                          <p className="text-sm text-gray-600 mb-4">Εγγραφή ως μεσιτική εταιρεία</p>
                          <div className="space-y-2 text-sm text-gray-500">
                            <div className="flex items-center justify-center">
                              <FaCrown className="w-4 h-4 text-purple-500 mr-2" />
                              <span>Συνδρομητικά πλάνα</span>
                            </div>
                            <div className="flex items-center justify-center">
                              <FaCrown className="w-4 h-4 text-purple-500 mr-2" />
                              <span>Προηγμένα χαρακτηριστικά</span>
                            </div>
                            <div className="flex items-center justify-center">
                              <FaCrown className="w-4 h-4 text-purple-500 mr-2" />
                              <span>Επαγγελματική υποστήριξη</span>
                            </div>
                          </div>
                        </div>
                        {userType === 'COMPANY' && (
                          <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-2">
                            <FaCheck className="w-4 h-4" />
                          </div>
                        )}
                      </motion.button>
                      </div>
                    </motion.div>

                  {/* Εξήγηση για το μοντέλο συνδρομής */}
                  {userType === 'COMPANY' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-lg"
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <FaInfoCircle className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-lg font-semibold text-blue-900 mb-2">Συνδρομητικό Μοντέλο</h4>
                          <p className="text-blue-800 mb-3">
                            Η πλατφόρμα μας λειτουργεί με σύγχρονο συνδρομητικό μοντέλο αντί για παραδοσιακή μεσιτική προμήθεια.
                          </p>
                          <div className="space-y-2 text-sm text-blue-700">
                            <div className="flex items-center">
                              <FaCheck className="w-4 h-4 text-blue-600 mr-2" />
                              <span>Σταθερή μηνιαία/τριμηνιαία συνδρομή</span>
                            </div>
                            <div className="flex items-center">
                              <FaCheck className="w-4 h-4 text-blue-600 mr-2" />
                              <span>Χωρίς κρυφά κόστη ή προμήθειες</span>
                            </div>
                            <div className="flex items-center">
                              <FaCheck className="w-4 h-4 text-blue-600 mr-2" />
                              <span>Προβλέψιμα έξοδα για την επιχείρησή σας</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Συνδρομητικά Πλάνα */}
                  {userType === 'COMPANY' && showPlans && (
                    subscriptionPlans.length > 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 backdrop-blur-sm rounded-2xl p-8 border border-green-200/50 shadow-xl"
                    >
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Επιλέξτε Συνδρομητικό Πλάνο</h3>
                        <p className="text-gray-600">Επιλέξτε το πλάνο που ταιριάζει καλύτερα στις ανάγκες της εταιρείας σας</p>
                      </div>
                      
                      {/* Billing Cycle Toggle */}
                      <div className="flex justify-center mb-8">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-1 shadow-lg border border-gray-200">
                          <button
                            type="button"
                            onClick={() => setBillingCycle('MONTHLY')}
                            className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                              billingCycle === 'MONTHLY'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform scale-105'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                          >
                            Μηνιαία
                          </button>
                          <button
                            type="button"
                            onClick={() => setBillingCycle('QUARTERLY')}
                            className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                              billingCycle === 'QUARTERLY'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform scale-105'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                          >
                            Τριμηνιαία
                            <span className="ml-2 bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">
                              -10%
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Plans Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8 max-w-6xl mx-auto">
                        {subscriptionPlans.map((plan, index) => (
                          <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className={`relative group cursor-pointer ${
                              selectedPlan === plan.id
                                ? 'transform scale-105'
                                : 'hover:scale-102'
                            } transition-all duration-300`}
                            onClick={() => setSelectedPlan(plan.id)}
                          >
                            <div className={`relative p-8 rounded-2xl border-2 transition-all duration-300 ${
                              selectedPlan === plan.id
                                ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl'
                                : plan.name === 'Pro'
                                ? 'border-emerald-300 bg-gradient-to-br from-white to-emerald-50/50 shadow-lg hover:shadow-xl'
                                : 'border-gray-200 bg-white shadow-lg hover:shadow-xl hover:border-gray-300'
                            }`}>
                              
                              {/* Popular Badge */}
                              {plan.name === 'Pro' && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                  <span className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                                    ⭐ Δημοφιλές
                                  </span>
                                </div>
                              )}
                              
                              {/* Plan Icon */}
                              <div className="text-center mb-6">
                                <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                                  plan.name === 'Basic' 
                                    ? 'bg-blue-100 text-blue-600' 
                                    : plan.name === 'Pro'
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : 'bg-purple-100 text-purple-600'
                                }`}>
                                  {plan.name === 'Basic' && <FaUser className="w-8 h-8" />}
                                  {plan.name === 'Pro' && <FaCrown className="w-8 h-8" />}
                                  {plan.name === 'Enterprise' && <FaBuilding className="w-8 h-8" />}
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h4>
                                {plan.description && (
                                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                                )}
                              </div>
                              
                              {/* Price */}
                              <div className="text-center mb-6">
                                <div className="flex items-center justify-center">
                                  <span className="text-4xl font-bold text-gray-900">
                                    €{billingCycle === 'QUARTERLY' ? plan.priceQuarterly : plan.price}
                                  </span>
                                  <div className="ml-2">
                                    <div className="text-sm text-gray-500">
                                      /{billingCycle === 'QUARTERLY' ? 'τρίμηνο' : 'μήνα'}
                                    </div>
                                    {billingCycle === 'QUARTERLY' && (
                                      <div className="text-xs text-green-600 font-medium">
                                        Εξοικονόμηση 10%
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Features */}
                              <div className="space-y-3 mb-8">
                                <div className="flex items-center text-sm text-gray-700">
                                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                    <FaCheck className="w-3 h-3 text-green-600" />
                                  </div>
                                  <span className="font-medium">{plan.maxProperties} ακίνητα</span>
                                </div>
                                {plan.benefits.map((benefit: string, benefitIndex: number) => (
                                  <div key={benefitIndex} className="flex items-center text-sm text-gray-600">
                                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                      <FaCheck className="w-3 h-3 text-green-600" />
                                    </div>
                                    {benefit}
                                  </div>
                                ))}
                              </div>
                              
                              {/* Select Button */}
                              <button
                                type="button"
                                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                                  selectedPlan === plan.id
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                                    : plan.name === 'Pro'
                                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-lg'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                                }`}
                              >
                                {selectedPlan === plan.id ? '✓ Επιλεγμένο' : 'Επιλογή'}
                              </button>
                </div>
              </motion.div>
                        ))}
                      </div>

                      {/* Payment Section */}
                      {selectedPlan && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                          className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-green-200 shadow-lg max-w-4xl mx-auto"
                        >
                          <div className="text-center">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">
                              Έτοιμοι να ξεκινήσετε;
                            </h4>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                              <button
                                type="button"
                                onClick={() => handleStripeCheckout(selectedPlan)}
                                disabled={loading}
                                className="inline-flex items-center px-8 py-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                              >
                                <FaCreditCard className="mr-3" />
                                {loading ? 'Προετοιμασία...' : 'Πληρωμή με Stripe'}
                              </button>
                              <div className="text-center sm:text-left">
                                <p className="text-sm text-gray-600">
                                  Ή προχωρήστε με την εγγραφή τώρα
                                </p>
                                <p className="text-xs text-gray-500">
                                  και πληρώστε αργότερα
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 backdrop-blur-sm rounded-2xl p-8 border border-green-200/50 shadow-xl"
                      >
                        <div className="text-center py-12">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Φόρτωση Πλάνων</h3>
                          <p className="text-gray-600">Παρακαλώ περιμένετε...</p>
                        </div>
                      </motion.div>
                    )
                  )}
              {error && (
                <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl relative"
                  role="alert"
                >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">{error}</p>
                        </div>
                      </div>
                </motion.div>
              )}

                  {/* Form Fields Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 shadow-lg"
                  >
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                      {userType === 'COMPANY' ? 'Στοιχεία Εταιρείας' : 'Στοιχεία Εγγραφής'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Name Field - Only for Individual */}
                      {userType === 'INDIVIDUAL' && (
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Ονοματεπώνυμο
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                        autoComplete="name"
                      required
                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                               bg-white/70 backdrop-blur-sm transition-all duration-200"
                      placeholder="Εισάγετε το ονοματεπώνυμό σας"
                    />
                    
                  </div>
                </div>
                    )}

                      {/* Email Field - Only for Individual */}
                      {userType === 'INDIVIDUAL' && (
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaEnvelope className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                               bg-white/70 backdrop-blur-sm transition-all duration-200"
                      placeholder="Εισάγετε το email σας"
                    />
                  </div>
                </div>
                      )}

                      {/* Phone Field - Only for Individual */}
                      {userType === 'INDIVIDUAL' && (
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Τηλέφωνο
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaPhone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                        autoComplete="tel"
                      required
                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                               bg-white/70 backdrop-blur-sm transition-all duration-200"
                      placeholder="Εισάγετε το τηλέφωνό σας"
                    />
                  </div>
                </div>
                      )}

                  {/* Company Name Field */}
                <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                    {userType === 'COMPANY' ? 'Όνομα Εταιρείας' : 'Όνομα Εταιρείας (προαιρετικό)'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaBuilding className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required={userType === 'COMPANY'}
                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                 bg-white/70 backdrop-blur-sm transition-all duration-200"
                        placeholder={userType === 'COMPANY' ? "Εισάγετε το όνομα της εταιρείας σας" : "Εισάγετε το όνομα της εταιρείας σας (προαιρετικό)"}
                      />
                    </div>
                  </div>

                  {/* Company Fields - Only for Company */}
                  {userType === 'COMPANY' && (
                    <>
                      {/* Company Title Field */}
                      <div>
                        <label htmlFor="companyTitle" className="block text-sm font-medium text-gray-700 mb-2">
                          Διακριτικός Τίτλος (προαιρετικό)
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaBuilding className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="companyTitle"
                            name="companyTitle"
                            type="text"
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     bg-white/70 backdrop-blur-sm transition-all duration-200"
                            placeholder="Εισάγετε τον διακριτικό τίτλο της εταιρείας"
                          />
                        </div>
                      </div>

                      {/* Company Tax ID Field */}
                      <div>
                        <label htmlFor="companyTaxId" className="block text-sm font-medium text-gray-700 mb-2">
                          ΑΦΜ Εταιρείας
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaBuilding className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="companyTaxId"
                            name="companyTaxId"
                            type="text"
                            required
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     bg-white/70 backdrop-blur-sm transition-all duration-200"
                            placeholder="Εισάγετε τον ΑΦΜ της εταιρείας"
                          />
                        </div>
                      </div>

                      {/* Company DOU Field */}
                      <div>
                        <label htmlFor="companyDou" className="block text-sm font-medium text-gray-700 mb-2">
                          ΔΟΥ Εταιρείας
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaBuilding className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="companyDou"
                            name="companyDou"
                            type="text"
                            required
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     bg-white/70 backdrop-blur-sm transition-all duration-200"
                            placeholder="Εισάγετε τη ΔΟΥ της εταιρείας"
                          />
                        </div>
                      </div>

                      {/* Company Phone Field */}
                      <div>
                        <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700 mb-2">
                          Τηλέφωνο Εταιρείας
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaPhone className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="companyPhone"
                            name="companyPhone"
                            type="tel"
                            required
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     bg-white/70 backdrop-blur-sm transition-all duration-200"
                            placeholder="Εισάγετε το τηλέφωνο της εταιρείας"
                          />
                        </div>
                      </div>

                      {/* Company Email Field */}
                      <div>
                        <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700 mb-2">
                          Email Εταιρείας
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaEnvelope className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="companyEmail"
                            name="companyEmail"
                            type="email"
                            required
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     bg-white/70 backdrop-blur-sm transition-all duration-200"
                            placeholder="Εισάγετε το email της εταιρείας"
                          />
                        </div>
                      </div>

                      {/* Company Headquarters Field */}
                      <div className="md:col-span-2">
                        <label htmlFor="companyHeadquarters" className="block text-sm font-medium text-gray-700 mb-2">
                          Έδρα Εταιρείας
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaBuilding className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="companyHeadquarters"
                            name="companyHeadquarters"
                            type="text"
                            required
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     bg-white/70 backdrop-blur-sm transition-all duration-200"
                            placeholder="Εισάγετε την έδρα της εταιρείας"
                          />
                        </div>
                      </div>

                      {/* Company Website Field */}
                      <div>
                        <label htmlFor="companyWebsite" className="block text-sm font-medium text-gray-700 mb-2">
                          Website (προαιρετικό)
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaBuilding className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="companyWebsite"
                            name="companyWebsite"
                            type="url"
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     bg-white/70 backdrop-blur-sm transition-all duration-200"
                            placeholder="https://www.example.com"
                          />
                        </div>
                      </div>

                      {/* Company Working Hours Field */}
                      <div>
                        <label htmlFor="companyWorkingHours" className="block text-sm font-medium text-gray-700 mb-2">
                          Ωράριο Λειτουργίας
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaBuilding className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="companyWorkingHours"
                            name="companyWorkingHours"
                            type="text"
                            required
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     bg-white/70 backdrop-blur-sm transition-all duration-200"
                            placeholder="π.χ. Δευτέρα-Παρασκευή 09:00-17:00"
                          />
                        </div>
                      </div>

                      {/* Contact Person Section */}
                      <div className="md:col-span-2">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                          Υπεύθυνος Επικοινωνίας
                        </h4>
                      </div>

                      {/* Contact Person Name */}
                      <div>
                        <label htmlFor="contactPersonName" className="block text-sm font-medium text-gray-700 mb-2">
                          Ονοματεπώνυμο Υπευθύνου
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaUser className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="contactPersonName"
                            name="contactPersonName"
                            type="text"
                            required
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     bg-white/70 backdrop-blur-sm transition-all duration-200"
                            placeholder="Εισάγετε το ονοματεπώνυμο του υπευθύνου"
                          />
                        </div>
                      </div>

                      {/* Contact Person Email */}
                      <div>
                        <label htmlFor="contactPersonEmail" className="block text-sm font-medium text-gray-700 mb-2">
                          Email Υπευθύνου
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaEnvelope className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="contactPersonEmail"
                            name="contactPersonEmail"
                            type="email"
                            required
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     bg-white/70 backdrop-blur-sm transition-all duration-200"
                            placeholder="Εισάγετε το email του υπευθύνου"
                          />
                        </div>
                      </div>

                      {/* Contact Person Phone */}
                      <div>
                        <label htmlFor="contactPersonPhone" className="block text-sm font-medium text-gray-700 mb-2">
                          Τηλέφωνο Υπευθύνου
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaPhone className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="contactPersonPhone"
                            name="contactPersonPhone"
                            type="tel"
                            required
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     bg-white/70 backdrop-blur-sm transition-all duration-200"
                            placeholder="Εισάγετε το τηλέφωνο του υπευθύνου"
                          />
                        </div>
                      </div>

                      {/* Company Logo Upload */}
                      <div className="md:col-span-2">
                        <label htmlFor="companyLogo" className="block text-sm font-medium text-gray-700 mb-2">
                          Λογότυπο Εταιρείας (προαιρετικό)
                        </label>
                        <div className="relative">
                          <input
                            id="companyLogo"
                            name="companyLogo"
                            type="file"
                            accept="image/*"
                            className="appearance-none block w-full py-3 px-4 border border-gray-300 rounded-xl
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     bg-white/70 backdrop-blur-sm transition-all duration-200"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Αποδεκτές μορφές: JPG, PNG, GIF. Μέγιστο μέγεθος: 5MB
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Password Fields - Always visible */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Password Field */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        Κωδικός
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaLock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          className="appearance-none block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl
                                   placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                   bg-white/70 backdrop-blur-sm transition-all duration-200"
                          placeholder="Εισάγετε τον κωδικό σας"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? (
                            <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Επιβεβαίωση Κωδικού
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaLock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          className="appearance-none block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl
                                   placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                   bg-white/70 backdrop-blur-sm transition-all duration-200"
                          placeholder="Επιβεβαιώστε τον κωδικό σας"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showConfirmPassword ? (
                            <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                    <div className="mt-8 text-center">
                <button
                  type="submit"
                  disabled={loading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl
                               text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600
                               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-medium shadow-lg
                               hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Εγγραφή...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <FaUserPlus className="mr-2" />
                          Εγγραφή
                        </div>
                      )}
                </button>
              </div>

                  {/* Links */}
                    <div className="text-center space-y-4 mt-6">
                <p className="text-sm text-gray-600">
                  Έχετε ήδη λογαριασμό;{' '}
                      <Link href="/seller/auth/login" className="font-medium text-green-600 hover:text-green-500">
                    Συνδεθείτε εδώ
                  </Link>
                </p>
                    <Link href="/seller" className="text-sm text-gray-600 hover:text-green-600">
                      &larr; Επιστροφή στην αρχική σελίδα
                    </Link>
              </div>
                    </div>
                  </motion.div>
            </form>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
      </div>
  );
}

export default function SellerRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Φόρτωση...</div>}>
      <SellerRegisterForm />
    </Suspense>
  );
} 