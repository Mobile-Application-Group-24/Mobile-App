/**
 * Utility functions for handling user avatars
 */

// Default avatar for users without a profile picture
export const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=3131&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

/**
 * Returns a valid avatar URL, falling back to the default if none is provided
 */
export function getAvatarUrl(url?: string | null): string {
  if (!url) return DEFAULT_AVATAR;
  return url;
}

/**
 * Returns a name to display for a user, with fallback for unnamed users
 */
export function getDisplayName(name?: string | null): string {
  if (!name) return 'Unknown User';
  return name;
}
