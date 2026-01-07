// Test SadTalker on Replicate using https module
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

async function testSadTalker() {
    const token = process.env.REPLICATE_API_TOKEN;
    console.log('Token:', token ? `${token.substring(0, 10)}...` : 'NOT SET');
    
    if (!token) {
        console.log('❌ REPLICATE_API_TOKEN not configured');
        return;
    }
    
    // D'abord, vérifions le solde du compte
    console.log('\nChecking account...');
    
    try {
        const accountRes = await httpsRequest({
            hostname: 'api.replicate.com',
            path: '/v1/account',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });
        
        console.log('Account status:', accountRes.status);
        console.log('Account:', JSON.stringify(accountRes.data, null, 2));
        
        if (accountRes.status !== 200) {
            console.log('❌ Account check failed');
            return;
        }
        
        // Test avec une image et audio de demo
        const testImageUrl = 'https://replicate.delivery/pbxt/IJEPmgAlL4MoL5dTnhMJsHKZ9l1NjlCYnJjANPvbfxLBhXQE/art_0.png';
        const testAudioUrl = 'https://replicate.delivery/pbxt/IJEPmgBrKprJctl0IroRzXJseBlesfOyGJMhGBMjdIOLYCHQ/deyu.wav';
        
        console.log('\nTesting SadTalker model...');
        
        const body = JSON.stringify({
            version: '3aa3dac9353cc4d6bd62a8f95957bd844003b401ca4e4a9b33baa574c549d376',
            input: {
                source_image: testImageUrl,
                driven_audio: testAudioUrl,
                preprocess: 'crop',
                still_mode: false,
                use_enhancer: false,
            }
        });
        
        const predRes = await httpsRequest({
            hostname: 'api.replicate.com',
            path: '/v1/predictions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, body);
        
        console.log('Prediction status:', predRes.status);
        console.log('Response:', JSON.stringify(predRes.data, null, 2));
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testSadTalker();
