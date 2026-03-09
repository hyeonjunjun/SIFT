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

async function findJK() {
    console.log(`\n--- Deep searching for jk11364 ---`);

    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, tier, updated_at')
        .ilike('username', '%jk%');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No users found containing 'jk'.");
        return;
    }

    console.log(`Found ${users.length} matching profiles:`);
    for (const user of users) {
        console.log(`- ID: ${user.id} | Username: "${user.username}" | Display: "${user.display_name}" | Tier: ${user.tier}`);

        if (user.username && user.username.includes('11364')) {
            console.log(`  [Match!] Updating to unlimited...`);
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ tier: 'unlimited' })
                .eq('id', user.id);

            if (updateError) {
                console.error(`  [!] Failed to update:`, updateError);
            } else {
                console.log(`  [✓] Fully verified upgrade to unlimited.`);

                // Confirm it actually saved
                const { data: confirm } = await supabase.from('profiles').select('tier').eq('id', user.id).single();
                console.log(`  [✓] DB Confirmation: Tier is now exactly "${confirm.tier}"`);
            }
        }
    }
}

findJK();
