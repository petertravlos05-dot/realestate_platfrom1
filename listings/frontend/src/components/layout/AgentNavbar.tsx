'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FaUser,
  FaCog,
  FaHeart,
  FaQuestionCircle,
  FaExchangeAlt,
  FaSignOutAlt,
  FaHome,
  FaUserCircle,
  FaChevronDown,
} from 'react-icons/fa';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import AgentNotificationBell from '@/components/notifications/AgentNotificationBell';

interface AgentNavbarProps {
  /** Όταν true, το navbar είναι πάντα solid (όχι transparent) από την αρχή */
  solidFromStart?: boolean;
  /** Όταν true, στην κορυφή (πριν το scroll) τα γράμματα είναι άσπρα (για dark hero background) */
  lightTextAtTop?: boolean;
}

export default function AgentNavbar({ solidFromStart = false, lightTextAtTop = false }: AgentNavbarProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) setIsProfileMenuOpen(false);
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) setIsRoleMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'BUYER') router.push('/buyer');
    else if (role === 'SELLER') router.push('/seller');
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/agent');
  };

  const showSolid = solidFromStart || isScrolled;
  const useLightText = lightTextAtTop && !showSolid;

  return (
    <header
      className={`fixed w-full z-50 transition-all duration-300 ${
        showSolid
          ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/agent" className="flex items-center group">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mr-2 shadow-lg transition-colors ${
                  showSolid ? 'bg-gradient-to-br from-indigo-600 to-indigo-700' : useLightText ? 'bg-white/20 backdrop-blur-sm border border-white/30' : 'bg-white/90 backdrop-blur-sm border border-slate-200/50'
                }`}
              >
                <FaHome className={`w-5 h-5 ${showSolid || useLightText ? 'text-white' : 'text-slate-800'}`} />
              </div>
              <span
                className={`text-xl font-bold transition-colors ${
                  showSolid ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text text-transparent' : useLightText ? 'text-white' : 'text-slate-800'
                }`}
              >
                RealEstate
              </span>
            </Link>
            <div className="relative" ref={roleMenuRef}>
              <button
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  showSolid
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-lg'
                    : useLightText ? 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30' : 'bg-white/90 backdrop-blur-sm text-slate-800 border border-slate-200/50 hover:bg-white'
                }`}
              >
                <FaUserCircle className="mr-2 w-4 h-4" />
                Referral Agent
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
                    <div className="px-6 py-3 bg-gradient-to-r from-indigo-50 to-indigo-50/50 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                        <FaExchangeAlt className="mr-2 text-indigo-500" />
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
                          <div className="text-xs text-gray-500 mt-1">Αναζήτηση και αγορά ακινήτων</div>
                        </div>
                        <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                      </div>
                      <div
                        onClick={() => handleRoleChange('SELLER')}
                        className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-200 cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                          <FaUserCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors duration-200">
                            Seller Mode
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Διαχείριση ακινήτων και πωλήσεων</div>
                        </div>
                        <FaExchangeAlt className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors duration-200" />
                      </div>
                    </div>
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs text-gray-500 text-center">
                        Τρέχων: <span className="font-semibold text-indigo-600">Referral Agent</span>
                      </p>
                      <p className="text-xs text-gray-500 text-center mt-1">
                        Είστε Επαγγελματίας;{' '}
                        <Link
                          href="/professionals"
                          className="font-semibold text-indigo-700 hover:text-indigo-800 underline underline-offset-2"
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
                href="/agent"
                className={`transition-all font-medium relative group ${
                  showSolid ? 'text-gray-600 hover:text-indigo-600' : useLightText ? 'text-white hover:text-white/90' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Αρχική
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all" />
              </Link>
              <Link
                href="/agent/properties"
                className={`transition-all font-medium relative group ${
                  showSolid ? 'text-gray-600 hover:text-indigo-600' : useLightText ? 'text-white hover:text-white/90' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Ακίνητα
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all" />
              </Link>
              <Link
                href="/agent/about"
                className={`transition-all font-medium relative group ${
                  showSolid ? 'text-gray-600 hover:text-indigo-600' : useLightText ? 'text-white hover:text-white/90' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Σχετικά
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-current group-hover:w-full transition-all" />
              </Link>
              <Link
                href="/agent/contact"
                className={`transition-all font-medium relative group ${
                  showSolid ? 'text-gray-600 hover:text-indigo-600' : useLightText ? 'text-white hover:text-white/90' : 'text-slate-700 hover:text-slate-900'
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
                <AgentNotificationBell variant={useLightText ? 'onDark' : 'default'} />
                <Link
                  href="/deals?from=agent&tab=overview"
                  className={`px-5 py-2.5 rounded-lg transition-all font-semibold text-sm ${
                    showSolid
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800'
                      : useLightText ? 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30' : 'bg-white/90 backdrop-blur-sm text-slate-800 border border-slate-200/50 hover:bg-white'
                  }`}
                >
                  Συναλλαγές
                </Link>
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md ${
                      showSolid
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800'
                        : useLightText ? 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30' : 'bg-white/90 backdrop-blur-sm text-slate-800 border border-slate-200/50 hover:bg-white'
                    }`}
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
                        href="/agent/profile?tab=settings"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors duration-200"
                      >
                        <FaCog className="mr-3 text-indigo-600" />
                        Ρυθμίσεις / Προφίλ
                      </Link>
                      <Link
                        href="/agent/profile?tab=favorites"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors duration-200"
                      >
                        <FaHeart className="mr-3 text-red-500" />
                        Αγαπημένα
                      </Link>
                      <Link
                        href="/agent/profile?tab=faq"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors duration-200"
                      >
                        <FaQuestionCircle className="mr-3 text-indigo-600" />
                        Συχνές Ερωτήσεις
                      </Link>
                      <div className="border-t border-gray-100 my-1" />
                      <Link
                        href="/"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors duration-200"
                      >
                        <FaExchangeAlt className="mr-3 text-indigo-600" />
                        Αλλαγή Ρόλων
                      </Link>
                      <button
                        onClick={() => { handleSignOut(); setIsProfileMenuOpen(false); }}
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
                  href="/agent/auth/login"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    showSolid ? 'text-slate-700 hover:bg-slate-100' : useLightText ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Σύνδεση
                </Link>
                <Link
                  href="/agent/auth/register"
                  className={`px-5 py-2.5 rounded-lg transition-all font-semibold text-sm ${
                    showSolid
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-lg'
                      : useLightText ? 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30' : 'bg-white/90 backdrop-blur-sm text-slate-800 border border-slate-200/50 hover:bg-white'
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
