// Test Chatterbox voice cloning on Replicate (best quality)
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

async function testChatterbox() {
    const token = process.env.REPLICATE_API_TOKEN;
    console.log('Token:', token ? `${token.substring(0, 10)}...` : 'NOT SET');
    
    // Test with a sample audio URL
    const testSpeakerUrl = 'https://replicate.delivery/pbxt/Jt79w0xsT64R1JsiJ0LQRL8UcWspg5J4RFrU6YwEKpOT1ukS/male.wav';
    const testText = "Bonjour, je suis votre assistant virtuel créé par l'Institut National de l'Eau du Bénin.";
    
    console.log('\nTesting Chatterbox voice cloning...');
    console.log('Text:', testText);
    
    // Use official model endpoint (no version needed)
    const predBody = JSON.stringify({
        input: {
            prompt: testText,
            audio_prompt: testSpeakerUrl,
            exaggeration: 0.3,
            cfg_weight: 0.5
        }
    });
    
    const predRes = await httpsRequest({
        hostname: 'api.replicate.com',
        path: '/v1/models/resemble-ai/chatterbox/predictions',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'wait',  // Wait for result
            'Content-Length': Buffer.byteLength(predBody)
        }
    }, predBody);
    
    console.log('\nPrediction status:', predRes.status);
    console.log('Response:', JSON.stringify(predRes.data, null, 2));
    
    if (predRes.data.id && predRes.data.status !== 'succeeded') {
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
}

testChatterbox();
