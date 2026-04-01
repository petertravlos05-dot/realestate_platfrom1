"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaUser, FaSignOutAlt, FaCaretDown, FaChevronDown, FaUserCircle, FaExchangeAlt, FaPlus, FaQuestionCircle, FaChartBar, FaCog, FaEnvelope, FaPhone, FaMapMarkerAlt, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaCheckCircle, FaBuilding } from 'react-icons/fa';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import SellerNotificationBell from '@/components/notifications/SellerNotificationBell';

const SellerLandingPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleAddListingClick = (e: React.MouseEvent) => {
    if (!session) {
      e.preventDefault();
      router.push('/seller/auth/login?callbackUrl=/add-listing');
    }
  };

  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'BUYER') {
      router.push('/buyer');
    } else if (role === 'AGENT') {
      router.push('/agent');
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/seller');
  };

  useEffect(() => {
    try {
      sessionStorage.setItem('deals_cameFromSeller', '1');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    const handleClickOutside = (event: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const howItWorksSteps = [
    {
      id: 1,
      emoji: '📅',
      title: 'Βήμα 1: Αγγελία & Ραντεβού',
      text: 'Ανεβάζετε το ακίνητό σας. Οι αγοραστές βλέπουν τη διαθεσιμότητά σας και κλείνουν ραντεβού προβολής. Εσείς λαμβάνετε ειδοποίηση με τα στοιχεία τους (όνομα, τηλέφωνο) και εγκρίνετε ή απορρίπτετε την επίσκεψη με ένα κλικ στο Deal Room.',
    },
    {
      id: 2,
      emoji: '💶',
      title: 'Βήμα 2: Διαπραγμάτευση & Προσφορές',
      text: 'Τέλος τα "παζάρια" στο πόδι. Λαμβάνετε επίσημες ψηφιακές προσφορές. Διαπραγματευτείτε κάνοντας αντιπρόταση ή αποδεχτείτε την προσφορά που σας ικανοποιεί για να "κλειδώσει" η τιμή.',
    },
    {
      id: 3,
      emoji: '👷‍♂️⚖️',
      title: 'Βήμα 3: Η Ομάδα σας (Μηχανικός & Δικηγόρος)',
      text: 'Για να προχωρήσει η πώληση χρειάζεστε μηχανικό. Επιλέξτε ελεγμένο επαγγελματία μέσα από την πλατφόρμα μας (ή προσκαλέστε τον δικό σας) για να αναλάβει την Ηλεκτρονική Ταυτότητα Κτιρίου (ΗΤΚ). Αν επιθυμείτε, μπορείτε να προσθέσετε και δικηγόρο για επιπλέον νομική κάλυψη.',
    },
    {
      id: 4,
      emoji: '📁',
      title: 'Βήμα 4: Ψηφιακός Φάκελος & Έγκριση',
      text: 'Ο μηχανικός και ο συμβολαιογράφος του αγοραστή σας ζητούν τα απαραίτητα έγγραφα (π.χ. συμβόλαια, κατόψεις). Εσείς τα ανεβάζετε με ασφάλεια στο Deal Room. Μόλις ο συμβολαιογράφος εγκρίνει τον φάκελο, είστε έτοιμοι!',
    },
    {
      id: 5,
      emoji: '✍️',
      title: 'Βήμα 5: Υπογραφές & Ολοκλήρωση',
      text: 'Το ραντεβού για το συμβόλαιο κλείνεται. Υπογράφετε, πατάτε "Επιβεβαίωση Ολοκλήρωσης" στην πλατφόρμα και το σπίτι πουλήθηκε!',
    },
  ];

  const pricingFeatures = [
    'Δωρεάν καταχώριση απεριόριστων ακινήτων',
    'Ιδιώτες: Διατηρείτε το 100% του κεφαλαίου ή του ενοικίου σας',
    'Μεσίτες: Κρατάτε το 100% της προμήθειας από τον πελάτη σας',
    'Πλήρης πρόσβαση στο ψηφιακό Deal Room',
    'Αυτόματη διαχείριση ραντεβού & προσφορών',
  ];

  const partnerAgencies = [
    'Prime Estate',
    'Athens Homes',
    'Golden Key Properties',
    'Urban Living',
    'SeaView Real Estate',
    'Oikodomiki',
    'Elite Brokers',
    'Metro Properties',
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - integrates with hero, changes on scroll */}
      <header className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100'
          : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-6">
          <div className="flex items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mr-2 shadow-lg transition-colors ${
                  isScrolled ? 'bg-gradient-to-br from-green-600 to-emerald-700' : 'bg-white/20 backdrop-blur-sm'
                }`}>
                  <FaHome className={`w-5 h-5 ${isScrolled ? 'text-white' : 'text-white'}`} />
                </div>
                <span className={`text-xl font-bold transition-colors ${
                  isScrolled ? 'bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent' : 'text-white'
                }`}>RealEstate</span>
              </Link>
              <div className="relative" ref={roleMenuRef}>
                <button
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all ${
                    isScrolled
                      ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800 shadow-lg'
                      : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                  }`}
                >
                  <FaUserCircle className="mr-2 w-4 h-4" />
                  Seller Mode
                  <FaChevronDown className={`ml-2 w-3 h-3 transition-transform duration-200 ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isRoleMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="absolute left-0 mt-3 w-64 bg-white rounded-2xl shadow-xl py-3 border border-gray-100 z-50 overflow-hidden"
                    >
                      <div className="px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                          <FaExchangeAlt className="mr-2 text-green-500" />
                          Αλλαγή Ρόλου
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Επιλέξτε τον ρόλο που θέλετε να χρησιμοποιήσετε</p>
                      </div>
                      <div className="py-2">
                        <div
                          onClick={() => handleRoleChange('BUYER')}
                          className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <FaUserCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                              Buyer Mode
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Αναζήτηση και αγορά ακινήτων
                            </div>
                          </div>
                          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                        </div>
                        <div
                          onClick={() => handleRoleChange('AGENT')}
                          className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-200 cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                            <FaUserCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                              Agent Mode
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Διαχείριση πελατών και ακινήτων
                            </div>
                          </div>
                          <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                        </div>
                      </div>
                      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs text-gray-500 text-center">
                          Τρέχων: <span className="font-semibold text-green-600">Seller Mode</span>
                        </p>
                        <p className="text-xs text-gray-500 text-center mt-1">
                          Είστε Επαγγελματίας;{' '}
                          <Link
                            href="/professionals"
                            className="font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
                          >
                            πατήστε εδώ
                          </Link>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex-1 flex justify-center">
              <nav className="flex items-center space-x-10">
                <Link
                  href="/seller"
                  className={`transition-all font-medium relative group ${
                    isScrolled ? 'text-gray-600 hover:text-green-600' : 'text-white/90 hover:text-white'
                  }`}
                >
                  Αρχική
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all" />
                </Link>
                <Link
                  href="/about"
                  className={`transition-all font-medium relative group ${
                    isScrolled ? 'text-gray-600 hover:text-green-600' : 'text-white/90 hover:text-white'
                  }`}
                >
                  Σχετικά
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all" />
                </Link>
                <Link
                  href="/contact"
                  className={`transition-all font-medium relative group ${
                    isScrolled ? 'text-gray-600 hover:text-green-600' : 'text-white/90 hover:text-white'
                  }`}
                >
                  Επικοινωνία
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all" />
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              {session ? (
                <>
                  <SellerNotificationBell light={!isScrolled} />
                  <Link
                    href="/deals?from=seller&tab=deals"
                    className={`px-5 py-2.5 rounded-lg transition-all font-semibold text-sm ${
                      isScrolled
                        ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800'
                        : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                    }`}
                  >
                    Συναλλαγές
                  </Link>
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md ${
                        isScrolled
                          ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800'
                          : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                      }`}
                    >
                      <FaUser className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {isProfileMenuOpen && (
                        <motion.div
                          key="profile-menu"
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100 z-50 overflow-hidden"
                        >
                          {/* Header */}
                          <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-600 to-emerald-700 flex items-center justify-center flex-shrink-0">
                                <FaUser className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">{session?.user?.name || 'Χρήστης'}</p>
                                <p className="text-[11px] text-gray-500 truncate">{session?.user?.email}</p>
                              </div>
                            </div>
                          </div>
                          {/* Links */}
                          <div className="py-1">
                            <Link
                              href="/dashboard/seller"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center mr-3 group-hover:bg-green-100 group-hover:scale-105 transition-all duration-200">
                                <FaCog className="w-3.5 h-3.5 text-green-700" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-green-800 transition-colors">Ρυθμίσεις / Προφίλ</span>
                            </Link>
                            <Link
                              href="/dashboard/seller"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center mr-3 group-hover:bg-green-100 group-hover:scale-105 transition-all duration-200">
                                <FaChartBar className="w-3.5 h-3.5 text-green-700" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-green-800 transition-colors">Πίνακας Ελέγχου</span>
                            </Link>
                            <Link
                              href="/about#faq"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center mr-3 group-hover:bg-green-100 group-hover:scale-105 transition-all duration-200">
                                <FaQuestionCircle className="w-3.5 h-3.5 text-green-700" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-green-800 transition-colors">Συχνές Ερωτήσεις</span>
                            </Link>
                          </div>
                          <div className="border-t border-gray-100" />
                          <div className="py-1">
                            <Link
                              href="/"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center mr-3 group-hover:bg-gray-200 group-hover:scale-105 transition-all duration-200">
                                <FaExchangeAlt className="w-3.5 h-3.5 text-gray-600" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors">Αλλαγή Ρόλων</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                void handleSignOut();
                              }}
                              className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center mr-3 group-hover:bg-red-100 group-hover:scale-105 transition-all duration-200">
                                <FaSignOutAlt className="w-3.5 h-3.5 text-red-600" />
                              </div>
                              <span className="font-medium group-hover:text-red-700 transition-colors">Αποσύνδεση</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/seller/auth/login"
                    className={`transition-all font-medium text-sm ${
                      isScrolled ? 'text-gray-600 hover:text-green-600' : 'text-white/90 hover:text-white'
                    }`}
                  >
                    Σύνδεση
                  </Link>
                  <Link
                    href="/seller/auth/register"
                    className={`px-5 py-2.5 rounded-lg transition-all font-semibold text-sm ${
                      isScrolled
                        ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800'
                        : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                    }`}
                  >
                    Εγγραφή
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Section 1: Hero Banner - πλήρης οθόνη */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <Image
          src="/images/hero-1.png"
          alt="Πουλήστε το ακίνητό σας"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/80 via-emerald-900/75 to-green-950/90" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
          >
            Πουλήστε το ακίνητό σας. Γρήγορα, Οργανωμένα και Εντελώς Δωρεάν.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg md:text-xl text-white/95 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Ξεχάστε τα τηλέφωνα σε ακατάλληλες ώρες και τις χαμένες προσφορές. Είτε είστε ιδιώτης είτε μεσιτικό γραφείο, καταχωρήστε το ακίνητό σας σήμερα και διαχειριστείτε ραντεβού, προσφορές και έγγραφα μέσα από το δικό σας ψηφιακό Deal Room, χωρίς κανένα κόστος προμήθειας προς εμάς.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-4"
          >
            <Link
              href="/add-listing"
              onClick={handleAddListingClick}
              className="inline-flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1"
            >
              <FaPlus className="mr-3" />
              Καταχώριση Ακινήτου (Δωρεάν)
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-2 border-white/50 px-10 py-5 rounded-xl font-bold text-lg transition-all"
            >
              <FaQuestionCircle className="mr-3" />
              Πώς Λειτουργεί
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Section 2: Τα 3 Μεγάλα "Γιατί" */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100"
            >
              <div className="text-4xl mb-6">💰</div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Μηδενική Προμήθεια Πώλησης</h3>
              <p className="text-gray-700 leading-relaxed">
                Σε αντίθεση με τις παραδοσιακές μεθόδους, εμείς δεν ζητάμε ούτε 1 ευρώ από την πλευρά του πωλητή. Η πλατφόρμα αμείβεται αποκλειστικά από τον αγοραστή. (Αν είστε μεσιτικό γραφείο, λειτουργούμε ως ο ιδανικός συνεργάτης σας).
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100"
            >
              <div className="text-4xl mb-6">📱</div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Τέλος το Χάος των Ραντεβού</h3>
              <p className="text-gray-700 leading-relaxed">
                Ορίστε τις ώρες που δέχεστε επισκέψεις στο ψηφιακό σας ημερολόγιο. Οι ενδιαφερόμενοι κλείνουν μόνοι τους ραντεβού, κι εσείς απλά εγκρίνετε ή απορρίπτετε με ένα κλικ.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100"
            >
              <div className="text-4xl mb-6">🤝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Επίσημες Προσφορές, Όχι Λόγια</h3>
              <p className="text-gray-700 leading-relaxed">
                Δέχεστε τις οικονομικές προτάσεις των αγοραστών γραπτά, μέσα στην πλατφόρμα. Μπορείτε να κάνετε αντιπρόταση, να απορρίψετε ή να κλειδώσετε τη συμφωνία με ασφάλεια.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3: Πώς Λειτουργεί */}
      <section id="how-it-works" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-16 text-gray-900"
          >
            Η διαδρομή από την αγγελία μέχρι το συμβόλαιο
          </motion.h2>

          <div className="max-w-3xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-300 via-emerald-400 to-green-300" />

              {howItWorksSteps.map((step, idx) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className="relative pl-16 pb-12 last:pb-0"
                >
                  <div className="absolute left-4 w-5 h-5 rounded-full border-2 border-green-600 bg-white flex items-center justify-center text-green-600 font-bold text-xs">
                    {step.id}
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span>{step.emoji}</span>
                      {step.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{step.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 3b: Pricing - Ξεκάθαρη χρέωση */}
      <section className="py-20 bg-emerald-50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-sm font-bold uppercase tracking-wider text-green-600 mb-2">ΤΟ ΜΟΝΤΕΛΟ ΜΑΣ</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ξεκάθαρη χρέωση. Καμία έκπληξη.
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
              Η πλατφόρμα μας αμείβεται αποκλειστικά από τον αγοραστή (1%) ή τον ενοικιαστή (50% ενός ενοικίου). Αν είστε ιδιοκτήτης, δεν μας πληρώνετε απολύτως τίποτα. Αν είστε μεσιτικό γραφείο, λειτουργούμε ως Co-Broke συνεργάτης σας.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="max-w-lg mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-10">
              <div className="flex flex-col sm:flex-row sm:items-end sm:gap-4 mb-6">
                <span className="text-5xl md:text-6xl font-bold text-green-600">0€</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mt-2 sm:mt-0">
                  Προς την πλατφόρμα
                </span>
              </div>
              <ul className="space-y-4 mb-8">
                {pricingFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <FaCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/add-listing"
                onClick={handleAddListingClick}
                className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                Ξεκινήστε Δωρεάν
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 4: Για Μεσιτικά Γραφεία */}
      <section className="py-20 bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Είστε Μεσιτικό Γραφείο;
            </h2>
            <p className="text-xl text-white/95 leading-relaxed mb-8">
              Η πλατφόρμα μας λειτουργεί ως το απόλυτο εργαλείο Co-Broke (Συνεργασία Γραφείων). Ως εκπρόσωπος του ακινήτου, χρησιμοποιείτε κανονικά το προφίλ του Πωλητή. Ανεβάστε τα ακίνητά σας δωρεάν, βρείτε έτοιμους αγοραστές από το δίκτυό μας και κρατήστε το 100% της προμήθειας από τον πελάτη σας (τον ιδιοκτήτη). Εμείς πληρωνόμαστε αποκλειστικά από τον αγοραστή και αναλαμβάνουμε όλη τη γραφειοκρατία του Deal Room!
            </p>
            {!session && (
              <Link
                href="/seller/auth/register"
                className="inline-flex items-center justify-center bg-white text-green-700 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all"
              >
                <FaPlus className="mr-3" />
                Εγγραφή ως Πωλητής (Δωρεάν)
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Section 4b: Partners Marquee */}
      <section className="py-12 bg-white border-y border-gray-100 overflow-hidden group">
        <div className="container mx-auto px-6 mb-8">
          <p className="text-center text-gray-500 font-medium text-lg">
            Δυναμικό Δίκτυο Συνεργατών. Μας εμπιστεύονται κορυφαία γραφεία.
          </p>
        </div>
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
          <div className="flex items-center gap-12 md:gap-16 px-6">
            {[...partnerAgencies, ...partnerAgencies].map((name, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300 flex-shrink-0"
              >
                <FaBuilding className="w-8 h-8 text-gray-600" />
                <span className="text-lg md:text-xl font-bold tracking-tighter text-gray-700 whitespace-nowrap">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Trust Badges */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-start gap-6 p-8 bg-gray-50 rounded-2xl border border-gray-100"
            >
              <div className="text-4xl">🔒</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Προστασία Δεδομένων</h3>
                <p className="text-gray-700">
                  Τα έγγραφά σας είναι κρυπτογραφημένα και ορατά μόνο στους επαγγελματίες της συναλλαγής.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex items-start gap-6 p-8 bg-gray-50 rounded-2xl border border-gray-100"
            >
              <div className="text-4xl">🏛️</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Νομική & Τεχνική Οργάνωση</h3>
                <p className="text-gray-700">
                  Συνεργασία με πιστοποιημένους μηχανικούς και διασύνδεση με κρατικές πλατφόρμες.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 6: Bottom CTA */}
      <section className="py-24 bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Έτοιμοι να αναβαθμίσετε τον τρόπο που πουλάτε;
            </h2>
            <Link
              href={session ? '/add-listing' : '/seller/auth/register'}
              onClick={!session ? undefined : handleAddListingClick}
              className="inline-flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white px-12 py-5 rounded-xl font-bold text-xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1"
            >
              <FaPlus className="mr-3" />
              Καταχωρήστε το Ακίνητό σας Τώρα
            </Link>
            {!session && (
              <p className="mt-4 text-white/80 text-sm">Δωρεάν Εγγραφή</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-green-900 to-emerald-900 text-white py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3">
                  <FaHome className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">RealEstate</span>
              </div>
              <p className="text-gray-300 leading-relaxed">
                Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-6">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-3">
                <li><Link href="/properties" className="text-gray-300 hover:text-white transition-all inline-block">Ακίνητα</Link></li>
                <li><Link href="/about" className="text-gray-300 hover:text-white transition-all inline-block">Σχετικά</Link></li>
                <li><Link href="/contact" className="text-gray-300 hover:text-white transition-all inline-block">Επικοινωνία</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-6">Επικοινωνία</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center"><FaEnvelope className="w-4 h-4 mr-3 text-green-400" /> info@realestate.com</li>
                <li className="flex items-center"><FaPhone className="w-4 h-4 mr-3 text-green-400" /> +30 210 1234567</li>
                <li className="flex items-center"><FaMapMarkerAlt className="w-4 h-4 mr-3 text-green-400" /> Αθήνα, Ελλάδα</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-6">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <a href="#" className="w-12 h-12 bg-green-700/50 rounded-xl flex items-center justify-center text-white hover:bg-green-600 transition-all">
                  <FaFacebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-12 h-12 bg-green-700/50 rounded-xl flex items-center justify-center text-white hover:bg-green-600 transition-all">
                  <FaTwitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-12 h-12 bg-green-700/50 rounded-xl flex items-center justify-center text-white hover:bg-green-600 transition-all">
                  <FaInstagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-12 h-12 bg-green-700/50 rounded-xl flex items-center justify-center text-white hover:bg-green-600 transition-all">
                  <FaLinkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SellerLandingPage;
