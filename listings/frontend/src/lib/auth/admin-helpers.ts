/**
 * Admin authorization helpers
 * Provides case-insensitive role checking for admin users
 */

/**
 * Check if user role is admin (case-insensitive)
 */
export function isAdmin(role: string | undefined | null): boolean {
  if (!role) return false;
  return role.toUpperCase() === 'ADMIN';
}

/**
 * Check if session user is admin
 */
export function isAdminSession(session: { user?: { role?: string } } | null): boolean {
  if (!session?.user?.role) return false;
  return isAdmin(session.user.role);
}

