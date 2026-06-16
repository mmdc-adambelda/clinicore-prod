// src/lib/supabase/admin.ts
// Service-role Supabase client — bypasses RLS entirely.
// Server-only. Never import this in a Client Component or expose its key to the browser.
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
