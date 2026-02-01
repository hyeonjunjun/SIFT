const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('--- SIFT Diagnostic ---');
    console.log('URL:', supabaseUrl);

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    if (users.length === 0) {
        console.log('No users found in auth.users');
        return;
    }

    const user = users[0];
    console.log('Found test user:', user.email, '(', user.id, ')');

    // Check profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) {
        console.log('Profile found:', JSON.stringify(profile));
    } else {
        console.log('Profile MISSING for user');
    }

    process.exit(0);
}

run();
