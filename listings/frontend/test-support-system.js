const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSupportSystem() {
  try {
    console.log('Testing Support Messaging System...\n');

    // 1. Δημιουργία test user
    console.log('1. Creating test user...');
    const testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'test123',
        role: 'BUYER'
      }
    });
    console.log('✓ Test user created:', testUser.email);

    // 2. Δημιουργία test property
    console.log('\n2. Creating test property...');
    const testProperty = await prisma.property.create({
      data: {
        title: 'Test Property',
        description: 'A test property for support system',
        price: 100000,
        area: 100,
        city: 'Athens',
        street: 'Test Street',
        number: '123',
        userId: testUser.id
      }
    });
    console.log('✓ Test property created:', testProperty.title);

    // 3. Δημιουργία support ticket
    console.log('\n3. Creating support ticket...');
    const supportTicket = await prisma.supportTicket.create({
      data: {
        title: 'Test Support Request',
        description: 'This is a test support request',
        category: 'GENERAL',
        priority: 'MEDIUM',
        userId: testUser.id,
        propertyId: testProperty.id
      }
    });
    console.log('✓ Support ticket created:', supportTicket.title);

    // 4. Δημιουργία support message
    console.log('\n4. Creating support message...');
    const supportMessage = await prisma.supportMessage.create({
      data: {
        content: 'This is a test message from the user',
        isFromAdmin: false,
        ticketId: supportTicket.id,
        userId: testUser.id
      }
    });
    console.log('✓ Support message created');

    // 5. Δημιουργία admin response
    console.log('\n5. Creating admin response...');
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'ADMIN'
      }
    });

    const adminMessage = await prisma.supportMessage.create({
      data: {
        content: 'This is a test response from admin',
        isFromAdmin: true,
        ticketId: supportTicket.id,
        userId: adminUser.id
      }
    });
    console.log('✓ Admin response created');

    // 6. Ενημέρωση ticket status
    console.log('\n6. Updating ticket status...');
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: supportTicket.id },
      data: { status: 'IN_PROGRESS' }
    });
    console.log('✓ Ticket status updated to:', updatedTicket.status);

    // 7. Ανάκτηση όλων των tickets
    console.log('\n7. Fetching all tickets...');
    const allTickets = await prisma.supportTicket.findMany({
      include: {
        user: true,
        property: true,
        messages: {
          include: {
            user: true
          }
        }
      }
    });
    console.log('✓ Found', allTickets.length, 'tickets');

    // 8. Ανάκτηση messages για συγκεκριμένο ticket
    console.log('\n8. Fetching messages for ticket...');
    const ticketMessages = await prisma.supportMessage.findMany({
      where: { ticketId: supportTicket.id },
      include: { user: true }
    });
    console.log('✓ Found', ticketMessages.length, 'messages');

    console.log('\n✅ Support messaging system test completed successfully!');
    console.log('\nTest Data Summary:');
    console.log('- Users created:', 2);
    console.log('- Properties created:', 1);
    console.log('- Support tickets created:', 1);
    console.log('- Support messages created:', 2);

  } catch (error) {
    console.error('❌ Error testing support system:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSupportSystem(); 