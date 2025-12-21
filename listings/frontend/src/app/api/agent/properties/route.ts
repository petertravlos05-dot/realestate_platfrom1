import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
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
                  { userId: session.user.id },
                  // 2. Είναι admin
                  { user: { role: 'admin' } },
                  // 3. Έχει προωθήσει το ακίνητο
                  {
                    connections: {
                      some: {
                        agent: {
                          id: session.user.id
                        }
                      }
                    }
                  },
                  // 4. Έχει συνδεδεμένο buyer που έχει δηλώσει ενδιαφέρον
                  {
                    favorites: {
                      some: {
                        user: {
                          buyerConnections: {
                            some: {
                              agent: {
                                id: session.user.id
                              }
                            }
                          }
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
        },
        leads: {
          where: {
            interestCancelled: false,
            agentId: session.user.id
          },
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            },
            agent: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: Prisma.SortOrder.desc
      }
    };

    const properties = await prisma.property.findMany(query);

    return NextResponse.json(properties);
  } catch (error) {
    console.error('Error fetching agent properties:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση των ακινήτων' },
      { status: 500 }
    );
  }
} 