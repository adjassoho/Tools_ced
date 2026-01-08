// Test ElevenLabs voice cloning
require('dotenv').config({ path: '.env.local' });
const https = require('https');
const fs = require('fs');

function httpsRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const contentType = res.headers['content-type'] || '';
                
                if (contentType.includes('audio') || contentType.includes('mpeg')) {
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

async function testElevenLabs() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    console.log('ElevenLabs API Key:', apiKey ? `${apiKey.substring(0, 15)}...` : 'NOT SET');
    
    if (!apiKey) {
        console.log('❌ ELEVENLABS_API_KEY not configured');
        return;
    }
    
    // Test 1: Check subscription/quota
    console.log('\n1. Checking subscription...');
    const subRes = await httpsRequest({
        hostname: 'api.elevenlabs.io',
        path: '/v1/user/subscription',
        method: 'GET',
        headers: {
            'xi-api-key': apiKey,
        }
    });
    
    console.log('Subscription status:', subRes.status);
    if (subRes.status === 200) {
        console.log('Tier:', subRes.data.tier);
        console.log('Character count:', subRes.data.character_count, '/', subRes.data.character_limit);
        console.log('Can use instant voice cloning:', subRes.data.can_use_instant_voice_cloning);
    } else {
        console.log('Response:', JSON.stringify(subRes.data, null, 2));
        return;
    }
    
    // Test 2: List available voices
    console.log('\n2. Listing voices...');
    const voicesRes = await httpsRequest({
        hostname: 'api.elevenlabs.io',
        path: '/v1/voices',
        method: 'GET',
        headers: {
            'xi-api-key': apiKey,
        }
    });
    
    console.log('Voices status:', voicesRes.status);
    if (voicesRes.status === 200) {
        console.log('Available voices:', voicesRes.data.voices?.length || 0);
        voicesRes.data.voices?.slice(0, 5).forEach(v => {
            console.log(`  - ${v.name} (${v.voice_id}) - ${v.labels?.accent || 'N/A'}`);
        });
    }
    
    // Test 3: Generate speech with a French voice
    console.log('\n3. Testing TTS...');
    
    // Find a French voice or use default
    const frenchVoice = voicesRes.data.voices?.find(v => 
        v.labels?.accent === 'french' || v.name.toLowerCase().includes('french')
    );
    const voiceId = frenchVoice?.voice_id || 'EXAVITQu4vr4xnSDxMaL'; // Default: Sarah
    
    console.log('Using voice:', frenchVoice?.name || 'Sarah (default)');
    
    const ttsBody = JSON.stringify({
        text: "Bonjour, je suis votre assistant virtuel créé par l'Institut National de l'Eau.",
        model_id: "eleven_multilingual_v2",
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
        }
    });
    
    const ttsRes = await httpsRequest({
        hostname: 'api.elevenlabs.io',
        path: `/v1/text-to-speech/${voiceId}`,
        method: 'POST',
        headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(ttsBody)
        }
    }, ttsBody);
    
    console.log('TTS status:', ttsRes.status);
    
    if (ttsRes.isAudio) {
        fs.writeFileSync('test-elevenlabs-output.mp3', ttsRes.data);
        console.log('✅ Audio saved to test-elevenlabs-output.mp3');
        console.log('Audio size:', ttsRes.data.length, 'bytes');
    } else {
        console.log('Response:', JSON.stringify(ttsRes.data, null, 2));
    }
}

testElevenLabs();
