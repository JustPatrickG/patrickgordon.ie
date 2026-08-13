// Same Supabase project as the patrickgordon.ie dashboard — shared database.
// Publishable key only; security is the RLS in setup.sql. Never the sb_secret_ key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://lyimgdrfofmukylbmyqk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_1fI5pDIatGsHjBPuRfQEkA_4E5WRarG';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,    // it's your phone — stay signed in
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
