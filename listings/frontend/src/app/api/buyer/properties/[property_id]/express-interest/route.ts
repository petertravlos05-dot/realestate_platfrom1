import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateJwtToken } from '@/middleware';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/lib/utils/jwt-secret';
import { generateId } from '@/lib/utils/id';
import * as Sentry from '@sentry/nextjs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ property_id: string }> }
) {
  const { property_id } = await params;
  console.log(`\n[express-interest] ===== POST /api/buyer/properties/${property_id}/express-interest =====`);
  console.log(`[express-interest] Request received at: ${new Date().toISOString()}`);
  
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
      return NextResponse.json(
        { error: 'Μη εξουσιοδοτημένη πρόσβαση' },
        { status: 401 }
      );
    }

    // property_id already extracted above
    console.log(`[express-interest] User authenticated: userId=${userId}`);

    // Έλεγχος αν το ακίνητο υπάρχει
    const property = await prisma.property.findUnique({
      where: { id: property_id },
      include: { user: true }
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Το ακίνητο δεν βρέθηκε' },
        { status: 404 }
      );
    }

    // Έλεγχος αν ο χρήστης έχει ήδη εκδηλώσει ενδιαφέρον
    const existingLead = await prisma.propertyLead.findFirst({
      where: {
        propertyId: property_id,
        buyerId: userId,
        interestCancelled: false
      }
    });

    if (existingLead) {
      return NextResponse.json(
        { error: 'Έχετε ήδη εκδηλώσει ενδιαφέρον για αυτό το ακίνητο' },
        { status: 400 }
      );
    }

    // Δημιουργία νέου lead
    const lead = await prisma.propertyLead.create({
      data: {
        propertyId: property_id,
        buyerId: userId,
        status: 'PENDING'
      },
      include: {
        property: true,
        buyer: true
      }
    });

    // Δημιουργία ειδοποίησης για τον buyer
    await prisma.notification.create({
      data: {
        userId: userId,
        type: 'INTERESTED',
        title: 'Εκδήλωση Ενδιαφέροντος',
        message: `✅ Η εκδήλωση ενδιαφέροντος καταχωρήθηκε με επιτυχία!`,
        propertyId: property_id,
        metadata: {
          leadId: lead.id,
          shouldOpenModal: false
        }
      }
    });

    // Δημιουργία ειδοποίησης για τον πωλητή (SELLER_INTEREST)
    await prisma.notification.create({
      data: {
        userId: property.userId,
        type: 'SELLER_INTEREST',
        title: 'Νέο Ενδιαφέρον',
        message: `Ο χρήστης ${lead.buyer.name} ενδιαφέρθηκε για το ακίνητό σας "${property.title}"`,
        propertyId: property_id,
        metadata: {
          leadId: lead.id,
          propertyId: property_id,
          buyerId: userId,
          buyerName: lead.buyer.name,
          propertyTitle: property.title,
          recipient: 'seller'
        }
      }
    });

    // Έλεγχος αν υπάρχει ήδη transaction
    let transaction = await prisma.transaction.findFirst({
      where: {
        propertyId: property_id,
        buyerId: userId,
        status: { not: 'CANCELLED' }
      }
    });

    if (!transaction) {
      // Έλεγχος αν υπάρχει ακυρωμένο transaction
      const cancelledTransaction = await prisma.transaction.findFirst({
        where: {
          propertyId: property_id,
          buyerId: userId,
          status: 'CANCELLED',
          interestCancelled: true
        }
      });
      
      if (cancelledTransaction) {
        // Επαναφορά του ακυρωμένου transaction
        let agentId = null;
        if (property.user) {
          agentId = property.user.id;
        }
        
        transaction = await prisma.transaction.update({
          where: { id: cancelledTransaction.id },
          data: {
            status: 'INTERESTED',
            stage: 'PENDING',
            interestCancelled: false,
            agentId: agentId ?? null,
            leadId: lead.id
          }
        });
        
        // Ενημερώνουμε το lead με το transaction ID
        await prisma.propertyLead.update({
          where: { id: lead.id },
          data: { transactionId: transaction.id }
        });
        
        // Δημιουργούμε progress entry για την επαναφορά
        await prisma.transactionProgress.create({
          data: {
            transactionId: transaction.id,
            stage: 'PENDING',
            notes: 'Η συναλλαγή επαναφέρθηκε από τον αγοραστή',
            createdById: userId
          }
        });
      } else {
        // Δημιουργία νέου transaction
        let agentId = null;
        if (property.user) {
          agentId = property.user.id;
        }
        
        transaction = await prisma.transaction.create({
          data: {
            propertyId: property_id,
            buyerId: userId,
            agentId: agentId ?? null,
            sellerId: property.userId,
            status: 'INTERESTED',
            stage: 'PENDING',
            leadId: lead.id
          }
        });

        // Ενημερώνουμε το lead με το transaction ID
        await prisma.propertyLead.update({
          where: { id: lead.id },
          data: { transactionId: transaction.id }
        });
      }
    }

    // Create Deal Room - Use backend API /api/deals POST endpoint
    // This backend route creates deal room with Prisma (EXACTLY like buyer-agent/connect)
    // We call it to ensure deal room is created correctly without creating duplicate lead/transaction
    let dealRoomId = null;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:3001';
      console.log(`[express-interest] Backend URL: ${backendUrl}`);
      
      // Get session to create JWT token for backend authentication
      const session = await getServerSession(authOptions);
      console.log(`[express-interest] Session for deal room creation:`, {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });
      
      if (!session?.user?.id) {
        console.error('[express-interest] ❌ No session found for deal room creation');
      } else {
        // Create JWT token from session for backend authentication
        const token = jwt.sign(
          {
            userId: session.user.id,
            email: session.user.email,
            role: (session.user as any).role,
          },
          getJwtSecret(),
          { expiresIn: '7d' }
        );

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };
        
        // Call backend /api/deals POST which creates deal room with Prisma
        // This is the same endpoint used by other parts of the app (EXACTLY like buyer-agent/connect)
        const fetchUrl = `${backendUrl}/api/deals`;
        console.log(`[express-interest] ===== CALLING BACKEND TO CREATE DEAL ROOM =====`);
        console.log(`[express-interest] POST ${fetchUrl}`, {
          propertyId: property_id,
          userId: session.user.id,
          hasToken: !!token,
          tokenLength: token.length
        });
        
        const response = await fetch(fetchUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ propertyId: property_id }),
          credentials: 'include',
        });

        console.log(`[express-interest] Backend response status: ${response.status} ${response.statusText}`);
        console.log(`[express-interest] Response ok: ${response.ok}`);

        if (response.ok) {
          const data = await response.json();
          dealRoomId = data.dealRoomId;
          console.log('[express-interest] ✅✅✅ DEAL ROOM CREATED SUCCESSFULLY ✅✅✅');
          console.log('[express-interest] Deal room details:', {
            dealRoomId,
            isNew: data.isNew,
            status: data.status,
            propertyId: data.propertyId,
            buyerId: data.buyerId,
            sellerId: data.sellerId,
            agentId: data.agentId,
            participants: data.participants?.map((p: any) => ({
              userId: p.userId,
              role: p.role,
              email: p.user?.email
            }))
          });
        } else {
          const errorText = await response.text();
          console.error(`[express-interest] ❌❌❌ BACKEND DEAL ROOM CREATION FAILED ❌❌❌`);
          console.error(`[express-interest] Status: ${response.status} ${response.statusText}`);
          console.error(`[express-interest] Error:`, errorText);
          console.error(`[express-interest] Request details:`, {
            url: fetchUrl,
            propertyId: property_id,
            userId: session.user.id,
            headers: Object.keys(headers)
          });
          
          // Fallback: Try to create deal room directly with Prisma (like buyer-agent/connect)
          console.log('[express-interest] Attempting fallback: Create deal room directly with Prisma');
          try {
            // Find agent via PropertyLead
            let agentId: string | null = null;
            const leadForAgent = await prisma.propertyLead.findFirst({
              where: {
                propertyId: property_id,
                buyerId: session.user.id,
              },
              select: { agentId: true },
            });
            if (leadForAgent?.agentId) {
              agentId = leadForAgent.agentId;
            }

            // Check if deal room already exists
            const existingDealRoom = await (prisma as any).dealRoom?.findUnique({
              where: {
                propertyId_buyerId: {
                  propertyId: property_id,
                  buyerId: session.user.id,
                },
              },
            });

            if (existingDealRoom) {
              dealRoomId = existingDealRoom.id;
              console.log('[express-interest] ✅ Fallback: Deal room already exists:', dealRoomId);
            } else {
              // Create new deal room with Prisma (EXACTLY like backend /api/buyer-agent/connect)
              const newDealRoom = await (prisma as any).dealRoom?.create({
                data: {
                  propertyId: property_id,
                  buyerId: session.user.id,
                  sellerId: property.userId,
                  agentId,
                  status: 'DRAFT',
                  participants: {
                    create: [
                      { userId: session.user.id, role: 'BUYER' as const },
                      { userId: property.userId, role: 'SELLER' as const },
                      ...(agentId ? [{ userId: agentId, role: 'AGENT' as const }] : []),
                    ],
                  },
                  threads: {
                    create: [
                      {
                        type: 'GROUP',
                        title: 'Group Chat',
                        members: {
                          create: [
                            { userId: session.user.id },
                            { userId: property.userId },
                            ...(agentId ? [{ userId: agentId }] : []),
                          ],
                        },
                      },
                    ],
                  },
                },
              });
              dealRoomId = newDealRoom?.id;
              console.log('[express-interest] ✅✅✅ FALLBACK: Deal room created with Prisma:', dealRoomId);
            }
          } catch (fallbackError: any) {
            console.error('[express-interest] ❌ Fallback Prisma creation also failed:', {
              error: fallbackError?.message || fallbackError,
              stack: fallbackError?.stack
            });
          }
        }
      }
    } catch (dealRoomError: any) {
      // Log error but don't fail the request - Deal Room creation is optional
      // Same error handling as backend /api/buyer-agent/connect
      console.error('[express-interest] ❌❌❌ EXCEPTION CALLING BACKEND FOR DEAL ROOM ❌❌❌');
      console.error('[express-interest] Error:', {
        message: dealRoomError?.message || dealRoomError,
        stack: dealRoomError?.stack,
        propertyId: property_id
      });
      
      // Try fallback Prisma creation even on exception
      try {
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
          let agentId: string | null = null;
          const leadForAgent = await prisma.propertyLead.findFirst({
            where: {
              propertyId: property_id,
              buyerId: session.user.id,
            },
            select: { agentId: true },
          });
          if (leadForAgent?.agentId) {
            agentId = leadForAgent.agentId;
          }

          const existingDealRoom = await (prisma as any).dealRoom?.findUnique({
            where: {
              propertyId_buyerId: {
                propertyId: property_id,
                buyerId: session.user.id,
              },
            },
          });

          if (!existingDealRoom) {
            const newDealRoom = await (prisma as any).dealRoom?.create({
              data: {
                propertyId: property_id,
                buyerId: session.user.id,
                sellerId: property.userId,
                agentId,
                status: 'DRAFT',
                participants: {
                  create: [
                    { userId: session.user.id, role: 'BUYER' as const },
                    { userId: property.userId, role: 'SELLER' as const },
                    ...(agentId ? [{ userId: agentId, role: 'AGENT' as const }] : []),
                  ],
                },
                threads: {
                  create: [
                    {
                      type: 'GROUP',
                      title: 'Group Chat',
                      members: {
                        create: [
                          { userId: session.user.id },
                          { userId: property.userId },
                          ...(agentId ? [{ userId: agentId }] : []),
                        ],
                      },
                    },
                  ],
                },
              },
            });
            dealRoomId = newDealRoom?.id;
            console.log('[express-interest] ✅✅✅ EXCEPTION FALLBACK: Deal room created:', dealRoomId);
          }
        }
      } catch (fallbackError2: any) {
        console.error('[express-interest] ❌ Exception fallback also failed:', fallbackError2);
      }
    }

    console.log(`[express-interest] ✅ Express interest completed:`, {
      propertyId: property_id,
      leadId: lead.id,
      transactionId: transaction.id,
      dealRoomId: dealRoomId || 'NOT_CREATED'
    });

    // Debug: Verify deal room was created by checking database
    if (dealRoomId) {
      try {
        const verifyDealRoom = await (prisma as any).dealRoom?.findUnique({
          where: { id: dealRoomId },
          include: {
            participants: {
              select: {
                userId: true,
                role: true,
                removedAt: true
              }
            }
          }
        });
        console.log(`[express-interest] 🔍 VERIFICATION: Deal room exists in DB:`, {
          dealRoomId,
          exists: !!verifyDealRoom,
          participants: verifyDealRoom?.participants?.map((p: any) => ({
            userId: p.userId,
            role: p.role,
            removedAt: p.removedAt
          }))
        });
      } catch (verifyError) {
        console.error('[express-interest] ⚠️ Could not verify deal room:', verifyError);
      }
    } else {
      console.error('[express-interest] ❌❌❌ DEAL ROOM ID IS NULL - NOT CREATED ❌❌❌');
    }

    return NextResponse.json({ 
      message: 'Το ενδιαφέρον σας καταγράφηκε με επιτυχία',
      lead,
      transaction,
      dealRoomId
    });

  } catch (error) {
    console.error('Error expressing interest:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Σφάλμα κατά την εκδήλωση ενδιαφέροντος' },
      { status: 500 }
    );
  }
} 