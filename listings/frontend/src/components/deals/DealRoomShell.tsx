'use client';

import { ReactNode } from 'react';
import { DealRoom } from '@/lib/api/deals';

interface DealRoomShellProps {
  deal: DealRoom;
  onRefresh: () => void;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  leftColumn: ReactNode;
  rightColumn: ReactNode;
}

/**
 * DealRoomShell - New 2-column layout for Deal Room workspace
 * 
 * Layout:
 * - Sticky compact header (handled by DealRoomHeader)
 * - 2-column grid on desktop (35% left / 65% right)
 * - Single column on mobile (stacked)
 */
export default function DealRoomShell({
  deal,
  onRefresh,
  connectionStatus,
  leftColumn,
  rightColumn,
}: DealRoomShellProps) {
  return (
    <>
      {/* Body Grid */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 lg:gap-10">
          {/* Left Column: Guide + Activity + Summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start lg:h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">
            <div className="space-y-6">
              {leftColumn}
            </div>
          </aside>

          {/* Right Column: Tabs Panel */}
          <main className="min-w-0 flex-1">
            {rightColumn}
          </main>
        </div>
      </div>
    </>
  );
}

