// Test OpenVoice on Replicate
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

async function testOpenVoice() {
    const token = process.env.REPLICATE_API_TOKEN;
    console.log('Token:', token ? `${token.substring(0, 10)}...` : 'NOT SET');
    
    // D'abord, vérifions si le modèle existe
    console.log('\nChecking myshell-ai/openvoice model...');
    
    const modelRes = await httpsRequest({
        hostname: 'api.replicate.com',
        path: '/v1/models/myshell-ai/openvoice',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Model status:', modelRes.status);
    
    if (modelRes.status === 200) {
        console.log('Model found!');
        console.log('Description:', modelRes.data.description);
        console.log('Latest version:', modelRes.data.latest_version?.id);
        
        // Essayons de créer une prédiction
        const testSpeakerUrl = 'https://replicate.delivery/pbxt/Jt79w0xsT64R1JsiJ0LQRL8UcWspg5J4RFrU6YwEKpOT1ukS/male.wav';
        const testText = "Bonjour, je suis votre assistant virtuel créé par l'Institut National de l'Eau du Bénin.";
        
        console.log('\nTesting OpenVoice...');
        console.log('Text:', testText);
        
        // Essayer avec l'endpoint officiel
        const predBody = JSON.stringify({
            input: {
                text: testText,
                audio: testSpeakerUrl,
                language: 'FR'
            }
        });
        
        const predRes = await httpsRequest({
            hostname: 'api.replicate.com',
            path: '/v1/models/myshell-ai/openvoice/predictions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
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
    } else {
        console.log('Model not found or error:', modelRes.data);
        
        // Cherchons d'autres modèles OpenVoice
        console.log('\nSearching for OpenVoice alternatives...');
        const searchRes = await httpsRequest({
            hostname: 'api.replicate.com',
            path: '/v1/models?query=openvoice',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (searchRes.status === 200 && searchRes.data.results) {
            console.log('Found models:');
            searchRes.data.results.forEach(m => {
                console.log(`  - ${m.owner}/${m.name}: ${m.description?.substring(0, 80)}...`);
            });
        }
    }
}

testOpenVoice();
