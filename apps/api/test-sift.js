const http = require('http');

async function testSift() {
    const data = JSON.stringify({
        url: "https://www.tiktok.com/t/ZP8mt5kHa/",
        user_id: "96abac6c-000c-4b62-a87c-2d87c062a27c",
        user_tier: "admin"
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/sift',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    console.log(`Sending SIFT request to http://localhost:3000/api/sift...`);

    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(body);
                console.log('Response Summary Length:', json.data?.summary?.length);
                console.log('--- FULL SUMMARY ---\n', json.data?.summary);
                console.log('--- END SUMMARY ---');
                console.log('Debug Info:', json.data?.metadata?.debug_info);
            } catch (e) {
                console.log('Response (Non-JSON):', body);
            }
            process.exit(0);
        });
    });

    req.on('error', (error) => {
        console.error('Request Error:', error.message);
        process.exit(1);
    });

    req.write(data);
    req.end();
}

testSift();
