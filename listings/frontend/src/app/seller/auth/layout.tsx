'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaSearch, FaHome, FaEnvelope, FaInfoCircle, FaQuestionCircle } from 'react-icons/fa';

export default function SellerAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
} 