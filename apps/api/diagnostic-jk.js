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

async function checkRealStatus() {
    const userId = "d6ea0c4f-8d8c-4dab-af62-ff58e4644d21"; // jk11364 (Google)

    console.log(`\n--- Real-Time Auth DB Check ---`);
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    console.log(`Current DB Profile for ${profile.username}:`);
    console.log(`Tier: ${profile.tier}`);
    console.log(`Updated at: ${profile.updated_at}`);

    // Let's also check if they have multiple profiles under similar names?
    const { data: otherG } = await supabase.auth.admin.listUsers();
    const otherJk = otherG.users.filter(u => u.email === 'jk11364@gmail.com');
    if (otherJk.length > 1) {
        console.log(`WAIT! There are ${otherJk.length} auth.users with the exact same email!`);
        for (const u of otherJk) {
            const { data: p } = await supabase.from('profiles').select('tier, username').eq('id', u.id).single();
            console.log(`- Auth ID: ${u.id} | Profile Username: ${p?.username} | Tier: ${p?.tier}`);
        }
    }
}
checkRealStatus();
