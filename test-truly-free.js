const fs = require('fs');
const FormData = require('form-data');
const https = require('https');
const http = require('http');
const pako = require('pako');
require('dotenv').config({ path: '.env.local' });

console.log('Test Truly Free Inpainting Solutions...');

const imageBuffer = fs.readFileSync('public/ced-ine-logo.png');
console.log('Image size:', imageBuffer.length, 'bytes');

// Créer un masque
function createMaskPNG(width, height, box) {
    const pixels = new Uint8Array(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 255;
    }
    for (let y = Math.floor(box.y); y < Math.min(height, box.y + box.height); y++) {
        for (let x = Math.floor(box.x); x < Math.min(width, box.x + box.width); x++) {
            const idx = (y * width + x) * 4;
            pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255;
        }
    }
    const rawData = new Uint8Array(height * (width * 4 + 1));
    for (let y = 0; y < height; y++) {
        rawData[y * (width * 4 + 1)] = 0;
        for (let x = 0; x < width * 4; x++) {
            rawData[y * (width * 4 + 1) + 1 + x] = pixels[y * width * 4 + x];
        }
    }
    const compressed = pako.deflate(rawData);
    const chunks = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])];
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; ihdr[9] = 6;
    chunks.push(createChunk('IHDR', ihdr));
    chunks.push(createChunk('IDAT', Buffer.from(compressed)));
    chunks.push(createChunk('IEND', Buffer.alloc(0)));
    return Buffer.concat(chunks);
}

function createChunk(type, data) {
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type);
    let crc = 0xFFFFFFFF;
    const crcData = Buffer.concat([typeBuffer, data]);
    for (let i = 0; i < crcData.length; i++) {
        crc ^= crcData[i];
        for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
    const crcBuffer = Buffer.alloc(4); crcBuffer.writeUInt32BE((~crc >>> 0), 0);
    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// Test 1: Replicate (offre des crédits gratuits au départ)
async function testReplicate() {
    console.log('\n--- Test Replicate (LaMa model) ---');
    const apiKey = process.env.REPLICATE_API_TOKEN;
    if (!apiKey) {
        console.log('REPLICATE_API_TOKEN not set');
        console.log('Get free credits at: https://replicate.com (sign up with GitHub)');
        return;
    }
    
    const width = 180, height = 180;
    const box = { x: 120, y: 150, width: 50, height: 25 };
    const maskBuffer = createMaskPNG(width, height, box);
    
    try {
        // Créer une prédiction
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: "cdac8e65d6e1a5e7e6a578e2f6a0b7e5c5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5", // LaMa
                input: {
                    image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                    mask: `data:image/png;base64,${maskBuffer.toString('base64')}`
                }
            })
        });
        
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Test 2: Remove.bg (1 crédit gratuit pour test, puis payant)
async function testRemoveBg() {
    console.log('\n--- Test Remove.bg ---');
    const apiKey = process.env.REMOVEBG_API_KEY;
    if (!apiKey) {
        console.log('REMOVEBG_API_KEY not set');
        console.log('Get 1 free credit at: https://www.remove.bg/api');
        return;
    }
    
    const formData = new FormData();
    formData.append('image_file', imageBuffer, { filename: 'image.png' });
    formData.append('size', 'auto');

    return new Promise((resolve) => {
        const options = {
            hostname: 'api.remove.bg',
            path: '/v1.0/removebg',
            method: 'POST',
            headers: {
                'X-Api-Key': apiKey,
                ...formData.getHeaders()
            }
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                console.log('Status:', res.statusCode);
                if (res.statusCode === 200) {
                    fs.writeFileSync('removebg-result.png', Buffer.concat(chunks));
                    console.log('✅ SUCCESS!');
                } else {
                    console.log('Response:', Buffer.concat(chunks).toString());
                }
                resolve();
            });
        });
        req.on('error', (e) => { console.error('Error:', e.message); resolve(); });
        formData.pipe(req);
    });
}

// Test 3: Stability AI (offre des crédits gratuits)
async function testStabilityAI() {
    console.log('\n--- Test Stability AI ---');
    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
        console.log('STABILITY_API_KEY not set');
        console.log('Get free credits at: https://platform.stability.ai/');
        return;
    }
    
    const width = 180, height = 180;
    const box = { x: 120, y: 150, width: 50, height: 25 };
    const maskBuffer = createMaskPNG(width, height, box);
    
    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'image.png' });
    formData.append('mask', maskBuffer, { filename: 'mask.png' });
    formData.append('output_format', 'png');

    return new Promise((resolve) => {
        const options = {
            hostname: 'api.stability.ai',
            path: '/v2beta/stable-image/edit/inpaint',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'image/*',
                ...formData.getHeaders()
            }
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                console.log('Status:', res.statusCode);
                if (res.statusCode === 200) {
                    fs.writeFileSync('stability-result.png', Buffer.concat(chunks));
                    console.log('✅ SUCCESS!');
                } else {
                    console.log('Response:', Buffer.concat(chunks).toString().substring(0, 500));
                }
                resolve();
            });
        });
        req.on('error', (e) => { console.error('Error:', e.message); resolve(); });
        formData.pipe(req);
    });
}

console.log('\n=== APIs gratuites disponibles ===');
console.log('1. Replicate - Crédits gratuits au signup: https://replicate.com');
console.log('2. Stability AI - Crédits gratuits: https://platform.stability.ai/');
console.log('3. ClipDrop - 100 appels/mois gratuits: https://clipdrop.co/apis');
console.log('4. Remove.bg - 1 crédit gratuit: https://www.remove.bg/api');
console.log('\nAjoute la clé API dans .env.local pour tester.\n');

async function runTests() {
    await testReplicate();
    await testRemoveBg();
    await testStabilityAI();
}

runTests();
