// Test OpenVoice v2 on Replicate
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

async function testOpenVoiceV2() {
    const token = process.env.REPLICATE_API_TOKEN;
    console.log('Token:', token ? `${token.substring(0, 10)}...` : 'NOT SET');
    
    // Get model info
    const modelRes = await httpsRequest({
        hostname: 'api.replicate.com',
        path: '/v1/models/chenxwh/openvoice',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Model:', modelRes.data.description);
    
    // Get latest version
    const versionRes = await httpsRequest({
        hostname: 'api.replicate.com',
        path: '/v1/models/chenxwh/openvoice/versions',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (versionRes.status !== 200) {
        console.log('Error getting versions');
        return;
    }
    
    const version = versionRes.data.results[0];
    console.log('\nLatest version:', version.id);
    console.log('Schema:', JSON.stringify(version.openapi_schema?.components?.schemas?.Input?.properties, null, 2));
    
    // Test with sample
    const testSpeakerUrl = 'https://replicate.delivery/pbxt/Jt79w0xsT64R1JsiJ0LQRL8UcWspg5J4RFrU6YwEKpOT1ukS/male.wav';
    const testText = "Bonjour, je suis votre assistant virtuel créé par l'Institut National de l'Eau du Bénin.";
    
    console.log('\nTesting OpenVoice v2...');
    console.log('Text:', testText);
    
    const predBody = JSON.stringify({
        version: version.id,
        input: {
            text: testText,
            audio: testSpeakerUrl,
            language: 'FR',
            speed: 1.0
        }
    });
    
    const predRes = await httpsRequest({
        hostname: 'api.replicate.com',
        path: '/v1/predictions',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(predBody)
        }
    }, predBody);
    
    console.log('\nPrediction status:', predRes.status);
    
    if (predRes.status !== 201) {
        console.log('Error:', predRes.data);
        return;
    }
    
    console.log('Prediction ID:', predRes.data.id);
    console.log('\n⏳ Waiting for result...');
    
    for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        
        const statusRes = await httpsRequest({
            hostname: 'api.replicate.com',
            path: `/v1/predictions/${predRes.data.id}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`Attempt ${i + 1}: ${statusRes.data.status}`);
        
        if (statusRes.data.status === 'succeeded') {
            console.log('\n✅ Success!');
            console.log('Output:', statusRes.data.output);
            break;
        } else if (statusRes.data.status === 'failed') {
            console.log('\n❌ Failed:', statusRes.data.error);
            break;
        }
    }
}

testOpenVoiceV2();
