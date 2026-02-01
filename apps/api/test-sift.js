const http = require('http');

async function testSift() {
    const data = JSON.stringify({
        url: "https://www.tiktok.com/@chefdwightsmith/video/7441702407073090871?is_from_webapp=1&sender_device=pc&web_id=7577296591753823775",
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
            console.log('Response:', body);
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
