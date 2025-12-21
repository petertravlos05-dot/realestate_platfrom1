import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  try {
    // Πρώτα δοκιμάζουμε να πάρουμε το session από next-auth
    const session = await getServerSession(authOptions);
    let userId;
    let userRole;

    if (session?.user?.id) {
      userId = session.user.id;
      userRole = session.user.role;
    } else {
      // Αν δεν υπάρχει session, δοκιμάζουμε να πάρουμε το JWT token
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' }, { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Agapao_ton_stivo05') as { userId: string; role: string };
        userId = decoded.userId;
        userRole = decoded.role;
      } catch (error) {
        return NextResponse.json({ error: 'Μη έγκυρο token' }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Μη εξουσιοδοτημένη πρόσβαση' },
        { status: 401 }
      );
    }

    const query: Prisma.PropertyFindManyArgs = {
      where: {
        OR: [
          // Διαθέσιμα ακίνητα
          { status: { not: 'unavailable' } },
          // Μη διαθέσιμα ακίνητα με ειδικά δικαιώματα
          {
            AND: [
              { status: 'unavailable' },
              {
                OR: [
                  // 1. Είναι ο ιδιοκτήτης
                  { userId: userId },
                  // 2. Είναι admin
                  { user: { role: 'admin' } },
                  // 3. Έχει ενδιαφερόμενο buyer
                  {
                    favorites: {
                      some: {
                        user: {
                          id: userId
                        }
                      }
                    }
                  },
                  // 4. Έχει συνδεδεμένο agent
                  {
                    connections: {
                      some: {
                        agent: {
                          id: userId
                        }
                      }
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      include: {
        stats: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    };

    const properties = await prisma.property.findMany(query);
    return NextResponse.json(properties);
  } catch (error) {
    console.error('Error fetching seller properties:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση των ακινήτων' },
      { status: 500 }
    );
  }
} 