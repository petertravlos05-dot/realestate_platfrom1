import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { validateJwtToken } from '@/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Favorite {
  id: string;
  user: {
    id: string;
  };
}

interface BuyerConnection {
  id: string;
  buyer: {
    id: string;
  };
}

interface AgentProperty {
  id: string;
  agent: {
    id: string;
    buyerConnections: BuyerConnection[];
  };
}

interface Property {
  id: string;
  title: string;
  status: string;
  user: {
    id: string;
  };
  interestedBuyers: {
    id: string;
  }[];
  agents: {
    id: string;
    buyers: {
      id: string;
    }[];
  }[];
  favorites: Favorite[];
  connections: {
    id: string;
    agent: {
      id: string;
      buyerConnections: BuyerConnection[];
    };
  }[];
}

interface PropertyWithRelations extends Prisma.PropertyGetPayload<{
  include: {
    user: true;
    interests: {
      include: {
        user: {
          select: {
            id: true;
          };
        };
      };
    };
    agentListings: {
      include: {
        agent: {
          select: {
            id: true;
            connections: {
              include: {
                buyer: {
                  select: {
                    id: true;
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}> {}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Πρώτα δοκιμάζουμε το JWT token (για το mobile app)
    const jwtUser = await validateJwtToken(request as any);
    let userId: string | undefined;
    let userRole: string | undefined;

    if (jwtUser) {
      // Αν έχουμε έγκυρο JWT token, χρησιμοποιούμε τα στοιχεία από αυτό
      userId = jwtUser.userId;
      userRole = jwtUser.role;
    } else {
      // Αλλιώς δοκιμάζουμε το next-auth session (για το web app)
    const session = await getServerSession(authOptions);
      userId = session?.user?.id;
      userRole = session?.user?.role;
    }

    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        favorites: {
          include: {
            user: {
              select: {
                id: true
              }
            }
          }
        },
        connections: {
          include: {
            agent: {
              select: {
                id: true,
                buyerConnections: {
                  include: {
                    buyer: {
                      select: {
                        id: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Αν το ακίνητο είναι μη διαθέσιμο, ελέγχουμε τα δικαιώματα προβολής
    if (property.status === 'unavailable') {
      // Αν δεν υπάρχει session ή JWT token, δεν επιτρέπεται η προβολή
      if (!userId) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }

      // Επιτρέπεται η προβολή αν:
      const canView = 
        // 1. Είναι ο ιδιοκτήτης
        property.user.id === userId ||
        // 2. Είναι admin
        userRole === 'admin' ||
        // 3. Είναι ενδιαφερόμενος buyer
        property.favorites.some(favorite => favorite.user.id === userId) ||
        // 4. Είναι agent που έχει προωθήσει το ακίνητο ή έχει συνδεδεμένο buyer
        property.connections.some(conn => 
          conn.agent.id === userId || 
          conn.agent.buyerConnections.some(bc => bc.buyer.id === userId)
        );

      if (!canView) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ property });
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const property = await prisma.property.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json({ property });
  } catch (error) {
    console.error('Error updating property:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.property.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting property:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 