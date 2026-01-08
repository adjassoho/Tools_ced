// Search for French voice cloning models on Replicate
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

async function searchModels() {
    const token = process.env.REPLICATE_API_TOKEN;
    
    const models = [
        'resemble-ai/chatterbox-multilingual',
        'resemble-ai/chatterbox',
        'lucataco/xtts-v2',
        'cjwbw/parler-tts',
        'suno-ai/bark',
        'myshell-ai/openvoice-v2',
        'lucataco/parler-tts-mini-v1',
        'lucataco/f5-tts'
    ];
    
    console.log('Checking voice models on Replicate...\n');
    
    for (const model of models) {
        const res = await httpsRequest({
            hostname: 'api.replicate.com',
            path: `/v1/models/${model}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });
        
        if (res.status === 200) {
            console.log(`✅ ${model}`);
            console.log(`   ${res.data.description?.substring(0, 80)}...`);
            console.log(`   Runs: ${res.data.run_count || 'N/A'}`);
            console.log('');
        } else {
            console.log(`❌ ${model} - Not found`);
        }
    }
}

searchModels();
