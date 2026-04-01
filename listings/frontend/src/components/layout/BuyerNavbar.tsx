'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaSearch, FaHome, FaEnvelope, FaInfoCircle, FaUser, FaCog, FaHeart, FaExchangeAlt, FaQuestionCircle, FaSignOutAlt, FaUserCircle, FaChevronDown } from 'react-icons/fa';
import { useSession, signOut } from 'next-auth/react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { motion } from 'framer-motion';

interface BuyerNavbarProps {
  /** Όταν true, το navbar είναι πάντα solid (όχι transparent) από την αρχή */
  solidFromStart?: boolean;
  /** Διαδρομή μετά την αποσύνδεση (προεπιλογή: αρχική) */
  signOutRedirect?: string;
}

export default function BuyerNavbar({ solidFromStart = false, signOutRedirect = '/' }: BuyerNavbarProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
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
    router.push(signOutRedirect);
  };

  const showSolid = solidFromStart || isScrolled;

  const navLinkClass = (base: string) =>
    showSolid
      ? 'text-gray-700 hover:bg-slate-100 hover:text-blue-800'
      : 'text-white hover:bg-white/10';

  const buttonClass = (base: string) =>
    showSolid
      ? 'bg-gradient-to-r from-blue-800 to-slate-700 text-white hover:from-blue-900 hover:to-slate-800'
      : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30';

  return (
    <header
      className={`fixed w-full z-50 transition-all duration-300 ${
        showSolid
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <Link href="/buyer" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-800 to-slate-700 rounded-lg flex items-center justify-center">
                <FaHome className="text-white text-sm" />
              </div>
              <span
                className={`text-xl font-bold ${
                  showSolid
                    ? 'bg-gradient-to-r from-blue-800 to-slate-700 bg-clip-text text-transparent'
                    : 'text-white'
                }`}
              >
                RealEstate
              </span>
            </Link>

            <div className="relative" ref={roleMenuRef}>
              <button
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-full shadow-md transition-all duration-300 ${buttonClass('')}`}
              >
                <FaUserCircle className="mr-2" />
                Buyer Mode
                <FaChevronDown
                  className={`ml-2 text-xs transition-transform duration-200 ${
                    isRoleMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isRoleMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute left-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl py-3 border border-gray-100 z-50 overflow-hidden"
                >
                  <div className="px-6 py-3 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                      <FaExchangeAlt className="mr-2 text-blue-800" />
                      Αλλαγή Ρόλου
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Επιλέξτε τον ρόλο που θέλετε να χρησιμοποιήσετε
                    </p>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/agent"
                      className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-800 to-slate-700 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                        <FaUserCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-800 transition-colors duration-200">
                          Agent Mode
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Διαχείριση πελατών και ακινήτων
                        </div>
                      </div>
                      <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-800 transition-colors duration-200" />
                    </Link>
                    <Link
                      href="/seller"
                      className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                        <FaUserCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors duration-200">
                          Seller Mode
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Διαχείριση ακινήτων και πωλήσεων
                        </div>
                      </div>
                      <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors duration-200" />
                    </Link>
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
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/buyer"
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${navLinkClass('')}`}
            >
              <FaHome className="mr-2" />
              Αρχική
            </Link>
            <Link
              href="/properties"
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${navLinkClass('')}`}
            >
              <FaSearch className="mr-2" />
              Ακίνητα
            </Link>
            <Link
              href="/buyer/contact"
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${navLinkClass('')}`}
            >
              <FaEnvelope className="mr-2" />
              Επικοινωνία
            </Link>
            <Link
              href="/buyer/about"
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${navLinkClass('')}`}
            >
              <FaInfoCircle className="mr-2" />
              Σχετικά
            </Link>
            <Link
              href="/buyer/how-it-works"
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${navLinkClass('')}`}
            >
              <FaQuestionCircle className="mr-2" />
              Πώς Λειτουργεί
            </Link>
          </nav>

          <div className="flex items-center space-x-3">
            {status === 'authenticated' ? (
              <>
                <Link
                  href="/deals?tab=overview"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-md ${buttonClass('')}`}
                >
                  Συναλλαγές
                </Link>
                <NotificationBell />
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md ${buttonClass('')}`}
                  >
                    <FaUser className="w-4 h-4" />
                  </button>
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl py-2 border border-gray-100">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">
                          {session?.user?.name || 'Χρήστης'}
                        </p>
                        <p className="text-xs text-gray-500">{session?.user?.email}</p>
                      </div>
                      <Link
                        href="/buyer/profile?tab=settings"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200"
                      >
                        <FaCog className="mr-3 text-blue-800" />
                        Ρυθμίσεις / Προφίλ
                      </Link>
                      <Link
                        href="/buyer/profile?tab=favorites"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200"
                      >
                        <FaHeart className="mr-3 text-red-500" />
                        Αγαπημένα
                      </Link>
                      <Link
                        href="/buyer/profile?tab=faq"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200"
                      >
                        <FaQuestionCircle className="mr-3 text-blue-800" />
                        Συχνές Ερωτήσεις
                      </Link>
                      <div className="border-t border-gray-100 my-1"></div>
                      <Link
                        href="/"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200"
                      >
                        <FaExchangeAlt className="mr-3 text-blue-800" />
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
                  href="/buyer/auth/login"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    showSolid ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
                  }`}
                >
                  Σύνδεση
                </Link>
                <Link
                  href="/buyer/auth/register"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-md ${buttonClass('')}`}
                >
                  Εγγραφή
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
