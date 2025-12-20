const FormData = require('form-data');
const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.PICWISH_API_KEY;
console.log('Test watermark-remove...');
console.log('API Key:', API_KEY);

const imageBuffer = fs.readFileSync('public/ced-ine-logo.png');
console.log('Image size:', imageBuffer.length, 'bytes');

// Test 1: avec "image"
async function test1() {
    console.log('\n--- Test avec "image" ---');
    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'test.png', contentType: 'image/png' });
    formData.append('sync', '1');

    return new Promise((resolve) => {
        const options = {
            hostname: 'techhk.aoscdn.com',
            path: '/api/tasks/visual/external/watermark-remove',
            method: 'POST',
            headers: {
                'X-API-KEY': API_KEY,
                ...formData.getHeaders()
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('Status:', res.statusCode);
                console.log('Response:', data);
                resolve();
            });
        });
        formData.pipe(req);
    });
}

// Test 2: avec base64 dans le body JSON
async function test2() {
    console.log('\n--- Test avec base64 JSON ---');
    const base64 = imageBuffer.toString('base64');
    
    const body = JSON.stringify({
        image_base64: base64,
        sync: 1
    });

    return new Promise((resolve) => {
        const options = {
            hostname: 'techhk.aoscdn.com',
            path: '/api/tasks/visual/external/watermark-remove',
            method: 'POST',
            headers: {
                'X-API-KEY': API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('Status:', res.statusCode);
                console.log('Response:', data);
                resolve();
            });
        });
        req.write(body);
        req.end();
    });
}

// Test 3: Endpoint inpainting (alternative)
async function test3() {
    console.log('\n--- Test endpoint inpainting ---');
    const formData = new FormData();
    formData.append('image_file', imageBuffer, { filename: 'test.png', contentType: 'image/png' });
    formData.append('sync', '1');
    // Box format: x1,y1,x2,y2
    formData.append('rect', '10,10,50,50');

    return new Promise((resolve) => {
        const options = {
            hostname: 'techhk.aoscdn.com',
            path: '/api/tasks/visual/inpainting',
            method: 'POST',
            headers: {
                'X-API-KEY': API_KEY,
                ...formData.getHeaders()
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('Status:', res.statusCode);
                console.log('Response:', data);
                resolve();
            });
        });
        formData.pipe(req);
    });
}

async function runTests() {
    await test1();
    await test2();
    await test3();
}

runTests();
