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
exports.isAdmin = exports.isAuthenticated = void 0;
const react_1 = require("next-auth/react");
const isAuthenticated = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield (0, react_1.getSession)({ req });
    if (!(session === null || session === void 0 ? void 0 : session.user)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});
exports.isAuthenticated = isAuthenticated;
const isAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield (0, react_1.getSession)({ req });
    if (!(session === null || session === void 0 ? void 0 : session.user) || session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
});
exports.isAdmin = isAdmin;
