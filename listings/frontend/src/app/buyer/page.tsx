'use client';

import BuyerLandingPage from '@/components/landing/BuyerLandingPage';
import BuyerMarketingHeader from '@/components/layout/BuyerMarketingHeader';
import BuyerMarketingFooter from '@/components/layout/BuyerMarketingFooter';

export default function BuyerPage() {
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <BuyerMarketingHeader />

      <main>
        <BuyerLandingPage />
      </main>

      <BuyerMarketingFooter />
    </div>
  );
}
