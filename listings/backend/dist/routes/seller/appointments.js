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
exports.appointmentsRouter = exports.router = void 0;
const express_1 = require("express");
const Appointment_1 = require("../../models/Appointment");
const Property_1 = require("../../models/Property");
const User_1 = require("../../models/User");
const Notification_1 = require("../../models/Notification");
const express_validator_1 = require("express-validator");
exports.router = (0, express_1.Router)();
// Get seller's appointments
exports.router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
            return;
        }
        // Get seller's properties
        const properties = yield Property_1.Property.find({ userId: req.user._id });
        const propertyIds = properties.map(p => p._id.toString());
        // Get appointments for these properties
        const appointments = yield Appointment_1.Appointment.find({
            propertyId: { $in: propertyIds }
        }).sort({ createdAt: -1 });
        // Get unique buyer IDs
        const buyerIds = [...new Set(appointments.map(a => a.buyerId.toString()))];
        // Get buyers and properties
        const [buyers, propertyMap] = yield Promise.all([
            User_1.User.find({ _id: { $in: buyerIds } }),
            Property_1.Property.find({ _id: { $in: propertyIds } }).then(properties => properties.reduce((acc, p) => (Object.assign(Object.assign({}, acc), { [p._id.toString()]: p })), {}))
        ]);
        // Create buyer map
        const buyerMap = buyers.reduce((acc, b) => (Object.assign(Object.assign({}, acc), { [b._id.toString()]: b })), {});
        res.json({
            appointments,
            properties: propertyMap,
            users: buyerMap
        });
    }
    catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση των ραντεβού' });
    }
}));
// Update appointment status
exports.router.put('/:appointmentId/status', [
    (0, express_validator_1.param)('appointmentId').isMongoId(),
    (0, express_validator_1.body)('status').isIn(['accepted', 'rejected'])
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
            return;
        }
        const { appointmentId } = req.params;
        const { status } = req.body;
        // Get appointment
        const appointment = yield Appointment_1.Appointment.findById(appointmentId);
        if (!appointment) {
            res.status(404).json({ error: 'Το ραντεβού δεν βρέθηκε' });
            return;
        }
        // Check if the property belongs to the seller
        const property = yield Property_1.Property.findOne({
            _id: appointment.propertyId,
            userId: req.user._id
        });
        if (!property) {
            res.status(403).json({ error: 'Δεν έχετε δικαίωμα να ενημερώσετε αυτό το ραντεβού' });
            return;
        }
        // Update appointment status
        appointment.status = status;
        yield appointment.save();
        // Create notification for buyer
        yield Notification_1.Notification.create({
            userId: appointment.buyerId,
            type: 'appointment_status_change',
            message: `Το ραντεβού σας για το ακίνητο ${property.title} ${status === 'accepted' ? 'έχει εγκριθεί' : 'έχει απορριφθεί'}`,
            data: {
                appointmentId: appointment._id,
                propertyId: property._id,
                status
            },
            isRead: false
        });
        res.json(appointment);
    }
    catch (error) {
        console.error('Error updating appointment status:', error);
        res.status(500).json({ error: 'Σφάλμα κατά την ενημέρωση της κατάστασης του ραντεβού' });
    }
}));
exports.appointmentsRouter = exports.router;
