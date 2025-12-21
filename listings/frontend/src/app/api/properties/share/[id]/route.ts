import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Το ακίνητο δεν βρέθηκε' },
        { status: 404 }
      );
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την ανάκτηση του ακινήτου' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { agentId } = await request.json();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Πρέπει να συνδεθείτε για να δημιουργήσετε σύνδεση' },
        { status: 401 }
      );
    }

    // Check if the agent exists (αφαιρούμε τον έλεγχο του ρόλου)
    const agent = await prisma.user.findUnique({
      where: {
        id: agentId,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Ο χρήστης δεν βρέθηκε' },
        { status: 404 }
      );
    }

    // Check if connection already exists
    const existingConnection = await prisma.buyerAgentConnection.findFirst({
      where: {
        buyerId: session.user.id,
        agentId: agentId,
        propertyId: params.id,
      },
    });

    if (existingConnection) {
      return NextResponse.json(
        { error: 'Η σύνδεση υπάρχει ήδη' },
        { status: 400 }
      );
    }

    // Create connection
    const connection = await prisma.buyerAgentConnection.create({
      data: {
        buyerId: session.user.id,
        agentId: agentId,
        propertyId: params.id,
        status: 'PENDING',
      },
    });

    return NextResponse.json(connection);
  } catch (error) {
    console.error('Error creating connection:', error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά τη δημιουργία της σύνδεσης' },
      { status: 500 }
    );
  }
} 