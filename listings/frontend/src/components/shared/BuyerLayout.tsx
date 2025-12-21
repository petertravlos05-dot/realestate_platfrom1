'use client';

import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaHome, FaUser, FaSearch, FaHeart, FaCog } from 'react-icons/fa';

interface BuyerLayoutProps {
  children: ReactNode;
}

export default function BuyerLayout({ children }: BuyerLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) {
    router.push('/buyer/auth/login');
    return null;
  }

  const menuItems = [
    {
      label: 'Αρχική',
      icon: <FaHome />,
      href: '/buyer/dashboard',
    },
    {
      label: 'Προφίλ',
      icon: <FaUser />,
      href: '/buyer/profile',
    },
    {
      label: 'Αναζήτηση',
      icon: <FaSearch />,
      href: '/buyer/properties',
    },
    {
      label: 'Αγαπημένα',
      icon: <FaHeart />,
      href: '/buyer/favorites',
    },
    {
      label: 'Ρυθμίσεις',
      icon: <FaCog />,
      href: '/buyer/settings',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg h-screen fixed">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-blue-600">RealEstate</h1>
            <p className="text-sm text-gray-500 mt-1">Πλατφόρμα Ακινήτων</p>
          </div>

          <nav className="mt-6">
            {menuItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="ml-64 flex-1">
          <main className="p-8">{children}</main>
        </div>
      </div>
    </div>
  );
} 