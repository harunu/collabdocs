import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('[Supabase] WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — Supabase calls will fail');
}

export const supabaseAdmin = createClient(supabaseUrl || 'http://localhost', supabaseServiceRoleKey || 'placeholder', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
