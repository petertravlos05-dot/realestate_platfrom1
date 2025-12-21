import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateJwtToken } from '@/middleware';

export async function GET(request: Request) {
  try {
    // Πρώτα δοκιμάζουμε το JWT token (για το mobile app)
    const jwtUser = await validateJwtToken(request as any);
    let userId: string | undefined;

    if (jwtUser) {
      // Αν έχουμε έγκυρο JWT token, χρησιμοποιούμε το userId από αυτό
      userId = jwtUser.userId;
    } else {
      // Αλλιώς δοκιμάζουμε το next-auth session (για το web app)
      const session = await getServerSession(authOptions);
      userId = session?.user?.id;
    }

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const agentId = searchParams.get('agentId');

    if (!propertyId || !agentId) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    const existingConnection = await prisma.buyerAgentConnection.findFirst({
      where: {
        propertyId,
        agentId,
        buyerId: userId,
      },
    });

    return NextResponse.json({
      exists: !!existingConnection,
      connection: existingConnection,
    });
  } catch (error) {
    console.error('Error checking buyer-agent connection:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Πρώτα δοκιμάζουμε το JWT token (για το mobile app)
    const jwtUser = await validateJwtToken(request as any);
    let userId: string | undefined;

    if (jwtUser) {
      // Αν έχουμε έγκυρο JWT token, χρησιμοποιούμε το userId από αυτό
      userId = jwtUser.userId;
    } else {
      // Αλλιώς δοκιμάζουμε το next-auth session (για το web app)
      const session = await getServerSession(authOptions);
      userId = session?.user?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId, agentId } = await request.json();

    if (!propertyId || !agentId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const existingConnection = await prisma.buyerAgentConnection.findFirst({
      where: {
        propertyId,
        agentId,
        buyerId: userId,
      },
    });

    return NextResponse.json({
      exists: !!existingConnection,
      connection: existingConnection,
    });
  } catch (error) {
    console.error('Error checking buyer-agent connection:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 