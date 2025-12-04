const https = require('https');

const apiKey = 'f5U4junq6_hpyCYgcXu8ng';
const data = JSON.stringify({
    q_organization_domains: "google.com",
    person_titles: ["Manager"],
    per_page: 5
});

const options = {
    hostname: 'api.apollo.io',
    path: '/v1/mixed_people/search',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
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

req.write(data);
req.end();
