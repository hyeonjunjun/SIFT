const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function upgradeUser(email) {
    console.log(`Searching for user with email: ${email}...`);

    // In Supabase, we usually find the user in auth.users, but we can't query that directly easily with the client
    // unless we use the admin auth API. Better to search the 'profiles' table which should exist.

    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, display_name, tier')
        .or(`id.eq.${email},display_name.eq.${email}`); // Fallback if ID is used

    // Since we don't have email in profiles usually, let's try to find it via a custom query or just assume the ID if provided.
    // Wait, I saw the ID '96abac6c-000c-4b62-a87c-2d87c062a27c' earlier for 'ryanjun@gmail.com'.
    // Let's try to find any profile and update them if they match a search.

    // Actually, often the 'profiles' table has an 'email' column if synced, or we can use the 'admin' auth API to get user by email.
    const { data: userAuth, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error("Error listing users:", authError.message);
        return;
    }

    const targetUser = userAuth.users.find(u => u.email === email || u.email === 'ryanjun@gmail.com');

    if (!targetUser) {
        console.error(`User with email ${email} not found.`);
        return;
    }

    console.log(`Found user: ${targetUser.id} (${targetUser.email})`);
    console.log(`Updating tier to 'admin' in profiles table...`);

    const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ tier: 'admin' })
        .eq('id', targetUser.id)
        .select();

    if (updateError) {
        console.error("Error updating profile:", updateError.message);
    } else {
        console.log("Success! Updated profile:", updateData);
    }
}

const targetEmail = process.argv[2] || 'rykjun@gmail.com';
upgradeUser(targetEmail);
