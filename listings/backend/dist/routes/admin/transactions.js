"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Store connected clients
const clients = new Map();
// SSE endpoint for real-time updates
router.get('/stream', auth_1.isAuthenticated, (req, res) => {
    var _a;
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);
    const clientId = Date.now().toString();
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.end();
        return;
    }
    clients.set(clientId, { res, userId });
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    // Remove client on connection close
    req.on('close', () => {
        clients.delete(clientId);
    });
});
// Helper function to send updates to connected clients
const sendUpdateToClients = (transaction) => {
    const { buyer, seller, agent } = transaction;
    const relevantUserIds = [buyer.id, seller.id];
    if (agent)
        relevantUserIds.push(agent.id);
    clients.forEach((client) => {
        if (relevantUserIds.includes(client.userId)) {
            client.res.write(`data: ${JSON.stringify({
                type: 'transaction_update',
                data: transaction
            })}\n\n`);
        }
    });
};
// Get all transactions
router.get('/', auth_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactions = yield prisma.transaction.findMany({
            include: {
                property: true,
                buyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                },
                seller: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                },
                agent: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                },
                notifications: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });
        res.json(transactions);
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
}));
// Update transaction stage
router.put('/:id/stage', auth_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { stage } = req.body;
    try {
        // Start a transaction to ensure data consistency
        const result = yield prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            // Update the transaction stage
            const transaction = yield prisma.transaction.update({
                where: { id },
                data: {
                    stage,
                    updatedAt: new Date()
                },
                include: {
                    property: true,
                    buyer: true,
                    seller: true,
                    agent: true,
                    notifications: true
                }
            });
            // Create automatic notification based on stage
            let notificationMessage = '';
            let category = 'general';
            switch (stage) {
                case 'meeting_scheduled':
                    notificationMessage = 'Το ραντεβού επιβεβαιώθηκε για την προβολή του ακινήτου.';
                    category = 'appointment';
                    break;
                case 'deposit_paid':
                    notificationMessage = 'Η προκαταβολή έχει καταχωρηθεί επιτυχώς.';
                    category = 'payment';
                    break;
                case 'final_signing':
                    notificationMessage = 'Όλα είναι έτοιμα για την τελική υπογραφή.';
                    category = 'contract';
                    break;
                case 'completed':
                    notificationMessage = 'Η συναλλαγή ολοκληρώθηκε με επιτυχία!';
                    category = 'completion';
                    break;
                case 'cancelled':
                    notificationMessage = 'Η διαδικασία έχει ακυρωθεί.';
                    category = 'general';
                    break;
            }
            // Create notifications for all parties
            if (notificationMessage) {
                const notifications = yield Promise.all([
                    prisma.transactionNotification.create({
                        data: {
                            message: notificationMessage,
                            recipient: 'buyer',
                            stage,
                            category,
                            isUnread: true,
                            transaction: { connect: { id } }
                        }
                    }),
                    prisma.transactionNotification.create({
                        data: {
                            message: notificationMessage,
                            recipient: 'seller',
                            stage,
                            category,
                            isUnread: true,
                            transaction: { connect: { id } }
                        }
                    })
                ]);
                if (transaction.agent) {
                    yield prisma.transactionNotification.create({
                        data: {
                            message: notificationMessage,
                            recipient: 'agent',
                            stage,
                            category,
                            isUnread: true,
                            transaction: { connect: { id } }
                        }
                    });
                }
                // Fetch updated transaction with new notifications
                const updatedTransaction = yield prisma.transaction.findUnique({
                    where: { id },
                    include: {
                        property: true,
                        buyer: true,
                        seller: true,
                        agent: true,
                        notifications: {
                            orderBy: {
                                createdAt: 'desc'
                            }
                        }
                    }
                });
                return updatedTransaction;
            }
            return transaction;
        }));
        // Send real-time update to connected clients
        sendUpdateToClients(result);
        res.json(result);
    }
    catch (error) {
        console.error('Error updating transaction stage:', error);
        res.status(500).json({ error: 'Failed to update transaction stage' });
    }
}));
// Add notification to transaction
router.post('/:id/notifications', auth_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { message, recipient, stage, category } = req.body;
    try {
        const result = yield prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            const notification = yield prisma.transactionNotification.create({
                data: {
                    message,
                    recipient,
                    stage,
                    category,
                    isUnread: true,
                    transaction: {
                        connect: { id }
                    }
                }
            });
            // Fetch updated transaction with new notification
            const updatedTransaction = yield prisma.transaction.findUnique({
                where: { id },
                include: {
                    property: true,
                    buyer: true,
                    seller: true,
                    agent: true,
                    notifications: {
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            });
            return updatedTransaction;
        }));
        // Send real-time update to connected clients
        sendUpdateToClients(result);
        res.json(result);
    }
    catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
}));
// Mark notification as read
router.put('/notifications/:notificationId/read', auth_1.isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { notificationId } = req.params;
    try {
        const notification = yield prisma.transactionNotification.update({
            where: { id: notificationId },
            data: {
                isUnread: false,
                updatedAt: new Date()
            }
        });
        res.json(notification);
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
}));
// Get notifications for a transaction
router.get('/:id/notifications', auth_1.isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { recipient } = req.query;
    try {
        const notifications = yield prisma.transactionNotification.findMany({
            where: Object.assign({ transactionId: id }, (recipient && { recipient: recipient })),
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(notifications);
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
}));
exports.default = router;
