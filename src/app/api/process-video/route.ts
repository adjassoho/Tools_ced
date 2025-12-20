import { NextRequest, NextResponse } from 'next/server';

interface BoxCoordinates {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Créer un masque PNG
function createMaskPNG(width: number, height: number, box: BoxCoordinates): Buffer {
    const pako = require('pako');
    const pixels = new Uint8Array(width * height * 4);
    
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 255;
    }
    
    const margin = 30;
    const x1 = Math.max(0, Math.floor(box.x) - margin);
    const y1 = Math.max(0, Math.floor(box.y) - margin);
    const x2 = Math.min(width, Math.floor(box.x + box.width) + margin);
    const y2 = Math.min(height, Math.floor(box.y + box.height) + margin);
    
    for (let y = y1; y < y2; y++) {
        for (let x = x1; x < x2; x++) {
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
    const chunks: Buffer[] = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])];
    
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; ihdr[9] = 6;
    
    function createChunk(type: string, data: Buffer): Buffer {
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

// Traiter une frame avec PicWish
async function processFrameWithPicWish(
    frameBuffer: Buffer, 
    maskBuffer: Buffer, 
    apiKey: string
): Promise<string> {
    const FormDataNode = require('form-data');
    const https = require('https');
    
    const formData = new FormDataNode();
    formData.append('image_file', frameBuffer, { filename: 'frame.png', contentType: 'image/png' });
    formData.append('mask_file', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });
    formData.append('sync', '1');

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'techhk.aoscdn.com',
            path: '/api/tasks/visual/watermark',
            method: 'POST',
            headers: { 'X-API-KEY': apiKey, ...formData.getHeaders() }
        };

        const req = https.request(options, (res: any) => {
            let data = '';
            res.on('data', (chunk: any) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.status === 200 && json.data?.image) {
                        resolve(json.data.image);
                    } else {
                        reject(new Error(json.message || 'Erreur PicWish'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        formData.pipe(req);
    });
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const action = formData.get('action') as string;
        
        // Action: Traiter une frame unique (le client gère l'extraction et la reconstruction)
        if (action === 'process-frame') {
            const frameData = formData.get('frame') as string; // base64
            const boxString = formData.get('box') as string;
            const widthStr = formData.get('width') as string;
            const heightStr = formData.get('height') as string;
            
            if (!frameData || !boxString) {
                return NextResponse.json({ error: 'Frame et zone requises' }, { status: 400 });
            }
            
            const box: BoxCoordinates = JSON.parse(boxString);
            const width = parseInt(widthStr);
            const height = parseInt(heightStr);
            const apiKey = process.env.PICWISH_API_KEY;
            
            if (!apiKey) {
                return NextResponse.json({ error: 'PICWISH_API_KEY non configuré' }, { status: 500 });
            }
            
            console.log('Processing frame with box:', box);
            
            // Décoder la frame base64
            const base64Data = frameData.replace(/^data:image\/\w+;base64,/, '');
            const frameBuffer = Buffer.from(base64Data, 'base64');
            
            // Créer le masque
            const maskBuffer = createMaskPNG(width, height, box);
            
            // Traiter avec PicWish
            console.log('Calling PicWish...');
            const processedUrl = await processFrameWithPicWish(frameBuffer, maskBuffer, apiKey);
            
            // Télécharger l'image traitée
            const response = await fetch(processedUrl);
            const processedBuffer = Buffer.from(await response.arrayBuffer());
            const processedBase64 = processedBuffer.toString('base64');
            
            return NextResponse.json({
                processedFrame: `data:image/png;base64,${processedBase64}`,
                success: true
            });
        }
        
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
        
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('Video processing error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
