import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase configuration missing! NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/service_role is empty.');
}

// Accessing the database with service role key for admin tasks
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
