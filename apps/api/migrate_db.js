require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// To execute raw DDL (data definition language) like ALTER TABLE we need to use a Postgres client (pg)
// Or use the Supabase RPC if one exists. Since we don't have direct DB credentials mapped in the repo, 
// and the REST API doesn't support raw SQL by default, we will first check if the columns exist using REST.
// If they don't, we'll try to insert a dummy record to see the error, and if we absolutely must, 
// we'll instruct the user to run it in the SQL editor, which is standard practice for Supabase.

async function checkAndMigrate() {
    console.log("Checking Supabase 'profiles' table for missing columns...");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.error("Missing SUPABASE credentials in .env.local");
        return;
    }

    const supabase = createClient(url, key);

    // Test if 'tier' exists by selecting it
    const { data: tierData, error: tierError } = await supabase
        .from('profiles')
        .select('tier')
        .limit(1);

    if (tierError && tierError.message.includes('Could not find the \'tier\' column')) {
        console.log("❌ 'tier' column is MISSING from profiles table.");
    } else {
        console.log("✅ 'tier' column exists.");
    }

    const { data: pushData, error: pushError } = await supabase
        .from('profiles')
        .select('push_token')
        .limit(1);

    if (pushError && pushError.message.includes('Could not find the \'push_token\' column')) {
        console.log("❌ 'push_token' column is MISSING from profiles table.");
    } else {
        console.log("✅ 'push_token' column exists.");
    }

    if ((tierError && tierError.message.includes('tier')) || (pushError && pushError.message.includes('push_token'))) {
        console.log("\n=======================================================");
        console.log("⚠️ MANUAL SQL MIGRATION REQUIRED ⚠️");
        console.log("Please run the following SQL in your Supabase Dashboard:");
        console.log("=======================================================\n");
        console.log(`
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS push_token text,
ADD COLUMN IF NOT EXISTS push_token_updated_at timestamptz;
        `);
        console.log("\n=======================================================\n");
    } else {
        console.log("All necessary columns reflect in the database schema.");
    }
}

checkAndMigrate();
