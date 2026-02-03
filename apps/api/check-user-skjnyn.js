const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserRecentSifts() {
    const userId = '28f2322e-4846-46d7-858e-039388035193'; // skjnyn
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000)).toISOString();

    const { data: pages, error } = await supabase
        .from('pages')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching pages:', error);
        return;
    }

    console.log(`Checking sifts for user ${userId} (skjnyn) in the last hour: ${pages.length} found.`);
    pages.forEach((page, i) => {
        console.log(`\n${i + 1}. [${page.created_at}] Status: ${page.metadata?.status}`);
        console.log(`URL: ${page.url}`);
        console.log(`Title: ${page.title}`);
        console.log(`Summary: ${page.summary?.substring(0, 50)}...`);
        console.log(`Debug: ${page.metadata?.debug_info}`);
    });
}

checkUserRecentSifts();
