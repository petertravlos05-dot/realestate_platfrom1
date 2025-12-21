"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaCamera, FaComments, FaHandshake, FaPlus, FaChartLine, FaLightbulb, FaQuestionCircle, FaUser, FaSignOutAlt, FaCaretDown, FaChevronLeft, FaChevronRight, FaStar, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaExchangeAlt, FaTimes, FaCheck, FaQuestion, FaRocket, FaShieldAlt, FaUsers, FaChartBar, FaCog, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { IconType } from 'react-icons';
import SellerNotificationBell from '@/components/notifications/SellerNotificationBell';

const SellerLandingPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const [currentPartnerIndex, setCurrentPartnerIndex] = useState(0);
  const [showReview, setShowReview] = useState<number | null>(null);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  const steps = [
    {
      id: 1,
      icon: FaUser,
      title: 'Εγγραφή Πωλητή',
      description: 'Δημιουργήστε τον προσωπικό σας λογαριασμό για να ξεκινήσετε',
      details: {
        subtitle: 'Ξεκινήστε με μια απλή εγγραφή',
        content: [
          'Δημιουργήστε τον προσωπικό σας λογαριασμό δωρεάν',
          'Αποκτήστε πρόσβαση στο προσωπικό σας dashboard',
          'Διαχειριστείτε εύκολα τα ακίνητά σας',
          'Παρακολουθήστε την πορεία των συναλλαγών σας',
          'Δείτε αναλυτικά στατιστικά για τα ακίνητά σας'
        ],
        tips: [
          'Συμπληρώστε όλες τις πληροφορίες του προφίλ σας',
          'Επιβεβαιώστε το email σας για ασφάλεια',
          'Προσθέστε φωτογραφία προφίλ για εμπιστοσύνη'
        ]
      }
    },
    {
      id: 2,
      icon: FaPlus,
      title: 'Δημιουργία Καταχώρησης',
      description: 'Προσθέστε το ακίνητό σας με εύκολο και φιλικό τρόπο',
      details: {
        subtitle: 'Δημιουργήστε μια ελκυστική καταχώρηση',
        content: [
          'Προσθέστε φωτογραφίες υψηλής ποιότητας',
          'Ορίστε την τιμή και τα χαρακτηριστικά',
          'Συμπληρώστε λεπτομερή περιγραφή',
          'Επιλέξτε ακριβή τοποθεσία στο χάρτη',
          'Χρησιμοποιήστε το φιλικό περιβάλλον της πλατφόρμας'
        ],
        tips: [
          'Εάν χρειάζεστε βοήθεια, η ομάδα μας είναι εδώ για να σας καθοδηγήσει',
          'Δημιουργούμε επαγγελματικές περιγραφές για την ιδανική προβολή του ακινήτου σας'
        ]
      }
    },
    {
      id: 3,
      icon: FaComments,
      title: 'Ενδιαφέρον & Ραντεβού',
      description: 'Διαχειριστείτε εύκολα τα ενδιαφερόμενα και τα ραντεβού',
      details: {
        subtitle: 'Διαχειριστείτε τις επικοινωνίες σας',
        content: [
          'Μόλις ένας υποψήφιος αγοραστής δείξει ενδιαφέρον, θα λαμβάνετε άμεσα ειδοποίηση',
          'Μπορείτε να προγραμματίσετε ραντεβού επίσκεψης του ακινήτου στην ημέρα και ώρα που σας εξυπηρετεί, μέσω του κέντρου διαχείρισης (dashboard) σας',
          'Η προκαταβολή που πιθανώς καταβάλλεται από τον αγοραστή "κλειδώνει" την αγγελία και σηματοδοτεί την έναρξη της διαδικασίας μεταβίβασης',
        ],
        tips: [
          'Επωφεληθείτε από τις ενημερώσεις και τα εργαλεία διαχείρισης εντός του dashboard για να παρακολουθείτε την πρόοδο της συναλλαγής σε πραγματικό χρόνο',
          'Λάβετε βοήθεια μέσω της ομάδας υποστήριξης της πλατφόρμας για την οργάνωση των ραντεβού και τη διαχείριση των ενδιαφερόμενων',
        ]
      }
    },
    {
      id: 4,
      icon: FaHandshake,
      title: 'Ολοκλήρωση Συναλλαγής',
      description: 'Ολοκληρώστε την πώληση με ασφάλεια και ευκολία',
      details: {
        subtitle: 'Ασφαλής ολοκλήρωση της πώλησης',
        content: [
          'Ακολουθεί η διαδικασία υπογραφής συμβολαίων και ολοκλήρωσης της αγοραπωλησίας, η οποία πραγματοποιείται αποκλειστικά με φυσική παρουσία, για να διασφαλίζεται η εγκυρότητα της πράξης',
          'Με την ολοκλήρωση της διαδικασίας, το ακίνητο μαρκάρεται αυτόματα ως πωλημένο και αφαιρείται από τις ενεργές αγγελίες',
        ],
        tips: [
          'Η πλατφόρμα σας παρέχει επίσης οδηγίες και υποστήριξη για κάθε βήμα της διαδικασίας, εξασφαλίζοντας μια διαφανή και ασφαλή συναλλαγή',
        ]
      }
    }
  ];

  const tips = [
    {
      id: 1,
      icon: FaCamera,
      title: 'Ορίστε Ανταγωνιστική Τιμή',
      description: 'Καθορίστε μια ανταγωνιστική τιμή για να προσελκύσετε περισσότερους αγοραστές',
      details: {
        subtitle: 'Στρατηγική τιμολόγησης για επιτυχημένη πώληση',
        content: [
          'Ερευνήστε την αγορά στην περιοχή σας για να καθορίσετε μια τιμή που αντικατοπτρίζει την πραγματική αξία του ακινήτου σας',
          'Μια σωστά τιμολογημένη καταχώρηση προσελκύει περισσότερα ενδιαφέροντα και αυξάνει τις πιθανότητες πώλησης',
        ],
        tips: [
          'Συμβουλευτείτε εργαλεία ή επαγγελματίες για τη στατιστική ανάλυση της αγοράς, ώστε να διαμορφώσετε μια ανταγωνιστική τιμή',
          'Οι ενημερώσεις και οι οδηγίες της πλατφόρμας βοηθούν στη διαδικασία καθορισμού της τιμής για μια επιτυχημένη καταχώρηση',
        ]
      }
    },
    {
      id: 2,
      icon: FaChartLine,
      title: 'Προβάλετε Επαγγελματικά το Ακίνητο',
      description: ' Αναδείξτε τα δυνατά σημεία του ακινήτου με σωστή εικόνα και περιγραφή',
      details: {
        subtitle: 'Η σημασία της οπτικής παρουσίας',
        content: [
          'Φροντίστε να χρησιμοποιείτε καθαρές, ευρυγώνιες φωτογραφίες που αναδεικνύουν τα δυνατά σημεία του ακινήτου',
          'Συνοδέψτε τις φωτογραφίες με μια περιεκτική περιγραφή που επισημαίνει τα πλεονεκτήματα και τις μοναδικές ιδιότητες του ακινήτου',
        ],
        tips: [
          'Μια σωστά παρουσιασμένη καταχώρηση προσελκύει περισσότερα ενδιαφέροντα και δημιουργεί θετική πρώτη εντύπωση στους υποψήφιους αγοραστές',
          'Επωφεληθείτε από τα εργαλεία και τις οδηγίες της πλατφόρμας για να παρουσιάσετε το ακίνητό σας με τον πιο επαγγελματικό τρόπο.',
        ]
      }
    },
    {
      id: 3,
      icon: FaLightbulb,
      title: 'Απαντήστε Άμεσα και Ουσιαστικά',
      description: 'Η γρήγορη και σαφής επικοινωνία ενισχύει την εμπιστοσύνη',
      details: {
        subtitle: 'Άμεση Επικοινωνία = Επιτυχημένη Πώληση',
        content: [
          'Η άμεση ανταπόκριση σε ερωτήσεις και αιτήματα των αγοραστών χτίζει εμπιστοσύνη',
          'Να είστε διαθέσιμοι, ειλικρινείς και έτοιμοι να παρέχετε λεπτομερείς πληροφορίες για το ακίνητό σας',
        ],
        tips: [
          'Μια σωστή επικοινωνία μπορεί να κάνει τη διαφορά και να κριθεί καθοριστική για την επιτυχία μιας πώλησης',
          'Επωφεληθείτε από τα εργαλεία και τις δυνατότητες της πλατφόρμας για να διατηρείτε ενεργή και ουσιαστική επικοινωνία με τους υποψήφιους αγοραστές',
        ]
      }
    },
    {
      id: 4,
      icon: FaHome,
      title: 'Δημιουργήστε Θετική Πρώτη Εντύπωση',
      description: 'Δημιουργήστε έναν ζεστό και φιλόξενο χώρο που εντυπωσιάζει κατά την επισκεψη',
      details: {
        subtitle: 'Δημιουργήστε Θετική Πρώτη Εντύπωση',
        content: [
          'Καθαρότητα και Οργάνωση: Βεβαιωθείτε ότι το ακίνητο είναι τακτοποιημένο και καθαρό, ώστε να δημιουργεί μια θετική πρώτη εντύπωση.',
          'Φωτεινότητα: Χρησιμοποιήστε φυσικό φως ή φωτισμό υψηλής ποιότητας για να αναδείξετε τους χώρους.',
          'Επαγγελματικές Πινελιές: Προσθέστε μικρές πινελιές όπως φυτά, λουλούδια ή άλλα διακοσμητικά στοιχεία που αναδεικnύουν τα δυνατά σημεία του ακινήτου.',
        ],
        tips: [
          'Η σωστή προετοιμασία του ακινήτου για τις επισκέψεις δημιουργεί θετική εμπειρία για τους υποψήφιους αγοραστές και μπορεί να επιταχύνει τη διαδικασία πώλησης.',
          'Επωφεληθείτε από συμβουλές και εργαλεία styling για να έχετε μια επαγγελματική εμφάνιση που ξεχωρίζει στις αγγελίες.',
        ]
      }
    }
  ];

  const faqs = [
    {
      question: 'Πώς μπορώ να ανεβάσω το ακίνητό μου στην πλατφόρμα;',
      answer: "Μετά την εγγραφή σας, μπορείτε να προσθέσετε το ακίνητό σας μέσω του πανελ ελέγχου. Επιλέξτε 'Προσθήκη Ακινήτου', συμπληρώστε τα απαραίτητα στοιχεία, προσθέστε φωτογραφίες και δημοσιεύστε την αγγελία σας. Η διαδικασία είναι απλή και οδηγούμενη."
    },
    {
      question: 'Είναι απαραίτητη η εγγραφή για καταχώρηση;',
      answer: "Ναι, η εγγραφή είναι απαραίτητη για να μπορέσετε να καταχωρήσετε ακίνητα. Αυτό εξασφαλίζει την αξιοπιστία της πλατφόρμας και επιτρέπει την αποτελεσματική διαχείριση των αγγελιών σας."
    },
    {
      question: 'Υπάρχει κόστος για την ανάρτηση του ακινήτου;',
      answer: "Η βασική καταχώρηση είναι δωρεάν. Προσφέρουμε επίσης premium πακέτα με πρόσθετες λειτουργίες όπως προώθηση, έμφαση στην αναζήτηση και στατιστικά επισκεψιμότητας."
    },
    {
      question: 'Τι πληροφορίες πρέπει να περιλαμβάνει η καταχώρηση;',
      answer: "Η καταχώρηση πρέπει να περιλαμβάνει: λεπτομερή περιγραφή, φωτογραφίες, τεχνικά χαρακτηριστικά, τοποθεσία, τιμή, και τυχόν ειδικά χαρακτηριστικά του ακινήτου. Όσο πιο ολοκληρωμένες είναι οι πληροφορίες, τόσο μεγαλύτερο το ενδιαφέρον."
    },
    {
      question: 'Προσφέρει η πλατφόρμα βοήθεια με τη δημιουργία της αγγελίας;',
      answer: "Ναι, παρέχουμε οδηγίες και συμβουλές για τη δημιουργία αποτελεσματικής αγγελίας. Επίσης, μπορείτε να επικοινωνήσετε με την ομάδα υποστήριξης για βοήθεια."
    },
    {
      question: 'Ποιος καθορίζει την τιμή του ακινήτου μου;',
      answer: "Εσείς ως πωλητής καθορίζετε την τιμή του ακινήτου. Προτείνουμε να κάνετε έρευνα αγοράς και να συμβουλευτείτε επαγγελματίες για να ορίσετε μια ανταγωνιστική τιμή."
    },
    {
      question: 'Πόσος χρόνος χρειάζεται για να εγκριθεί η αγγελία;',
      answer: "Οι αγγελίες εγκρίνονται συνήθως εντός 24 ωρών. Σε περίπτωση που χρειάζεται επιπλέον πληροφορίες, θα επικοινωνήσουμε μαζί σας άμεσα."
    },
    {
      question: 'Μπορώ να επεξεργαστώ την αγγελία μου μετά τη δημοσίευση;',
      answer: "Ναι, μπορείτε να επεξεργαστείτε την αγγελία σας οποιαδήποτε στιγμή μέσω του dashboard σας. Οι αλλαγές θα εμφανιστούν άμεσα στην πλατφόρμα."
    }
  ];

  const partners = [
    {
      id: 1,
      name: 'Bank of Greece',
      logo: '/images/partners/bank-of-greece.png',
      review: 'Εξαιρετική συνεργασία με την πλατφόρμα. Οι υπηρεσίες τους είναι επαγγελματικές και αξιόπιστες.',
      reviewer: 'Μαρία Παπαδοπούλου',
      role: 'Διευθύντρια Τμήματος'
    },
    {
      id: 2,
      name: 'Alpha Bank',
      logo: '/images/partners/alpha-bank.png',
      review: 'Η πλατφόρμα έχει βοηθήσει πολλούς πελάτες μας να βρουν το ιδανικό τους σπίτι.',
      reviewer: 'Γιώργος Κωνσταντίνου',
      role: 'Επικεφαλής Ακινήτων'
    },
    {
      id: 3,
      name: 'Eurobank',
      logo: '/images/partners/eurobank.png',
      review: 'Συνεργαζόμαστε εδώ και χρόνια και είμαστε πολύ ικανοποιημένοι από την ποιότητα των υπηρεσιών.',
      reviewer: 'Ελένη Δημητρίου',
      role: 'Διευθύντρια Επενδύσεων'
    },
    {
      id: 4,
      name: 'Piraeus Bank',
      logo: '/images/partners/piraeus-bank.png',
      review: 'Η πλατφόρμα προσφέρει λύσεις υψηλής ποιότητας για όλες τις ανάγκες ακινήτων.',
      reviewer: 'Νίκος Αλεξίου',
      role: 'Επικεφαλής Στρατηγικής'
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const nextPartner = () => {
    setCurrentPartnerIndex((prev) => (prev + 1) % partners.length);
  };

  const prevPartner = () => {
    setCurrentPartnerIndex((prev) => (prev - 1 + partners.length) % partners.length);
  };

  const handleAddListingClick = (e: React.MouseEvent) => {
    if (!session) {
      e.preventDefault();
      setShowAuthModal(true);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-[#ecfdf5]">
      {/* Navigation */}
      <header className="fixed w-full z-50 bg-white/95 backdrop-blur-xl shadow-lg border-b border-white/20">
        <div className="container mx-auto px-6">
          <div className="flex items-center h-16">
            {/* Logo - Left */}
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center group">
                <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center mr-2 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <FaHome className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">RealEstate</span>
                </Link>
                <div className="relative" ref={roleMenuRef}>
                  <button
                    onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className="px-3 py-2 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-full hover:from-green-700 hover:to-emerald-800 transition-all duration-300 flex items-center space-x-1 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <span>Seller Mode</span>
                  <FaCaretDown className="w-3 h-3" />
                  </button>
                  {isRoleMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl py-2 border border-white/20 z-50">
                      <div 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 cursor-pointer rounded-lg mx-2"
                        onClick={() => handleRoleChange('BUYER')}
                      >
                        <FaExchangeAlt className="mr-2 text-green-500" />
                      <span className="text-green-600 font-medium">Buyer Mode</span>
                      </div>
                      <div 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-200 cursor-pointer rounded-lg mx-2"
                        onClick={() => handleRoleChange('AGENT')}
                      >
                        <FaExchangeAlt className="mr-2 text-blue-500" />
                      <span className="text-blue-600 font-medium">Agent Mode</span>
                      </div>
                    <div className="border-t border-gray-100 my-1 mx-2"></div>
                      <Link
                        href="/"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 transition-all duration-200 rounded-lg mx-2"
                      >
                        <FaExchangeAlt className="mr-2 text-gray-500" />
                        Επιλογή Ρόλου
                      </Link>
                    </div>
                  )}
              </div>
            </div>
            
            {/* Navigation - Center */}
            <div className="flex-1 flex justify-center">
              <nav className="flex items-center space-x-10">
                <Link href="/seller/properties" className="text-gray-600 hover:text-green-600 transition-all duration-300 font-medium relative group">
                  Ακίνητα
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-600 to-emerald-700 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link href="/about" className="text-gray-600 hover:text-green-600 transition-all duration-300 font-medium relative group">
                  Σχετικά
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-600 to-emerald-700 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link href="/contact" className="text-gray-600 hover:text-green-600 transition-all duration-300 font-medium relative group">
                  Επικοινωνία
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-600 to-emerald-700 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </nav>
            </div>

            {/* Icons - Right */}
            <div className="flex items-center space-x-3">
              {session ? (
                <>
                  <SellerNotificationBell />
                  <Link
                    href="/dashboard/seller"
                    className="bg-gradient-to-r from-green-600 to-emerald-700 text-white px-5 py-2.5 rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-sm"
                  >
                    Dashboard
                  </Link>
                  <div className="relative">
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-all duration-300 p-1.5 rounded-lg hover:bg-green-50"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-700 rounded-full flex items-center justify-center">
                        <FaUser className="w-4 h-4 text-white" />
                      </div>
                      <FaCaretDown className="w-3 h-3" />
                    </button>
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl py-2 border border-white/20 z-50">
                        <Link href="/dashboard/seller" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 rounded-lg mx-2">
                          <FaChartBar className="mr-3 text-green-500" />
                          Πίνακας Ελέγχου
                        </Link>
                        <Link href="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 rounded-lg mx-2">
                          <FaUser className="mr-3 text-green-500" />
                          Προφίλ
                        </Link>
                        <Link href="/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 rounded-lg mx-2">
                          <FaCog className="mr-3 text-green-500" />
                          Ρυθμίσεις
                        </Link>
                        <div className="border-t border-gray-100 my-1 mx-2"></div>
                        <Link href="/" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 transition-all duration-200 rounded-lg mx-2">
                          <FaExchangeAlt className="mr-3 text-gray-500" />
                          Αλλαγή Ρόλων
                        </Link>
                        <button
                          onClick={() => signOut()}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-200 rounded-lg mx-2"
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
                    className="text-gray-600 hover:text-green-600 transition-all duration-300 font-medium text-sm"
                  >
                    Σύνδεση
                  </Link>
                  <Link
                    href="/seller/auth/register"
                    className="bg-gradient-to-r from-green-600 to-emerald-700 text-white px-5 py-2.5 rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-sm"
                  >
                    Εγγραφή
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-40 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-teal-400/20 to-cyan-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-green-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full border border-green-200/50 mb-8">
                <FaRocket className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-700 font-semibold">Πουλήστε το ακίνητό σας γρήγορα και με ασφάλεια</span>
              </div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-7xl font-bold mb-8 leading-tight"
            >
              <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Πουλήστε το Ακίνητό σας
              </span>
              <br />
              <span className="text-gray-800">με Επιστήμη και Τέχνη</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Προσεγγίστε χιλιάδες ενδιαφερόμενους αγοραστές και διαχειριστείτε τις πωλήσεις σας
              με επαγγελματικά εργαλεία και προηγμένη τεχνολογία.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6"
            >
              <Link
                href="/add-listing"
                onClick={handleAddListingClick}
                className="group inline-flex items-center bg-gradient-to-r from-green-600 to-emerald-700 text-white px-10 py-5 rounded-2xl
                         hover:from-green-700 hover:to-emerald-800 transition-all duration-300 text-xl font-bold shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 duration-300"
              >
                <FaPlus className="mr-3 group-hover:rotate-90 transition-transform duration-300" />
                Καταχωρήστε το Ακίνητό σας
              </Link>
              
              <div className="flex items-center space-x-6 text-gray-600">
                <div className="flex items-center">
                  <FaShieldAlt className="w-5 h-5 text-green-500 mr-2" />
                  <span className="font-medium">100% Ασφαλές</span>
                </div>
                <div className="flex items-center">
                  <FaUsers className="w-5 h-5 text-green-500 mr-2" />
                  <span className="font-medium">10,000+ Ενεργοί Χρήστες</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden">
            <svg
            className="relative block w-full h-24"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
            >
              <path
                d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
              className="fill-white"
              ></path>
            </svg>
        </div>
      </section>

      {/* Steps Section */}
      <section className="relative py-32 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                Πώς Λειτουργεί
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Απλό, γρήγορο και αποτελεσματικό σύστημα για την πώληση του ακινήτου σας
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                onClick={() => setSelectedStep(step.id)}
                className="group relative bg-gradient-to-br from-white to-green-50/50 rounded-3xl p-8 shadow-xl hover:shadow-2xl 
                         transform hover:-translate-y-2 transition-all duration-500 border border-green-100/50 
                         cursor-pointer overflow-hidden"
              >
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Step number */}
                <div className="absolute top-6 right-6 w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl 
                                flex items-center justify-center mx-auto mb-6 shadow-lg 
                                group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                  
                  <h3 className="text-xl font-bold mb-4 text-gray-800 group-hover:text-green-600 
                             transition-colors duration-300">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  
                  {/* Hover effect */}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-600 to-emerald-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Step Details Modal */}
      <AnimatePresence>
        {selectedStep !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStep(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            
            {/* Modal Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full md:w-[700px] bg-white/95 backdrop-blur-xl z-50 overflow-y-auto shadow-2xl"
            >
              <div className="relative h-full p-8">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedStep(null)}
                  className="absolute top-6 right-6 p-3 text-gray-500 hover:text-gray-700 transition-all duration-300 bg-white/80 rounded-full shadow-lg hover:shadow-xl hover:rotate-90 transform"
                >
                  <FaTimes className="w-6 h-6" />
                </button>

                {/* Content */}
                {(() => {
                  const selectedStepData = steps.find(s => s.id === selectedStep);
                  if (!selectedStepData?.details) return null;
                  
                  return (
                    <div className="pt-8">
                      <div className="flex items-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl flex items-center justify-center mr-6 shadow-xl">
                          <selectedStepData.icon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                          {selectedStepData.title}
                        </h2>
                          <p className="text-gray-600 text-lg">{selectedStepData.description}</p>
                        </div>
                      </div>

                      <h3 className="text-2xl font-semibold text-gray-800 mb-6">
                        {selectedStepData.details.subtitle}
                      </h3>

                      <div className="space-y-8">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100/50">
                          <h4 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                            <FaCheck className="w-5 h-5 text-green-500 mr-3" />
                            Βασικά Σημεία
                          </h4>
                          <ul className="space-y-3">
                            {selectedStepData.details.content.map((item, index) => (
                              <li key={index} className="flex items-start">
                                <div className="w-2 h-2 bg-green-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                                <span className="text-gray-700 leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-100/50">
                          <h4 className="text-xl font-semibold text-orange-800 mb-4 flex items-center">
                            <FaLightbulb className="w-5 h-5 text-yellow-500 mr-3" />
                            Χρήσιμες Συμβουλές
                          </h4>
                          <ul className="space-y-3">
                            {selectedStepData.details.tips.map((tip, index) => (
                              <li key={index} className="flex items-start">
                                <FaLightbulb className="w-5 h-5 text-yellow-500 mt-1 mr-3 flex-shrink-0" />
                                <span className="text-gray-700 leading-relaxed">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tips Section */}
      <section className="relative py-32 bg-gradient-to-br from-gray-50 to-green-50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                Συμβουλές για Επιτυχημένες Πωλήσεις
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ακολουθήστε αυτές τις επαγγελματικές συμβουλές για να μεγιστοποιήσετε τις πιθανότητες επιτυχίας σας
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tips.map((tip) => (
              <motion.div
                key={tip.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  transition: { duration: 0.3 }
                }}
                onClick={() => setSelectedTip(tip.id)}
                className="group relative bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl 
                         transform hover:-translate-y-2 transition-all duration-500 
                         border border-gray-100 cursor-pointer overflow-hidden"
              >
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    <tip.icon className="w-6 h-6 text-white" />
                </div>
                  
                  <h3 className="text-lg font-bold mb-3 text-gray-800 group-hover:text-green-600 transition-colors duration-300">
                    {tip.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{tip.description}</p>
                  
                  {/* Hover effect */}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-600 to-emerald-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sliding Panel */}
        <AnimatePresence>
          {selectedTip && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedTip(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              />
              
              {/* Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 h-full w-full md:w-[700px] bg-white/95 backdrop-blur-xl z-50 overflow-y-auto shadow-2xl"
              >
                <div className="relative h-full p-8">
                  {/* Close Button */}
                  <button
                    onClick={() => setSelectedTip(null)}
                    className="absolute top-6 right-6 p-3 text-gray-500 hover:text-gray-700 transition-all duration-300 bg-white/80 rounded-full shadow-lg hover:shadow-xl hover:rotate-90 transform"
                  >
                    <FaTimes className="w-6 h-6" />
                  </button>

                  {/* Content */}
                  {(() => {
                    const selectedTipData = tips.find(t => t.id === selectedTip);
                    if (!selectedTipData?.details) return null;
                    
                    return (
                      <div className="pt-8">
                        <div className="flex items-center mb-8">
                          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl flex items-center justify-center mr-6 shadow-xl">
                            <selectedTipData.icon className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                            {selectedTipData.title}
                          </h2>
                            <p className="text-gray-600 text-lg">{selectedTipData.description}</p>
                          </div>
                        </div>

                        <h3 className="text-2xl font-semibold text-gray-800 mb-6">
                          {selectedTipData.details.subtitle}
                        </h3>

                        <div className="space-y-8">
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100/50">
                            <h4 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                              <FaCheck className="w-5 h-5 text-green-500 mr-3" />
                              Βασικά Σημεία
                            </h4>
                            <ul className="space-y-3">
                              {selectedTipData.details.content.map((item, index) => (
                                <li key={index} className="flex items-start">
                                  <div className="w-2 h-2 bg-green-600 rounded-full mt-3 mr-4 flex-shrink-0"></div>
                                  <span className="text-gray-700 leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-100/50">
                            <h4 className="text-xl font-semibold text-orange-800 mb-4 flex items-center">
                              <FaLightbulb className="w-5 h-5 text-yellow-500 mr-3" />
                              Χρήσιμες Συμβουλές
                            </h4>
                            <ul className="space-y-3">
                              {selectedTipData.details.tips.map((tip, index) => (
                                <li key={index} className="flex items-start">
                                  <FaLightbulb className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-700 leading-relaxed">{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </section>

      {/* FAQ Section */}
      <section className="relative py-32 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
              Συχνές Ερωτήσεις
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Βρείτε απαντήσεις στις πιο συχνές ερωτήσεις σας
              </p>
            </motion.div>
            
            <div className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                  initial={{ opacity: 0, y: 30, x: -10 }}
                  whileInView={{ opacity: 1, y: 0, x: 0 }}
                viewport={{ once: true }}
                  transition={{ 
                    delay: index * 0.1,
                    duration: 0.6,
                    type: "spring",
                    stiffness: 100,
                    damping: 15
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                    transition: { duration: 0.3 }
                  }}
                  className="group bg-gradient-to-br from-white to-green-50/30 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl 
                           transition-all duration-500 border border-green-100/50 transform hover:-translate-y-1"
              >
                  <div className="flex items-start gap-6">
                    <motion.div 
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg"
                    >
                      <FaQuestion className="w-6 h-6 text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <motion.h3 
                        whileHover={{ color: "#16a34a" }}
                        transition={{ duration: 0.3 }}
                        className="text-xl font-semibold text-gray-800 mb-4 group-hover:text-green-600 transition-colors duration-300"
                      >
                  {faq.question}
                      </motion.h3>
                      <motion.p 
                        initial={{ opacity: 0.8 }}
                        whileHover={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="text-gray-600 leading-relaxed text-lg"
                      >
                        {faq.answer}
                      </motion.p>
                    </div>
                  </div>
              </motion.div>
            ))}
          </div>
          </motion.div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="relative py-32 bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                Οι Συνεργάτες μας
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Εμπιστευόμαστε από τις μεγαλύτερες τραπεζικές οντότητες της Ελλάδας
            </p>
          </motion.div>
          
          {/* Partners Carousel */}
          <div className="relative max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <button
                onClick={prevPartner}
                className="absolute left-0 z-10 p-4 text-green-600 hover:text-green-700 transition-all duration-300 bg-white/90 backdrop-blur-sm rounded-full shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                aria-label="Previous partner"
              >
                <FaChevronLeft className="w-8 h-8" />
              </button>

              <div className="overflow-hidden mx-16">
                <div className="flex items-center justify-center gap-8">
                  {partners.map((partner, index) => {
                    const isVisible = Math.abs(index - currentPartnerIndex) <= 2;
                    return isVisible && (
                      <motion.div
                        key={partner.id}
                        className="relative"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ 
                          opacity: index === currentPartnerIndex ? 1 : 0.6,
                          scale: index === currentPartnerIndex ? 1 : 0.8,
                          x: (index - currentPartnerIndex) * 300
                        }}
                        transition={{ duration: 0.6 }}
                        onHoverStart={() => setShowReview(partner.id)}
                        onHoverEnd={() => setShowReview(null)}
                      >
                        <div className="w-56 h-56 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 flex items-center justify-center transform hover:scale-105 transition-all duration-500 border border-white/50">
                          <Image
                            src={partner.logo}
                            alt={partner.name}
                            width={200}
                            height={200}
                            className="object-contain"
                          />
                        </div>
                        
                        {/* Review Tooltip */}
                        <AnimatePresence>
                          {showReview === partner.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 20 }}
                              className="absolute top-full mt-6 left-1/2 transform -translate-x-1/2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 z-20 border border-white/50"
                            >
                              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white/95 rotate-45 border-l border-t border-white/50" />
                              <div className="flex items-center mb-4">
                                {[...Array(5)].map((_, i) => (
                                  <FaStar key={i} className="w-5 h-5 text-yellow-400" />
                                ))}
                              </div>
                              <p className="text-gray-700 mb-4 leading-relaxed">{partner.review}</p>
                              <div className="text-sm">
                                <p className="font-semibold text-green-600">{partner.reviewer}</p>
                                <p className="text-gray-600">{partner.role}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={nextPartner}
                className="absolute right-0 z-10 p-4 text-green-600 hover:text-green-700 transition-all duration-300 bg-white/90 backdrop-blur-sm rounded-full shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                aria-label="Next partner"
              >
                <FaChevronRight className="w-8 h-8" />
              </button>
            </div>

            {/* Dots Navigation */}
            <div className="flex justify-center mt-12 space-x-3">
              {partners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPartnerIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-500 ${
                    currentPartnerIndex === index 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-700 w-8 shadow-lg' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to partner ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Only show when user is not logged in */}
      {!session && (
        <section className="relative py-32 bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          </div>
          
          <div className="container mx-auto px-6 relative z-10">
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-5xl mx-auto bg-white/10 backdrop-blur-xl 
                       rounded-3xl p-16 shadow-2xl 
                       border border-white/20"
            >
              <div className="text-center">
                <motion.h2 
                  initial={{ scale: 0.9, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-4xl md:text-5xl font-bold text-white mb-8"
                >
                  Έτοιμοι να Ξεκινήσετε;
                </motion.h2>
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed"
                >
                  Δημιουργήστε το λογαριασμό σας και ξεκινήστε να πουλάτε σήμερα με την πιο προηγμένη πλατφόρμα ακινήτων.
                </motion.p>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="flex flex-col sm:flex-row justify-center items-center space-y-6 sm:space-y-0 sm:space-x-8"
                >
                  <Link
                    href="/seller/auth/register"
                    className="group bg-white text-green-600 px-10 py-5 rounded-2xl 
                             hover:bg-gray-50 transition-all duration-300 text-xl font-bold 
                             shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 duration-300"
                  >
                    <span className="flex items-center">
                      <FaRocket className="mr-3 group-hover:rotate-12 transition-transform duration-300" />
                    Δημιουργία Λογαριασμού
                    </span>
                  </Link>
                  <Link
                    href="/contact"
                    className="group bg-transparent text-white border-2 border-white/50 px-10 py-5 rounded-2xl
                             hover:bg-white/10 hover:border-white transition-all duration-300 text-xl font-bold 
                             transform hover:-translate-y-1 duration-300 backdrop-blur-sm"
                  >
                    <span className="flex items-center">
                      <FaComments className="mr-3 group-hover:scale-110 transition-transform duration-300" />
                    Επικοινωνήστε Μαζί μας
                    </span>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-6"
            >
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white/50
                            relative overflow-hidden w-full max-w-[500px]"
              >
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-600/30 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-600/30 to-transparent" />
                
                {/* Close Button */}
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="absolute top-6 right-6 p-3 text-gray-500 hover:text-gray-700 transition-all duration-300
                           hover:rotate-90 transform bg-white/80 rounded-full shadow-lg hover:shadow-xl"
                >
                  <FaTimes className="w-6 h-6" />
                </button>

                {/* Content */}
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl 
                             flex items-center justify-center mx-auto mb-8 shadow-xl"
                  >
                    <FaHome className="w-10 h-10 text-white" />
                  </motion.div>
                  
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent mb-6">
                      Καλώς ήρθατε στην πλατφόρμα μας!
                    </h3>
                    
                    <p className="text-gray-600 text-lg mb-10 leading-relaxed">
                      Για να καταχωρήσετε το ακίνητό σας, παρακαλούμε συνδεθείτε στο λογαριασμό σας ή δημιουργήστε έναν νέο.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row justify-center gap-6"
                  >
                    <Link
                      href="/seller/auth/login"
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-700 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-800 
                               transition-all duration-300 font-bold shadow-xl hover:shadow-2xl transform hover:-translate-y-1
                               hover:ring-4 hover:ring-green-600/20"
                    >
                      Σύνδεση
                    </Link>
                    <Link
                      href="/seller/auth/register"
                      className="flex-1 bg-white text-green-600 px-8 py-4 rounded-xl border-2 border-green-600 
                               hover:bg-green-600 hover:text-white transition-all duration-300 font-bold transform hover:-translate-y-1
                               hover:ring-4 hover:ring-green-600/20 shadow-xl hover:shadow-2xl"
                    >
                      Εγγραφή
                    </Link>
                  </motion.div>

                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 text-gray-500"
                  >
                    Χρειάζεστε βοήθεια; {' '}
                    <Link href="/contact" className="text-green-600 hover:text-green-700 font-semibold hover:underline transition-colors duration-300">
                      Επικοινωνήστε μαζί μας
                    </Link>
                  </motion.p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-green-900 to-emerald-900 text-white py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3">
                  <FaHome className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">RealEstate</span>
              </div>
              <p className="text-gray-300 leading-relaxed">
                Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες με την πιο προηγμένη τεχνολογία.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-6 text-white">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/properties" className="text-gray-300 hover:text-white transition-all duration-300 hover:translate-x-1 inline-block">
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-gray-300 hover:text-white transition-all duration-300 hover:translate-x-1 inline-block">
                    Σχετικά
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-300 hover:text-white transition-all duration-300 hover:translate-x-1 inline-block">
                    Επικοινωνία
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-6 text-white">Επικοινωνία</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center">
                  <FaEnvelope className="w-4 h-4 mr-3 text-green-400" />
                  info@realestate.com
                </li>
                <li className="flex items-center">
                  <FaPhone className="w-4 h-4 mr-3 text-green-400" />
                  +30 210 1234567
                </li>
                <li className="flex items-center">
                  <FaMapMarkerAlt className="w-4 h-4 mr-3 text-green-400" />
                  Αθήνα, Ελλάδα
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-6 text-white">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <a href="#" className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center text-white hover:from-green-700 hover:to-emerald-800 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl">
                  <FaFacebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center text-white hover:from-green-700 hover:to-emerald-800 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl">
                  <FaTwitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center text-white hover:from-green-700 hover:to-emerald-800 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl">
                  <FaInstagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center text-white hover:from-green-700 hover:to-emerald-800 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl">
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