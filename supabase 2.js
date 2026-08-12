// ============ supabase config ============
// Project URL + publishable ("anon") key. Safe to ship in the browser.
// Security comes from Row Level Security on your tables (see setup SQL).
// NEVER put the sb_secret_ key in here.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://lyimgdrfofmukylbmyqk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_1fI5pDIatGsHjBPuRfQEkA_4E5WRarG';

export const CONFIGURED =
  !SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
  !SUPABASE_ANON_KEY.includes('YOUR-ANON');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,   // in-memory only -> fresh login every visit
    autoRefreshToken: true,
    detectSessionInUrl: true // needed for the password-reset link
  }
});
