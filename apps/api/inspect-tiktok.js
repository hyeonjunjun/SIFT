const { ApifyClient } = require('apify-client');
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

const apifyToken = env.APIFY_API_TOKEN;
const client = new ApifyClient({ token: apifyToken });

async function inspectTikTokData() {
    const url = "https://www.tiktok.com/t/ZP8mt5kHa/";
    console.log(`Inspecting TikTok raw data for: ${url}`);
    try {
        const actorId = 'clockworks/tiktok-scraper';
        const input = { "postURLs": [url], "resultsPerPage": 1 };

        const run = await client.actor(actorId).call(input, { memory: 2048 });
        console.log(`Run ${run.id} finished.`);

        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (!items || items.length === 0) {
            console.log("NO ITEMS RETURNED");
            return;
        }

        const rawItem = items[0];
        console.log("\n--- FULL ITEM JSON ---");
        console.log(JSON.stringify(rawItem, null, 2));

    } catch (error) {
        console.error("Inspection Failed:", error.message);
    }
}

inspectTikTokData();
