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

async function checkSifts() {
    const userId = "96abac6c-000c-4b62-a87c-2d87c062a27c";
    console.log(`Checking sifts for user: ${userId}`);

    const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Error:', error);
        return;
    }

    data.forEach((page, i) => {
        console.log(`\n--- SIFT ${i + 1}: ${page.title} ---`);
        console.log(`ID: ${page.id}`);
        console.log(`URL: ${page.url}`);
        console.log(`Content Length: ${page.content?.length || 0}`);
        console.log(`Summary Preview: ${page.summary?.substring(0, 100)}...`);
        console.log(`Debug Info: ${page.metadata?.debug_info}`);
        console.log(`Smart Data:`, JSON.stringify(page.metadata?.smart_data, null, 2));
        console.log(`FULL SUMMARY:\n${page.summary}`);
    });
}

checkSifts();
