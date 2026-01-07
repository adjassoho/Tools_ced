// Test F5-TTS voice cloning on Replicate
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

async function testF5TTS() {
    const token = process.env.REPLICATE_API_TOKEN;
    console.log('Token:', token ? `${token.substring(0, 10)}...` : 'NOT SET');
    
    // Test avec un audio sample de demo (voix masculine)
    const testSpeakerUrl = 'https://replicate.delivery/pbxt/Jt79w0xsT64R1JsiJ0LQRL8UcWspg5J4RFrU6YwEKpOT1ukS/male.wav';
    const testText = "Bonjour, je suis votre assistant virtuel créé par l'Institut National de l'Eau du Bénin.";
    
    console.log('\nTesting F5-TTS voice cloning...');
    console.log('Text:', testText);
    
    const version = '87faf6dd7a692dd82043f662e76369cab126a2cf1937e25a9d41e0b834fd230e';
    
    const predBody = JSON.stringify({
        version: version,
        input: {
            gen_text: testText,
            ref_audio: testSpeakerUrl,
            ref_text: "",  // Laisser vide pour auto-transcription
            model: "F5-TTS",
            remove_silence: true
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
        for (let i = 0; i < 60; i++) {
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

testF5TTS();
