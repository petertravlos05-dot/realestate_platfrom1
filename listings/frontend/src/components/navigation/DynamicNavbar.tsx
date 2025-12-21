'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { FaHome, FaSearch, FaEnvelope, FaInfoCircle, FaQuestionCircle, FaUser, FaCog, FaComments, FaExchangeAlt, FaSignOutAlt, FaUserCircle, FaChevronDown, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import NotificationBell from '@/components/notifications/NotificationBell';
import { motion, AnimatePresence } from 'framer-motion';

export default function DynamicNavbar() {
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
    await signOut({ redirect: false });
    router.push('/');
  };

  const handleChangeRole = () => {
    router.push('/');
  };

  const getRoleSpecificLinks = () => {
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

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${
      shouldBeTransparent
        ? 'bg-transparent'
        : isScrolled
        ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100'
        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-none'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <Link href={links.home} className="flex items-center space-x-3 group">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <FaHome className="text-white text-sm" />
              </div>
              <span className={`text-xl font-bold transition-colors duration-300 ${
                isBuyerPropertyDetails
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
            </Link>
            
            <div className="relative" ref={roleMenuRef}>
              <button
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-full shadow-md transition-all duration-300 ${
                  shouldBeTransparent
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
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href={links.home}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                shouldBeTransparent
                  ? 'text-white hover:bg-white/10'
                  : isScrolled
                  ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <FaHome className="mr-2" />
              Αρχική
            </Link>
            <Link
              href={links.properties}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                shouldBeTransparent
                  ? 'text-white hover:bg-white/10'
                  : isScrolled
                  ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <FaSearch className="mr-2" />
              Ακίνητα
            </Link>
            <Link
              href={links.contact}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                shouldBeTransparent
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
                shouldBeTransparent
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
              href={links.howItWorks}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                shouldBeTransparent
                  ? 'text-white hover:bg-white/10'
                  : isScrolled
                  ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <FaQuestionCircle className="mr-2" />
              Πώς Λειτουργεί
            </Link>
          </nav>

          <div className="flex items-center space-x-3">
            {status === 'authenticated' ? (
              <>
                <Link
                  href={links.dashboard}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-md ${
                    shouldBeTransparent
                      ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                      : isScrolled
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
                      : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                  }`}
                >
                  Dashboard
                </Link>
                <NotificationBell />
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md ${
                      shouldBeTransparent
                        ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                        : isScrolled
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
                        : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                    }`}
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
                        href={links.dashboard}
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200"
                      >
                        <FaCog className="mr-3 text-blue-500" />
                        Ρυθμίσεις
                      </Link>
                      <Link
                        href="/messages"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200"
                      >
                        <FaComments className="mr-3 text-blue-500" />
                        Μηνύματα
                      </Link>
                      <Link
                        href={links.howItWorks + "#faq"}
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200"
                      >
                        <FaQuestionCircle className="mr-3 text-blue-500" />
                        Συχνές Ερωτήσεις
                      </Link>
                      <div className="border-t border-gray-100 my-1"></div>
                      <Link
                        href="/"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200"
                      >
                        <FaExchangeAlt className="mr-3 text-blue-500" />
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
                  href={links.login}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    shouldBeTransparent
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
                    shouldBeTransparent
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