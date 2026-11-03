import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gvzhgcvfgacshlnuxhen.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_h_4UJgU0s4lF4MG0dOgN1A_kJy4LcOA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
