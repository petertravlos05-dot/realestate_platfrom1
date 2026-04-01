import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  role: string;
  exp: number;
}

// Professional-only routes (allowed for LAWYER, NOTARY, ACCOUNTANT)
const PROFESSIONAL_ROUTES = [
  '/professional',
  '/professionals',
];

// Non-professional routes (not allowed for professionals)
// Note: /deals is allowed for professionals if they are participants
const NON_PROFESSIONAL_ROUTES = [
  '/admin',
  '/buyer',
  '/agent',
  '/seller',
  '/dashboard',
  '/properties',
  '/login',
  '/register',
];

// Check if path matches any route prefix
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => pathname.startsWith(route));
}

/** Διαδρομές που δεν επιτρέπονται σε πωλητή με userType COMPANY */
function isRestrictedForCompanySeller(pathname: string): boolean {
  return (
    pathname.startsWith('/buyer') ||
    pathname.startsWith('/dashboard/buyer') ||
    pathname.startsWith('/agent') ||
    pathname.startsWith('/dashboard/agent') ||
    pathname.startsWith('/professionals')
  );
}

// Middleware για το admin panel και buyer pages
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = await getToken({ req: request });

  /** Πωλητής μεσιτικής εταιρείας (COMPANY): όχι buyer / agent / professionals — αποσύνδεση μέσω /seller/auth/login */
  const restrictedCompany = isRestrictedForCompanySeller(pathname);
  let effectiveUserType = String((token as { userType?: string } | null)?.userType || '').toUpperCase();
  if (
    token &&
    String(token.role || '').toUpperCase() === 'SELLER' &&
    !effectiveUserType &&
    restrictedCompany
  ) {
    try {
      const res = await fetch(new URL('/api/auth/session', request.nextUrl.origin), {
        headers: { cookie: request.headers.get('cookie') ?? '' },
        cache: 'no-store',
      });
      const data = res.ok ? await res.json() : null;
      effectiveUserType = String(data?.user?.userType || 'INDIVIDUAL').toUpperCase();
    } catch {
      effectiveUserType = 'INDIVIDUAL';
    }
  }
  const isCompanySeller =
    !!token &&
    String(token.role || '').toUpperCase() === 'SELLER' &&
    effectiveUserType === 'COMPANY';
  if (isCompanySeller && restrictedCompany) {
    const url = new URL('/seller/auth/login', request.url);
    url.searchParams.set('logout', 'true');
    url.searchParams.set('reason', 'company_seller_restricted');
    return NextResponse.redirect(url);
  }

  // Check if user is a professional
  const isProfessional = token?.role === 'LAWYER' || token?.role === 'NOTARY' || token?.role === 'ACCOUNTANT';
  
  // Allow buyers and non-professionals to access /buyer routes and /dashboard/buyer
  // This should come BEFORE the professional check to allow buyers through
  if (pathname.startsWith('/buyer') || pathname.startsWith('/dashboard/buyer')) {
    // If user is a professional, block them
    if (isProfessional && token) {
      const redirectUrl = new URL('/professional/dashboard', request.url);
      redirectUrl.searchParams.set('logout', 'true');
      redirectUrl.searchParams.set('reason', 'professional_account');
      return NextResponse.redirect(redirectUrl);
    }
    // Allow everyone else (buyers, sellers, agents, unauthenticated users for /buyer routes)
    // For /dashboard/buyer, require authentication but allow all non-professional roles
    // Redirect buyers to /deals instead of /dashboard/buyer after login
    if (pathname.startsWith('/dashboard/buyer')) {
      if (!token) {
        return NextResponse.redirect(new URL(`/buyer/auth/login?callbackUrl=${encodeURIComponent('/deals')}`, request.url));
      }
      // If authenticated buyer tries to access /dashboard/buyer, redirect to /deals
      if (token.role === 'BUYER') {
        return NextResponse.redirect(new URL('/deals', request.url));
      }
    }
    return NextResponse.next();
  }
  
  // If user is a professional, block access to non-professional routes
  if (isProfessional && token) {
    // Allow professional routes
    if (matchesRoute(pathname, PROFESSIONAL_ROUTES)) {
      return NextResponse.next();
    }
    
    // Allow deal rooms for professionals (they can be participants)
    if (pathname.startsWith('/deals/')) {
      return NextResponse.next();
    }
    
    // Allow public routes (home, about, etc.)
    if (pathname === '/' || pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
      return NextResponse.next();
    }
    
    // Block access to non-professional routes - redirect to professional dashboard and sign out
    if (matchesRoute(pathname, NON_PROFESSIONAL_ROUTES)) {
      // Redirect to professional dashboard
      const redirectUrl = new URL('/professional/dashboard', request.url);
      redirectUrl.searchParams.set('logout', 'true');
      redirectUrl.searchParams.set('reason', 'professional_account');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Allow /professionals page for everyone (landing page), including logged-in users.
  // (Μεσιτικές εταιρείες πωλητών αποκλείονται παραπάνω.)
  if (pathname === '/professionals') {
    return NextResponse.next();
  }

  // Allow /professionals/login page for everyone (for login)
  // But if a non-professional is already logged in, redirect them away
  if (pathname === '/professionals/login') {
    // If user is logged in and is NOT a professional, redirect them
    if (token && !isProfessional) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Allow access for everyone else (including unauthenticated users and professionals)
    return NextResponse.next();
  }

  // Έλεγχος αν η διαδρομή είναι login ή register
  const isAuthRoute = pathname === '/admin/login' || 
                     pathname === '/admin/register' ||
                     pathname === '/buyer/auth/login' ||
                     pathname === '/buyer/auth/register' ||
                     pathname === '/agent/auth/login' ||
                     pathname === '/agent/auth/register' ||
                     pathname === '/seller/auth/login' ||
                     pathname === '/seller/auth/register' ||
                     pathname === '/login' ||
                     pathname === '/register';

  // Block professionals from accessing non-professional login/register pages
  if (isAuthRoute && isProfessional && token) {
    return NextResponse.redirect(new URL('/professional/dashboard', request.url));
  }

  // Επιτρέπουμε την πρόσβαση στις σελίδες login και register (για non-professionals)
  if (isAuthRoute) {
    return NextResponse.next();
  }

  // Για όλες τις άλλες διαδρομές admin, ελέγχουμε το token
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Για τις διαδρομές buyer που απαιτούν σύνδεση ΚΑΙ για /buyer/properties αλλά χωρίς έλεγχο ρόλου
  // Note: /dashboard/buyer is handled above in the /buyer routes check
  if (pathname.startsWith('/buyer/properties/')) {
    if (!token) {
      // Ανακατεύθυνση στη σελίδα σύνδεσης buyer με callback URL
      const callbackUrl = encodeURIComponent(pathname);
      return NextResponse.redirect(new URL(`/buyer/auth/login?callbackUrl=${callbackUrl}`, request.url));
    }
    // Δεν ελέγχουμε το role!
  }

  return NextResponse.next();
}

// Middleware για το mobile app - τώρα δέχεται και Request
export async function validateJwtToken(request: NextRequest | Request): Promise<JwtPayload | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    return decoded;
  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
}

export const config = {
  matcher: [
    '/admin/:path*', 
    '/buyer/:path*', 
    '/agent/:path*', 
    '/seller/:path*',
    '/dashboard/:path*',
    '/deals/:path*',
    '/properties/:path*',
    '/login',
    '/register',
    '/professional/:path*',
    '/professionals/:path*',
  ]
}; 