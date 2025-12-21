'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const isDashboard = pathname?.includes('dashboard') || false;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header/Navbar θα προστεθεί εδώ */}
      <main className={`${isDashboard ? 'px-4 py-8' : ''}`}>
        {children}
      </main>
      {/* Footer θα προστεθεί εδώ */}
    </div>
  );
};

export default MainLayout; 