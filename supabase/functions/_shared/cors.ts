/**
 * Shared CORS helpers for Supabase Edge Functions.
 *
 * Usage:
 *   import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
 *
 * Origins are controlled by the ALLOWED_ORIGINS env var (comma-separated).
 * Defaults to permissive localhost origins for local dev.
 */

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
];

function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    return envOrigins.split(',').map((o) => o.trim()).filter(Boolean);
  }
  return DEFAULT_ORIGINS;
}

/**
 * Returns CORS headers matching the request's Origin against the allowlist.
 * If origin matches, echoes it back. Otherwise, returns the first allowed origin.
 */
export function getCorsHeaders(req?: Request): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = req?.headers.get('Origin') ?? '';

  const origin = allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0] ?? 'http://localhost:5173';

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

/**
 * Handles CORS preflight (OPTIONS) request. Returns a Response if handled, null otherwise.
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
