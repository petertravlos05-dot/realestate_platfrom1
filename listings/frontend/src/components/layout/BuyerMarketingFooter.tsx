'use client';

import Link from 'next/link';
import { FaHome, FaEnvelope, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';

export default function BuyerMarketingFooter() {
  return (
    <footer className="bg-[#f5f0e8] border-t border-stone-300/40 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-slate-800 rounded-lg flex items-center justify-center">
                <FaHome className="text-white text-sm" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-900 to-slate-800 bg-clip-text text-transparent">
                RealEstate
              </span>
            </div>
            <p className="text-gray-600">
              Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Γρήγοροι Σύνδεσμοι</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/properties" className="text-gray-600 hover:text-blue-800 transition-colors duration-200">
                  Ακίνητα
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-blue-800 transition-colors duration-200">
                  Σχετικά
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-blue-800 transition-colors duration-200">
                  Επικοινωνία
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Επικοινωνία</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center">
                <FaEnvelope className="mr-2 text-blue-700" />
                info@realestate.com
              </li>
              <li className="flex items-center">
                <FaPhone className="mr-2 text-blue-700" />
                +30 210 1234567
              </li>
              <li className="flex items-center">
                <FaMapMarkerAlt className="mr-2 text-blue-700" />
                Αθήνα, Ελλάδα
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ακολουθήστε μας</h3>
            <div className="flex space-x-4">
              <a
                href="#"
                className="w-10 h-10 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200"
              >
                <FaFacebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200"
              >
                <FaTwitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200"
              >
                <FaInstagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors duration-200"
              >
                <FaLinkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
