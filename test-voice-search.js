// Search for voice cloning models on Replicate
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
    
    // Chercher des modèles de voice cloning
    const queries = ['voice clone', 'tts', 'text to speech'];
    
    for (const query of queries) {
        console.log(`\nSearching: "${query}"...`);
        const res = await httpsRequest({
            hostname: 'api.replicate.com',
            path: `/v1/models?query=${encodeURIComponent(query)}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 200 && res.data.results) {
            res.data.results.slice(0, 5).forEach(m => {
                console.log(`  - ${m.owner}/${m.name}`);
                console.log(`    ${m.description?.substring(0, 100) || 'No description'}...`);
            });
        }
    }
}

searchModels();
