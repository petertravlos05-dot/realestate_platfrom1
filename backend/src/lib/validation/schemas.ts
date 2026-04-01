/**
 * Validation schemas using Zod
 * Prevents mass assignment vulnerabilities by whitelisting allowed fields
 */

import { z } from 'zod';

/**
 * Protected fields that cannot be updated via API
 */
export const PROTECTED_FIELDS = [
  'id',
  'userId',
  'ownerId',
  'role',
  'isVerified',
  'emailVerified',
  'createdAt',
  'updatedAt',
  'password', // Use dedicated password change endpoint
] as const;

/**
 * User Registration Schema
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  confirmPassword: z.string().min(12, 'Confirm password must be at least 12 characters'),
  name: z.string().min(1, 'Name is required').max(255),
  role: z.enum(['BUYER', 'SELLER', 'AGENT', 'LAWYER', 'NOTARY', 'ENGINEER', 'ACCOUNTANT']).default('BUYER'),
  phone: z.string().optional(),
  country: z.string().max(100).optional(), // Country of origin
  companyName: z.string().optional(),
  companyTitle: z.string().optional(),
  companyTaxId: z.string().optional(),
  companyDou: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email('Invalid company email').optional().or(z.literal('')),
  companyHeadquarters: z.string().optional(),
  companyWebsite: z.string().url('Invalid website URL').optional().or(z.literal('')),
  companyWorkingHours: z.string().optional(),
  contactPersonName: z.string().optional(),
  contactPersonEmail: z.string().email('Invalid contact email').optional().or(z.literal('')),
  contactPersonPhone: z.string().optional(),
  companyLogo: z.string().optional(),
  licenseNumber: z.string().optional(),
  businessAddress: z.string().optional(),
  userType: z.enum(['INDIVIDUAL', 'COMPANY']).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).strict(); // Reject unknown fields

/**
 * User Update Schema (excludes protected fields)
 */
export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().optional(),
  country: z.string().max(100).optional(), // Country of origin
  companyName: z.string().optional(),
  companyTitle: z.string().optional(),
  companyTaxId: z.string().optional(),
  companyDou: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email().optional().or(z.literal('')),
  companyHeadquarters: z.string().optional(),
  companyWebsite: z.string().url().optional().or(z.literal('')),
  companyWorkingHours: z.string().optional(),
  contactPersonName: z.string().optional(),
  contactPersonEmail: z.string().email().optional().or(z.literal('')),
  contactPersonPhone: z.string().optional(),
  companyLogo: z.string().optional(),
  licenseNumber: z.string().optional(),
  businessAddress: z.string().optional(),
  userType: z.enum(['INDIVIDUAL', 'COMPANY']).optional(),
}).strict();

/**
 * Property Update Schema (excludes protected fields)
 */
export const updatePropertySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  shortDescription: z.string().optional(),
  fullDescription: z.string().optional(),
  propertyType: z.enum(['APARTMENT', 'HOUSE', 'VILLA', 'OFFICE', 'STORE', 'LAND', 'OTHER']).optional(),
  price: z.number().positive().optional(),
  city: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  postalCode: z.string().optional(),
  area: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  status: z.enum(['available', 'unavailable', 'sold', 'rented']).optional(),
  images: z.array(z.string()).optional(),
  features: z.record(z.string(), z.any()).optional(),
  amenities: z.array(z.string()).optional(),
  visitSettings: z.record(z.string(), z.any()).optional(),
  lawyerName: z.string().optional(),
  lawyerEmail: z.string().email().optional().or(z.literal('')),
  lawyerPhone: z.string().optional(),
  lawyerTaxId: z.string().optional(),
}).strict();

/**
 * Transaction Update Schema
 */
export const updateTransactionSchema = z.object({
  stage: z.enum(['PENDING', 'MEETING_SCHEDULED', 'DEPOSIT_PAID', 'FINAL_SIGNING', 'COMPLETED', 'CANCELLED']).optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
}).strict();

/**
 * Viewing Request Create Schema
 */
export const createViewingRequestSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
  buyerId: z.string().min(1, 'Buyer ID is required'),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)), // Accept ISO date or YYYY-MM-DD
  time: z.string().min(1, 'Time is required'),
  endTime: z.string().optional(),
}).strict();

/**
 * Viewing Request Update Schema
 */
export const updateViewingRequestSchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  time: z.string().optional(),
  endTime: z.string().optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED']).optional(),
}).strict();

/**
 * Property Availability Schema
 */
export const propertyAvailabilitySchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
}).strict();

/**
 * Property Lawyer Info Schema
 */
export const propertyLawyerSchema = z.object({
  name: z.string().min(1, 'Lawyer name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(1, 'Phone is required'),
  taxId: z.string().optional(),
}).strict();

/**
 * Property Progress Schema
 */
export const propertyProgressSchema = z.object({
  stage: z.enum(['legalDocuments', 'platformReview', 'platformAssignment', 'listing']),
  status: z.enum(['pending', 'in_progress', 'completed', 'rejected']),
  message: z.string().optional(),
}).strict();

/**
 * Seller Lead Update Schema
 */
export const updateLeadSchema = z.object({
  leadId: z.string().min(1),
  status: z.string().optional(),
  notes: z.string().optional(),
  interestCancelled: z.boolean().optional(),
}).strict();

/**
 * Express Interest Schema
 */
export const expressInterestSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
}).strict();

/**
 * Favorite Schema
 */
export const favoriteSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
}).strict();

/**
 * Buyer-Agent Connect Schema
 */
export const buyerAgentConnectSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
}).strict();

/**
 * Utility function to strip protected fields from object
 */
export function stripProtectedFields<T extends Record<string, any>>(
  data: T,
  additionalProtectedFields: string[] = []
): Omit<T, typeof PROTECTED_FIELDS[number] | string> {
  const allProtected = [...PROTECTED_FIELDS, ...additionalProtectedFields];
  const result = { ...data };
  
  for (const field of allProtected) {
    delete result[field];
  }
  
  return result;
}

/**
 * Utility function to validate and sanitize request body
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details?: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return {
        success: false,
        error: `Validation failed: ${errorMessages}`,
        details: error,
      };
    }
    return {
      success: false,
      error: 'Validation failed: Unknown error',
    };
  }
}

// ============================================
// DEAL ROOM VALIDATION SCHEMAS
// ============================================

export const createDealRoomSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
}).strict();

export const requestProfessionalSchema = z.object({
  professionalId: z.string().min(1, 'Professional ID is required'),
  message: z.string().max(1000).optional(),
}).strict();

export const createDirectThreadSchema = z.object({
  otherUserId: z.string().min(1, 'Other user ID is required'),
}).strict();

export const sendMessageSchema = z.object({
  body: z.string().min(1, 'Message body is required').max(5000, 'Message too long'),
}).strict();

export const requestDocumentSchema = z.object({
  category: z.string().min(1).max(200), // Allow any string for flexibility with Greek document names
  requestedFromRole: z.enum(['BUYER', 'SELLER']),
  note: z.string().max(500).optional(),
  guideWhere: z.string().max(500).optional(), // Where to find the document
  guideInstructions: z.string().max(2000).optional(), // Instructions on how to get the document
}).strict();

export const reviewDocumentSchema = z.object({
  status: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  note: z.string().max(1000).optional(),
}).strict();

export const requestAppointmentSchema = z.object({
  professionalId: z.string().min(1, 'Professional ID is required'),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  type: z.enum(['ONLINE', 'IN_PERSON']),
  note: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
}).strict();

export const registerProfessionalSchema = z.object({
  type: z.enum(['LAWYER', 'NOTARY', 'ENGINEER']),
  displayName: z.string().min(1).max(200),
  officeName: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  city: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.string().min(1).max(100).optional()
  ), // Required only for first-time onboarding
  areaTags: z.array(z.string()).default([]),
  address: z.string().max(500).optional(),
  bio: z.string().max(2000).optional(),
  languages: z.array(z.string()).default([]),
  services: z.record(z.string(), z.any()).optional(),
  registryNumber: z.string().min(1).max(100).optional(), // Will be stored in services
  /** Δικηγορικός σύλλογος / παράρτημα ΤΕΕ / συμβολαιογραφικός σύλλογος — αποθηκεύεται στο services */
  registryBody: z.string().max(200).optional(),
  availability: z.object({
    timezone: z.string().default('Europe/Athens'),
    weeklyRules: z.array(z.object({
      weekday: z.number().int().min(0).max(6),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    })).optional(),
    meetingTypes: z.array(z.enum(['ONLINE', 'IN_PERSON'])).default([]),
  }).optional(),
}).strict();

export const updateAvailabilitySchema = z.object({
  timezone: z.string().default('Europe/Athens'),
  weeklyRules: z.array(z.object({
    weekday: z.number().int().min(0).max(6),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  })),
  exceptions: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    unavailable: z.boolean(),
  })).optional(),
  meetingTypes: z.array(z.enum(['ONLINE', 'IN_PERSON'])).default([]),
}).strict();

