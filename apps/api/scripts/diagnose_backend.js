
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL = 'https://sift-8azyad04z-ryan-juns-projects.vercel.app';
const TEST_USER_ID = '3cb3c34';

async function runDiagnostics() {
    console.log(`--- SIFT BACKEND DIAGNOSTICS ---`);
    console.log(`Target API: ${API_URL}`);

    // 1. Test GET Archive (Connectivity check)
    console.log(`\n1. Testing GET /api/archive?user_id=${TEST_USER_ID}...`);
    try {
        const res = await fetch(`${API_URL}/api/archive?user_id=${TEST_USER_ID}`);
        console.log(`Status: ${res.status}`);
        const data = await res.json();
        console.log(`Result: ${Array.isArray(data) ? `Found ${data.length} archived items` : JSON.stringify(data)}`);
    } catch (e) {
        console.error(`Fetch failed: ${e.message}`);
    }

    // 2. Test Mock Sift (Connectivity check)
    // Note: This won't actually "Sift" because we don't have a real URL provided here that won't trigger scraping
    // But we can check if the endpoint is alive at least.
}

runDiagnostics();
