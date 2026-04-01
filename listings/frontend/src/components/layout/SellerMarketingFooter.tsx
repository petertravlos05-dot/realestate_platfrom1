'use client';

import Link from 'next/link';
import {
  FaHome,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
} from 'react-icons/fa';

export default function SellerMarketingFooter() {
  return (
    <footer className="bg-gradient-to-r from-green-900 to-emerald-900 text-white py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3">
                <FaHome className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold">RealEstate</span>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6">Γρήγοροι Σύνδεσμοι</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/properties" className="text-gray-300 hover:text-white transition-all inline-block">
                  Ακίνητα
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-300 hover:text-white transition-all inline-block">
                  Σχετικά
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-white transition-all inline-block">
                  Επικοινωνία
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6">Επικοινωνία</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center">
                <FaEnvelope className="w-4 h-4 mr-3 text-green-400" /> info@realestate.com
              </li>
              <li className="flex items-center">
                <FaPhone className="w-4 h-4 mr-3 text-green-400" /> +30 210 1234567
              </li>
              <li className="flex items-center">
                <FaMapMarkerAlt className="w-4 h-4 mr-3 text-green-400" /> Αθήνα, Ελλάδα
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6">Ακολουθήστε μας</h3>
            <div className="flex space-x-4">
              <a
                href="#"
                className="w-12 h-12 bg-green-700/50 rounded-xl flex items-center justify-center text-white hover:bg-green-600 transition-all"
              >
                <FaFacebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-12 h-12 bg-green-700/50 rounded-xl flex items-center justify-center text-white hover:bg-green-600 transition-all"
              >
                <FaTwitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-12 h-12 bg-green-700/50 rounded-xl flex items-center justify-center text-white hover:bg-green-600 transition-all"
              >
                <FaInstagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-12 h-12 bg-green-700/50 rounded-xl flex items-center justify-center text-white hover:bg-green-600 transition-all"
              >
                <FaLinkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

