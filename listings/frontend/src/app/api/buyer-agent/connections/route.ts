import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateJwtToken } from '@/middleware';

interface Property {
  id: string;
  title: string;
  shortDescription: string | null;
  fullDescription: string;
  price: number;
  propertyType: string;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number;
  images: string[];
  state: string;
  city: string;
  street: string;
  number: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface BuyerAgentConnection {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  propertyId: string;
  buyerId: string;
  agentId: string;
  property: Property;
  agent: Agent;
}

export const dynamic = 'force-dynamic';

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

    const connections = await prisma.buyerAgentConnection.findMany({
      where: {
        buyerId: userId,
        interestCancelled: false
      },
      include: {
        property: true,
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }) as unknown as BuyerAgentConnection[];

    // Debug log
    console.log('buyerAgentConnections:', connections.map(c => ({ id: c.id, propertyId: c.propertyId, buyerId: c.buyerId, agentId: c.agentId })));

    const properties = connections.map((connection: BuyerAgentConnection) => ({
      id: connection.property.id,
      title: connection.property.title,
      shortDescription: connection.property.shortDescription,
      fullDescription: connection.property.fullDescription,
      price: connection.property.price,
      location: `${connection.property.street} ${connection.property.number}, ${connection.property.city}, ${connection.property.state}`,
      propertyType: connection.property.propertyType,
      status: connection.property.status,
      bedrooms: connection.property.bedrooms ?? 0,
      bathrooms: connection.property.bathrooms ?? 0,
      squareMeters: connection.property.area,
      images: connection.property.images,
      agent: {
        id: connection.agent.id,
        name: connection.agent.name,
        email: connection.agent.email,
      },
    }));

    return NextResponse.json(properties);
  } catch (error) {
    console.error('Error fetching buyer connections:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const { propertyId } = await request.json();
    // Διαγραφή του connection για τον συγκεκριμένο buyer και property
    await prisma.buyerAgentConnection.deleteMany({
      where: {
        buyerId: session.user.id,
        propertyId
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting buyer-agent connection:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const { propertyId, interestCancelled } = await request.json();
    
    console.log('=== Updating Connection ===', {
      buyerId: session.user.id,
      propertyId,
      interestCancelled
    });
    
    // Ενημέρωση του connection για τον συγκεκριμένο buyer και property
    const updatedConnection = await prisma.buyerAgentConnection.updateMany({
      where: {
        buyerId: session.user.id,
        propertyId
      },
      data: {
        interestCancelled
      }
    });

    console.log('Update result:', updatedConnection);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating buyer-agent connection:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { propertyId, agentId, checkCancelled, buyerEmail, buyerPhone } = await request.json();

    if (checkCancelled && propertyId && agentId && (buyerEmail || buyerPhone)) {
      // Βρες τον buyer με βάση email ή/και phone
      const buyer = await prisma.user.findFirst({
        where: {
          ...(buyerEmail ? { email: buyerEmail } : {}),
          ...(buyerPhone ? { phone: buyerPhone } : {}),
        }
      });
      if (!buyer) {
        return NextResponse.json({ interestCancelled: false });
      }
      const cancelledConnection = await prisma.buyerAgentConnection.findFirst({
        where: {
          buyerId: buyer.id,
          propertyId,
          agentId,
          interestCancelled: true
        }
      });
      return NextResponse.json({ interestCancelled: !!cancelledConnection });
    }

    if (checkCancelled && propertyId && agentId) {
      const cancelledConnection = await prisma.buyerAgentConnection.findFirst({
        where: {
          buyerId: session.user.id,
          propertyId,
          agentId,
          interestCancelled: true
        }
      });
      return NextResponse.json({ interestCancelled: !!cancelledConnection });
    }

    // Δημιουργία νέας σύνδεσης buyer-agent
    if (propertyId && agentId) {
      // Έλεγχος αν υπάρχει ήδη σύνδεση
      const existingConnection = await prisma.buyerAgentConnection.findFirst({
        where: {
          buyerId: session.user.id,
          agentId,
          propertyId,
        },
      });

      if (existingConnection) {
        return NextResponse.json(
          { error: 'Η σύνδεση υπάρχει ήδη' },
          { status: 400 }
        );
      }

      // Δημιουργία νέας σύνδεσης
      const connection = await prisma.buyerAgentConnection.create({
        data: {
          buyerId: session.user.id,
          agentId,
          propertyId,
          status: 'PENDING',
        },
      });

      return NextResponse.json({
        success: true,
        connection,
      });
    }

    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in buyer-agent connections POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 