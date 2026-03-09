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

async function checkAndUpdateTiers() {
    const targetUsernames = ['jk11364', 'rachel'];
    console.log(`\n--- Verifying Tiers for: ${targetUsernames.join(', ')} ---`);

    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, tier')
        .in('username', targetUsernames);

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No users found matching those usernames.");
        return;
    }

    for (const user of users) {
        console.log(`[${user.username}] Current tier: ${user.tier}`);
        if (user.tier !== 'unlimited') {
            console.log(`--> Updating ${user.username} to unlimited...`);
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ tier: 'unlimited' })
                .eq('id', user.id);
            if (updateError) {
                console.error(`Failed to update ${user.username}:`, updateError);
            } else {
                console.log(`--> Successfully updated ${user.username} to unlimited!`);
            }
        } else {
            console.log(`--> ${user.username} is already unlimited!`);
        }
    }
}

checkAndUpdateTiers();
