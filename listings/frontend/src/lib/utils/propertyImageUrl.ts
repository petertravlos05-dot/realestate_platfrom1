/**
 * Converts property image URLs from backend format to full URLs.
 * Backend returns relative paths like /uploads/properties/xyz.jpg which resolve
 * to the backend origin. The frontend needs full URLs to load images.
 */
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PLACEHOLDER = '/images/placeholder.svg';

export function getPropertyImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return PLACEHOLDER;
  const trimmed = url.trim();
  if (!trimmed) return PLACEHOLDER;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) {
    const base = BACKEND_URL.replace(/\/$/, '');
    return `${base}${trimmed}`;
  }
  return url;
}
