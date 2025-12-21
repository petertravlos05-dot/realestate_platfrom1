'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaUsers, FaChartBar, FaPlus, FaEye, FaCalendarAlt, FaBuilding, FaUserTie, FaPhone, FaEnvelope, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaSearch, FaUser, FaSignOutAlt, FaCog, FaComments, FaExchangeAlt, FaQuestionCircle, FaInfoCircle } from 'react-icons/fa';
import Link from 'next/link';

export default function AddListingPage() {
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f4ff] to-[#e5eaff]">
      {/* Header */}
      <header className="fixed w-full z-50 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            {/* Left Section - Logo */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex-shrink-0"
            >
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-[#001f3f]">RealEstate</span>
                <span className="px-2 py-1 text-xs font-semibold bg-[#001f3f]/10 text-[#001f3f] rounded-full">
                  Seller Mode
                </span>
              </Link>
            </motion.div>

            {/* Center Section - Navigation Links */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex-grow flex justify-center"
            >
              <div className="hidden md:flex items-center space-x-8">
                <Link
                  href="/seller/properties"
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Ακίνητα
                </Link>
                <Link
                  href="/about"
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Σχετικά
                </Link>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Επικοινωνία
                </Link>
              </div>
            </motion.div>

            {/* Right Section - Actions */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex-shrink-0 flex items-center space-x-4"
            >
              <Link
                href="/seller"
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <FaHome className="w-5 h-5" />
              </Link>
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2"
                >
                  <FaUser className="w-5 h-5 text-gray-600 hover:text-gray-900 transition-colors duration-200" />
                </button>
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                    >
                      <Link
                        href="/dashboard/seller/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <FaCog className="inline-block mr-2" />
                        Ρυθμίσεις
                      </Link>
                      <Link
                        href="/dashboard/seller/messages"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <FaComments className="inline-block mr-2" />
                        Μηνύματα
                      </Link>
                      <Link
                        href="/seller/how-it-works#faq"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <FaQuestionCircle className="inline-block mr-2" />
                        Συχνές Ερωτήσεις
                      </Link>
                      <Link
                        href="/"
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <FaExchangeAlt className="inline-block mr-2" />
                        Αλλαγή Ρόλων
                      </Link>
                      <button
                        onClick={() => router.push('/')}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors duration-200"
                      >
                        Αποσύνδεση
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        {/* Your existing add listing form content here */}
      </main>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="bg-[#001f3f] text-white py-8 mt-12"
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <h3 className="text-xl font-bold mb-4">Σχετικά με εμάς</h3>
              <p className="text-white">
                Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <h3 className="text-xl font-bold mb-4">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/properties" className="text-white hover:text-white/80 transition-colors duration-200">
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-white hover:text-white/80 transition-colors duration-200">
                    Σχετικά
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-white hover:text-white/80 transition-colors duration-200">
                    Επικοινωνία
                  </Link>
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
            >
              <h3 className="text-xl font-bold mb-4">Επικοινωνία</h3>
              <ul className="space-y-2 text-white">
                <li>Email: info@realestate.com</li>
                <li>Τηλέφωνο: +30 210 1234567</li>
                <li>Διεύθυνση: Αθήνα, Ελλάδα</li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
            >
              <h3 className="text-xl font-bold mb-4">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <motion.a 
                  whileHover={{ scale: 1.2 }}
                  href="#" 
                  className="text-white hover:text-white/80 transition-colors duration-200"
                >
                  <FaFacebook className="w-6 h-6" />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.2 }}
                  href="#" 
                  className="text-white hover:text-white/80 transition-colors duration-200"
                >
                  <FaTwitter className="w-6 h-6" />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.2 }}
                  href="#" 
                  className="text-white hover:text-white/80 transition-colors duration-200"
                >
                  <FaInstagram className="w-6 h-6" />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.2 }}
                  href="#" 
                  className="text-white hover:text-white/80 transition-colors duration-200"
                >
                  <FaLinkedin className="w-6 h-6" />
                </motion.a>
              </div>
            </motion.div>
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="border-t border-white/20 mt-8 pt-8 text-center text-white"
          >
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
} 