"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaHome, FaUserTie, FaHandshake, FaUserPlus, FaSearch, FaCheckCircle, FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main>
      {/* Hero Section */}
      <div className="relative min-h-screen bg-gradient-to-br from-[#001f3f] via-[#003366] to-[#001f3f]">
        {/* Hero Background */}
        <div className="absolute inset-0">
        <Image
            src="/images/hero-bg.svg"
            alt="Real Estate Hero"
            fill
            className="object-cover"
          priority
        />
          <div className="absolute inset-0 bg-gradient-to-br from-[#001f3f]/80 via-[#003366]/60 to-[#001f3f]/80" />
        </div>

        {/* Sticky Header */}
        <header className={`fixed w-full z-50 transition-all duration-300 ${
          isScrolled ? 'bg-blue-900/95 shadow-lg backdrop-blur-sm' : 'bg-transparent'
        }`}>
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-white text-2xl font-bold">
              RealEstate
            </Link>
            
            <nav className="flex items-center space-x-6">
              <Link href="/properties" className="text-white hover:text-blue-200 transition-colors">
                Browse Properties
              </Link>
              <Link href="/login" className="text-white hover:text-blue-200 transition-colors">
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors"
              >
                Sign Up
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 h-screen flex items-center">
          <div className="max-w-3xl text-white">
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Βρείτε το ιδανικό ακίνητο
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Ανακαλύψτε μοναδικές ευκαιρίες σε ακίνητα. Είτε ψάχνετε για αγορά, πώληση
              ή ενοικίαση, είμαστε εδώ για να σας βοηθήσουμε να βρείτε την τέλεια επιλογή.
            </p>
            <div className="flex space-x-4">
              <Link 
                href="/properties" 
                className="btn-primary"
              >
                Αναζήτηση Ακινήτων
              </Link>
              <Link 
                href="/properties/list" 
                className="btn-secondary"
              >
                Καταχώρηση Ακινήτου
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Role Selection */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="section-title">
            Επιλέξτε τον ρόλο σας
          </h2>
          <p className="section-subtitle">
            Αποφασίστε πώς θέλετε να χρησιμοποιήσετε την πλατφόρμα μας και ξεκινήστε το ταξίδι σας
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Buyer Card */}
            <div className="card">
              <div className="card-icon bg-green-500">
                <FaHome className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Αγοραστής</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Βρείτε το τέλειο ακίνητο για εσάς με εύκολη αναζήτηση και φιλτράρισμα.
              </p>
              <Link 
                href="/register?role=buyer"
                className="btn-primary"
              >
                Συνέχεια
              </Link>
            </div>

            {/* Seller Card */}
            <div className="card">
              <div className="card-icon bg-blue-500">
                <FaUserTie className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Πωλητής</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Καταχωρήστε το ακίνητό σας και φτάστε σε χιλιάδες ενδιαφερόμενους αγοραστές.
              </p>
              <Link 
                href="/register?role=seller"
                className="btn-primary"
              >
                Συνέχεια
              </Link>
            </div>

            {/* Agent Card */}
            <div className="card">
              <div className="card-icon bg-purple-500">
                <FaHandshake className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Μεσίτης</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Επαγγελματική πλατφόρμα για μεσίτες με εργαλεία διαχείρισης ακινήτων.
              </p>
              <Link 
                href="/register?role=agent"
                className="btn-primary"
              >
                Συνέχεια
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="section-title">
            Πώς λειτουργεί η πλατφόρμα μας
          </h2>
          <p className="section-subtitle">
            Ακολουθήστε τα απλά βήματα για να ξεκινήσετε το ταξίδι σας στην πλατφόρμα μας
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="flex items-start group">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <FaUserPlus className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors duration-300">Εγγραφή</h3>
                <p className="text-gray-600 leading-relaxed">Δημιουργήστε τον λογαριασμό σας και επιλέξτε τον ρόλο σας</p>
              </div>
              <div className="hidden md:block flex-1 h-0.5 bg-blue-200 mt-6 ml-4 group-hover:bg-blue-400 transition-colors duration-300" />
            </div>

            {/* Step 2 */}
            <div className="flex items-start group">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <FaSearch className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors duration-300">Αναζήτηση</h3>
                <p className="text-gray-600 leading-relaxed">Αναζητήστε ακίνητα με προχωρημένα φίλτρα</p>
              </div>
              <div className="hidden md:block flex-1 h-0.5 bg-blue-200 mt-6 ml-4 group-hover:bg-blue-400 transition-colors duration-300" />
            </div>

            {/* Step 3 */}
            <div className="flex items-start group">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <FaHome className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors duration-300">Καταχώρηση</h3>
                <p className="text-gray-600 leading-relaxed">Προσθέστε το ακίνητό σας με λεπτομερείς πληροφορίες</p>
              </div>
              <div className="hidden md:block flex-1 h-0.5 bg-blue-200 mt-6 ml-4 group-hover:bg-blue-400 transition-colors duration-300" />
            </div>

            {/* Step 4 */}
            <div className="flex items-start group">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <FaCheckCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors duration-300">Ολοκλήρωση</h3>
                <p className="text-gray-600 leading-relaxed">Ολοκληρώστε τη συναλλαγή με ασφάλεια</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#001f3f] text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <h3 className="text-xl font-bold mb-4">RealEstatePro</h3>
              <p className="text-gray-300 leading-relaxed">
                Η πιο αξιόπιστη πλατφόρμα για ακίνητα στην Ελλάδα.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Γρήγοροι Σύνδεσμοι</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-gray-300 hover:text-white transition-colors duration-300">
                    Σχετικά με εμάς
                  </Link>
                </li>
                <li>
                  <Link href="/properties" className="text-gray-300 hover:text-white transition-colors duration-300">
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/agents" className="text-gray-300 hover:text-white transition-colors duration-300">
                    Μεσίτες
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-300 hover:text-white transition-colors duration-300">
                    Επικοινωνία
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Επικοινωνία</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Λεωφ. Σόλωνος 123</li>
                <li>10672 Αθήνα</li>
                <li>Τηλ: 210 1234567</li>
                <li>Email: info@realestatepro.gr</li>
              </ul>
            </div>

            {/* Social Media */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Ακολουθήστε μας</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-300 hover:text-white transition-colors duration-300 transform hover:scale-110">
                  <FaFacebook className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors duration-300 transform hover:scale-110">
                  <FaTwitter className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors duration-300 transform hover:scale-110">
                  <FaInstagram className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors duration-300 transform hover:scale-110">
                  <FaLinkedin className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-blue-800 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; {new Date().getFullYear()} RealEstatePro. Με επιφύλαξη παντός δικαιώματος.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
