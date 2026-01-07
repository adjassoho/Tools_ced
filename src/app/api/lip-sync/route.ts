import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

function httpsRequest(options: https.RequestOptions, body?: string): Promise<{ status: number; data: any }> {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode || 500, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode || 500, data });
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        if (body) req.write(body);
        req.end();
    });
}

// Convertir un fichier en base64 data URL
async function fileToDataUrl(file: File): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'application/octet-stream';
    return `data:${mimeType};base64,${base64}`;
}

// GET - Vérifier le statut d'une prédiction
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const predictionId = searchParams.get('id');

    if (!predictionId) {
        return NextResponse.json({ error: 'ID de prédiction requis' }, { status: 400 });
    }

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
        return NextResponse.json({ error: 'Token Replicate non configuré' }, { status: 500 });
    }

    try {
        const result = await httpsRequest({
            hostname: 'api.replicate.com',
            path: `/v1/predictions/${predictionId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        return NextResponse.json({
            status: result.data.status,
            output: result.data.output,
            error: result.data.error
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Créer une nouvelle prédiction lip-sync
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const photo = formData.get('photo') as File;
        const audio = formData.get('audio') as File;

        if (!photo || !audio) {
            return NextResponse.json({ error: 'Photo et audio requis' }, { status: 400 });
        }

        const token = process.env.REPLICATE_API_TOKEN;
        if (!token) {
            return NextResponse.json({ 
                error: 'Token Replicate non configuré. Utilisez les alternatives gratuites en ligne.',
                alternatives: ['https://www.wav2lip.org/', 'https://sadtalker.ai/']
            }, { status: 400 });
        }

        console.log('Processing lip-sync request...');
        console.log('Photo:', photo.name, photo.size, 'bytes');
        console.log('Audio:', audio.name, audio.size, 'bytes');

        // Convertir les fichiers en data URLs
        const photoDataUrl = await fileToDataUrl(photo);
        const audioDataUrl = await fileToDataUrl(audio);

        // Créer la prédiction SadTalker sur Replicate
        const body = JSON.stringify({
            version: '3aa3dac9353cc4d6bd62a8f95957bd844003b401ca4e4a9b33baa574c549d376',
            input: {
                source_image: photoDataUrl,
                driven_audio: audioDataUrl,
                preprocess: 'crop',
                still_mode: false,
                use_enhancer: false,
                batch_size: 2,
                size: 256,
                pose_style: 0,
                facerender: 'facevid2vid',
                exp_scale: 1,
            }
        });

        const result = await httpsRequest({
            hostname: 'api.replicate.com',
            path: '/v1/predictions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body).toString()
            }
        }, body);

        console.log('Replicate response:', result.status, result.data);

        if (result.status === 402) {
            return NextResponse.json({ 
                error: 'Crédit Replicate insuffisant. Rechargez votre compte sur replicate.com/account/billing ou utilisez les alternatives gratuites.',
                alternatives: ['https://www.wav2lip.org/', 'https://sadtalker.ai/']
            }, { status: 402 });
        }

        if (result.status !== 201 && result.status !== 200) {
            return NextResponse.json({ 
                error: result.data.detail || result.data.error || 'Erreur Replicate'
            }, { status: result.status });
        }

        return NextResponse.json({
            predictionId: result.data.id,
            status: result.data.status
        });

    } catch (error: any) {
        console.error('Lip-sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
