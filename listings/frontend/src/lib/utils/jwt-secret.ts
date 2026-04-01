/**
 * Get JWT secret from environment variables
 * Fails fast if secret is missing
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: JWT_SECRET environment variable is not set. ' +
        'This is required for production. Please set JWT_SECRET in your environment variables.'
      );
    }
    
    // In development, warn but fail to force proper configuration
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
      'Please set it in your .env.local file or environment variables.'
    );
  }

  // Validate secret strength
  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security. ' +
      `Current length: ${secret.length}`
    );
  }

  return secret;
}

/**
 * Verify JWT token using the configured secret
 * Helper function for consistent JWT verification across the app
 */
export function verifyJwtToken(token: string): { userId: string; email?: string; role?: string } {
  const jwt = require('jsonwebtoken');
  return jwt.verify(token, getJwtSecret()) as { userId: string; email?: string; role?: string };
}

