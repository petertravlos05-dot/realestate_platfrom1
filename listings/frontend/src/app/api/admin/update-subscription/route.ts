import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, planName, status, amount, interval, currentPeriodStart, currentPeriodEnd } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Έλεγχος αν υπάρχει ο χρήστης
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Έλεγχος αν υπάρχει ήδη συνδρομή
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId }
    });

    let subscription;

    // Βρίσκουμε ή δημιουργούμε το plan
    let plan = await prisma.subscriptionPlan.findFirst({
      where: { name: planName || 'Free' }
    });

    if (!plan) {
      plan = await prisma.subscriptionPlan.create({
        data: {
          name: planName || 'Free',
          description: `Plan for ${planName || 'Free'}`,
          price: amount || 0,
          priceQuarterly: Math.round((amount || 0) * 2.7), // 10% discount
          maxProperties: planName === 'Free' ? 5 : planName === 'Basic' ? 50 : planName === 'Pro' ? 200 : 1000,
          benefits: planName === 'Free' ? ['Βασικά χαρακτηριστικά'] : 
                   planName === 'Basic' ? ['Προηγμένα χαρακτηριστικά', 'Email υποστήριξη'] :
                   planName === 'Pro' ? ['Όλα τα χαρακτηριστικά', 'Προτεραιότητα υποστήριξη', 'Analytics'] :
                   ['Όλα τα χαρακτηριστικά', 'Dedicated support', 'Custom features']
        }
      });
    }

    if (existingSubscription) {
      // Ενημέρωση υπάρχουσας συνδρομής
      subscription = await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId: plan.id,
          status: status || existingSubscription.status,
          billingCycle: interval === 'quarter' ? 'QUARTERLY' : 'MONTHLY',
          currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart) : existingSubscription.currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : existingSubscription.currentPeriodEnd,
          updatedAt: new Date()
        }
      });
    } else {
      // Δημιουργία νέας συνδρομής
      subscription = await prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: status || 'ACTIVE',
          billingCycle: interval === 'quarter' ? 'QUARTERLY' : 'MONTHLY',
          currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart) : new Date(),
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 μέρες από τώρα
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      message: 'Subscription updated successfully',
      subscription
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
