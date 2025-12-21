"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaUserTie, FaHandshake, FaArrowRight, FaBuilding } from 'react-icons/fa';

const LandingPage = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const roles = [
    {
      id: 'buyer',
      title: 'Αγοραστής',
      description: 'Βρείτε το τέλειο ακίνητο για εσάς με εύκολη αναζήτηση και φιλτράρισμα.',
      icon: FaHome,
      color: 'bg-green-500',
      link: '/register?role=buyer'
    },
    {
      id: 'seller',
      title: 'Πωλητής',
      description: 'Καταχωρήστε το ακίνητό σας και βρείτε τον τέλειο αγοραστή.',
      icon: FaUserTie,
      color: 'bg-blue-500',
      link: '/register?role=seller'
    },
    {
      id: 'agent',
      title: 'Μεσίτης',
      description: 'Βοηθήστε άλλους να βρουν το ιδανικό τους ακίνητο και αναπτύξτε την επιχείρησή σας.',
      icon: FaBuilding,
      color: 'bg-purple-500',
      link: '/register?role=agent'
    }
  ];

  return (
    <div className="relative min-h-screen">
      {/* Video Background */}
      <div className="absolute inset-0 z-0 bg-[#001f3f]">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        >
          <source src="/videos/landing-background.mp4" type="video/mp4" />
          Το browser σας δεν υποστηρίζει την αναπαραγωγή βίντεο.
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#001f3f]/80 via-[#003366]/60 to-[#001f3f]/80" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="fixed w-full bg-gradient-to-b from-[#001f3f]/90 to-transparent backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="text-2xl font-bold text-white hover:text-blue-300 transition-colors">
                RealEstate
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link href="/properties" className="text-white/90 hover:text-white transition-colors text-lg">
                  Αναζήτηση
                </Link>
                <Link href="/about" className="text-white/90 hover:text-white transition-colors text-lg">
                  Σχετικά
                </Link>
                <Link href="/contact" className="text-white/90 hover:text-white transition-colors text-lg">
                  Επικοινωνία
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-4xl w-full text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              Βρείτε το Ιδανικό Ακίνητό Σας
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-white/90 mb-12"
            >
              Ανακαλύψτε μοναδικές ευκαιρίες σε ακίνητα. Είτε ψάχνετε για αγορά, πώληση
              ή ενοικίαση, είμαστε εδώ για να σας βοηθήσουμε να βρείτε την τέλεια επιλογή.
            </motion.p>

            {/* Role Selection */}
            <AnimatePresence mode="wait">
              {!selectedRole ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-8"
                >
                  {roles.map((role) => (
                    <motion.div
                      key={role.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedRole(role.id)}
                      className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 cursor-pointer
                               border border-white/20 hover:border-white/40 transition-all duration-300"
                    >
                      <div className={`${role.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6`}>
                        <role.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4">{role.title}</h3>
                      <p className="text-white/80 mb-6">{role.description}</p>
                      <div className="flex items-center justify-center text-white">
                        <span className="mr-2">Συνέχεια</span>
                        <FaArrowRight />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl mx-auto"
                >
                  <h3 className="text-2xl font-bold text-white mb-6">
                    {roles.find(r => r.id === selectedRole)?.title}
                  </h3>
                  <p className="text-white/80 mb-8">
                    {roles.find(r => r.id === selectedRole)?.description}
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Link
                      href={selectedRole === 'buyer' ? '/buyer' : selectedRole === 'seller' ? '/seller' : '/agent'}
                      className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700
                               transition-colors duration-300 flex items-center"
                    >
                      <span className="mr-2">Συνέχεια</span>
                      <FaArrowRight />
                    </Link>
                    <button
                      onClick={() => setSelectedRole(null)}
                      className="bg-white/20 text-white px-8 py-3 rounded-lg hover:bg-white/30
                               transition-colors duration-300"
                    >
                      Επιστροφή
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LandingPage; 