const fs = require('fs');
const pako = require('pako');
require('dotenv').config({ path: '.env.local' });

// Hugging Face - gratuit avec un token (optionnel pour certains modèles)
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN || '';

console.log('Test Hugging Face Inpainting API...');
console.log('HF Token:', HF_TOKEN ? 'Set' : 'Not set (using anonymous)');

const imageBuffer = fs.readFileSync('public/ced-ine-logo.png');
console.log('Image size:', imageBuffer.length, 'bytes');

// Créer un masque PNG simple
function createMaskPNG(width, height, box) {
    const pixels = new Uint8Array(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 255;
    }
    const x1 = Math.max(0, Math.floor(box.x));
    const y1 = Math.max(0, Math.floor(box.y));
    const x2 = Math.min(width, Math.floor(box.x + box.width));
    const y2 = Math.min(height, Math.floor(box.y + box.height));
    for (let y = y1; y < y2; y++) {
        for (let x = x1; x < x2; x++) {
            const idx = (y * width + x) * 4;
            pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255; pixels[idx + 3] = 255;
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
    const crc = crc32(Buffer.concat([typeBuffer, data]));
    const crcBuffer = Buffer.alloc(4); crcBuffer.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
    return ~crc >>> 0;
}

// Test avec le modèle LaMa sur Hugging Face
async function testHuggingFaceLaMa() {
    console.log('\n--- Test Hugging Face LaMa Inpainting ---');
    
    const width = 180, height = 180;
    const box = { x: 120, y: 150, width: 50, height: 25 };
    const maskBuffer = createMaskPNG(width, height, box);
    
    // Convertir en base64
    const imageBase64 = imageBuffer.toString('base64');
    const maskBase64 = maskBuffer.toString('base64');
    
    const headers = {
        'Content-Type': 'application/json',
    };
    if (HF_TOKEN) {
        headers['Authorization'] = `Bearer ${HF_TOKEN}`;
    }

    try {
        // Modèle LaMa pour inpainting
        const response = await fetch('https://api-inference.huggingface.co/models/smartywu/big-lama', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                inputs: {
                    image: imageBase64,
                    mask: maskBase64
                }
            })
        });

        console.log('Status:', response.status);
        
        if (response.ok) {
            const buffer = await response.arrayBuffer();
            fs.writeFileSync('hf-result.png', Buffer.from(buffer));
            console.log('✅ SUCCESS! Saved to hf-result.png');
        } else {
            const text = await response.text();
            console.log('Response:', text);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Test avec un autre modèle d'inpainting
async function testHuggingFaceSDInpaint() {
    console.log('\n--- Test Hugging Face Stable Diffusion Inpainting ---');
    
    const imageBase64 = imageBuffer.toString('base64');
    
    const headers = {
        'Content-Type': 'application/json',
    };
    if (HF_TOKEN) {
        headers['Authorization'] = `Bearer ${HF_TOKEN}`;
    }

    try {
        const response = await fetch('https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                inputs: imageBase64,
                parameters: {
                    prompt: "clean background, no text, no watermark"
                }
            })
        });

        console.log('Status:', response.status);
        
        if (response.ok) {
            const buffer = await response.arrayBuffer();
            fs.writeFileSync('hf-sd-result.png', Buffer.from(buffer));
            console.log('✅ SUCCESS! Saved to hf-sd-result.png');
        } else {
            const text = await response.text();
            console.log('Response:', text);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function runTests() {
    await testHuggingFaceLaMa();
    await testHuggingFaceSDInpaint();
}

runTests();
