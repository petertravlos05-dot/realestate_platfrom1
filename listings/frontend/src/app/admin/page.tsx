'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaHome, FaEnvelope, FaChartBar, FaUsers, FaCog, FaSignOutAlt } from 'react-icons/fa';
import Link from 'next/link';

const adminMenuItems = [
  { id: 'listings', label: 'Αιτήσεις Αγγελιών', icon: <FaHome /> },
  { id: 'messages', label: 'Μηνύματα', icon: <FaEnvelope /> },
  { id: 'analytics', label: 'Στατιστικά', icon: <FaChartBar /> },
  { id: 'users', label: 'Χρήστες', icon: <FaUsers /> },
  { id: 'settings', label: 'Ρυθμίσεις', icon: <FaCog /> },
];

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('listings');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Πίνακας Διαχείρισης</h1>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/users"
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Διαχείριση Χρηστών</h3>
              <p className="mt-1 text-sm text-gray-500">
                Προβολή και διαχείριση χρηστών της πλατφόρμας
              </p>
            </div>
          </Link>

          <Link
            href="/admin/properties"
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Διαχείριση Ακινήτων</h3>
              <p className="mt-1 text-sm text-gray-500">
                Προβολή και διαχείριση καταχωρημένων ακινήτων
              </p>
            </div>
          </Link>

          <Link
            href="/admin/transactions"
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Διαχείριση Συναλλαγών</h3>
              <p className="mt-1 text-sm text-gray-500">
                Παρακολούθηση και ενημέρωση προόδου συναλλαγών
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
} 