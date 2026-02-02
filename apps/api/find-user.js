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

async function findUser() {
    console.log(`\n--- Searching for rykjun ---`);
    const { data: p1, error: e1 } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', '%rykjun%');
    console.log('Search rykjun:', p1, e1);

    const { data: p2, error: e2 } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', '%ryanjun%');
    console.log('Search ryanjun:', p2, e2);
}

findUser();
