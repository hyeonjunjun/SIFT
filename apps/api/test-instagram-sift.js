const http = require('https');

async function testInstagramSift() {
    const data = JSON.stringify({
        url: "https://www.instagram.com/reel/DRGcXwWCkad/?igsh=MTg2ZGJpc2F6Y3FybQ==",
        user_id: "96abac6c-000c-4b62-a87c-2d87c062a27c",
        user_tier: "admin"
    });

    const options = {
        hostname: 'sift-rho.vercel.app',
        port: 443,
        path: '/api/sift',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    console.log('Sending SIFT request to production for INSTAGRAM: https://www.instagram.com/reel/DRGcXwWCkad/...');
    const startTime = Date.now();

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            const duration = (Date.now() - startTime) / 1000;
            console.log(`\nStatus: ${res.statusCode} (Duration: ${duration}s)`);
            try {
                const json = JSON.parse(body);
                console.log('Response Title:', json.data?.title);
                console.log('Response Summary Length:', json.data?.summary?.length);
                console.log('Debug Info:', json.data?.metadata?.debug_info);
            } catch (e) {
                console.log('Response (Non-JSON):', body);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Request Error:', error);
    });

    req.write(data);
    req.end();
}

testInstagramSift();
