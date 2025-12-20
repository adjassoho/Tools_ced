const fs = require('fs');
const FormData = require('form-data');
const https = require('https');
const pako = require('pako');
require('dotenv').config({ path: '.env.local' });

console.log('Test Free Inpainting APIs...');

const imageBuffer = fs.readFileSync('public/ced-ine-logo.png');
console.log('Image size:', imageBuffer.length, 'bytes');

// Créer un masque PNG
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

// Test 1: Hugging Face Router (nouvelle API)
async function testHuggingFaceRouter() {
    console.log('\n--- Test Hugging Face Router (LaMa) ---');
    
    const width = 180, height = 180;
    const box = { x: 120, y: 150, width: 50, height: 25 };
    const maskBuffer = createMaskPNG(width, height, box);
    
    try {
        const response = await fetch('https://router.huggingface.co/hf-inference/models/smartywu/big-lama', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inputs: {
                    image: imageBuffer.toString('base64'),
                    mask: maskBuffer.toString('base64')
                }
            })
        });

        console.log('Status:', response.status);
        if (response.ok) {
            const buffer = await response.arrayBuffer();
            fs.writeFileSync('hf-lama-result.png', Buffer.from(buffer));
            console.log('✅ SUCCESS! Saved to hf-lama-result.png');
        } else {
            console.log('Response:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Test 2: CleanUp.pictures API (gratuit, pas de clé requise pour test)
async function testCleanupPictures() {
    console.log('\n--- Test Cleanup.pictures ---');
    
    const width = 180, height = 180;
    const box = { x: 120, y: 150, width: 50, height: 25 };
    const maskBuffer = createMaskPNG(width, height, box);
    
    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'image.png', contentType: 'image/png' });
    formData.append('mask', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });

    return new Promise((resolve) => {
        const options = {
            hostname: 'clipdrop-api.co',
            path: '/cleanup/v1',
            method: 'POST',
            headers: {
                ...formData.getHeaders()
                // Pas de clé API pour le test
            }
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                console.log('Status:', res.statusCode);
                if (res.statusCode === 200) {
                    fs.writeFileSync('cleanup-result.png', Buffer.concat(chunks));
                    console.log('✅ SUCCESS! Saved to cleanup-result.png');
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

// Test 3: PhotoRoom API (a un tier gratuit)
async function testPhotoRoom() {
    console.log('\n--- Test PhotoRoom (needs API key) ---');
    const apiKey = process.env.PHOTOROOM_API_KEY;
    if (!apiKey) {
        console.log('Skipped - PHOTOROOM_API_KEY not set');
        return;
    }
    // Implementation si clé disponible
}

// Test 4: Pixian.ai (gratuit pour petites images)
async function testPixian() {
    console.log('\n--- Test Pixian.ai ---');
    
    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'image.png', contentType: 'image/png' });

    return new Promise((resolve) => {
        const options = {
            hostname: 'api.pixian.ai',
            path: '/api/v2/remove-background',
            method: 'POST',
            headers: formData.getHeaders()
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                console.log('Status:', res.statusCode);
                if (res.statusCode === 200) {
                    fs.writeFileSync('pixian-result.png', Buffer.concat(chunks));
                    console.log('✅ SUCCESS!');
                } else {
                    console.log('Response:', Buffer.concat(chunks).toString().substring(0, 200));
                }
                resolve();
            });
        });
        req.on('error', (e) => { console.error('Error:', e.message); resolve(); });
        formData.pipe(req);
    });
}

async function runTests() {
    await testHuggingFaceRouter();
    await testCleanupPictures();
    await testPixian();
}

runTests();
