// Test Fish Audio voice cloning
require('dotenv').config({ path: '.env.local' });
const https = require('https');
const fs = require('fs');

function httpsRequest(options, body = null, isFormData = false) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const contentType = res.headers['content-type'] || '';
                
                if (contentType.includes('audio') || contentType.includes('octet-stream')) {
                    resolve({ status: res.statusCode, data: buffer, isAudio: true });
                } else {
                    try {
                        resolve({ status: res.statusCode, data: JSON.parse(buffer.toString()) });
                    } catch {
                        resolve({ status: res.statusCode, data: buffer.toString() });
                    }
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function testFishAudio() {
    const apiKey = process.env.FISH_AUDIO_API_KEY;
    console.log('Fish Audio API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
    
    if (!apiKey) {
        console.log('❌ FISH_AUDIO_API_KEY not configured');
        return;
    }
    
    // Test 1: List available voices
    console.log('\n1. Listing available voices...');
    const listRes = await httpsRequest({
        hostname: 'api.fish.audio',
        path: '/model',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        }
    });
    
    console.log('List status:', listRes.status);
    if (listRes.status === 200 && listRes.data.items) {
        console.log('Available voices:', listRes.data.items.length);
        listRes.data.items.slice(0, 3).forEach(v => {
            console.log(`  - ${v.title} (${v._id})`);
        });
    } else {
        console.log('Response:', JSON.stringify(listRes.data, null, 2));
    }
    
    // Test 2: Generate speech with a default voice
    console.log('\n2. Testing TTS with default voice...');
    
    const ttsBody = JSON.stringify({
        text: "Bonjour, je suis votre assistant virtuel créé par l'Institut National de l'Eau du Bénin.",
        reference_id: "7f92f8afb8ec43bf81429cc1c9199cb1", // Default French voice
        format: "mp3"
    });
    
    const ttsRes = await httpsRequest({
        hostname: 'api.fish.audio',
        path: '/v1/tts',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(ttsBody)
        }
    }, ttsBody);
    
    console.log('TTS status:', ttsRes.status);
    
    if (ttsRes.isAudio) {
        fs.writeFileSync('test-fish-output.mp3', ttsRes.data);
        console.log('✅ Audio saved to test-fish-output.mp3');
        console.log('Audio size:', ttsRes.data.length, 'bytes');
    } else {
        console.log('Response:', JSON.stringify(ttsRes.data, null, 2));
    }
}

testFishAudio();
