/**
 * Recreate deal rooms from existing property leads.
 * Use after migrations that wiped deal_rooms.
 *
 * Common causes of data loss:
 *   - prisma migrate reset (drops entire DB and recreates)
 *   - prisma db push --force-reset
 *   - Manually dropping/recreating tables
 *
 * Usage: node scripts/seed-deal-rooms-from-leads.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.propertyLead.findMany({
    where: { interestCancelled: false },
    include: {
      property: { select: { id: true, title: true, userId: true } },
      buyer: { select: { id: true, name: true } },
    },
  });

  console.log(`Found ${leads.length} active leads (interest not cancelled)\n`);

  let created = 0;
  let skipped = 0;

  for (const lead of leads) {
    const existing = await prisma.dealRoom.findUnique({
      where: {
        propertyId_buyerId: {
          propertyId: lead.propertyId,
          buyerId: lead.buyerId,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    try {
      await prisma.dealRoom.create({
        data: {
          propertyId: lead.propertyId,
          buyerId: lead.buyerId,
          sellerId: lead.property.userId,
          agentId: lead.agentId ?? undefined,
          status: 'DRAFT',
          participants: {
            create: [
              { userId: lead.buyerId, role: 'BUYER' },
              { userId: lead.property.userId, role: 'SELLER' },
              ...(lead.agentId ? [{ userId: lead.agentId, role: 'AGENT' }] : []),
            ],
          },
          threads: {
            create: [
              {
                type: 'GROUP',
                title: 'Group Chat',
                members: {
                  create: [
                    { userId: lead.buyerId },
                    { userId: lead.property.userId },
                    ...(lead.agentId ? [{ userId: lead.agentId }] : []),
                  ],
                },
              },
            ],
          },
        },
      });
      created++;
      console.log(`  ✓ Created deal: "${lead.property.title}" — buyer ${lead.buyer.name}`);
    } catch (err) {
      console.error(`  ✗ Failed for ${lead.property.title}:`, err.message);
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped (already exist): ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
