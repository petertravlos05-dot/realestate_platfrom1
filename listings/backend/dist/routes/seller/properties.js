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
exports.propertiesRouter = exports.router = void 0;
const express_1 = require("express");
const Property_1 = require("../../models/Property");
const express_validator_1 = require("express-validator");
const Appointment_1 = require("../../models/Appointment");
const Notification_1 = require("../../models/Notification");
exports.router = (0, express_1.Router)();
// Add the new endpoint
exports.router.put('/:propertyId/visit-settings', [
    (0, express_validator_1.param)('propertyId').isMongoId(),
    (0, express_validator_1.body)('presenceType').isIn(['platform_only', 'seller_and_platform']),
    (0, express_validator_1.body)('schedulingType').optional().isIn(['seller_availability', 'buyer_proposal']),
    (0, express_validator_1.body)('availability').optional().isObject()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        const { propertyId } = req.params;
        const { presenceType, schedulingType, availability } = req.body;
        // Update property settings
        const property = yield Property_1.Property.findById(propertyId);
        if (!property) {
            res.status(404).json({ error: 'Το ακίνητο δεν βρέθηκε' });
            return;
        }
        property.visitSettings = {
            presenceType,
            schedulingType,
            availability: schedulingType === 'seller_availability' ? availability : undefined,
            updatedAt: new Date()
        };
        yield property.save();
        res.json({ message: 'Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς' });
    }
    catch (error) {
        console.error('Error saving visit settings:', error);
        res.status(500).json({ error: 'Σφάλμα κατά την αποθήκευση των ρυθμίσεων' });
    }
}));
// Add GET endpoint for appointment settings
exports.router.get('/:propertyId/appointment-settings', [
    (0, express_validator_1.param)('propertyId').isMongoId()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        const { propertyId } = req.params;
        const property = yield Property_1.Property.findById(propertyId);
        if (!property) {
            res.status(404).json({ error: 'Το ακίνητο δεν βρέθηκε' });
            return;
        }
        res.json(property.visitSettings || {
            presenceType: 'platform_only',
            schedulingType: 'buyer_proposal'
        });
    }
    catch (error) {
        console.error('Error fetching appointment settings:', error);
        res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση των ρυθμίσεων' });
    }
}));
// Add POST endpoint for creating appointments
exports.router.post('/:propertyId/appointments', [
    (0, express_validator_1.param)('propertyId').isMongoId(),
    (0, express_validator_1.body)('buyerId').isMongoId(),
    (0, express_validator_1.body)('date').isISO8601(),
    (0, express_validator_1.body)('time').isString(),
    (0, express_validator_1.body)('submittedByBuyer').isBoolean()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        const { propertyId } = req.params;
        const { buyerId, date, time, submittedByBuyer } = req.body;
        const property = yield Property_1.Property.findById(propertyId);
        if (!property) {
            res.status(404).json({ error: 'Το ακίνητο δεν βρέθηκε' });
            return;
        }
        // Check if the property has visit settings
        if (!property.visitSettings) {
            res.status(400).json({ error: 'Το ακίνητο δεν έχει ρυθμίσεις ραντεβού' });
            return;
        }
        // Create appointment
        const appointment = new Appointment_1.Appointment({
            propertyId,
            buyerId,
            date,
            time,
            status: property.visitSettings.presenceType === 'platform_only' ? 'accepted' : 'pending',
            submittedByBuyer,
            createdAt: new Date()
        });
        yield appointment.save();
        // Create notification for seller if needed
        if (property.visitSettings.presenceType === 'seller_and_platform') {
            yield Notification_1.Notification.create({
                userId: property.userId,
                type: 'appointment_request',
                message: `Νέα αίτηση ραντεβού για το ακίνητο ${property.title}`,
                data: {
                    appointmentId: appointment._id,
                    propertyId,
                    buyerId
                },
                isRead: false
            });
        }
        res.status(201).json(appointment);
    }
    catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'Σφάλμα κατά τη δημιουργία του ραντεβού' });
    }
}));
exports.propertiesRouter = exports.router;
