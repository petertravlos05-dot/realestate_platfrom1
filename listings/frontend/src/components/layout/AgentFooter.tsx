'use client';

import Link from 'next/link';
import { FaHome, FaEnvelope, FaPhone, FaMapMarkerAlt, FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';

export default function AgentFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 mt-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <FaHome className="text-white text-sm" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-indigo-300 bg-clip-text text-transparent">
                RealEstate
              </span>
            </div>
            <p className="text-slate-400">
              Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Γρήγοροι Σύνδεσμοι</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/agent/properties" className="text-slate-400 hover:text-indigo-400 transition-colors duration-200">
                  Ακίνητα
                </Link>
              </li>
              <li>
                <Link href="/agent/about" className="text-slate-400 hover:text-indigo-400 transition-colors duration-200">
                  Σχετικά
                </Link>
              </li>
              <li>
                <Link href="/agent/contact" className="text-slate-400 hover:text-indigo-400 transition-colors duration-200">
                  Επικοινωνία
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Επικοινωνία</h3>
            <ul className="space-y-3 text-slate-400">
              <li className="flex items-center">
                <FaEnvelope className="mr-2 text-indigo-400" />
                info@realestate.com
              </li>
              <li className="flex items-center">
                <FaPhone className="mr-2 text-indigo-400" />
                +30 210 1234567
              </li>
              <li className="flex items-center">
                <FaMapMarkerAlt className="mr-2 text-indigo-400" />
                Αθήνα, Ελλάδα
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Ακολουθήστε μας</h3>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-slate-700/50 text-indigo-300 rounded-lg flex items-center justify-center hover:bg-indigo-600/30 hover:text-white transition-colors duration-200">
                <FaFacebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-700/50 text-indigo-300 rounded-lg flex items-center justify-center hover:bg-indigo-600/30 hover:text-white transition-colors duration-200">
                <FaTwitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-700/50 text-indigo-300 rounded-lg flex items-center justify-center hover:bg-indigo-600/30 hover:text-white transition-colors duration-200">
                <FaInstagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-700/50 text-indigo-300 rounded-lg flex items-center justify-center hover:bg-indigo-600/30 hover:text-white transition-colors duration-200">
                <FaLinkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-700 mt-8 pt-8 text-center text-slate-400">
          <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
