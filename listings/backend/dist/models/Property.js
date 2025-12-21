"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Property = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const propertySchema = new mongoose_1.default.Schema({
    title: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    userId: { type: String, required: true },
    visitSettings: {
        presenceType: { type: String, enum: ['platform_only', 'seller_and_platform'] },
        schedulingType: { type: String, enum: ['seller_availability', 'buyer_proposal'] },
        availability: { type: Object },
        updatedAt: { type: Date }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
exports.Property = mongoose_1.default.model('Property', propertySchema);
