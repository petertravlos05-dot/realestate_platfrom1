const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSupportModels() {
  try {
    console.log('Testing SupportTicket model...');
    
    // Test if we can query support tickets
    const tickets = await prisma.supportTicket.findMany({
      take: 1,
      include: {
        user: true,
        messages: true
      }
    });
    
    console.log('SupportTicket query successful:', tickets.length, 'tickets found');
    
    // Test if we can query support messages
    const messages = await prisma.supportMessage.findMany({
      take: 1,
      include: {
        user: true
      }
    });
    
    console.log('SupportMessage query successful:', messages.length, 'messages found');
    
    // Test if we can create a support message
    console.log('Testing message creation...');
    
    // First, let's get a ticket to work with
    const firstTicket = await prisma.supportTicket.findFirst();
    
    if (!firstTicket) {
      console.log('No tickets found, creating a test ticket first...');
      
      // Get a user to create a ticket for
      const user = await prisma.user.findFirst();
      
      if (!user) {
        console.log('No users found in database');
        return;
      }
      
      const testTicket = await prisma.supportTicket.create({
        data: {
          title: 'Test Ticket',
          description: 'This is a test ticket',
          status: 'OPEN',
          priority: 'MEDIUM',
          category: 'GENERAL',
          userId: user.id
        }
      });
      
      console.log('Created test ticket:', testTicket.id);
      
      // Now create a test message
      const testMessage = await prisma.supportMessage.create({
        data: {
          content: 'This is a test message',
          ticketId: testTicket.id,
          userId: user.id,
          isFromAdmin: false
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });
      
      console.log('Created test message:', testMessage);
      
    } else {
      console.log('Using existing ticket:', firstTicket.id);
      
      // Create a test message for existing ticket
      const testMessage = await prisma.supportMessage.create({
        data: {
          content: 'This is a test admin reply',
          ticketId: firstTicket.id,
          userId: firstTicket.userId, // Using the ticket owner as user
          isFromAdmin: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });
      
      console.log('Created test admin message:', testMessage);
    }
    
    console.log('All tests passed!');
    
  } catch (error) {
    console.error('Error testing support models:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSupportModels(); 