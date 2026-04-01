'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaHome, FaArrowRight, FaShieldAlt, FaCheckCircle, FaSearch, FaEnvelope, FaQuestionCircle, FaUserCircle, FaChevronDown, FaExchangeAlt, FaCog, FaComments, FaSignOutAlt, FaPhone, FaBuilding, FaUserPlus, FaCheck, FaTimes, FaGlobe } from 'react-icons/fa';
import Image from 'next/image';
import SellerMarketingHeader from '@/components/layout/SellerMarketingHeader';
import SellerMarketingFooter from '@/components/layout/SellerMarketingFooter';
import { apiClient } from '@/lib/api/client';
import { countries } from '@/lib/countries';

function SellerRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [userType, setUserType] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');

  const rawCallbackUrl = searchParams?.get('callbackUrl') || '/deals?from=seller&tab=deals';
  const callbackUrl =
    rawCallbackUrl === '/dashboard/seller' ? '/deals?from=seller&tab=deals' : rawCallbackUrl;

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const handleChangeRole = () => {
    router.push('/');
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
      country: formData.get('country')?.toString() || '',
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
    } catch (error: any) {
      // Extract error message from axios response
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Check if there are validation details (Zod errors)
        if (errorData.details && Array.isArray(errorData.details.issues)) {
          // Extract the first validation error message
          const firstIssue = errorData.details.issues[0];
          if (firstIssue.path && firstIssue.path.length > 0) {
            const field = firstIssue.path[0];
            const message = firstIssue.message;
            
            // Translate common field names to Greek
            const fieldTranslations: Record<string, string> = {
              'password': 'κωδικός',
              'confirmPassword': 'επιβεβαίωση κωδικού',
              'email': 'email',
              'name': 'όνομα',
            };
            
            const fieldName = fieldTranslations[field] || field;
            
            // Translate common messages to Greek
            if (message.includes('at least 12 characters')) {
              setError(`Ο ${fieldName} πρέπει να έχει τουλάχιστον 12 χαρακτήρες.`);
            } else if (message.includes('do not match')) {
              setError('Οι κωδικοί δεν ταιριάζουν.');
            } else {
              setError(`${fieldName}: ${message}`);
            }
          } else {
            setError(errorData.error || 'Προέκυψε σφάλμα επικύρωσης.');
          }
        } else if (errorData.error) {
          // Use the error message from backend
          setError(errorData.error);
        } else {
          setError('Προέκυψε κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
        }
      } else if (error instanceof Error) {
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
      <SellerMarketingHeader solidFromStart />

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
                        onClick={() => setUserType('INDIVIDUAL')}
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
                        onClick={() => setUserType('COMPANY')}
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
                              <FaCheck className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
                              <span>Πλήρη στοιχεία εταιρείας (ΑΦΜ, ΔΟΥ, έδρα κ.λπ.)</span>
                            </div>
                            <div className="flex items-center justify-center">
                              <FaCheck className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
                              <span>Υπεύθυνος επικοινωνίας για σύνδεση και ειδοποιήσεις</span>
                            </div>
                            <div className="flex items-center justify-center">
                              <FaCheck className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
                              <span>Ίδια πρόσβαση στην πλατφόρμα με τον ιδιώτη πωλητή</span>
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

                      {/* Country Field - Only for Individual */}
                      {userType === 'INDIVIDUAL' && (
                <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                    Χώρα Καταγωγής <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <FaGlobe className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      id="country"
                      name="country"
                      required
                      className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl
                               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                               bg-white/70 backdrop-blur-sm transition-all duration-200 cursor-pointer"
                    >
                      <option value="">Επιλέξτε χώρα...</option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.name}>
                          {country.flag} {country.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <FaChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
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

                      {/* Country Field - Only for Company */}
                      <div>
                        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                          Χώρα Καταγωγής <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                            <FaGlobe className="h-5 w-5 text-gray-400" />
                          </div>
                          <select
                            id="country"
                            name="country"
                            required
                            className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl
                                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                     bg-white/70 backdrop-blur-sm transition-all duration-200 cursor-pointer"
                          >
                            <option value="">Επιλέξτε χώρα...</option>
                            {countries.map((country) => (
                              <option key={country.code} value={country.name}>
                                {country.flag} {country.name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <FaChevronDown className="h-4 w-4 text-gray-400" />
                          </div>
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

      <SellerMarketingFooter />
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