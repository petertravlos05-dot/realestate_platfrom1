'use client';

import { useSearchParams } from 'next/navigation';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

/**
 * Returns theme classes based on deal room context (buyer vs agent vs seller).
 * Buyer context = same colors as /properties (blue-900, slate-800, blue-800, slate-700).
 * Seller context = same colors as /seller (green-600, emerald-700).
 * Agent = indigo/blue-600 palette.
 */
export function useDealRoomTheme() {
  const searchParams = useSearchParams();
  const { role } = useCurrentUser();
  const fromParam = searchParams?.get('from') ?? null;
  const normalizedRole = (role || '').toUpperCase();
  const isProfessionalContext = ['LAWYER', 'NOTARY', 'ENGINEER', 'ACCOUNTANT'].includes(normalizedRole);
  const isBuyerContext = fromParam !== 'agent' && fromParam !== 'seller';
  const isSellerContext = fromParam === 'seller';
  const isAgentContext = fromParam === 'agent';

  // Seller: green theme (like /seller page)
  const sellerTheme = {
    accentGradient: 'from-green-600 to-emerald-700',
    accentHover: 'hover:from-green-700 hover:to-emerald-800',
    accentIcon: 'from-green-600 to-emerald-700',
    accentBorder: 'border-green-600',
    accentText: 'text-green-700',
    accentRing: 'ring-green-300',
    accentSelectedBg: 'from-emerald-50 to-green-50',
  };
  // Buyer: blue theme
  const buyerTheme = {
    accentGradient: 'from-blue-800 to-slate-700',
    accentHover: 'hover:from-blue-900 hover:to-slate-800',
    accentIcon: 'from-blue-800 to-slate-700',
    accentBorder: 'border-blue-800',
    accentText: 'text-blue-800',
    accentRing: 'ring-blue-800',
    accentSelectedBg: 'from-slate-50 to-blue-50',
  };
  // Agent: indigo/blue theme
  const agentTheme = {
    accentGradient: 'from-blue-600 to-indigo-600',
    accentHover: 'hover:from-blue-700 hover:to-indigo-700',
    accentIcon: 'from-blue-500 to-indigo-600',
    accentBorder: 'border-blue-600',
    accentText: 'text-blue-700',
    accentRing: 'ring-blue-300',
    accentSelectedBg: 'from-blue-50 to-indigo-50',
  };
  // Professional: slate/teal theme (like professional dashboard)
  const professionalTheme = {
    accentGradient: 'from-slate-900 to-slate-800',
    accentHover: 'hover:from-slate-800 hover:to-slate-700',
    accentIcon: 'from-teal-600 to-teal-500',
    accentBorder: 'border-teal-600',
    accentText: 'text-teal-700',
    accentRing: 'ring-teal-400',
    accentSelectedBg: 'from-teal-50 to-slate-50',
  };

  const theme = isProfessionalContext
    ? professionalTheme
    : isSellerContext
    ? sellerTheme
    : isBuyerContext
    ? buyerTheme
    : agentTheme;

  return {
    isProfessionalContext,
    isBuyerContext,
    isSellerContext,
    isAgentContext,
    ...theme,
  };
}
