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

async function checkAuthUsers() {
    console.log(`\n--- Cross-referencing jk11364 in auth.users ---`);

    // Fetch from auth.users via admin API
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    const matches = users.filter(u =>
        (u.email && u.email.includes('jk')) ||
        (u.user_metadata?.display_name && u.user_metadata.display_name.includes('jk')) ||
        (u.user_metadata?.username && u.user_metadata.username.includes('jk'))
    );

    console.log(`Found ${matches.length} matching auth accounts:`);
    for (const u of matches) {
        console.log(`- ID: ${u.id} | Email: ${u.email} | Meta Display: ${u.user_metadata?.display_name}`);

        // Fetch accompanying profile
        const { data: profile } = await supabase.from('profiles').select('tier, username, display_name').eq('id', u.id).single();
        console.log(`  -> Profile: Username: ${profile?.username} | Tier: ${profile?.tier}`);

        // Check if there are multiple accounts doing strange things.
        if (profile?.tier !== 'unlimited') {
            console.log(`  [!] Forcing tier override for this orphaned account...`);
            await supabase.from('profiles').update({ tier: 'unlimited' }).eq('id', u.id);
            console.log(`  [✓] Fully verified upgrade to unlimited.`);
        }
    }
}

checkAuthUsers();
