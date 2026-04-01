'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { clearAuthStorage } from '@/lib/api/client';
import { useRouter, usePathname } from 'next/navigation';
import { FaHome, FaSearch, FaEnvelope, FaInfoCircle, FaQuestionCircle, FaUser, FaCog, FaHeart, FaExchangeAlt, FaSignOutAlt, FaUserCircle, FaChevronDown, FaMapMarkerAlt, FaPhone, FaUserTie } from 'react-icons/fa';
import NotificationBell from '@/components/notifications/NotificationBell';
import { motion, AnimatePresence } from 'framer-motion';

interface DynamicNavbarProps {
  forceProfessionalTheme?: boolean;
  forceSolidFromStart?: boolean;
}

export default function DynamicNavbar({
  forceProfessionalTheme = false,
  forceSolidFromStart = false,
}: DynamicNavbarProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedRole, setSelectedRole] = useState<'BUYER' | 'SELLER' | 'AGENT'>('BUYER');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Function to get role from localStorage
  const getCurrentRole = () => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('selectedRole');
      return (storedRole && ['BUYER', 'SELLER', 'AGENT'].includes(storedRole)) 
        ? storedRole as 'BUYER' | 'SELLER' | 'AGENT'
        : 'BUYER';
    }
    return 'BUYER';
  };

  // Update role on mount and when localStorage changes
  useEffect(() => {
    setSelectedRole(getCurrentRole());

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    // Create a storage event listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedRole') {
        setSelectedRole(getCurrentRole());
      }
    };

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('scroll', handleScroll);

    // Custom event for same-tab updates
    const handleCustomStorageChange = () => {
      setSelectedRole(getCurrentRole());
    };
    window.addEventListener('selectedRoleChange', handleCustomStorageChange);

    // Handle click outside for profile menu
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
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('selectedRoleChange', handleCustomStorageChange);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    clearAuthStorage();
    await signOut({ redirect: false });
    const afterSignOut = pathname && pathname.startsWith('/professional') ? '/professionals' : '/';
    router.push(afterSignOut);
  };

  const handleChangeRole = () => {
    router.push('/');
  };

  const getRoleSpecificLinks = () => {
    // Professionals pages: εξειδικευμένα links για επαγγελματίες
    if (pathname && (pathname.startsWith('/professionals') || pathname.startsWith('/professional'))) {
      return {
        home: '/professionals',
        properties: '/properties',
        contact: '/agent/contact',
        about: '/professionals',
        howItWorks: '/professionals#role-section',
        login: '/professionals/login',
        register: '/professional/join',
        dashboard: '/professional/dashboard'
      };
    }
    // Αν είμαστε στη σελίδα /properties, /buyer/how-it-works, ή buyer property details, πάντα επιστρέφουμε buyer links
    if (pathname === '/properties' || 
        pathname === '/buyer/how-it-works' || 
        (pathname && pathname.startsWith('/buyer/properties/'))) {
      return {
        home: '/buyer',
        properties: '/properties',
        contact: '/buyer/contact',
        about: '/buyer/about',
        howItWorks: '/buyer/how-it-works',
        login: '/buyer/auth/login',
        register: '/buyer/auth/register',
        dashboard: '/dashboard/buyer'
      };
    }

    // Αλλιώς χρησιμοποιούμε τον επιλεγμένο ρόλο
    switch (selectedRole) {
      case 'SELLER':
        return {
          home: '/seller',
          properties: '/properties',
          contact: '/seller/contact',
          about: '/seller/about',
          howItWorks: '/seller/how-it-works',
          login: '/seller/auth/login',
          register: '/seller/auth/register',
          dashboard: '/dashboard/seller'
        };
      case 'AGENT':
        return {
          home: '/agent',
          properties: '/properties',
          contact: '/agent/contact',
          about: '/agent/about',
          howItWorks: '/agent/how-it-works',
          login: '/agent/auth/login',
          register: '/agent/auth/register',
          dashboard: '/dashboard/agent'
        };
      default: // BUYER
        return {
          home: '/buyer',
          properties: '/properties',
          contact: '/buyer/contact',
          about: '/buyer/about',
          howItWorks: '/buyer/how-it-works',
          login: '/buyer/auth/login',
          register: '/buyer/auth/register',
          dashboard: '/dashboard/buyer'
        };
    }
  };

  const links = getRoleSpecificLinks();

  // Ειδικό styling για buyer property details
  const isBuyerPropertyDetails = pathname && pathname.startsWith('/buyer/properties/');
  const shouldBeTransparent = isBuyerPropertyDetails && !isScrolled;
  
  // Για τις σελίδες /properties και /buyer/how-it-works, πάντα δείχνουμε Buyer Mode
  const displayRole = (pathname === '/properties' || pathname === '/buyer/how-it-works' || (pathname && pathname.startsWith('/buyer/properties/'))) ? 'BUYER' : selectedRole;
  
  // Για τις σελίδες /properties και /buyer/how-it-works, το logo πρέπει να είναι άσπρο
  const isBuyerPage = pathname === '/properties' || pathname === '/buyer/how-it-works' || (pathname && pathname.startsWith('/buyer/properties/'));
  const isProfessionalJoinPage = pathname === '/professional/join';
  const isProfessionalDashboardPage = pathname === '/professional/dashboard';
  const isProfessionalFaqPage = pathname === '/professional/faq';
  const isProfessionalRolesPage = pathname === '/professional/roles';
  const isProfessionalsLoginPage = pathname === '/professionals/login';
  const isProfessionalsPage =
    forceProfessionalTheme || (pathname && (pathname.startsWith('/professionals') || pathname.startsWith('/professional')));
  const isProfessionalsPageTransparent =
    isProfessionalsPage &&
    !isProfessionalsLoginPage &&
    !isProfessionalJoinPage &&
    !isProfessionalDashboardPage &&
    !isProfessionalRolesPage &&
    !isProfessionalFaqPage &&
    !forceSolidFromStart &&
    !isScrolled;

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${
      isProfessionalsLoginPage
        ? 'bg-white shadow-md border-b border-gray-200'
        : isProfessionalsPageTransparent
        ? 'bg-transparent'
        : isProfessionalsPage
        ? 'bg-white shadow-md border-b border-slate-200'
        : isProfessionalsLoginPage
        ? 'bg-white shadow-md border-b border-slate-200'
        : isProfessionalsLoginPage
        ? 'bg-white shadow-md border-b border-slate-200'
        : shouldBeTransparent
        ? 'bg-transparent'
        : isScrolled
        ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100'
        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-none'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <div className="flex flex-col">
              <Link href={links.home} className="flex items-center space-x-3 group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isProfessionalsPage ? 'bg-teal-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                }`}>
                  <FaHome className="text-white text-sm" />
                </div>
                {isProfessionalsPage ? (
                  <span className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-bold transition-colors duration-300 ${
                      isProfessionalsPageTransparent ? 'text-white' : 'text-slate-900'
                    }`}>
                      RealEstate
                    </span>
                    <span className={`text-sm font-normal opacity-80 transition-colors duration-300 ${
                      isProfessionalsPageTransparent ? 'text-white/90' : 'text-slate-500'
                    }`}>
                      | για Επαγγελματίες
                    </span>
                  </span>
                ) : (
                  <span className={`text-xl font-bold transition-colors duration-300 ${
                    isProfessionalJoinPage
                      ? 'text-blue-600'
                      : isBuyerPropertyDetails
                      ? isScrolled 
                        ? 'text-gray-700' 
                        : 'text-white'
                      : isBuyerPage 
                        ? 'text-white' 
                        : shouldBeTransparent 
                          ? 'text-white' 
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'
                  }`}>
                    RealEstate
                  </span>
                )}
              </Link>

              {isProfessionalsPage && (
                <Link
                  href="/buyer"
                  className={`mt-0.5 w-fit pl-11 text-[10px] leading-none font-semibold transition-colors ${
                    isProfessionalsPageTransparent ? 'text-white/90 hover:text-white underline underline-offset-2' : 'text-slate-500 hover:text-teal-700 underline underline-offset-2'
                  }`}
                >
                  Έξοδος από RealEstate Pro → RealEstate
                </Link>
              )}
            </div>
            
            {!isProfessionalsPage && (
            <div className="relative" ref={roleMenuRef}>
              <button
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-full shadow-md transition-all duration-300 ${
                  isProfessionalsPageTransparent
                    ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                    : isProfessionalsPage
                    ? 'bg-slate-100 text-[#0f172a] hover:bg-slate-200'
                    : shouldBeTransparent
                    ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                    : isScrolled 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600' 
                    : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                }`}
              >
                <FaUserCircle className="mr-2" />
                {displayRole === 'SELLER' ? 'Seller Mode' : 
                 displayRole === 'AGENT' ? 'Agent Mode' : 'Buyer Mode'}
                <FaChevronDown className={`ml-2 text-xs transition-transform duration-200 ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isRoleMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute left-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl py-3 border border-gray-100 z-50 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                        <FaExchangeAlt className="mr-2 text-blue-500" />
                        Αλλαγή Ρόλου
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Επιλέξτε τον ρόλο που θέλετε να χρησιμοποιήσετε</p>
                    </div>
                    
                    {/* Options */}
                    <div className="py-2">
                      <Link
                        href="/agent"
                        className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group"
                        onClick={() => {
                          localStorage.setItem('selectedRole', 'AGENT');
                          window.dispatchEvent(new Event('selectedRoleChange'));
                        }}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
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
                      </Link>
                      
                      <Link
                        href="/seller"
                        className="flex items-center px-6 py-4 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 group"
                        onClick={() => {
                          localStorage.setItem('selectedRole', 'SELLER');
                          window.dispatchEvent(new Event('selectedRoleChange'));
                        }}
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
                    
                    {/* Footer */}
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs text-gray-500 text-center">
                        Τρέχων: <span className="font-semibold text-blue-600">
                          {displayRole === 'SELLER' ? 'Seller Mode' : 
                           displayRole === 'AGENT' ? 'Agent Mode' : 'Buyer Mode'}
                        </span>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href={links.home}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isProfessionalJoinPage
                  ? 'text-blue-600 hover:bg-blue-50'
                  : isProfessionalsPageTransparent
                  ? 'text-white hover:bg-white/10'
                  : isProfessionalsPage
                  ? 'text-slate-800 hover:bg-teal-50 hover:text-teal-700'
                  : shouldBeTransparent
                  ? 'text-white hover:bg-white/10'
                  : isScrolled
                  ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <FaHome className="mr-2" />
              Αρχική
            </Link>
            {isProfessionalsPage ? (
              <>
                <Link
                  href={links.howItWorks}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isProfessionalsPageTransparent
                      ? 'text-white hover:bg-white/10'
                      : 'text-slate-800 hover:bg-teal-50 hover:text-teal-700'
                  }`}
                >
                  <FaQuestionCircle className="mr-2" />
                  Πώς Λειτουργεί
                </Link>
                <Link
                  href={links.contact}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isProfessionalsPageTransparent
                      ? 'text-white hover:bg-white/10'
                      : 'text-slate-800 hover:bg-teal-50 hover:text-teal-700'
                  }`}
                >
                  <FaEnvelope className="mr-2" />
                  Επικοινωνία
                </Link>
              </>
            ) : (
              <>
            {!isProfessionalJoinPage && (
              <Link
                href={links.properties}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isProfessionalsPageTransparent
                    ? 'text-white hover:bg-white/10'
                    : isProfessionalsPage
                    ? 'text-slate-800 hover:bg-teal-50 hover:text-teal-700'
                    : shouldBeTransparent
                    ? 'text-white hover:bg-white/10'
                    : isScrolled
                    ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <FaSearch className="mr-2" />
                Ακίνητα
              </Link>
            )}
            {status === 'authenticated' && ['BUYER', 'SELLER', 'AGENT'].includes(displayRole) && (
              <Link
                href="/deals"
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isProfessionalsPageTransparent
                    ? 'text-white hover:bg-white/10'
                    : isProfessionalsPage
                    ? 'text-slate-800 hover:bg-teal-50 hover:text-teal-700'
                    : shouldBeTransparent
                    ? 'text-white hover:bg-white/10'
                    : isScrolled
                    ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <FaExchangeAlt className="mr-2" />
                Συναλλαγές
              </Link>
            )}
            {status === 'authenticated' && (session?.user?.role === 'LAWYER' || session?.user?.role === 'NOTARY' || session?.user?.role === 'ENGINEER') && (
              <Link
                href="/professional/dashboard"
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isProfessionalsPageTransparent
                    ? 'text-white hover:bg-white/10'
                    : isProfessionalsPage
                    ? 'text-slate-800 hover:bg-teal-50 hover:text-teal-700'
                    : shouldBeTransparent
                    ? 'text-white hover:bg-white/10'
                    : isScrolled
                    ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <FaUserTie className="mr-2" />
                Επαγγελματικό Dashboard
              </Link>
            )}
            <Link
              href={links.contact}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isProfessionalJoinPage
                  ? 'text-blue-600 hover:bg-blue-50'
                  : isProfessionalsPageTransparent
                  ? 'text-white hover:bg-white/10'
                  : isProfessionalsPage
                  ? 'text-slate-800 hover:bg-teal-50 hover:text-teal-700'
                  : shouldBeTransparent
                  ? 'text-white hover:bg-white/10'
                  : isScrolled
                  ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <FaEnvelope className="mr-2" />
              Επικοινωνία
            </Link>
            <Link
              href={links.about}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isProfessionalJoinPage
                  ? 'text-blue-600 hover:bg-blue-50'
                  : isProfessionalsPageTransparent
                  ? 'text-white hover:bg-white/10'
                  : isProfessionalsPage
                  ? 'text-slate-800 hover:bg-teal-50 hover:text-teal-700'
                  : shouldBeTransparent
                  ? 'text-white hover:bg-white/10'
                  : isScrolled
                  ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <FaInfoCircle className="mr-2" />
              Σχετικά
            </Link>
            <Link
              href="/professionals"
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isProfessionalJoinPage
                  ? 'text-blue-600 hover:bg-blue-50'
                  : isProfessionalsPageTransparent
                  ? 'text-white hover:bg-white/10'
                  : isProfessionalsPage
                  ? 'text-slate-800 hover:bg-teal-50 hover:text-teal-700'
                  : shouldBeTransparent
                  ? 'text-white hover:bg-white/10'
                  : isScrolled
                  ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <FaUserTie className="mr-2" />
              Επαγγελματίες
            </Link>
            {!isProfessionalJoinPage && (
              <Link
                href={links.howItWorks}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isProfessionalsPageTransparent
                    ? 'text-white hover:bg-white/10'
                    : isProfessionalsPage
                    ? 'text-slate-800 hover:bg-teal-50 hover:text-teal-700'
                    : shouldBeTransparent
                    ? 'text-white hover:bg-white/10'
                    : isScrolled
                    ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <FaQuestionCircle className="mr-2" />
                Πώς Λειτουργεί
              </Link>
            )}
              </>
            )}
          </nav>

          <div className="flex items-center space-x-3">
            {status === 'authenticated' ? (
              <>
                <Link
                  href={links.dashboard}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-md ${
                    isProfessionalsPageTransparent
                      ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                      : isProfessionalsPage
                      ? 'bg-teal-600 text-white hover:bg-teal-500'
                      : shouldBeTransparent
                      ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                      : isScrolled
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
                      : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                  }`}
                >
                  {isProfessionalsPage ? 'Μετάβαση στο Dashboard' : 'Dashboard'}
                </Link>
                <NotificationBell />
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md ${
                      isProfessionalsPageTransparent
                        ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                        : isProfessionalsPage
                        ? 'bg-teal-600 text-white hover:bg-teal-500'
                        : shouldBeTransparent
                        ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                        : isScrolled
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
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
                            href={isProfessionalsPage ? '/professional/dashboard?tab=pricing' : links.dashboard}
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-100 group-hover:scale-105 transition-all duration-200">
                              <FaCog className="w-3.5 h-3.5 text-blue-700" />
                            </div>
                            <span className="font-medium text-gray-900 group-hover:text-blue-800 transition-colors">Ρυθμίσεις / Προφίλ</span>
                          </Link>
                          <Link
                            href={isProfessionalsPage ? '/professional/dashboard?tab=requests' : '/buyer/profile?tab=favorites'}
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200 group"
                          >
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-all duration-200 ${
                                isProfessionalsPage
                                  ? 'bg-orange-50 group-hover:bg-orange-100'
                                  : 'bg-red-50 group-hover:bg-red-100'
                              }`}
                            >
                              {isProfessionalsPage ? (
                                <FaEnvelope className="w-3.5 h-3.5 text-orange-500" />
                              ) : (
                                <FaHeart className="w-3.5 h-3.5 text-red-500" />
                              )}
                            </div>
                            <span
                              className={`font-medium text-gray-900 transition-colors ${
                                isProfessionalsPage ? 'group-hover:text-orange-700' : 'group-hover:text-red-600'
                              }`}
                            >
                              {isProfessionalsPage ? 'Αιτήματα' : 'Αγαπημένα'}
                            </span>
                          </Link>
                          <Link
                            href={isProfessionalsPage ? '/professional/faq' : links.howItWorks + '#faq'}
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
                            href={isProfessionalsPage ? '/professional/roles' : '/buyer/profile?tab=roles'}
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
                <Link
                  href={links.login}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isProfessionalsPageTransparent
                      ? 'text-white border border-white/40 hover:bg-white/10'
                      : isProfessionalsPage
                      ? 'text-slate-800 border border-slate-300 hover:bg-teal-50 hover:text-teal-700'
                      : shouldBeTransparent
                      ? 'text-white hover:bg-white/10'
                      : isScrolled
                      ? 'text-gray-700 hover:bg-gray-100'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  Σύνδεση
                </Link>
                <Link
                  href={links.register}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-md ${
                    isProfessionalsPageTransparent
                      ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                      : isProfessionalsPage
                      ? 'bg-teal-600 text-white hover:bg-teal-500'
                      : shouldBeTransparent
                      ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                      : isScrolled
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
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