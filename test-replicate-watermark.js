const fs = require('fs');
const pako = require('pako');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.REPLICATE_API_TOKEN;
console.log('Test Replicate Inpainting...');

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

async function testStabilityInpainting() {
    console.log('\n--- Test stability-ai/stable-diffusion-inpainting ---');
    
    const modelResponse = await fetch('https://api.replicate.com/v1/models/stability-ai/stable-diffusion-inpainting', {
        headers: { 'Authorization': `Token ${API_KEY}` }
    });
    
    if (!modelResponse.ok) {
        console.log('Model not found, status:', modelResponse.status);
        const text = await modelResponse.text();
        console.log(text);
        return;
    }
    
    const modelData = await modelResponse.json();
    const version = modelData.latest_version?.id;
    console.log('Version:', version);
    
    const imageBase64 = imageBuffer.toString('base64');
    const dataUri = `data:image/png;base64,${imageBase64}`;
    
    const width = 180, height = 180;
    const box = { x: 120, y: 150, width: 50, height: 25 };
    const maskBuffer = createMaskPNG(width, height, box);
    const maskUri = `data:image/png;base64,${maskBuffer.toString('base64')}`;
    
    console.log('Creating prediction...');
    const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
            'Authorization': `Token ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            version: version,
            input: {
                image: dataUri,
                mask: maskUri,
                prompt: "clean seamless background, no text, no watermark",
                num_inference_steps: 25
            }
        })
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2).substring(0, 500));
    
    if (result.id) {
        await waitForResult(result.id);
    }
}

async function waitForResult(predictionId) {
    console.log('\nWaiting for result...');
    let attempts = 0;
    
    while (attempts < 60) {
        await new Promise(r => setTimeout(r, 2000));
        attempts++;
        
        const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: { 'Authorization': `Token ${API_KEY}` }
        });
        const data = await response.json();
        
        process.stdout.write(`\rStatus: ${data.status} (${attempts * 2}s)   `);
        
        if (data.status === 'succeeded') {
            console.log('\n\n✅ SUCCESS!');
            if (data.output) {
                const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
                console.log('Downloading result...');
                const imgResponse = await fetch(outputUrl);
                const buffer = Buffer.from(await imgResponse.arrayBuffer());
                fs.writeFileSync('replicate-result.png', buffer);
                console.log('Saved to replicate-result.png');
            }
            return true;
        }
        
        if (data.status === 'failed') {
            console.log('\n\n❌ FAILED:', data.error);
            return false;
        }
    }
    
    console.log('\nTimeout');
    return false;
}

testStabilityInpainting();
