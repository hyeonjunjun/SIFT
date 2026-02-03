const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTotalRecent() {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - (10 * 60 * 1000)).toISOString();

    const { data: pages, error } = await supabase
        .from('pages')
        .select('*')
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching pages:', error);
        return;
    }

    console.log(`Checking TOTAL sifts in the last 10 minutes: ${pages.length} found.`);
    pages.forEach((page, i) => {
        console.log(`\n${i + 1}. [${page.created_at}] User: ${page.user_id} Status: ${page.metadata?.status}`);
        console.log(`URL: ${page.url}`);
        console.log(`Title: ${page.title}`);
    });
}

checkTotalRecent();
