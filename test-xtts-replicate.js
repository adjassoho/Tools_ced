// Test XTTS-v2 voice cloning on Replicate
require('dotenv').config({ path: '.env.local' });
const https = require('https');
const fs = require('fs');

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

async function testXTTS() {
    const token = process.env.REPLICATE_API_TOKEN;
    console.log('Token:', token ? `${token.substring(0, 10)}...` : 'NOT SET');
    
    if (!token) {
        console.log('❌ REPLICATE_API_TOKEN not configured');
        return;
    }
    
    // Test avec un audio sample de demo
    const testSpeakerUrl = 'https://replicate.delivery/pbxt/Jt79w0xsT64R1JsiJ0LQRL8UcWspg5J4RFrU6YwEKpOT1ukS/male.wav';
    const testText = "Bonjour, je suis votre assistant virtuel créé par l'Institut National de l'Eau.";
    
    console.log('\nTesting XTTS-v2 voice cloning...');
    console.log('Text:', testText);
    
    const body = JSON.stringify({
        version: 'b3eb0c4f4a8f615a3aee26f3c9e8f7d9c0a7e8f9d0b1c2d3e4f5a6b7c8d9e0f1',
        input: {
            text: testText,
            speaker: testSpeakerUrl,
            language: 'fr'
        }
    });
    
    // D'abord, récupérons la dernière version du modèle
    const versionRes = await httpsRequest({
        hostname: 'api.replicate.com',
        path: '/v1/models/lucataco/xtts-v2/versions',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
    
    console.log('Versions status:', versionRes.status);
    
    if (versionRes.status === 200 && versionRes.data.results?.length > 0) {
        const latestVersion = versionRes.data.results[0].id;
        console.log('Latest version:', latestVersion);
        
        // Créer la prédiction
        const predBody = JSON.stringify({
            version: latestVersion,
            input: {
                text: testText,
                speaker: testSpeakerUrl,
                language: 'fr'
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
        console.log('Response:', JSON.stringify(predRes.data, null, 2));
        
        if (predRes.data.id) {
            console.log('\n⏳ Waiting for result...');
            
            // Poll for result
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 2000));
                
                const statusRes = await httpsRequest({
                    hostname: 'api.replicate.com',
                    path: `/v1/predictions/${predRes.data.id}`,
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
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
}

testXTTS();
