import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Επεξεργασία πόντων όταν προστίθεται ακίνητο
export async function POST(request: NextRequest) {
  try {
    const { propertyId, userId, area, location } = await request.json();

    if (!propertyId || !userId) {
      return NextResponse.json({ 
        error: 'Missing property ID or user ID' 
      }, { status: 400 });
    }

    // Υπολογισμός πόντων βάσει τετραγωνικών και περιοχής
    let points = 0;
    
    if (area) {
      // Βασικοί πόντου: 1 πόντος ανά 10τ.μ.
      points = Math.floor(area / 10);
      
      // Bonus πόντου για μεγάλες περιοχές
      if (area > 200) {
        points += Math.floor((area - 200) / 20) * 2; // +2 πόντους ανά 20τ.μ. επιπλέον
      }
    }

    // Bonus πόντου για συγκεκριμένες περιοχές
    const premiumAreas = ['Αθήνα', 'Θεσσαλονίκη', 'Πειραιάς', 'Πάτρα'];
    if (location && premiumAreas.some(area => location.includes(area))) {
      points = Math.floor(points * 1.5); // +50% για premium περιοχές
    }

    // Ελάχιστοι πόντου: 50
    points = Math.max(points, 50);

    // Εύρεση του referral για αυτόν τον χρήστη
    const userReferral = await prisma.$queryRaw`
      SELECT id FROM referrals WHERE "referredId" = ${userId} AND "isActive" = true
    `;

    if (userReferral && Array.isArray(userReferral) && userReferral.length > 0) {
      const referralId = (userReferral[0] as any).id;
      
      // Προσθήκη πόντων για το ακίνητο
      await prisma.$executeRaw`
        INSERT INTO referral_points (id, "referralId", "propertyId", points, reason, area, location, "createdAt")
        VALUES (${crypto.randomUUID()}, ${referralId}, ${propertyId}, ${points}, 'property_added', ${area || null}, ${location || null}, NOW())
      `;
      
      // Ενημέρωση των στατιστικών του referral
      await prisma.$executeRaw`
        UPDATE referrals 
        SET "totalPoints" = "totalPoints" + ${points}, 
            "propertiesAdded" = "propertiesAdded" + 1,
            "totalArea" = "totalArea" + ${area || 0},
            "updatedAt" = NOW()
        WHERE id = ${referralId}
      `;
      
      console.log(`Property points added: ${propertyId} by user: ${userId}, Points: ${points}`);
    } else {
      console.log(`No active referral found for user: ${userId}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Property points calculated and added successfully',
      propertyId,
      userId,
      area,
      location,
      points,
      breakdown: {
        basePoints: area ? Math.floor(area / 10) : 0,
        areaBonus: area > 200 ? Math.floor((area - 200) / 20) * 2 : 0,
        locationBonus: location && premiumAreas.some(area => location.includes(area)) ? '50%' : '0%',
        minimumPoints: 50
      }
    });

  } catch (error) {
    console.error('Error processing property points:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 