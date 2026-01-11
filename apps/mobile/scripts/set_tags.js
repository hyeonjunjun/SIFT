const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '../../api/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
const serviceKey = keyMatch ? keyMatch[1].trim() : null;

if (!serviceKey) {
    console.error("Could not find Service Key in .env.local");
    process.exit(1);
}

const supabaseUrl = 'https://twgfzcjqqhabnuqsyhvp.supabase.co';
const supabase = createClient(supabaseUrl, serviceKey);

const updates = [
    {
        id: '42c20e1c-5b1a-49a3-850b-d98b3f1bb59b',
        tags: ['Cooking']
    },
    {
        id: 'fe78da40-1a65-48b5-bdb3-99c0e5b528b0',
        tags: ['Baking']
    },
    {
        id: '231dc42c-3130-4b00-98a1-5439a02446eb',
        tags: ['Baking']
    }
];

async function run() {
    console.log("Updating tags...");
    for (const update of updates) {
        const { error } = await supabase
            .from('pages')
            .update({ tags: update.tags })
            .eq('id', update.id);

        if (error) console.error(`Failed to update ${update.id}:`, error);
        else console.log(`Updated ${update.id} to ${update.tags.join(', ')}`);
    }
}

run();
