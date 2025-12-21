import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  role: string;
  exp: number;
}

// Middleware για το admin panel και buyer pages
export async function middleware(request: NextRequest) {
  // Έλεγχος αν η διαδρομή είναι login ή register
  const isAuthRoute = request.nextUrl.pathname === '/admin/login' || 
                     request.nextUrl.pathname === '/admin/register' ||
                     request.nextUrl.pathname === '/buyer/auth/login' ||
                     request.nextUrl.pathname === '/buyer/auth/register' ||
                     request.nextUrl.pathname === '/agent/auth/login' ||
                     request.nextUrl.pathname === '/agent/auth/register' ||
                     request.nextUrl.pathname === '/seller/auth/login' ||
                     request.nextUrl.pathname === '/seller/auth/register';

  // Επιτρέπουμε την πρόσβαση στις σελίδες login και register
  if (isAuthRoute) {
    return NextResponse.next();
  }

  // Για όλες τις άλλες διαδρομές admin, ελέγχουμε το token
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = await getToken({ req: request });
    
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Για τις διαδρομές buyer που απαιτούν σύνδεση ΚΑΙ για /buyer/properties αλλά χωρίς έλεγχο ρόλου
  if (request.nextUrl.pathname.startsWith('/buyer/properties/')) {
    const token = await getToken({ req: request });
    if (!token) {
      // Ανακατεύθυνση στη σελίδα σύνδεσης buyer με callback URL
      const callbackUrl = encodeURIComponent(request.nextUrl.pathname);
      return NextResponse.redirect(new URL(`/buyer/auth/login?callbackUrl=${callbackUrl}`, request.url));
    }
    // Δεν ελέγχουμε το role!
  }

  // Για dashboard/buyer ελέγχουμε μόνο αν είναι authenticated, όχι το ρόλο
  if (request.nextUrl.pathname.startsWith('/dashboard/buyer')) {
    const token = await getToken({ req: request });
    if (!token) {
      const callbackUrl = encodeURIComponent(request.nextUrl.pathname);
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
  matcher: ['/admin/:path*', '/buyer/properties/:path*', '/dashboard/buyer/:path*']
}; 