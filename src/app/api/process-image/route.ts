import { NextRequest, NextResponse } from 'next/server';

interface BoxCoordinates {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Créer un masque PNG (noir = garder, blanc = supprimer)
function createMaskPNG(width: number, height: number, box: BoxCoordinates): Buffer {
    const pako = require('pako');
    
    const pixels = new Uint8Array(width * height * 4);
    
    // Fond noir (zone à garder)
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
        pixels[i + 3] = 255;
    }
    
    // Zone blanche avec marge généreuse (zone à supprimer)
    // Une marge plus grande aide l'algorithme d'inpainting
    const margin = 30;
    const x1 = Math.max(0, Math.floor(box.x) - margin);
    const y1 = Math.max(0, Math.floor(box.y) - margin);
    const x2 = Math.min(width, Math.floor(box.x + box.width) + margin);
    const y2 = Math.min(height, Math.floor(box.y + box.height) + margin);
    
    for (let y = y1; y < y2; y++) {
        for (let x = x1; x < x2; x++) {
            const idx = (y * width + x) * 4;
            pixels[idx] = 255;
            pixels[idx + 1] = 255;
            pixels[idx + 2] = 255;
            pixels[idx + 3] = 255;
        }
    }
    
    // Encoder en PNG
    const rawData = new Uint8Array(height * (width * 4 + 1));
    for (let y = 0; y < height; y++) {
        rawData[y * (width * 4 + 1)] = 0;
        for (let x = 0; x < width * 4; x++) {
            rawData[y * (width * 4 + 1) + 1 + x] = pixels[y * width * 4 + x];
        }
    }
    
    const compressed = pako.deflate(rawData);
    const chunks: Buffer[] = [];
    
    // Signature PNG
    chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    
    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    chunks.push(createChunk('IHDR', ihdr));
    
    // IDAT
    chunks.push(createChunk('IDAT', Buffer.from(compressed)));
    
    // IEND
    chunks.push(createChunk('IEND', Buffer.alloc(0)));
    
    return Buffer.concat(chunks);
}

function createChunk(type: string, data: Buffer): Buffer {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    
    let crc = 0xffffffff;
    for (let i = 0; i < crcData.length; i++) {
        crc ^= crcData[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
    }
    
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE((~crc >>> 0), 0);
    
    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

export async function POST(req: NextRequest) {
    let base64Image: string = '';
    let fileType: string = 'image/png';

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const boxString = formData.get('box') as string;
        const imageSizeString = formData.get('imageSize') as string;

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier uploadé' }, { status: 400 });
        }

        // Lire le fichier
        const arrayBuffer = await file.arrayBuffer();
        const imageBuffer = Buffer.from(new Uint8Array(arrayBuffer));
        base64Image = imageBuffer.toString('base64');
        fileType = file.type || 'image/png';

        // Parse les coordonnées de la box
        let box: BoxCoordinates | null = null;
        if (boxString) {
            try {
                box = JSON.parse(boxString);
                console.log('Selection box:', box);
            } catch {
                console.warn('Failed to parse box coordinates');
            }
        }

        // Parse les dimensions de l'image
        let imageWidth = 1000, imageHeight = 1000;
        if (imageSizeString) {
            try {
                const size = JSON.parse(imageSizeString);
                imageWidth = size.width;
                imageHeight = size.height;
                console.log('Image dimensions:', imageWidth, 'x', imageHeight);
            } catch {
                console.warn('Failed to parse image size');
            }
        }

        const apiKey = process.env.PICWISH_API_KEY;

        // Mode Démo
        if (!apiKey) {
            return NextResponse.json({
                resultUrl: `data:${fileType};base64,${base64Image}`,
                demo: true,
                message: 'Mode démo - Configurez PICWISH_API_KEY dans .env.local'
            });
        }

        if (!box || box.width <= 0 || box.height <= 0) {
            return NextResponse.json({ 
                error: 'Veuillez sélectionner une zone à supprimer' 
            }, { status: 400 });
        }

        console.log('Calling PicWish API...');
        console.log('File size:', imageBuffer.length, 'bytes');
        console.log('Box:', box);

        // Créer le masque PNG
        const maskBuffer = createMaskPNG(imageWidth, imageHeight, box);
        console.log('Mask created:', maskBuffer.length, 'bytes');
        
        // Debug: sauvegarder le masque pour comparaison
        const fs = require('fs');
        fs.writeFileSync('debug-app-mask.png', maskBuffer);
        console.log('Debug mask saved to debug-app-mask.png');

        // Préparer le FormData pour PicWish
        const FormDataNode = require('form-data');
        const https = require('https');
        
        const picwishFormData = new FormDataNode();
        picwishFormData.append('image_file', imageBuffer, {
            filename: 'image.jpg',
            contentType: fileType
        });
        picwishFormData.append('mask_file', maskBuffer, {
            filename: 'mask.png',
            contentType: 'image/png'
        });
        picwishFormData.append('sync', '1');

        // Appel à l'API PicWish
        const responseData = await new Promise<string>((resolve, reject) => {
            const options = {
                hostname: 'techhk.aoscdn.com',
                path: '/api/tasks/visual/watermark',
                method: 'POST',
                headers: {
                    'X-API-KEY': apiKey,
                    ...picwishFormData.getHeaders()
                }
            };

            const request = https.request(options, (res: any) => {
                let data = '';
                res.on('data', (chunk: any) => data += chunk);
                res.on('end', () => resolve(data));
            });

            request.on('error', (e: Error) => reject(e));
            picwishFormData.pipe(request);
        });

        console.log('PicWish Response:', responseData);

        const data = JSON.parse(responseData);

        if (data.status !== 200) {
            throw new Error(data.message || `Erreur API PicWish (status: ${data.status})`);
        }

        if (data.data?.image) {
            return NextResponse.json({
                resultUrl: data.data.image,
                success: true
            });
        }

        if (data.data?.state === -1) {
            throw new Error(data.data.err_message || 'Erreur de traitement');
        }

        throw new Error('URL image non trouvée dans la réponse');

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('Error:', errorMessage);

        return NextResponse.json({ 
            error: errorMessage 
        }, { status: 500 });
    }
}
