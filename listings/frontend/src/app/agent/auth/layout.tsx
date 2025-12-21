'use client';

import { ReactNode } from 'react';

export default function AgentAuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="absolute top-0 left-0 w-full p-4">
        <div className="flex items-center space-x-2">
          <a href="/agent" className="flex items-center">
            <span className="text-xl font-bold text-[#001f3f]">RealEstate</span>
            <span className="ml-2 px-2 py-1 text-xs font-semibold bg-[#001f3f] text-white rounded-full">
              Agent Mode
            </span>
          </a>
        </div>
      </div>
      {children}
    </main>
  );
} 