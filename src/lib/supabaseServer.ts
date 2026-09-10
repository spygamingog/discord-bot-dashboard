/**
 * Supabase Administrative Server Client
 * File: dashboard/src/lib/supabaseServer.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function getSupabaseServer() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server environment variables (URL/Service Key) are missing.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
