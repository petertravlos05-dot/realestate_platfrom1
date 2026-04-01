'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaHome,
  FaUser,
  FaUserCircle,
  FaChevronDown,
  FaExchangeAlt,
  FaQuestionCircle,
  FaCog,
  FaChartBar,
  FaSignOutAlt,
} from 'react-icons/fa';
import { useSession, signOut } from 'next-auth/react';
import SellerNotificationBell from '@/components/notifications/SellerNotificationBell';

interface SellerMarketingHeaderProps {
  /** Όταν true, το navbar είναι solid από την αρχή (σαν να έχει γίνει scroll). */
  solidFromStart?: boolean;
}

export default function SellerMarketingHeader({ solidFromStart = false }: SellerMarketingHeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'BUYER') {
      router.push('/buyer');
    } else if (role === 'AGENT') {
      router.push('/agent');
    }
  };

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

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/seller');
  };

  const showSolid = solidFromStart || isScrolled;

  return (
    <header
      className={`fixed w-full z-50 transition-all duration-300 ${
        showSolid ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center group">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mr-2 shadow-lg transition-colors ${
                  showSolid ? 'bg-gradient-to-br from-green-600 to-emerald-700' : 'bg-white/20 backdrop-blur-sm'
                }`}
              >
                <FaHome className="w-5 h-5 text-white" />
              </div>
              <span
                className={`text-xl font-bold transition-colors ${
                  showSolid ? 'bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent' : 'text-white'
                }`}
              >
                RealEstate
              </span>
            </Link>

            <div className="relative" ref={roleMenuRef}>
              <button
                type="button"
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  showSolid
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
                        role="button"
                        tabIndex={0}
                        onClick={() => handleRoleChange('BUYER')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRoleChange('BUYER');
                          }
                        }}
                        className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                          <FaUserCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                            Buyer Mode
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Αναζήτηση και αγορά ακινήτων</div>
                        </div>
                        <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleRoleChange('AGENT')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRoleChange('AGENT');
                          }
                        }}
                        className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-200 cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                          <FaUserCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                            Agent Mode
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Διαχείριση πελατών και ακινήτων</div>
                        </div>
                        <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                      </div>
                    </div>
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs text-gray-500 text-center">
                        Τρέχων: <span className="font-semibold text-green-600">Seller Mode</span>
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
                  showSolid ? 'text-gray-600 hover:text-green-600' : 'text-white/90 hover:text-white'
                }`}
              >
                Αρχική
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all" />
              </Link>
              <Link
                href="/about"
                className={`transition-all font-medium relative group ${
                  showSolid ? 'text-gray-600 hover:text-green-600' : 'text-white/90 hover:text-white'
                }`}
              >
                Σχετικά
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all" />
              </Link>
              <Link
                href="/contact"
                className={`transition-all font-medium relative group ${
                  showSolid ? 'text-gray-600 hover:text-green-600' : 'text-white/90 hover:text-white'
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
                <SellerNotificationBell light={!showSolid} />
                <Link
                  href="/deals?from=seller&tab=deals"
                  className={`px-5 py-2.5 rounded-lg transition-all font-semibold text-sm ${
                    showSolid
                      ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800'
                      : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                  }`}
                >
                  Συναλλαγές
                </Link>
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md ${
                      showSolid
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
                    showSolid ? 'text-gray-600 hover:text-green-600' : 'text-white/90 hover:text-white'
                  }`}
                >
                  Σύνδεση
                </Link>
                <Link
                  href="/seller/auth/register"
                  className={`px-5 py-2.5 rounded-lg transition-all font-semibold text-sm ${
                    showSolid
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
  );
}

