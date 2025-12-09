const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env.local to get Client ID and Secret
const envPath = path.resolve(__dirname, '../.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.error('Error: Could not find .env.local file at', envPath);
    process.exit(1);
}

// Improved env parser
const parseEnv = (key) => {
    // Look for Key=Value or Key="Value" or Key='Value'
    // Handles multi-line or tricky spacing reasonably well for a simple parser
    const regex = new RegExp(`^${key}\\s*=\\s*(["']?)(.*?)\\1\\s*$`, 'm');
    const match = envContent.match(regex);
    if (match) {
        return match[2].trim();
    }
    return null;
};

const CLIENT_ID = parseEnv('ZOHO_CLIENT_ID');
const CLIENT_SECRET = parseEnv('ZOHO_CLIENT_SECRET');
const DC = parseEnv('ZOHO_DC') || 'com';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Error: ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET not found in .env.local');
    process.exit(1);
}

const code = process.argv[2];
if (!code) {
    console.log('\nUsage: node scripts/exchange_token.js <YOUR_AUTH_CODE>');
    process.exit(1);
}

const DATA_CENTER_URLS = {
    'com': 'accounts.zoho.com',
    'eu': 'accounts.zoho.eu',
    'in': 'accounts.zoho.in',
    'ae': 'accounts.zoho.ae',
    'com.au': 'accounts.zoho.com.au',
    'com.cn': 'accounts.zoho.com.cn',
};

const hostname = DATA_CENTER_URLS[DC] || DATA_CENTER_URLS['com'];

// Use URLSearchParams to ensure everything is properly encoded
const queryParams = new URLSearchParams({
    code: code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code'
}).toString();

const options = {
    hostname: hostname,
    path: `/oauth/v2/token?${queryParams}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
};

console.log(`\nExchanging code with Zoho (${hostname})...`);

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error('\n❌ Error from Zoho:', json.error);
                return;
            }

            if (json.refresh_token) {
                console.log('\n✅ SUCCESS! Here is your new Refresh Token:');
                console.log('\n' + json.refresh_token + '\n');
                console.log('👉 Copy this value and update ZOHO_REFRESH_TOKEN in your .env.local file.');
            } else {
                console.log('\n⚠️  No refresh token returned. Did you already use this code?');
                console.log('Full response:', json);
            }
        } catch (e) {
            console.error('Error parsing response:', e);
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Request error:', e);
});

req.end();
