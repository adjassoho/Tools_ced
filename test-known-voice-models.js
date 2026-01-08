// Check known voice cloning models on Replicate
require('dotenv').config({ path: '.env.local' });
const https = require('https');

function httpsRequest(options) {
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
        req.end();
    });
}

async function checkModels() {
    const token = process.env.REPLICATE_API_TOKEN;
    
    const models = [
        'lucataco/xtts-v2',
        'resemble-ai/chatterbox',
        'afiaka87/tortoise-tts',
        'suno-ai/bark',
        'zsxkib/realistic-voice-cloning',
        'cjwbw/openvoice',
        'lucataco/openvoice-v2',
        'myshell-ai/openvoice-v2',
        'chenxwh/openvoice',
        'lucataco/parler-tts',
        'cjwbw/parler-tts'
    ];
    
    console.log('Checking voice models on Replicate...\n');
    
    for (const model of models) {
        const res = await httpsRequest({
            hostname: 'api.replicate.com',
            path: `/v1/models/${model}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 200) {
            console.log(`✅ ${model}`);
            console.log(`   ${res.data.description?.substring(0, 80) || 'No description'}...`);
            console.log(`   Runs: ${res.data.run_count || 'N/A'}`);
        } else {
            console.log(`❌ ${model} - Not found`);
        }
    }
}

checkModels();
