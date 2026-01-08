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
        req.setTimeout(60000, () => {
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
        const makeRequest = (targetUrl: string) => {
            const urlObj = new URL(targetUrl);
            https.get({
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
            }, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    const redirectUrl = res.headers.location;
                    if (redirectUrl) {
                        makeRequest(redirectUrl);
                        return;
                    }
                }
                const chunks: Buffer[] = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
                res.on('error', reject);
            }).on('error', reject);
        };
        makeRequest(url);
    });
}

// Récupérer la dernière version d'un modèle
async function getLatestVersion(token: string, model: string): Promise<string | null> {
    const res = await httpsRequest({
        hostname: 'api.replicate.com',
        path: `/v1/models/${model}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.data.latest_version?.id || null;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const text = formData.get('text') as string;
        const expressivity = parseFloat(formData.get('expressivity') as string) || 0.4;
        const model = (formData.get('model') as string) || 'chatterbox-fr'; // Default to French Chatterbox

        if (!text) {
            return NextResponse.json({ error: 'Texte requis' }, { status: 400 });
        }

        if (!file) {
            return NextResponse.json({ error: 'Échantillon vocal requis' }, { status: 400 });
        }

        const replicateToken = process.env.REPLICATE_API_TOKEN;
        
        if (!replicateToken) {
            return NextResponse.json({ 
                error: 'Token Replicate non configuré' 
            }, { status: 500 });
        }

        // Determine model name for display
        let modelName: string;
        let replicateModel: string;
        let predBody: string;

        const audioDataUrl = await audioToDataUrl(file);

        console.log('Starting voice cloning...');
        console.log('Model requested:', model);
        console.log('Audio sample:', (file as File).name, file.size, 'bytes');
        console.log('Text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));

        if (model === 'xtts') {
            // XTTS-v2 - bon support multilingue
            modelName = 'XTTS-v2';
            replicateModel = 'lucataco/xtts-v2';
            const version = await getLatestVersion(replicateToken, replicateModel);
            predBody = JSON.stringify({
                version: version,
                input: {
                    text: text,
                    speaker: audioDataUrl,
                    language: 'fr'
                }
            });
        } else if (model === 'chatterbox') {
            // Chatterbox original (anglais)
            modelName = 'Chatterbox';
            replicateModel = 'resemble-ai/chatterbox';
            predBody = JSON.stringify({
                input: {
                    prompt: text,
                    audio_prompt: audioDataUrl,
                    exaggeration: expressivity,
                    cfg_weight: 0.9
                }
            });
        } else {
            // Chatterbox Multilingual (français) - DEFAULT
            modelName = 'Chatterbox FR';
            replicateModel = 'resemble-ai/chatterbox-multilingual';
            const version = await getLatestVersion(replicateToken, replicateModel);
            predBody = JSON.stringify({
                version: version,
                input: {
                    text: text,
                    audio_prompt: audioDataUrl,
                    language: 'fr',
                    exaggeration: expressivity,
                    cfg_weight: 0.5
                }
            });
        }

        console.log('Using model:', modelName, '(' + replicateModel + ')');

        // Determine API path
        const apiPath = model === 'chatterbox' 
            ? `/v1/models/${replicateModel}/predictions`
            : '/v1/predictions';

        const predRes = await httpsRequest({
            hostname: 'api.replicate.com',
            path: apiPath,
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
                error: 'Crédit Replicate insuffisant'
            }, { status: 402 });
        }

        if (predRes.status !== 201 && predRes.status !== 200) {
            console.error('Replicate error:', predRes.data);
            return NextResponse.json({ 
                error: predRes.data.detail || predRes.data.error || 'Erreur lors de la création'
            }, { status: predRes.status });
        }

        // Si le résultat est immédiat
        if (predRes.data.status === 'succeeded' && predRes.data.output) {
            const audioBuffer = await downloadAudio(predRes.data.output);
            const base64Audio = audioBuffer.toString('base64');
            return NextResponse.json({
                audio: `data:audio/wav;base64,${base64Audio}`,
                success: true,
                model: modelName
            });
        }

        // Polling pour le résultat
        const predictionId = predRes.data.id;
        console.log('Prediction ID:', predictionId);

        let attempts = 0;
        const maxAttempts = 90; // 3 minutes max (Chatterbox Multilingual peut être lent)
        
        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000));
            
            const statusRes = await httpsRequest({
                hostname: 'api.replicate.com',
                path: `/v1/predictions/${predictionId}`,
                method: 'GET',
                headers: { 'Authorization': `Bearer ${replicateToken}` }
            });

            console.log(`Attempt ${attempts + 1}: ${statusRes.data.status}`);

            if (statusRes.data.status === 'succeeded') {
                const outputUrl = statusRes.data.output;
                const audioBuffer = await downloadAudio(outputUrl);
                const base64Audio = audioBuffer.toString('base64');

                return NextResponse.json({
                    audio: `data:audio/wav;base64,${base64Audio}`,
                    success: true,
                    model: modelName
                });
            } else if (statusRes.data.status === 'failed') {
                return NextResponse.json({ 
                    error: statusRes.data.error || 'La génération a échoué'
                }, { status: 500 });
            }

            attempts++;
        }

        return NextResponse.json({ 
            error: 'Timeout - la génération prend trop de temps'
        }, { status: 504 });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('Voice cloning error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
