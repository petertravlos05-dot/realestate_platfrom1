/**
 * Structured Audit Logger
 * 
 * Logs security-relevant events with structured JSON format.
 * Ensures no secrets or sensitive PII are logged.
 */

import { Request } from 'express';
import { AuthRequest } from '../../middleware/auth';

export type AuditEventType =
  | 'login.success'
  | 'login.failure'
  | 'login.blocked'
  | 'logout'
  | 'password.change'
  | 'password.reset.request'
  | 'password.reset.complete'
  | 'role.change'
  | 'property.create'
  | 'property.update'
  | 'property.delete'
  | 'property.view'
  | 'transaction.create'
  | 'transaction.update'
  | 'transaction.delete'
  | 'lead.create'
  | 'lead.update'
  | 'lead.delete'
  | 'webhook.received'
  | 'webhook.processed'
  | 'webhook.failed'
  | 'payment.success'
  | 'payment.failed'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'file.upload'
  | 'file.delete'
  | 'admin.action'
  | 'authorization.failed'
  | 'rate_limit.exceeded'
  | 'consent.accepted'
  | 'dsar.export_requested'
  | 'dsar.delete_requested'
  | 'dsar.delete_completed'
  | 'dsar.files_delete_queued'
  | 'dsar.files_deleted'
  | 'dsar.files_delete_failed'
  | 'file.download'
  | 'api.error'
  | 'deal.created'
  | 'deal.professional_requested'
  | 'deal.professional_accepted'
  | 'deal.professional_declined'
  | 'deal.professional_request_cancelled'
  | 'deal.thread_created'
  | 'deal.message_sent'
  | 'deal.document_requested'
  | 'deal.document_uploaded'
  | 'deal.document_reviewed'
  | 'deal.document_downloaded'
  | 'deal.document_deleted'
  | 'deal.document_updated'
  | 'deal.appointment_requested'
  | 'deal.appointment_confirmed'
  | 'deal.appointment_cancelled'
  | 'professional.profile_updated'
  | 'professional.availability_updated'
  | 'professional.verified'
  | 'professional.rejected'
  | 'professional.onboarding_started'
  | 'professional.onboarding_completed';

export interface AuditLogEntry {
  timestamp: string;
  requestId?: string;
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string; // Sanitized (no full email in logs)
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  status: 'success' | 'failure' | 'warning';
  details?: Record<string, any>;
  error?: string;
}

/**
 * Sanitize sensitive data from log entries
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'refreshToken',
    'authorization',
    'creditCard',
    'cardNumber',
    'cvv',
    'ssn',
    'socialSecurityNumber',
  ];

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    
    // Remove sensitive keys
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Sanitize nested objects
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }

    // Sanitize email (show only domain for privacy)
    if (lowerKey === 'email' && typeof sanitized[key] === 'string') {
      try {
        const email = sanitized[key] as string;
        if (email.includes('@')) {
          const [localPart, domain] = email.split('@');
          if (domain && localPart) {
            sanitized[key] = `${localPart.substring(0, 2)}***@${domain}`;
          }
        }
      } catch (emailError) {
        // If email sanitization fails, just keep original (will be sanitized by sanitizeData wrapper)
        sanitized[key] = sanitized[key];
      }
    }
  }

  return sanitized;
}

/**
 * Extract IP address from request
 */
function getClientIp(req: Request): string {
  // With trust proxy enabled, req.ip automatically handles X-Forwarded-For
  // No need to manually parse headers
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Generate request ID if not present
 */
function getRequestId(req: Request): string {
  try {
    const existingId = (req as any).requestId;
    if (existingId) {
      return existingId;
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    (req as any).requestId = requestId;
    return requestId;
  } catch (error) {
    // Fallback if request ID generation fails
    return `req-${Date.now()}-fallback`;
  }
}

/**
 * Main audit logging function
 */
export function auditLog(
  req: Request | AuthRequest,
  eventType: AuditEventType,
  action: string,
  status: 'success' | 'failure' | 'warning',
  options?: {
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, any>;
    error?: string;
  }
): void {
  try {
    const authReq = req as AuthRequest;
    
    const logEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      requestId: getRequestId(req),
      eventType,
      userId: authReq.userId,
      userEmail: authReq.userEmail ? sanitizeData({ email: authReq.userEmail }).email : undefined,
      userRole: authReq.userRole,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || undefined,
      action,
      resourceType: options?.resourceType,
      resourceId: options?.resourceId,
      status,
      details: options?.details ? sanitizeData(options.details) : undefined,
      error: options?.error,
    };

    // Output structured JSON log
    const logLine = JSON.stringify(logEntry);
    
    if (status === 'failure' || status === 'warning') {
      console.error('[AUDIT]', logLine);
    } else {
      console.log('[AUDIT]', logLine);
    }
  } catch (error) {
    // If audit logging fails, log the error but don't throw
    // This ensures audit logging never breaks the main flow
    console.error('[AUDIT ERROR] Failed to log audit event:', error);
    console.error('[AUDIT ERROR] Event type:', eventType, 'Action:', action);
  }
}

/**
 * Convenience functions for common audit events
 */
export const auditLogger = {
  loginSuccess: (req: Request | AuthRequest, userId: string, email: string, action?: string, details?: Record<string, any>) => {
    // Safely extract domain from email
    const emailDomain = email.includes('@') ? email.split('@')[1] : 'unknown';
    auditLog(req, 'login.success', 'User logged in successfully', 'success', {
      details: { userId, email: emailDomain },
    });
  },

  loginFailure: (req: Request, email: string, reason: string) => {
    // Safely extract domain from email
    const emailDomain = email.includes('@') ? email.split('@')[1] : 'unknown';
    auditLog(req, 'login.failure', 'Login attempt failed', 'failure', {
      details: { email: emailDomain, reason },
      error: reason,
    });
  },

  loginBlocked: (req: Request, email: string, reason: string) => {
    // Safely extract domain from email
    const emailDomain = email.includes('@') ? email.split('@')[1] : 'unknown';
    auditLog(req, 'login.blocked', 'Login blocked due to rate limiting', 'warning', {
      details: { email: emailDomain, reason },
    });
  },

  logout: (req: Request | AuthRequest) => {
    auditLog(req, 'logout', 'User logged out', 'success');
  },

  passwordChange: (req: Request | AuthRequest, userId: string) => {
    auditLog(req, 'password.change', 'Password changed', 'success', {
      resourceType: 'user',
      resourceId: userId,
    });
  },

  passwordResetRequest: (req: Request, email: string) => {
    // Safely extract domain from email
    const emailDomain = email.includes('@') ? email.split('@')[1] : 'unknown';
    auditLog(req, 'password.reset.request', 'Password reset requested', 'success', {
      details: { email: emailDomain },
    });
  },

  passwordResetComplete: (req: Request, email: string) => {
    // Safely extract domain from email
    const emailDomain = email.includes('@') ? email.split('@')[1] : 'unknown';
    auditLog(req, 'password.reset.complete', 'Password reset completed', 'success', {
      details: { email: emailDomain },
    });
  },

  roleChange: (req: Request | AuthRequest, userId: string, oldRole: string, newRole: string) => {
    auditLog(req, 'role.change', 'User role changed', 'success', {
      resourceType: 'user',
      resourceId: userId,
      details: { oldRole, newRole },
    });
  },

  propertyCreate: (req: Request | AuthRequest, propertyId: string) => {
    auditLog(req, 'property.create', 'Property created', 'success', {
      resourceType: 'property',
      resourceId: propertyId,
    });
  },

  propertyUpdate: (req: Request | AuthRequest, propertyId: string, changes?: Record<string, any>) => {
    auditLog(req, 'property.update', 'Property updated', 'success', {
      resourceType: 'property',
      resourceId: propertyId,
      details: changes ? sanitizeData(changes) : undefined,
    });
  },

  propertyDelete: (req: Request | AuthRequest, propertyId: string) => {
    auditLog(req, 'property.delete', 'Property deleted', 'success', {
      resourceType: 'property',
      resourceId: propertyId,
    });
  },

  transactionCreate: (req: Request | AuthRequest, transactionId: string) => {
    auditLog(req, 'transaction.create', 'Transaction created', 'success', {
      resourceType: 'transaction',
      resourceId: transactionId,
    });
  },

  transactionUpdate: (req: Request | AuthRequest, transactionId: string, changes?: Record<string, any>) => {
    auditLog(req, 'transaction.update', 'Transaction updated', 'success', {
      resourceType: 'transaction',
      resourceId: transactionId,
      details: changes ? sanitizeData(changes) : undefined,
    });
  },

  authorizationFailed: (req: Request | AuthRequest, resourceType: string, resourceId: string, reason: string) => {
    auditLog(req, 'authorization.failed', 'Authorization check failed', 'failure', {
      resourceType,
      resourceId,
      error: reason,
    });
  },

  rateLimitExceeded: (req: Request, endpoint: string, ipAddress: string) => {
    auditLog(req, 'rate_limit.exceeded', 'Rate limit exceeded', 'warning', {
      details: { endpoint, ipAddress },
    });
  },

  apiError: (req: Request | AuthRequest, error: Error, endpoint: string) => {
    auditLog(req, 'api.error', 'API error occurred', 'failure', {
      details: { endpoint, errorType: error.constructor.name },
      error: error.message,
    });
  },

  fileAccess: (req: Request | AuthRequest, action: string, status: 'success' | 'failure', details?: Record<string, any>) => {
    auditLog(req, 'file.download', action, status, {
      resourceType: 'file',
      details: details ? sanitizeData(details) : undefined,
    });
  },

  // Deal Room Events
  dealCreated: (req: Request | AuthRequest, dealRoomId: string) => {
    auditLog(req, 'deal.created', 'Deal room created', 'success', {
      resourceType: 'deal_room',
      resourceId: dealRoomId,
    });
  },

  professionalRequested: (req: Request | AuthRequest, dealRoomId: string, professionalId: string) => {
    auditLog(req, 'deal.professional_requested', 'Professional requested', 'success', {
      resourceType: 'deal_room',
      resourceId: dealRoomId,
      details: { professionalId },
    });
  },

  professionalAccepted: (req: Request | AuthRequest, dealRoomId: string, professionalId: string) => {
    auditLog(req, 'deal.professional_accepted', 'Professional request accepted', 'success', {
      resourceType: 'deal_room',
      resourceId: dealRoomId,
      details: { professionalId },
    });
  },

  professionalDeclined: (req: Request | AuthRequest, dealRoomId: string, professionalId: string) => {
    auditLog(req, 'deal.professional_declined', 'Professional request declined', 'success', {
      resourceType: 'deal_room',
      resourceId: dealRoomId,
      details: { professionalId },
    });
  },

  professionalRequestCancelled: (req: Request | AuthRequest, dealRoomId: string, professionalId: string) => {
    auditLog(req, 'deal.professional_request_cancelled', 'Professional request cancelled by buyer', 'success', {
      resourceType: 'deal_room',
      resourceId: dealRoomId,
      details: { professionalId },
    });
  },

  threadCreated: (req: Request | AuthRequest, threadId: string, dealRoomId: string) => {
    auditLog(req, 'deal.thread_created', 'Thread created', 'success', {
      resourceType: 'deal_thread',
      resourceId: threadId,
      details: { dealRoomId },
    });
  },

  messageSent: (req: Request | AuthRequest, messageId: string, threadId: string, dealRoomId: string) => {
    auditLog(req, 'deal.message_sent', 'Message sent', 'success', {
      resourceType: 'deal_message',
      resourceId: messageId,
      details: { threadId, dealRoomId },
    });
  },

  documentRequested: (req: Request | AuthRequest, documentId: string, dealRoomId: string) => {
    auditLog(req, 'deal.document_requested', 'Document requested', 'success', {
      resourceType: 'deal_document',
      resourceId: documentId,
      details: { dealRoomId },
    });
  },

  documentUploaded: (req: Request | AuthRequest, documentId: string, dealRoomId: string) => {
    auditLog(req, 'deal.document_uploaded', 'Document uploaded', 'success', {
      resourceType: 'deal_document',
      resourceId: documentId,
      details: { dealRoomId },
    });
  },

  documentReviewed: (req: Request | AuthRequest, documentId: string, dealRoomId: string, status: string) => {
    auditLog(req, 'deal.document_reviewed', 'Document reviewed', 'success', {
      resourceType: 'deal_document',
      resourceId: documentId,
      details: { dealRoomId, status },
    });
  },

  documentDownloaded: (req: Request | AuthRequest, documentId: string, dealRoomId: string) => {
    auditLog(req, 'deal.document_downloaded', 'Document download URL generated', 'success', {
      resourceType: 'deal_document',
      resourceId: documentId,
      details: { dealRoomId },
    });
  },

  documentDeleted: (req: Request | AuthRequest, documentId: string, dealRoomId: string) => {
    auditLog(req, 'deal.document_deleted', 'Document request deleted', 'success', {
      resourceType: 'deal_document',
      resourceId: documentId,
      details: { dealRoomId },
    });
  },

  documentUpdated: (req: Request | AuthRequest, documentId: string, dealRoomId: string) => {
    auditLog(req, 'deal.document_updated', 'Document guide updated', 'success', {
      resourceType: 'deal_document',
      resourceId: documentId,
      details: { dealRoomId },
    });
  },

  appointmentRequested: (req: Request | AuthRequest, appointmentId: string, dealRoomId: string) => {
    auditLog(req, 'deal.appointment_requested', 'Appointment requested', 'success', {
      resourceType: 'deal_appointment',
      resourceId: appointmentId,
      details: { dealRoomId },
    });
  },

  appointmentConfirmed: (req: Request | AuthRequest, appointmentId: string, dealRoomId: string) => {
    auditLog(req, 'deal.appointment_confirmed', 'Appointment confirmed', 'success', {
      resourceType: 'deal_appointment',
      resourceId: appointmentId,
      details: { dealRoomId },
    });
  },

  appointmentCancelled: (req: Request | AuthRequest, appointmentId: string, dealRoomId: string) => {
    auditLog(req, 'deal.appointment_cancelled', 'Appointment cancelled', 'success', {
      resourceType: 'deal_appointment',
      resourceId: appointmentId,
      details: { dealRoomId },
    });
  },

  // Professional Events
  professionalProfileUpdated: (req: Request | AuthRequest, professionalId: string) => {
    auditLog(req, 'professional.profile_updated', 'Professional profile updated', 'success', {
      resourceType: 'professional_profile',
      resourceId: professionalId,
    });
  },

  professionalAvailabilityUpdated: (req: Request | AuthRequest, professionalId: string) => {
    auditLog(req, 'professional.availability_updated', 'Professional availability updated', 'success', {
      resourceType: 'professional_profile',
      resourceId: professionalId,
    });
  },

  professionalVerified: (req: Request | AuthRequest, professionalId: string) => {
    auditLog(req, 'professional.verified', 'Professional verified', 'success', {
      resourceType: 'professional_profile',
      resourceId: professionalId,
    });
  },

  professionalRejected: (req: Request | AuthRequest, professionalId: string) => {
    auditLog(req, 'professional.rejected', 'Professional rejected', 'success', {
      resourceType: 'professional_profile',
      resourceId: professionalId,
    });
  },

  professionalOnboardingStarted: (req: Request | AuthRequest, userId: string, type: string) => {
    auditLog(req, 'professional.onboarding_started', 'Professional onboarding started', 'success', {
      resourceType: 'professional_profile',
      resourceId: userId,
      details: { type },
    });
  },

  professionalOnboardingCompleted: (req: Request | AuthRequest, userId: string, professionalId: string, type: string) => {
    auditLog(req, 'professional.onboarding_completed', 'Professional onboarding completed', 'success', {
      resourceType: 'professional_profile',
      resourceId: professionalId,
      details: { userId, type },
    });
  },
};

