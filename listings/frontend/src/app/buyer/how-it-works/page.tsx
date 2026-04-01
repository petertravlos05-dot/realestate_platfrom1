'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaHandshake, FaCheckCircle, FaHandshake as FaHandshakeIcon, FaUserTie, FaFileAlt, FaComments, FaChartBar, FaHome, FaEnvelope, FaInfoCircle, FaQuestionCircle, FaUser, FaUserCircle, FaCog, FaHeart, FaExchangeAlt, FaChevronDown, FaKey, FaMobileAlt, FaSignOutAlt, FaPhone } from 'react-icons/fa';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import NotificationBell from '@/components/notifications/NotificationBell';

// Properties page colors: bg-[#f5f0e8], from-blue-900 to-slate-800, from-blue-800 to-slate-700

const phases = [
  {
    id: 1,
    title: 'Γνωριμία & Συμφωνία',
    steps: [
      { num: 1, title: 'Κλείσιμο Ραντεβού', desc: 'Δείτε τις διαθέσιμες ώρες του πωλητή και κλείστε την επίσκεψή σας 100% ψηφιακά.' },
      { num: 2, title: 'Επιβεβαίωση Ενδιαφέροντος', desc: 'Είδατε το ακίνητο; Δηλώστε στο σύστημα αν θέλετε να προχωρήσετε, να το ξαναδείτε ή να ακυρώσετε.' },
      { num: 3, title: 'Επίσημη Προσφορά', desc: 'Στείλτε την οικονομική σας πρόταση στον πωλητή. Διαπραγματευτείτε την τιμή (αποδοχή, απόρριψη ή αντιπρόταση) μέχρι να δώσετε τα χέρια.' },
    ],
  },
  {
    id: 2,
    title: 'Νομική Προστασία & Κατοχύρωση',
    steps: [
      { num: 4, title: 'Επιλογή Δικηγόρου', desc: 'Βρείτε ελεγμένους δικηγόρους μέσα από τη λίστα μας (δείτε βιογραφικά & κριτικές) ή προσκαλέστε τον δικό σας. Η αμοιβή του δικηγόρου συμφωνείται ελεύθερα μεταξύ σας.' },
      { num: 5, title: 'Προκαταβολή & Κατοχύρωση', desc: 'Ο δικηγόρος εγκρίνει τα βασικά χαρτιά. Εσείς πληρώνετε την προκαταβολή. Το ακίνητο "κλειδώνει" για εσάς, κατεβαίνει από την αγορά και υπογράφεται το Ιδιωτικό Συμφωνητικό.' },
    ],
  },
  {
    id: 3,
    title: 'Ψηφιακός Φάκελος & Συμβολαιογράφος',
    steps: [
      { num: 6, title: 'Προετοιμασία Εγγράφων', desc: 'Ο δικηγόρος σας καθοδηγεί (με αναλυτικές οδηγίες και links) για το ποια έγγραφα να ανεβάσετε στο Deal Room.' },
      { num: 7, title: 'Επιλογή Συμβολαιογράφου', desc: 'Επιλέξτε ή προσκαλέστε τον συμβολαιογράφο που επιθυμείτε.' },
      { num: 8, title: 'Τελικός Έλεγχος', desc: 'Ο συμβολαιογράφος αναλαμβάνει δράση, παραλαμβάνει τον ψηφιακό φάκελο, ελέγχει τα έγγραφα και δίνει το τελικό ΟΚ.' },
    ],
  },
  {
    id: 4,
    title: 'Οι Υπογραφές',
    steps: [
      { num: 9, title: 'Ραντεβού Υπογραφών', desc: 'Το ραντεβού για το οριστικό συμβόλαιο κλείνεται και επιβεβαιώνεται.' },
      { num: 10, title: 'Επιβεβαίωση & Συγχαρητήρια!', desc: 'Πατάτε το κουμπί επιβεβαίωσης, η συναλλαγή κλείνει επιτυχώς και το σπίτι είναι δικό σας!' },
    ],
  },
];

const features = [
  {
    icon: FaComments,
    title: 'Διάφανη Επικοινωνία',
    desc: 'Μέσα στο Deal Room υπάρχει κοινό (ομαδικό) Chat όπου μιλάτε εσείς, ο πωλητής και οι επαγγελματίες. Τέρμα οι κρυφές συμφωνίες. Προσωπικό chat έχετε μόνο με τον δικό σας δικηγόρο.',
  },
  {
    icon: FaUserTie,
    title: 'Απόλυτη Ελευθερία Επαγγελματιών',
    desc: 'Διευκολύνουμε τη διαδικασία, δεν σας δεσμεύουμε. Φέρτε τους δικούς σας έμπιστους επαγγελματίες απλά στέλνοντάς τους μια πρόσκληση.',
  },
  {
    icon: FaChartBar,
    title: 'Πίνακας Ελέγχου (Dashboard)',
    desc: 'Παρακολουθήστε ζωντανά την πρόοδο του πωλητή και δείτε ποιες ενέργειες εκκρεμούν, χωρίς να χρειάζεται να παίρνετε τηλέφωνα.',
  },
];

export default function HowItWorks() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setIsProfileMenuOpen(false);
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) setIsRoleMenuOpen(false);
    };
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/buyer');
  };

  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'AGENT') {
      router.push('/agent');
    } else if (role === 'SELLER') {
      router.push('/seller');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Header - same as buyer/properties */}
      <header className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Link href="/buyer" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-slate-800 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-sm" />
                </div>
                <span className={`text-xl font-bold ${isScrolled ? 'bg-gradient-to-r from-blue-900 to-slate-800 bg-clip-text text-transparent' : 'text-white'}`}>RealEstate</span>
              </Link>
              {status === 'authenticated' && (
                <div className="relative" ref={roleMenuRef}>
                  <button onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)} className={`flex items-center px-4 py-2 text-sm font-medium rounded-full shadow-sm transition-all duration-300 whitespace-nowrap ${isScrolled ? 'bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800' : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'}`}>
                    <FaUserCircle className="mr-2" />
                    Buyer Mode
                    <FaChevronDown className={`ml-2 text-xs transition-transform duration-200 ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isRoleMenuOpen && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute left-0 mt-3 w-64 bg-white rounded-2xl shadow-xl py-3 border border-gray-100 z-50 overflow-hidden">
                        <div className="px-6 py-3 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-100">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center"><FaExchangeAlt className="mr-2 text-blue-700" /> Αλλαγή Ρόλου</h3>
                        </div>
                        <div className="py-2">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => { setIsRoleMenuOpen(false); handleRoleChange('AGENT'); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsRoleMenuOpen(false); handleRoleChange('AGENT'); } }}
                            className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-slate-50 transition-all cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-800 to-slate-700 flex items-center justify-center mr-4"><FaUserCircle className="w-5 h-5 text-white" /></div>
                            <div><div className="font-semibold">Agent Mode</div><div className="text-xs text-gray-500">Διαχείριση πελατών και ακινήτων</div></div>
                          </div>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => { setIsRoleMenuOpen(false); handleRoleChange('SELLER'); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsRoleMenuOpen(false); handleRoleChange('SELLER'); } }}
                            className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-slate-50 transition-all cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-4"><FaUserCircle className="w-5 h-5 text-white" /></div>
                            <div><div className="font-semibold">Seller Mode</div><div className="text-xs text-gray-500">Διαχείριση ακινήτων και πωλήσεων</div></div>
                          </div>
                        </div>

                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                          <p className="text-xs text-gray-500 text-center">
                            Τρέχων: <span className="font-semibold text-blue-800">Buyer Mode</span>
                          </p>
                          <p className="text-xs text-gray-500 text-center mt-1">
                            Είστε Επαγγελματίας;{' '}
                            <Link
                              href="/professionals"
                              className="font-semibold text-blue-800 hover:text-blue-900 underline underline-offset-2"
                            >
                              πατήστε εδώ
                            </Link>
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
            <nav className="hidden md:flex items-center space-x-1">
              <Link href="/buyer" className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${pathname === '/buyer' ? (isScrolled ? 'bg-slate-100 text-blue-800' : 'bg-white/10 text-white') : isScrolled ? 'text-gray-700 hover:bg-slate-100 hover:text-blue-800' : 'text-white hover:bg-white/10'}`}><FaHome className="mr-2" /> Αρχική</Link>
              <Link href="/properties" className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${pathname === '/properties' ? (isScrolled ? 'bg-slate-100 text-blue-800' : 'bg-white/10 text-white') : isScrolled ? 'text-gray-700 hover:bg-slate-100 hover:text-blue-800' : 'text-white hover:bg-white/10'}`}><FaSearch className="mr-2" /> Ακίνητα</Link>
              <Link href="/buyer/contact" className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${isScrolled ? 'text-gray-700 hover:bg-slate-100 hover:text-blue-800' : 'text-white hover:bg-white/10'}`}><FaEnvelope className="mr-2" /> Επικοινωνία</Link>
              <Link href="/buyer/about" className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${isScrolled ? 'text-gray-700 hover:bg-slate-100 hover:text-blue-800' : 'text-white hover:bg-white/10'}`}><FaInfoCircle className="mr-2" /> Σχετικά</Link>
              <Link href="/buyer/how-it-works" className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${pathname === '/buyer/how-it-works' ? (isScrolled ? 'bg-slate-100 text-blue-800' : 'bg-white/10 text-white') : isScrolled ? 'text-gray-700 hover:bg-slate-100 hover:text-blue-800' : 'text-white hover:bg-white/10'}`}><FaQuestionCircle className="mr-2" /> Πώς Λειτουργεί</Link>
            </nav>
            <div className="flex items-center space-x-3">
              {status === 'authenticated' ? (
                <>
                  <Link href="/deals?tab=overview" className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md ${isScrolled ? 'bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800' : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'}`}>Συναλλαγές</Link>
                  <NotificationBell />
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md ${
                        isScrolled 
                          ? 'bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800' 
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
                          <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-800 to-slate-700 flex items-center justify-center flex-shrink-0">
                                <FaUser className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">{session?.user?.name || 'Χρήστης'}</p>
                                <p className="text-[11px] text-gray-500 truncate">{session?.user?.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="py-1">
                            <Link
                              href="/buyer/profile?tab=settings"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-100 group-hover:scale-105 transition-all duration-200">
                                <FaCog className="w-3.5 h-3.5 text-blue-700" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-blue-800 transition-colors">Ρυθμίσεις / Προφίλ</span>
                            </Link>
                            <Link
                              href="/buyer/profile?tab=favorites"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center mr-3 group-hover:bg-red-100 group-hover:scale-105 transition-all duration-200">
                                <FaHeart className="w-3.5 h-3.5 text-red-500" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-red-600 transition-colors">Αγαπημένα</span>
                            </Link>
                            <Link
                              href="/buyer/profile?tab=faq"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-100 group-hover:scale-105 transition-all duration-200">
                                <FaQuestionCircle className="w-3.5 h-3.5 text-blue-700" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-blue-800 transition-colors">Συχνές Ερωτήσεις</span>
                            </Link>
                          </div>
                          <div className="border-t border-gray-100" />
                          <div className="py-1">
                            <Link
                              href="/"
                              className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center mr-3 group-hover:bg-slate-200 group-hover:scale-105 transition-all duration-200">
                                <FaExchangeAlt className="w-3.5 h-3.5 text-slate-600" />
                              </div>
                              <span className="font-medium text-gray-900 group-hover:text-slate-800 transition-colors">Αλλαγή Ρόλων</span>
                            </Link>
                            <button
                              onClick={handleSignOut}
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
                  <Link href="/buyer/auth/login" className={`px-4 py-2 rounded-lg text-sm font-medium ${isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}>Σύνδεση</Link>
                  <Link href="/buyer/auth/register" className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md ${isScrolled ? 'bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800' : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'}`}>Εγγραφή</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Section 1: Hero Banner — full viewport height */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-slate-800 to-blue-900 overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center w-full">
          {/* Hero visual: keys + mobile mockup */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex justify-center items-center gap-8 mb-12">
            <div className="hidden sm:flex w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <FaKey className="text-5xl text-amber-300" />
            </div>
            <div className="w-20 h-36 sm:w-24 sm:h-44 rounded-3xl bg-white/15 backdrop-blur-sm border-2 border-white/30 flex flex-col items-center justify-center p-2 shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-800 to-slate-700 flex items-center justify-center mb-2">
                <FaHome className="text-white text-lg" />
              </div>
              <span className="text-white font-bold text-xs">RealEstate</span>
              <FaMobileAlt className="text-white/50 text-2xl mt-2" />
            </div>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Η αγορά του νέου σας σπιτιού,<br />πιο απλή και διάφανη από ποτέ.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg sm:text-xl text-blue-100/90 max-w-3xl mx-auto leading-relaxed">
            Ανακαλύψτε πώς το ψηφιακό μας Deal Room σας γλιτώνει χρόνο, υπέρογκες προμήθειες και γραφειοκρατία, οδηγώντας σας με ασφάλεια μέχρι την υπογραφή του συμβολαίου.
          </motion.p>
        </div>
      </section>

      {/* Section 2: Πώς ξεκινάτε; */}
      <section className="py-20 bg-[#f5f0e8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl font-bold text-gray-900 text-center mb-14">
            Πώς ξεκινάτε;
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-blue-800 to-slate-700 flex items-center justify-center mb-6">
                <FaSearch className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Αυτόνομη Αναζήτηση</h3>
              <p className="text-gray-600 leading-relaxed">
                Μπείτε στην πλατφόρμα, βρείτε το ακίνητο που σας ταιριάζει και πατήστε &quot;Εκδήλωση Ενδιαφέροντος&quot; για να ανοίξετε το δικό σας Deal Room.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-blue-800 to-slate-700 flex items-center justify-center mb-6">
                <FaHandshake className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Μέσω Πρόσκλησης (Referral)</h3>
              <p className="text-gray-600 leading-relaxed">
                Σας έστειλε link ένας γνωστός σας (Referral Agent); Κάντε εγγραφή μέσω του link του. Ο agent δεν έχει πρόσβαση στα προσωπικά σας δεδομένα ή στις συνομιλίες σας, απλώς παρακολουθεί την εξέλιξη των βημάτων για να λάβει την προμήθειά του από εμάς στο τέλος!
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3: Το Ταξίδι σας στο Deal Room - Timeline Accordion */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl font-bold text-gray-900 text-center mb-14">
            Το Ταξίδι σας στο Deal Room
          </motion.h2>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-blue-300 to-blue-200" />
            {phases.map((phase, idx) => (
              <motion.div key={phase.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="relative pl-16 pb-8">
                {/* Phase dot */}
                <div className={`absolute left-4 w-5 h-5 rounded-full border-2 ${expandedPhase === phase.id ? 'bg-gradient-to-r from-blue-800 to-slate-700 border-blue-800' : 'bg-white border-gray-300'}`} />
                <button onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)} className="w-full text-left group">
                  <h3 className={`text-xl font-bold transition-colors ${expandedPhase === phase.id ? 'text-blue-900' : 'text-gray-800 group-hover:text-blue-800'}`}>
                    Φάση {phase.id}: {phase.title}
                  </h3>
                  <FaChevronDown className={`absolute right-0 top-1 text-gray-500 transition-transform duration-200 ${expandedPhase === phase.id ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedPhase === phase.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="mt-6 overflow-hidden">
                      <div className="space-y-4 pl-4 border-l-2 border-blue-200 ml-2">
                        {phase.steps.map((step) => (
                          <div key={step.num} className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-800 to-slate-700 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">{step.num}</div>
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-1">Βήμα {step.num}: {step.title}</h4>
                                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Τα "Υπερόπλα" του Αγοραστή */}
      <section className="py-20 bg-[#f5f0e8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl font-bold text-gray-900 text-center mb-14">
            Τα &quot;Υπερόπλα&quot; του Αγοραστή
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-10">
            {features.map((f, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-800 to-slate-700 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <f.icon className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Γιατί να μείνετε στην πλατφόρμα; */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl font-bold text-gray-900 text-center mb-14">
            Συμφέρει να ολοκληρώσω τη συναλλαγή ψηφιακά;
          </motion.h2>
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2"><FaCheckCircle className="text-blue-800" /> Πληρώνετε πολύ λιγότερα</h3>
              <p className="text-gray-600 leading-relaxed">
                Αν το ακίνητο ανήκει σε μεσιτικό γραφείο, εκτός πλατφόρμας θα σας ζητήσουν 2% έως 3% προμήθεια (ή 2 ενοίκια). Μέσα από εμάς, η χρέωση παραμένει σταθερή και ελάχιστη.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2"><FaHandshakeIcon className="text-blue-800" /> Προστατεύετε τον άνθρωπό σας</h3>
              <p className="text-gray-600 leading-relaxed">
                Αν σας έκανε σύσταση ένας φίλος (Referral Agent), ολοκληρώνοντας τη διαδικασία μέσω του Deal Room εξασφαλίζετε ότι θα ανταμειφθεί για την προσπάθειά του.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2"><FaFileAlt className="text-blue-800" /> Νομική Ασφάλεια</h3>
              <p className="text-gray-600 leading-relaxed">
                Η εγγραφή και η χρήση της πλατφόρμας ενέχει θέση ψηφιακής μεσιτικής εντολής (βάσει των Όρων Χρήσης). Παραμένοντας στην πλατφόρμα, εξασφαλίζετε ομαλή συνεργασία, χωρίς τον κίνδυνο νομικών κυρώσεων ή αξιώσεων αποζημίωσης από την παράκαμψη.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 6: CTA */}
      <section className="py-24 bg-gradient-to-br from-blue-900 via-slate-800 to-blue-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          {session ? (
            <>
              <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ώρα να βρείτε το σπίτι σας;
              </motion.h2>
              <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }} className="text-lg text-blue-100/90 mb-8">
                Εξερευνήστε τα διαθέσιμα ακίνητα και ξεκινήστε το ταξίδι σας προς το νέο σας σπίτι.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                <Link href="/properties" className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-white text-blue-900 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl">
                  Δείτε τα Ακίνητα
                </Link>
              </motion.div>
            </>
          ) : (
            <>
              <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold text-white mb-8">
                Είστε έτοιμοι να βρείτε το επόμενο σπίτι σας;
              </motion.h2>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/buyer/auth/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-900 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl">
                  Δημιουργία Δωρεάν Λογαριασμού
                </Link>
                <Link href="/properties" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-800 to-slate-700 text-white font-bold rounded-xl hover:from-blue-900 hover:to-slate-800 transition-all shadow-lg hover:shadow-xl border-2 border-white/30">
                  Δείτε τα Ακίνητα
                </Link>
              </motion.div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f5f0e8] border-t border-stone-300/40 py-12 mt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-slate-800 rounded-lg flex items-center justify-center"><FaHome className="text-white text-sm" /></div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-900 to-slate-800 bg-clip-text text-transparent">RealEstate</span>
              </div>
              <p className="text-gray-600">Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-3">
                <li><Link href="/properties" className="text-gray-600 hover:text-blue-800 transition-colors">Ακίνητα</Link></li>
                <li><Link href="/buyer/about" className="text-gray-600 hover:text-blue-800 transition-colors">Σχετικά</Link></li>
                <li><Link href="/buyer/contact" className="text-gray-600 hover:text-blue-800 transition-colors">Επικοινωνία</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Επικοινωνία</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center"><FaEnvelope className="mr-2 text-blue-700" /> info@realestate.com</li>
                <li className="flex items-center"><FaPhone className="mr-2 text-blue-700" /> +30 210 1234567</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-300/40 mt-8 pt-8 text-center text-gray-600">
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
