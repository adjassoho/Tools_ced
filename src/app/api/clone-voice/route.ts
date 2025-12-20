import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const text = formData.get('text') as string;

        if (!text) {
            return NextResponse.json({ error: 'Texte requis' }, { status: 400 });
        }

        // Limiter la longueur du texte pour le plan gratuit
        const maxLength = 2500;
        const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

        const apiKey = process.env.ELEVENLABS_API_KEY;

        if (!apiKey) {
            return NextResponse.json({
                error: 'Configurez ELEVENLABS_API_KEY dans .env.local',
                demo: true
            }, { status: 400 });
        }

        console.log('Starting TTS with ElevenLabs...');
        console.log('Text length:', truncatedText.length, 'chars');

        // Utiliser une voix française pré-existante (gratuit)
        // Liste des voix françaises disponibles sur ElevenLabs
        const frenchVoiceId = 'pFZP5JQG7iQjIQuC4Bku'; // Lily - voix française

        // Générer le TTS
        const https = require('https');

        const ttsBody = JSON.stringify({
            text: truncatedText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
            },
        });

        const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
            const options = {
                hostname: 'api.elevenlabs.io',
                path: `/v1/text-to-speech/${frenchVoiceId}`,
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(ttsBody)
                },
                timeout: 120000
            };

            const request = https.request(options, (res: any) => {
                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('end', () => {
                    console.log('TTS status:', res.statusCode);
                    
                    if (res.statusCode !== 200) {
                        const errorText = Buffer.concat(chunks).toString();
                        console.error('TTS error:', errorText);
                        
                        try {
                            const error = JSON.parse(errorText);
                            if (error.detail?.status === 'quota_exceeded') {
                                reject(new Error('Quota ElevenLabs dépassé. Attendez le renouvellement mensuel ou passez à un plan payant.'));
                            } else {
                                reject(new Error(error.detail?.message || error.detail || 'Erreur TTS'));
                            }
                        } catch {
                            reject(new Error(`Erreur ${res.statusCode}`));
                        }
                        return;
                    }
                    
                    resolve(Buffer.concat(chunks));
                });
            });

            request.on('error', (e: Error) => reject(e));
            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Timeout'));
            });

            request.write(ttsBody);
            request.end();
        });

        console.log('Audio generated:', audioBuffer.length, 'bytes');

        const base64Audio = audioBuffer.toString('base64');
        
        return NextResponse.json({
            audio: `data:audio/mpeg;base64,${base64Audio}`,
            success: true,
            note: file ? 'Note: Le clonage vocal nécessite un abonnement ElevenLabs. Audio généré avec une voix française standard.' : undefined
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('TTS Error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
