// Test Tortoise-TTS voice cloning on Replicate
require('dotenv').config({ path: '.env.local' });
const https = require('https');

function httpsRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function testTortoise() {
    const token = process.env.REPLICATE_API_TOKEN;
    console.log('Token:', token ? `${token.substring(0, 10)}...` : 'NOT SET');
    
    // Get model info first
    const modelRes = await httpsRequest({
        hostname: 'api.replicate.com',
        path: '/v1/models/afiaka87/tortoise-tts',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Model info:', modelRes.status);
    if (modelRes.status === 200) {
        console.log('Latest version:', modelRes.data.latest_version?.id);
    }
    
    // Get versions
    const versionRes = await httpsRequest({
        hostname: 'api.replicate.com',
        path: '/v1/models/afiaka87/tortoise-tts/versions',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (versionRes.status === 200 && versionRes.data.results?.length > 0) {
        const version = versionRes.data.results[0];
        console.log('\nVersion:', version.id);
        console.log('Input schema:', JSON.stringify(version.openapi_schema?.components?.schemas?.Input?.properties, null, 2));
    }
}

testTortoise();
