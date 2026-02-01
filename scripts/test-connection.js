
const config = require('../apps/mobile/app.json');
const fetch = require('node-fetch'); // Assumes node environment

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sift-rho.vercel.app';

console.log(`Testing connection to: ${API_URL}`);

async function testConnection() {
    try {
        console.log('1. Pinging Root...');
        const rootRes = await fetch(`${API_URL}/`);
        console.log(`   Status: ${rootRes.status}`);

        console.log('2. Pinging Health Check (Sift API)...');
        // Trying a known endpoint, e.g. /api/sift with a GET which might return 405 or 400, but proves connectivity
        const apiRes = await fetch(`${API_URL}/api/sift`, { method: 'POST', body: '{}' });
        console.log(`   Status: ${apiRes.status}`);

        if (rootRes.ok || apiRes.status !== 404) {
            console.log('✅ Connection SUCCESSFUL.');
            console.log('Note: If status is 405/400 that is GOOD (it means the server exist and replied).');
            console.log('      If status is 500, server is crashing.');
            console.log('      If status is 404, endpoint is wrong.');
        } else {
            console.log('❌ Connection FAILED.');
        }

    } catch (error) {
        console.error('❌ Network Error:', error.message);
        if (error.cause) console.error('   Cause:', error.cause);
    }
}

testConnection();
