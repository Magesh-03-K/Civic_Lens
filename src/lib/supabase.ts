import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env';

let supabaseClient: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const env = getEnv();
  supabaseClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

/**
 * Returns the public URL for a media path.
 * If the path starts with /seed/ or http, returns as-is.
 * Otherwise, constructs the public URL for the Supabase storage bucket.
 */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('/seed/') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const bucket = process.env.SUPABASE_BUCKET || 'civic-media';
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
