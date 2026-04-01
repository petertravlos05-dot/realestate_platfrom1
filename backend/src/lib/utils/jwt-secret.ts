/**
 * Get JWT secret from environment variables
 * Fails fast if secret is missing in production
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
    
    // In development, warn but don't fail (to allow local testing)
    console.warn(
      '⚠️  WARNING: JWT_SECRET environment variable is not set. ' +
      'Using a default secret for development only. ' +
      'This is INSECURE and should never be used in production!'
    );
    
    // Still throw in development to force proper configuration
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
      'Please set it in your .env file or environment variables.'
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





