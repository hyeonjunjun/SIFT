const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser(userId) {
    console.log(`Checking profile for user: ${userId}`);
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (pError) {
        console.error("Error fetching profile:", pError.message);
    } else {
        console.log("Profile Tier:", profile.tier);
    }

    const { count, error: cError } = await supabase
        .from('pages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (cError) {
        console.error("Error counting pages:", cError.message);
    } else {
        console.log("Total Sifts:", count);
    }
}

const targetUserId = "96abac6c-000c-4b62-a87c-2d87c062a27c";
checkUser(targetUserId);
