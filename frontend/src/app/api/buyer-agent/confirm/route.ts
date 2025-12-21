import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  BUYER = 'BUYER',
  SELLER = 'SELLER'
}

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface Session {
  user: SessionUser;
}

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    if (!session?.user?.id || session.user.role !== UserRole.BUYER) {
      return NextResponse.json(
        { error: 'Unauthorized - Only buyers can create connections' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { agentId, propertyId } = body;

    if (!agentId || !propertyId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ελέγχουμε αν ο agent υπάρχει (χωρίς να ελέγχουμε τον ρόλο)
    const agent = await prisma.user.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid agent ID' },
        { status: 400 }
      );
    }

    // Αφαιρούμε τον έλεγχο για τον ρόλο AGENT - τώρα οποιοσδήποτε χρήστης μπορεί να λειτουργήσει σαν μεσίτης
    // if (!agent || agent.role !== UserRole.AGENT) {
    //   return NextResponse.json(
    //     { error: 'Invalid agent ID' },
    //     { status: 400 }
    //   );
    // }

    // Ελέγχουμε αν υπάρχει ήδη σύνδεση
    const existingConnection = await prisma.buyerAgentConnection.findFirst({
      where: {
        buyerId: session.user.id,
        agentId,
        propertyId,
      },
    });

    if (existingConnection) {
      return NextResponse.json(
        { error: 'Connection already exists' },
        { status: 400 }
      );
    }

    // Ελέγχουμε αν υπάρχει ήδη PropertyLead
    const existingLead = await prisma.$queryRaw`
      SELECT * FROM "PropertyLead" 
      WHERE "propertyId" = ${propertyId} 
      AND "buyerId" = ${session.user.id} 
      AND "agentId" = ${agentId}
      LIMIT 1
    `;
    
    if (existingLead && Array.isArray(existingLead) && existingLead.length > 0) {
      return NextResponse.json(
        { error: 'Υπάρχει ήδη lead για αυτό το ακίνητο και agent.' },
        { status: 400 }
      );
    }

    // Ελέγχουμε αν υπάρχει ήδη transaction
    const existingTransaction = await prisma.$queryRaw`
      SELECT * FROM "Transaction" 
      WHERE "propertyId" = ${propertyId} 
      AND "buyerId" = ${session.user.id} 
      AND "agentId" = ${agentId}
      LIMIT 1
    `;
    
    if (existingTransaction && Array.isArray(existingTransaction) && existingTransaction.length > 0) {
      return NextResponse.json(
        { error: 'Υπάρχει ήδη συναλλαγή για αυτό το ακίνητο και agent.' },
        { status: 400 }
      );
    }

    // Δημιουργούμε τη σύνδεση
    const connection = await prisma.buyerAgentConnection.create({
      data: {
        buyerId: session.user.id,
        agentId,
        propertyId,
        status: 'CONFIRMED',
      },
    });

    return NextResponse.json({
      success: true,
      connection,
    });
  } catch (error) {
    console.error('Error confirming buyer-agent connection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 