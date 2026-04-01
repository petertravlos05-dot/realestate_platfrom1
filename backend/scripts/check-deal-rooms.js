/**
 * Check deal rooms in database - for debugging /deals page
 * Usage: node scripts/check-deal-rooms.js [userId]
 * If userId omitted, lists all deal rooms and users with properties.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = process.argv[2];

  const totalDeals = await prisma.dealRoom.count();
  console.log(`\n=== Deal Rooms in DB: ${totalDeals} total ===\n`);

  if (totalDeals === 0) {
    const propsWithLeads = await prisma.property.findMany({
      where: { leads: { some: {} } },
      select: { id: true, title: true, userId: true },
      take: 5,
    });
    console.log('No deal rooms found. Properties with leads (potential deal sources):', propsWithLeads.length);
    propsWithLeads.forEach((p) => console.log(`  - ${p.id} "${p.title}" owner: ${p.userId}`));
    return;
  }

  const allDeals = await prisma.dealRoom.findMany({
    take: 20,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      propertyId: true,
      buyerId: true,
      sellerId: true,
      agentId: true,
      status: true,
      property: { select: { title: true, userId: true } },
    },
  });

  console.log('Sample deal rooms:');
  allDeals.forEach((d) => {
    console.log(`  ${d.id} | status=${d.status} | buyer=${d.buyerId} | seller=${d.sellerId} | prop.owner=${d.property?.userId}`);
  });

  if (userId) {
    const userDeals = await prisma.dealRoom.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
          { agentId: userId },
          { participants: { some: { userId } } },
          { property: { userId } },
        ],
      },
      select: { id: true, status: true, buyerId: true, sellerId: true },
    });
    console.log(`\n=== Deals for userId ${userId}: ${userDeals.length} ===`);
    userDeals.forEach((d) => console.log(`  ${d.id} status=${d.status}`));

    const userProps = await prisma.property.count({ where: { userId } });
    console.log(`\nUser ${userId} owns ${userProps} properties`);

    const leads = await prisma.propertyLead.findMany({
      where: { property: { userId } },
      select: { id: true, buyerId: true, propertyId: true },
      take: 5,
    });
    console.log(`\nLeads on user's properties: ${leads.length} (sample)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
