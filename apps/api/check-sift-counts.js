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

async function checkSiftsCount() {
    const userIds = [
        "96abac6c-000c-4b62-a87c-2d87c062a27c",
        "28f2322e-4846-46d7-858e-039388035193",
        "f45ece94-b19f-4acb-a560-bd22a3796b89",
        "d6ea0c4f-8d8c-4dab-af62-ff58e4644d21",
        "f4940a5f-beb3-47e1-81ee-f945da850dc9"
    ];

    for (const uid of userIds) {
        const { count, error } = await supabase
            .from('pages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', uid);

        console.log(`User ID: ${uid} | Sifts: ${count} | Error: ${error ? error.message : 'none'}`);
    }
}

checkSiftsCount();
