const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function findActiveUser() {
    console.log(`\n--- Finding most recent active user ---`);
    const { data, error } = await supabase
        .from('pages')
        .select('user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) {
        console.error('Error:', error);
        return;
    }

    const userId = data[0].user_id;
    console.log(`Recent User ID: ${userId}`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    console.log('Profile Info:', profile);
}

findActiveUser();
