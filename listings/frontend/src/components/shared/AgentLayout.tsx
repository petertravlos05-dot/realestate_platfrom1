'use client';

import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaHome, FaUser, FaBuilding, FaChartLine, FaCog } from 'react-icons/fa';
import Link from 'next/link';

interface AgentLayoutProps {
  children: ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) {
    router.push('/agent/auth/login');
    return null;
  }

  const menuItems = [
    { href: '/dashboard/agent', icon: <FaHome />, label: 'Αρχική' },
    { href: '/agent/profile', icon: <FaUser />, label: 'Προφίλ' },
    { href: '/agent/properties', icon: <FaBuilding />, label: 'Ακίνητα' },
    { href: '/agent/analytics', icon: <FaChartLine />, label: 'Αναλύσεις' },
    { href: '/agent/settings', icon: <FaCog />, label: 'Ρυθμίσεις' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b">
            <h1 className="text-2xl font-bold text-blue-600">RealEstate</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">
                  {session.user?.name?.[0] || 'A'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {session.user?.name}
                </p>
                <p className="text-xs text-gray-500">Μεσίτης</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
} 