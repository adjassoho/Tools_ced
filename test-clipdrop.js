const fs = require('fs');
const FormData = require('form-data');
const https = require('https');
const pako = require('pako');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.CLIPDROP_API_KEY;
console.log('Test ClipDrop Cleanup API...');
console.log('API Key:', API_KEY ? 'OK' : 'MISSING');

const imageBuffer = fs.readFileSync('public/ced-ine-logo.png');
console.log('Image size:', imageBuffer.length, 'bytes');

// Créer un masque PNG
function createMaskPNG(width, height, box) {
    const pixels = new Uint8Array(width * height * 4);
    // Fond noir (transparent pour ClipDrop = zone à garder)
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0; // Transparent
    }
    // Zone blanche opaque (zone à supprimer)
    for (let y = Math.floor(box.y); y < Math.min(height, box.y + box.height); y++) {
        for (let x = Math.floor(box.x); x < Math.min(width, box.x + box.width); x++) {
            const idx = (y * width + x) * 4;
            pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255; pixels[idx + 3] = 255;
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

async function testClipDrop() {
    console.log('\n--- Test ClipDrop Cleanup ---');
    
    const width = 180, height = 180;
    const box = { x: 120, y: 150, width: 50, height: 25 };
    const maskBuffer = createMaskPNG(width, height, box);
    
    // Sauvegarder le masque pour debug
    fs.writeFileSync('clipdrop-mask.png', maskBuffer);
    console.log('Mask saved to clipdrop-mask.png');
    
    const formData = new FormData();
    formData.append('image_file', imageBuffer, { filename: 'image.png', contentType: 'image/png' });
    formData.append('mask_file', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });

    return new Promise((resolve) => {
        const options = {
            hostname: 'clipdrop-api.co',
            path: '/cleanup/v1',
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                ...formData.getHeaders()
            }
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                console.log('Status:', res.statusCode);
                const buffer = Buffer.concat(chunks);
                
                if (res.statusCode === 200) {
                    fs.writeFileSync('clipdrop-result.png', buffer);
                    console.log('✅ SUCCESS! Saved to clipdrop-result.png');
                    console.log('Result size:', buffer.length, 'bytes');
                } else {
                    console.log('Response:', buffer.toString());
                }
                resolve();
            });
        });
        
        req.on('error', (e) => { 
            console.error('Error:', e.message); 
            resolve(); 
        });
        
        formData.pipe(req);
    });
}

testClipDrop();
