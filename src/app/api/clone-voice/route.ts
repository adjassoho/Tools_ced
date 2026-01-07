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

// Convertir un fichier audio en data URL
async function audioToDataUrl(file: File | Blob): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'audio/wav';
    return `data:${mimeType};base64,${base64}`;
}

// Télécharger l'audio résultat
async function downloadAudio(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                const redirectUrl = res.headers.location;
                if (redirectUrl) {
                    https.get(redirectUrl, (redirectRes) => {
                        const chunks: Buffer[] = [];
                        redirectRes.on('data', chunk => chunks.push(chunk));
                        redirectRes.on('end', () => resolve(Buffer.concat(chunks)));
                        redirectRes.on('error', reject);
                    }).on('error', reject);
                    return;
                }
            }
            
            const chunks: Buffer[] = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

// Récupérer la dernière version du modèle XTTS-v2
async function getLatestXTTSVersion(token: string): Promise<string> {
    const res = await httpsRequest({
        hostname: 'api.replicate.com',
        path: '/v1/models/lucataco/xtts-v2/versions',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
    
    if (res.status === 200 && res.data.results?.length > 0) {
        return res.data.results[0].id;
    }
    
    // Fallback version
    return '684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e';
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const text = formData.get('text') as string;

        if (!text) {
            return NextResponse.json({ error: 'Texte requis' }, { status: 400 });
        }

        if (!file) {
            return NextResponse.json({ error: 'Échantillon vocal requis' }, { status: 400 });
        }

        const replicateToken = process.env.REPLICATE_API_TOKEN;
        
        if (!replicateToken) {
            return NextResponse.json({ 
                error: 'Token Replicate non configuré. Ajoutez REPLICATE_API_TOKEN dans .env.local' 
            }, { status: 500 });
        }

        console.log('Starting voice cloning with XTTS-v2...');
        console.log('Audio sample:', file.name, file.size, 'bytes');
        console.log('Text length:', text.length, 'chars');

        // Convertir l'audio en data URL pour Replicate
        const audioDataUrl = await audioToDataUrl(file);

        // Récupérer la dernière version du modèle
        const version = await getLatestXTTSVersion(replicateToken);
        console.log('Using XTTS-v2 version:', version);
        
        const predBody = JSON.stringify({
            version: version,
            input: {
                text: text,
                speaker: audioDataUrl,
                language: 'fr'
            }
        });

        const predRes = await httpsRequest({
            hostname: 'api.replicate.com',
            path: '/v1/predictions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${replicateToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(predBody).toString()
            }
        }, predBody);

        console.log('Prediction response:', predRes.status);

        if (predRes.status === 402) {
            return NextResponse.json({ 
                error: 'Crédit Replicate insuffisant. Rechargez votre compte sur replicate.com/account/billing'
            }, { status: 402 });
        }

        if (predRes.status !== 201 && predRes.status !== 200) {
            console.error('Replicate error:', predRes.data);
            return NextResponse.json({ 
                error: predRes.data.detail || 'Erreur lors de la création de la prédiction'
            }, { status: predRes.status });
        }

        const predictionId = predRes.data.id;
        console.log('Prediction ID:', predictionId);

        // Polling pour le résultat (max 2 minutes)
        let attempts = 0;
        const maxAttempts = 60;
        
        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000));
            
            const statusRes = await httpsRequest({
                hostname: 'api.replicate.com',
                path: `/v1/predictions/${predictionId}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${replicateToken}`,
                }
            });

            console.log(`Attempt ${attempts + 1}: ${statusRes.data.status}`);

            if (statusRes.data.status === 'succeeded') {
                const outputUrl = statusRes.data.output;
                console.log('Output URL:', outputUrl);

                // Télécharger l'audio généré
                const audioBuffer = await downloadAudio(outputUrl);
                const base64Audio = audioBuffer.toString('base64');

                return NextResponse.json({
                    audio: `data:audio/wav;base64,${base64Audio}`,
                    success: true,
                    model: 'XTTS-v2',
                    message: 'Voix clonée avec succès !'
                });
            } else if (statusRes.data.status === 'failed') {
                console.error('Prediction failed:', statusRes.data.error);
                return NextResponse.json({ 
                    error: statusRes.data.error || 'La génération a échoué'
                }, { status: 500 });
            }

            attempts++;
        }

        return NextResponse.json({ 
            error: 'Timeout - la génération prend trop de temps. Réessayez.'
        }, { status: 504 });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('Voice cloning error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
