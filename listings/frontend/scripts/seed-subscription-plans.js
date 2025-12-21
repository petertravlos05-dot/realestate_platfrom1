const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const subscriptionPlans = [
  {
    name: 'Basic',
    description: 'Ιδανικό για μικρές μεσιτικές εταιρείες',
    price: 29.99,
    priceQuarterly: 79.99,
    maxProperties: 10,
    benefits: [
      'Έως 10 ακίνητα',
      'Βασική αναφορά στατιστικών',
      'Email υποστήριξη',
      'Στάνταρ προφίλ εταιρείας'
    ],
    stripePriceId: 'price_basic_monthly', // Θα χρειαστεί να δημιουργηθούν στο Stripe
    stripePriceIdQuarterly: 'price_basic_quarterly'
  },
  {
    name: 'Pro',
    description: 'Για μεσαίες μεσιτικές εταιρείες',
    price: 59.99,
    priceQuarterly: 159.99,
    maxProperties: 50,
    benefits: [
      'Έως 50 ακίνητα',
      'Προηγμένα στατιστικά',
      'Προτεραιότητα υποστήριξης',
      'Προηγμένο προφίλ εταιρείας',
      'Αναφορές εξαγωγής',
      'Προσαρμοσμένο branding'
    ],
    stripePriceId: 'price_pro_monthly',
    stripePriceIdQuarterly: 'price_pro_quarterly'
  },
  {
    name: 'Enterprise',
    description: 'Για μεγάλες μεσιτικές εταιρείες',
    price: 99.99,
    priceQuarterly: 269.99,
    maxProperties: 200,
    benefits: [
      'Έως 200 ακίνητα',
      'Πλήρη αναλυτικά στοιχεία',
      '24/7 υποστήριξη',
      'Πλήρως προσαρμοσμένο προφίλ',
      'API πρόσβαση',
      'Διαχείριση πολλαπλών χρηστών',
      'Προηγμένα εργαλεία μάρκετινγκ'
    ],
    stripePriceId: 'price_enterprise_monthly',
    stripePriceIdQuarterly: 'price_enterprise_quarterly'
  }
];

async function seedSubscriptionPlans() {
  try {
    console.log('🌱 Seeding subscription plans...');

    // Διαγραφή υπαρχόντων πλάνων
    await prisma.subscriptionPlan.deleteMany({});
    console.log('✅ Cleared existing subscription plans');

    // Δημιουργία νέων πλάνων
    for (const plan of subscriptionPlans) {
      await prisma.subscriptionPlan.create({
        data: plan
      });
      console.log(`✅ Created subscription plan: ${plan.name}`);
    }

    console.log('🎉 Subscription plans seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding subscription plans:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSubscriptionPlans();
