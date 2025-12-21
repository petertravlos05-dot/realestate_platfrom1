import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateJwtToken } from '@/middleware';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const agent = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        businessAddress: true,
        role: true,
        image: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Αφαιρούμε τον έλεγχο για τον ρόλο AGENT - τώρα οποιοσδήποτε χρήστης μπορεί να εμφανιστεί σαν μεσίτης
    // if (agent.role !== 'AGENT') {
    //   return NextResponse.json({ error: 'User is not an agent' }, { status: 400 });
    // }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 