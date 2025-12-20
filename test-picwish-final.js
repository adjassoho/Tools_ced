const fs = require('fs');
const FormData = require('form-data');
const https = require('https');
const pako = require('pako');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.PICWISH_API_KEY;
console.log('Test PicWish avec zone plus grande...');
console.log('API Key:', API_KEY ? 'OK' : 'MISSING');

const imageBuffer = fs.readFileSync('public/641ce9cc-e344-4edd-bb44-4216fbfe1203.jpg');
console.log('Image size:', imageBuffer.length, 'bytes');

// Obtenir les dimensions de l'image (approximation pour JPG)
// L'image semble être ~2752x1536 basé sur les tests précédents

// Créer un masque PNG avec zone plus grande
function createMaskPNG(width, height, box) {
    const pixels = new Uint8Array(width * height * 4);
    // Fond noir
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 255;
    }
    // Zone blanche (avec marge)
    const margin = 10;
    const x1 = Math.max(0, Math.floor(box.x) - margin);
    const y1 = Math.max(0, Math.floor(box.y) - margin);
    const x2 = Math.min(width, Math.floor(box.x + box.width) + margin);
    const y2 = Math.min(height, Math.floor(box.y + box.height) + margin);
    
    for (let y = y1; y < y2; y++) {
        for (let x = x1; x < x2; x++) {
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
    
    chunks.push(createChunk('IHDR', ihdr));
    chunks.push(createChunk('IDAT', Buffer.from(compressed)));
    chunks.push(createChunk('IEND', Buffer.alloc(0)));
    return Buffer.concat(chunks);
}

async function testPicWish() {
    console.log('\n--- Test PicWish /watermark ---');
    
    // Zone couvrant le filigrane en bas à droite (AI NotebookLM)
    // Image dimensions: 2752x1536 (basé sur les tests précédents)
    const width = 2752, height = 1536;
    // Filigrane en bas à droite - zone large avec marge
    const box = { x: 2450, y: 1380, width: 280, height: 140 };
    
    const maskBuffer = createMaskPNG(width, height, box);
    fs.writeFileSync('picwish-mask.png', maskBuffer);
    console.log('Mask saved (larger area)');
    
    const formData = new FormData();
    formData.append('image_file', imageBuffer, { filename: 'image.png', contentType: 'image/png' });
    formData.append('mask_file', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });
    formData.append('sync', '1');

    return new Promise((resolve) => {
        const options = {
            hostname: 'techhk.aoscdn.com',
            path: '/api/tasks/visual/watermark',
            method: 'POST',
            headers: {
                'X-API-KEY': API_KEY,
                ...formData.getHeaders()
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', async () => {
                console.log('Status:', res.statusCode);
                try {
                    const json = JSON.parse(data);
                    console.log('Response:', JSON.stringify(json, null, 2));
                    
                    if (json.status === 200 && json.data?.image) {
                        console.log('\n✅ SUCCESS!');
                        // Télécharger le résultat
                        const imgRes = await fetch(json.data.image);
                        const buffer = Buffer.from(await imgRes.arrayBuffer());
                        fs.writeFileSync('picwish-result.png', buffer);
                        console.log('Saved to picwish-result.png');
                    }
                } catch (e) {
                    console.log('Parse error:', e.message);
                }
                resolve();
            });
        });
        
        req.on('error', (e) => { console.error('Error:', e.message); resolve(); });
        formData.pipe(req);
    });
}

testPicWish();
