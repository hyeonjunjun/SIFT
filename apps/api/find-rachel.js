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

async function findRachel() {
    console.log(`\n--- Searching for Rachel ---`);

    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, tier')
        .ilike('username', '%rachel%');

    const { data: users2, error: err2 } = await supabase
        .from('profiles')
        .select('id, username, display_name, tier')
        .ilike('display_name', '%rachel%');

    const allMatches = [...(users || []), ...(users2 || [])];

    // De-dupe
    const uniqueMatches = Array.from(new Set(allMatches.map(u => u.id)))
        .map(id => allMatches.find(u => u.id === id));

    if (uniqueMatches.length === 0) {
        console.log("No users found containing 'rachel' in username or display name.");
        return;
    }

    for (const user of uniqueMatches) {
        console.log(`Found Match: [Username: ${user.username}] [Display: ${user.display_name}] [Tier: ${user.tier}]`);
        if (user.tier !== 'unlimited') {
            console.log(`--> Updating ${user.username} to unlimited...`);
            await supabase.from('profiles').update({ tier: 'unlimited' }).eq('id', user.id);
            console.log(`--> Successfully updated ${user.username} to unlimited!`);
        } else {
            console.log(`--> ${user.username} is already unlimited!`);
        }
    }
}

findRachel();
