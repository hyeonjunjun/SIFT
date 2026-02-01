const { ApifyClient } = require('apify-client');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
});

const apifyToken = env.APIFY_API_TOKEN || env.apify;

if (!apifyToken) {
    console.error("Missing Apify token in .env.local");
    process.exit(1);
}

const client = new ApifyClient({ token: apifyToken });

async function testApify() {
    console.log("Testing Apify connection...");
    try {
        const actorId = 'apify/website-content-crawler';
        const input = { "startUrls": [{ "url": "https://example.com" }], "maxCrawlDepth": 0 };

        console.log(`Starting actor ${actorId}...`);
        const run = await client.actor(actorId).call(input);

        console.log(`Run started successfully! ID: ${run.id}, Status: ${run.status}`);

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log(`Items found: ${items.length}`);
        if (items.length > 0) {
            console.log(`First item title: ${items[0].metadata?.title || items[0].title}`);
        }
    } catch (error) {
        console.error("Apify Test Failed:", error.message);
    }
}

testApify();
