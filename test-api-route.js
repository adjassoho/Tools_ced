const fs = require('fs');
const FormData = require('form-data');
const https = require('https');
const pako = require('pako');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.PICWISH_API_KEY;
console.log('Test API Route avec mask généré...');
console.log('API Key:', API_KEY);

const imageBuffer = fs.readFileSync('public/ced-ine-logo.png');
console.log('Image size:', imageBuffer.length, 'bytes');

// Fonctions de création de masque PNG
function createMaskPNG(width, height, box) {
    const pixels = new Uint8Array(width * height * 4);
    
    // Remplir en noir
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
        pixels[i + 3] = 255;
    }
    
    // Zone blanche
    const x1 = Math.max(0, Math.floor(box.x));
    const y1 = Math.max(0, Math.floor(box.y));
    const x2 = Math.min(width, Math.floor(box.x + box.width));
    const y2 = Math.min(height, Math.floor(box.y + box.height));
    
    for (let y = y1; y < y2; y++) {
        for (let x = x1; x < x2; x++) {
            const idx = (y * width + x) * 4;
            pixels[idx] = 255;
            pixels[idx + 1] = 255;
            pixels[idx + 2] = 255;
            pixels[idx + 3] = 255;
        }
    }
    
    return encodePNG(width, height, pixels);
}

function encodePNG(width, height, pixels) {
    const rawData = new Uint8Array(height * (width * 4 + 1));
    for (let y = 0; y < height; y++) {
        rawData[y * (width * 4 + 1)] = 0;
        for (let x = 0; x < width * 4; x++) {
            rawData[y * (width * 4 + 1) + 1 + x] = pixels[y * width * 4 + x];
        }
    }
    
    const compressed = pako.deflate(rawData);
    const chunks = [];
    
    chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    chunks.push(createChunk('IHDR', ihdr));
    chunks.push(createChunk('IDAT', Buffer.from(compressed)));
    chunks.push(createChunk('IEND', Buffer.alloc(0)));
    
    return Buffer.concat(chunks);
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = crc32(crcData);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(data) {
    let crc = 0xFFFFFFFF;
    const table = getCRC32Table();
    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return crc ^ 0xFFFFFFFF;
}

let crcTable = null;
function getCRC32Table() {
    if (crcTable) return crcTable;
    crcTable = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[n] = c;
    }
    return crcTable;
}

async function testWithGeneratedMask() {
    console.log('\n--- Test avec mask PNG généré ---');
    
    // Dimensions de l'image test (180x180 pour ced-ine-logo.png)
    const width = 180;
    const height = 180;
    const box = { x: 10, y: 10, width: 100, height: 50 };
    
    const maskBuffer = createMaskPNG(width, height, box);
    console.log('Mask generated:', maskBuffer.length, 'bytes');
    
    // Sauvegarder le mask pour vérification
    fs.writeFileSync('test-mask.png', maskBuffer);
    console.log('Mask saved to test-mask.png');
    
    const formData = new FormData();
    formData.append('image_file', imageBuffer, { 
        filename: 'image.png', 
        contentType: 'image/png' 
    });
    formData.append('mask_file', maskBuffer, { 
        filename: 'mask.png', 
        contentType: 'image/png' 
    });
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
            res.on('end', () => {
                console.log('Status:', res.statusCode);
                try {
                    const json = JSON.parse(data);
                    console.log('Response:', JSON.stringify(json, null, 2));
                    if (json.status === 200 && json.data?.image) {
                        console.log('\n✅ SUCCESS!');
                        console.log('Result URL:', json.data.image.substring(0, 80) + '...');
                    } else if (json.data?.state === -1) {
                        console.log('\n❌ Processing failed:', json.data.err_message);
                    }
                } catch {
                    console.log('Raw:', data);
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

testWithGeneratedMask();
