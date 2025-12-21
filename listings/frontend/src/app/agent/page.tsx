'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { FaUser, FaCog, FaComments, FaQuestionCircle, FaExchangeAlt, 
         FaSignOutAlt, FaChartLine, FaLink, FaUserTie, FaHandshake, 
         FaMoneyBillWave, FaFacebook, FaTwitter, FaInstagram, FaLinkedin,
         FaBuilding, FaEnvelope, FaBell, FaChevronDown, FaTachometerAlt, FaCheck } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function AgentLandingPage() {
  const { data: session } = useSession();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleChange = (role: string) => {
    localStorage.setItem('selectedRole', role);
    window.dispatchEvent(new Event('selectedRoleChange'));
    if (role === 'BUYER') {
      router.push('/buyer');
    } else if (role === 'SELLER') {
      router.push('/seller');
    }
  };

  const handleLogout = () => {
    signOut();
  };

  const testimonials = [
    {
      name: "Γιώργος Παπαδόπουλος",
      role: "Real Estate Agent",
      image: "/images/agent1.jpg",
      text: "Μέσω της πλατφόρμας κατάφερα να αυξήσω τις προμήθειές μου κατά 40% τον τελευταίο χρόνο. Το σύστημα των referral links είναι απλά εκπληκτικό!"
    },
    {
      name: "Μαρία Κωνσταντίνου",
      role: "Senior Agent",
      image: "/images/agent2.jpg",
      text: "Η δυνατότητα να παρακολουθώ τα leads μου σε πραγματικό χρόνο έχει αλλάξει τον τρόπο που δουλεύω. Συστήνω ανεπιφύλακτα την πλατφόρμα!"
    },
    {
      name: "Νίκος Αντωνίου",
      role: "Real Estate Consultant",
      image: "/images/agent3.jpg",
      text: "Εξαιρετικό εργαλείο για networking και προώθηση ακινήτων. Έχω ήδη κλείσει 5 deals μέσω των referral links."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f4ff] to-[#e5eaff]">
      {/* Hero Section with Fullscreen */}
      <section className="relative h-screen overflow-hidden">
        {/* Video Background */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute w-full h-full object-cover"
        >
          <source src="/videos/agent-hero.mp4" type="video/mp4" />
        </video>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50">
          {/* Header - Now fixed and inside the hero section */}
          <header className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md' : 'bg-transparent'}`}>
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-4">
                  <Link href="/agent" className="text-2xl font-bold text-[#001f3f]">
                    RealEstate
                  </Link>
                  <div className="relative" ref={roleMenuRef}>
                    <button
                      onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                      className={`px-2 py-1 text-xs font-semibold ${isScrolled ? 'bg-[#001f3f] text-white' : 'bg-white/20 text-white'} rounded-full hover:bg-[#003366] transition-all duration-300 flex items-center space-x-1`}
                    >
                      <span>Agent Mode</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isRoleMenuOpen && (
                      <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2 border border-gray-100 z-50">
                        <div 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                          onClick={() => handleRoleChange('BUYER')}
                        >
                          <FaExchangeAlt className="mr-2 text-green-500" />
                          <span className="text-green-500 font-medium">Buyer Mode</span>
                        </div>
                        <div 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                          onClick={() => handleRoleChange('SELLER')}
                        >
                          <FaExchangeAlt className="mr-2 text-blue-500" />
                          <span className="text-blue-500 font-medium">Seller Mode</span>
                        </div>
                        <div className="border-t border-gray-100 my-1"></div>
                        <Link
                          href="/"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                        >
                          <FaExchangeAlt className="mr-2 text-gray-500" />
                          Επιλογή Ρόλου
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <Link 
                    href="/agent/properties"
                    className={`text-gray-700 hover:text-[#001f3f] font-medium flex items-center ${isScrolled ? '' : 'text-white hover:text-white/80'}`}
                  >
                    <FaBuilding className="mr-2" />
                    Ακίνητα
                  </Link>
                  <Link 
                    href="/agent/contact"
                    className={`text-gray-700 hover:text-[#001f3f] font-medium flex items-center ${isScrolled ? '' : 'text-white hover:text-white/80'}`}
                  >
                    <FaEnvelope className="mr-2" />
                    Επικοινωνία
                  </Link>
                  {session ? (
                    <>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Link
                          href="/dashboard/agent"
                          className={`bg-[#001f3f] text-white px-4 py-2 rounded-lg hover:bg-[#003366] transition-colors duration-200 flex items-center`}
                        >
                          <FaTachometerAlt className="mr-2" />
                          Dashboard
                        </Link>
                      </motion.div>
                      <div className="relative">
                        <button className={`text-gray-500 hover:text-gray-700 ${isScrolled ? '' : 'text-white hover:text-white/80'}`}>
                          <FaBell className="w-5 h-5" />
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                            3
                          </span>
                        </button>
                      </div>
                      <div className="relative">
                        <button 
                          className={`flex items-center space-x-2 ${isScrolled ? 'text-gray-700 hover:text-[#001f3f]' : 'text-white hover:text-white/80'}`}
                          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        >
                          <div className="h-8 w-8 rounded-full bg-[#001f3f] text-white flex items-center justify-center">
                            <span className="font-medium text-sm">{session?.user?.name?.[0] || 'A'}</span>
                          </div>
                          <span className="font-medium">{session?.user?.name}</span>
                          <FaChevronDown className={`w-3 h-3 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {isProfileMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                              ref={profileMenuRef}
                            >
                              <Link 
                                href="/agent/profile" 
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <FaUser className="mr-2" />
                                Προφίλ
                              </Link>
                              <Link 
                                href="/agent/settings" 
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <FaCog className="mr-2" />
                                Ρυθμίσεις
                              </Link>
                              <Link 
                                href="/" 
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <FaUserTie className="mr-2" />
                                Αλλαγή Ρόλου
                              </Link>
                              <div className="border-t border-gray-200 my-1"></div>
                              <button 
                                onClick={() => {
                                  signOut({ callbackUrl: '/agent' });
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                              >
                                <FaSignOutAlt className="mr-2" />
                                Αποσύνδεση
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/agent/auth/login"
                        className={`text-base ${isScrolled ? 'text-gray-600 hover:text-[#001f3f]' : 'text-white hover:text-white/80'} transition-colors`}
                      >
                        Σύνδεση
                      </Link>
                      <Link
                        href="/agent/auth/register"
                        className={`px-4 py-2 rounded-lg ${
                          isScrolled 
                            ? 'bg-[#001f3f] text-white hover:bg-[#003366]' 
                            : 'bg-white text-[#001f3f] hover:bg-white/90'
                        } transition-colors duration-200`}
                      >
                        Εγγραφή
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Hero Content - Centered in the screen */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center pt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-white max-w-3xl"
            >
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-block px-4 py-2 bg-[#001f3f]/80 rounded-full text-sm font-semibold mb-6"
              >
                AGENT EXCLUSIVE
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300"
              >
                Unlock Your Potential as an Agent
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-xl md:text-2xl mb-8 text-gray-200"
              >
                Promote properties, connect with buyers, and earn commissions – all in one platform
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex flex-col sm:flex-row gap-6"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/agent/properties"
                    className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#001f3f] to-[#003366] text-white rounded-lg font-semibold overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:from-[#002b57] hover:to-[#004080]"
                  >
                    <span className="absolute inset-0 bg-white/10 group-hover:scale-x-100 scale-x-0 origin-left transition-transform duration-500"></span>
                    <FaLink className="w-5 h-5 mr-2" />
                    <span className="relative">Promote Properties</span>
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/dashboard/agent"
                    className="group relative inline-flex items-center justify-center px-8 py-4 bg-white text-[#001f3f] rounded-lg font-semibold overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:bg-gray-50"
                  >
                    <span className="absolute inset-0 bg-[#001f3f]/5 group-hover:scale-x-100 scale-x-0 origin-left transition-transform duration-500"></span>
                    <FaChartLine className="w-5 h-5 mr-2" />
                    <span className="relative">View Your Dashboard</span>
                  </Link>
                </motion.div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-12 flex items-center space-x-4"
              >
                <div className="flex -space-x-2">
                  <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden">
                    <Image
                      src="/images/agent1.jpg"
                      alt="Agent"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden">
                    <Image
                      src="/images/agent2.jpg"
                      alt="Agent"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden">
                    <Image
                      src="/images/agent3.jpg"
                      alt="Agent"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-300">
                  Join <span className="font-semibold text-white">500+</span> successful agents on our platform
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
          >
            <span className="text-white text-sm mb-2">Scroll to explore</span>
            <motion.div
              animate={{
                y: [0, 10, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
              }}
              className="w-6 h-6 text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f0f4ff]/30 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <span className="inline-block px-4 py-2 bg-[#001f3f]/10 rounded-full text-[#001f3f] text-sm font-semibold mb-4">
              HOW IT WORKS
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#001f3f] mb-6">
              Your Path to Success
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Follow these simple steps to start earning commissions through our platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#001f3f]/20 via-[#001f3f] to-[#001f3f]/20 transform -translate-y-1/2"></div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="w-12 h-12 bg-[#001f3f] rounded-full flex items-center justify-center text-2xl font-bold text-white">
                  1
                </div>
              </div>
              <div className="w-16 h-16 bg-[#001f3f]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaLink className="w-8 h-8 text-[#001f3f]" />
              </div>
              <h3 className="text-xl font-semibold text-[#001f3f] mb-4">
                Create Your Referral Link
              </h3>
              <p className="text-gray-600">
                Select properties and generate unique referral links to share with potential buyers
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="relative bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="w-12 h-12 bg-[#001f3f] rounded-full flex items-center justify-center text-2xl font-bold text-white">
                  2
                </div>
              </div>
              <div className="w-16 h-16 bg-[#001f3f]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaUserTie className="w-8 h-8 text-[#001f3f]" />
              </div>
              <h3 className="text-xl font-semibold text-[#001f3f] mb-4">
                Connect with Buyers
              </h3>
              <p className="text-gray-600">
                Share your personalized links through your network and social media
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="relative bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="w-12 h-12 bg-[#001f3f] rounded-full flex items-center justify-center text-2xl font-bold text-white">
                  3
                </div>
              </div>
              <div className="w-16 h-16 bg-[#001f3f]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaChartLine className="w-8 h-8 text-[#001f3f]" />
              </div>
              <h3 className="text-xl font-semibold text-[#001f3f] mb-4">
                Track Your Leads
              </h3>
              <p className="text-gray-600">
                Monitor engagement and manage your leads through our intuitive dashboard
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="relative bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="w-12 h-12 bg-[#001f3f] rounded-full flex items-center justify-center text-2xl font-bold text-white">
                  4
                </div>
              </div>
              <div className="w-16 h-16 bg-[#001f3f]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaMoneyBillWave className="w-8 h-8 text-[#001f3f]" />
              </div>
              <h3 className="text-xl font-semibold text-[#001f3f] mb-4">
                Earn Commissions
              </h3>
              <p className="text-gray-600">
                Get paid when your referrals result in successful property transactions
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Video Tutorial Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-[#001f3f] mb-6">
                Δες πώς λειτουργεί η πλατφόρμα
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Μάθε πώς να χρησιμοποιείς όλα τα εργαλεία που σου προσφέρουμε για να μεγιστοποιήσεις τα κέρδη σου
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsVideoPlaying(true)}
                className="px-8 py-4 bg-[#001f3f] text-white rounded-lg font-semibold hover:bg-[#003366] transition-colors"
              >
                Παρακολούθησε το Video
              </motion.button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative aspect-video rounded-xl overflow-hidden shadow-xl"
            >
              <Image
                src="/images/video-thumbnail.jpg"
                alt="Tutorial Video Thumbnail"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsVideoPlaying(true)}
                  className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg"
                >
                  <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-[#001f3f] border-b-[15px] border-b-transparent ml-2" />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-[#001f3f] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/pattern.png')] opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-white/10 rounded-full text-white text-sm font-semibold mb-4">
              SUCCESS STORIES
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Hear from Our Top Agents
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Join hundreds of successful agents who are already using our platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center mb-6">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden mr-4 ring-4 ring-[#001f3f]/10">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#001f3f] text-lg">{testimonial.name}</h3>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                <div className="mb-6">
                  <svg className="w-8 h-8 text-[#001f3f]/20" fill="currentColor" viewBox="0 0 32 32">
                    <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-6">{testimonial.text}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="w-5 h-5 text-yellow-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">Verified Agent</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-50 to-indigo-50 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-200 rounded-full opacity-20"></div>
          <div className="absolute top-20 right-10 w-60 h-60 bg-indigo-200 rounded-full opacity-20"></div>
          <div className="absolute bottom-10 left-1/3 w-50 h-50 bg-blue-300 rounded-full opacity-20"></div>
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-blue-100 rounded-full opacity-30"></div>
          <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-indigo-100 rounded-full opacity-30"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-left"
            >
              <span className="inline-block px-4 py-2 bg-[#001f3f]/10 rounded-full text-[#001f3f] text-sm font-semibold mb-4">
                ΕΞΑΙΡΕΤΙΚΗ ΕΥΚΑΙΡΙΑ
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#001f3f] mb-4">
                Ξεκινήστε την Προώθηση των Ακινήτων
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Επωφεληθείτε από το μοναδικό σύστημα referral μας και κερδίστε προμήθειες!
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-[#001f3f] rounded-full flex items-center justify-center text-white">
                      <FaCheck className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-700 font-medium">Δημιουργήστε μοναδικούς συνδέσμους για κάθε ακίνητο</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-[#001f3f] rounded-full flex items-center justify-center text-white">
                      <FaCheck className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-700 font-medium">Παρακολουθήστε τα leads σας σε πραγματικό χρόνο</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-[#001f3f] rounded-full flex items-center justify-center text-white">
                      <FaCheck className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-700 font-medium">Κερδίστε προμήθειες από κάθε επιτυχή συμφωνία</p>
                  </div>
                </div>
              </div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/agent/properties"
                  className="inline-flex items-center justify-center px-8 py-4 bg-[#001f3f] text-white rounded-lg font-semibold hover:bg-[#003366] transition-all shadow-lg hover:shadow-xl"
                >
                  <FaLink className="w-5 h-5 mr-2" />
                  Ξεκινήστε την Προώθηση
                </Link>
              </motion.div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-xl overflow-hidden shadow-2xl">
                <Image 
                  src="/images/agent-dashboard-preview.jpg" 
                  alt="Agent Dashboard Preview" 
                  width={600} 
                  height={400}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#001f3f]/30 to-transparent"></div>
                
                {/* Floating elements */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
                  className="absolute top-10 right-10 bg-white rounded-lg shadow-lg p-4 max-w-xs"
                >
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white mr-2">
                      <FaUser className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Νέο Lead</p>
                      <p className="text-xs text-gray-500">Πριν 5 λεπτά</p>
                    </div>
                  </div>
                  <p className="text-sm">Ο Γιώργος ενδιαφέρεται για το διαμέρισμα στην Κηφισιά</p>
                </motion.div>
                
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, repeatType: "reverse" }}
                  className="absolute bottom-10 left-10 bg-white rounded-lg shadow-lg p-4 max-w-xs"
                >
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white mr-2">
                      <FaMoneyBillWave className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Επιτυχής Συμφωνία</p>
                      <p className="text-xs text-gray-500">Πριν 2 ώρες</p>
                    </div>
                  </div>
                  <p className="text-sm">Κέρδος: €2,500</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#001f3f] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Σχετικά με εμάς</h3>
              <p className="text-gray-300">
                Η πλατφόρμα που συνδέει agents με αγοραστές και πωλητές ακινήτων.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Σύνδεσμοι</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/agent/properties" className="text-gray-300 hover:text-white transition-colors">
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/agent/about" className="text-gray-300 hover:text-white transition-colors">
                    Σχετικά
                  </Link>
                </li>
                <li>
                  <Link href="/agent/contact" className="text-gray-300 hover:text-white transition-colors">
                    Επικοινωνία
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Επικοινωνία</h3>
              <ul className="space-y-2 text-gray-300">
                <li>Email: info@realestate.com</li>
                <li>Τηλέφωνο: +30 210 1234567</li>
                <li>Διεύθυνση: Αθήνα, Ελλάδα</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Social Media</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <FaFacebook className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <FaTwitter className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <FaInstagram className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  <FaLinkedin className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      <AnimatePresence>
        {isVideoPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setIsVideoPlaying(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <video
                autoPlay
                controls
                className="w-full h-full"
              >
                <source src="/videos/agent-tutorial.mp4" type="video/mp4" />
              </video>
              <button
                onClick={() => setIsVideoPlaying(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 