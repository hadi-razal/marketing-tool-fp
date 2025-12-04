const https = require('https');

const apiKey = 'f5U4junq6_hpyCYgcXu8ng';

const options = {
    hostname: 'api.apollo.io',
    path: '/v1/auth/health',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey
    }
};

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let responseBody = '';

    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        console.log('Response Body:', responseBody);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.end();
