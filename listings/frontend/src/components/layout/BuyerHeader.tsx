'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FaHome, FaSearch, FaUser, FaEnvelope, FaInfoCircle } from 'react-icons/fa';

const BuyerHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed w-full z-50 bg-white/90 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/buyer" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-blue-600">RealEstate</span>
              <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-600 rounded-full">
                Buyer Mode
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/buyer"
              className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              <FaHome className="mr-2" />
              Αρχική
            </Link>
            <Link
              href="/properties"
              className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              <FaSearch className="mr-2" />
              Ακίνητα
            </Link>
            <Link
              href="/buyer/contact"
              className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              <FaEnvelope className="mr-2" />
              Επικοινωνία
            </Link>
            <Link
              href="/buyer/about"
              className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              <FaInfoCircle className="mr-2" />
              Σχετικά
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            <Link
              href="/buyer/auth/login"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Σύνδεση
            </Link>
            <Link
              href="/buyer/auth/register"
              className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              Εγγραφή
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/buyer"
                className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium"
              >
                <FaHome className="mr-2" />
                Αρχική
              </Link>
              <Link
                href="http://localhost:3004/properties"
                className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium"
              >
                <FaSearch className="mr-2" />
                Ακίνητα
              </Link>
              <Link
                href="/buyer/contact"
                className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium"
              >
                <FaEnvelope className="mr-2" />
                Επικοινωνία
              </Link>
              <Link
                href="/buyer/about"
                className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium"
              >
                <FaInfoCircle className="mr-2" />
                Σχετικά
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default BuyerHeader; 