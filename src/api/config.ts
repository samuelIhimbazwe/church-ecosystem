/**
 * Frontend → backend bridge.
 * When VITE_API_URL is set, auth (and later domain) can use the API.
 * Domain data still uses in-memory seeds until those routes are ported.
 */

export function apiBaseUrl(): string | null {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

/** True when the SPA should attempt API auth. */
export function isApiEnabled(): boolean {
  return Boolean(apiBaseUrl());
}

/** Fall back to seed login if API is down / user unknown on server. Default true. */
export function isApiFallbackEnabled(): boolean {
  return import.meta.env.VITE_API_FALLBACK !== 'false';
}
