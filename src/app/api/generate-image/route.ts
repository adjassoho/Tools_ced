import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { deductCredits } from '@/lib/credits';

// Extraire le texte d'un PDF
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    const { extractText } = await import('unpdf');
    const uint8Array = new Uint8Array(buffer);
    const result = await extractText(uint8Array);
    if (Array.isArray(result.text)) {
        return result.text.join('\n\n');
    }
    return result.text;
}

// Extraire le texte d'un DOCX
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
}

// Extraire le texte d'un TXT
function extractTextFromTxt(buffer: Buffer): string {
    return buffer.toString('utf-8');
}

// Générer un prompt d'image avec Groq
async function generateImagePrompt(text: string, apiKey: string, style: string): Promise<{ prompt: string; title: string }> {
    const styleDescriptions: Record<string, string> = {
        'realistic': 'photorealistic, DSLR photography, 85mm lens, natural lighting, sharp focus on faces',
        'illustration': 'digital illustration, colorful, educational style, clean lines',
        'artistic': 'artistic oil painting, vibrant colors, expressive brushstrokes',
        'infographic': 'clean infographic style, icons, diagrams, educational, minimal'
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: `Tu es un expert en création de prompts pour la génération d'images photoréalistes.
Tu dois créer un prompt en ANGLAIS pour générer une image illustrant le contenu d'un document.

RÈGLES IMPORTANTES:
1. L'image DOIT représenter un CONTEXTE AFRICAIN (Afrique de l'Ouest, Bénin, villages béninois, etc.)
2. L'image doit être en lien DIRECT avec le sujet du document
3. Le prompt doit être très descriptif (200-250 mots)
4. Style demandé: ${styleDescriptions[style] || 'photorealistic'}

TECHNIQUES POUR IMAGES RÉALISTES:
- Spécifier "photorealistic, ultra detailed, 8k resolution"
- Pour les personnes: "detailed facial features, natural skin texture, realistic eyes, authentic African features"
- Éclairage: "golden hour lighting, soft natural light, cinematic lighting"
- Caméra: "shot on Canon EOS R5, 85mm portrait lens, shallow depth of field"
- Éviter les foules floues, préférer des groupes de 3-6 personnes bien définies

CONTEXTE AFRICAIN SPÉCIFIQUE:
- Villages béninois, architecture en terre/banco
- Marchés locaux colorés, pagnes traditionnels
- Paysages: savane, palmiers, baobabs
- Activités: agriculture, pêche, artisanat, réunions communautaires
- Vêtements traditionnels africains colorés

Retourne un JSON:
{
    "prompt": "Le prompt détaillé en anglais...",
    "title": "Titre court en français décrivant l'image"
}`
                },
                {
                    role: 'user',
                    content: `Crée un prompt d'image photoréaliste pour illustrer ce document:\n\n${text.substring(0, 4000)}`
                }
            ],
            temperature: 0.7,
            max_tokens: 600,
        }),
    });

    if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content?.trim() || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        return {
            prompt: content,
            title: "Image générée"
        };
    }
    
    let jsonStr = jsonMatch[0];
    
    // Robuste : échapper les retours à la ligne générés par Llama à l'intérieur des valeurs JSON
    jsonStr = jsonStr.replace(/\\n/g, "\\n")
               .replace(/\\'/g, "\\'")
               .replace(/\\"/g, '\\"')
               .replace(/\\&/g, "\\&")
               .replace(/\\r/g, "\\r")
               .replace(/\\t/g, "\\t")
               .replace(/\\b/g, "\\b")
               .replace(/\\f/g, "\\f");

    jsonStr = jsonStr.replace(/[\u0000-\u0019]+/g, " "); 

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("JSON parse failure in generate-image:", jsonStr);
        return {
            prompt: "A beautiful African village scene with people, photorealistic",
            title: "Scène locale"
        };
    }
}


// Générer l'image avec Pollinations.ai (gratuit)
async function generateImageWithPollinations(prompt: string, width: number = 1024, height: number = 1024): Promise<string> {
    // Ajouter des paramètres de qualité au prompt
    const qualityBoost = "ultra realistic, 8k uhd, high resolution, detailed faces, sharp focus, professional photography, masterpiece";
    const negativePrompt = "blurry, low quality, distorted faces, bad anatomy, deformed, ugly, duplicate";
    
    const enhancedPrompt = `${prompt}, ${qualityBoost}`;
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    
    // Utiliser le modèle flux-realism pour meilleure qualité des visages
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=flux-realism&nologo=true&negative=${encodeURIComponent(negativePrompt)}`;
    
    return imageUrl;
}

export async function POST(req: NextRequest) {
    try {
        // Lire le cookie directement depuis le NextRequest (fiable en Next.js 16)
        const token = req.cookies.get('auth-jwt')?.value;
        if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_cedine_tools_2026_super_secure');
        const { payload } = await jwtVerify(token, secret);
        const email = payload.email as string;

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const style = (formData.get('style') as string) || 'realistic';
        const aspectRatio = (formData.get('aspectRatio') as string) || '1:1';

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
        }

        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            return NextResponse.json({ error: 'Clé API Groq non configurée' }, { status: 500 });
        }

        console.log('Processing file for image generation:', file.name);

        // Lire le fichier
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let text = '';

        // Extraire le texte selon le type
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
            text = extractTextFromTxt(buffer);
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            text = await extractTextFromPdf(buffer);
        } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
            text = await extractTextFromDocx(buffer);
        } else {
            return NextResponse.json({ error: 'Format non supporté (PDF, DOCX, TXT)' }, { status: 400 });
        }

        if (!text || text.trim().length < 50) {
            return NextResponse.json({ error: 'Document trop court ou vide' }, { status: 400 });
        }

        // Prélever 10 crédits AVANT de lancer la génération
        try {
            await deductCredits(email, 10);
        } catch (creditError: any) {
            return NextResponse.json({ error: creditError.message }, { status: 402 }); // 402 Payment Required
        }

        // Déterminer les dimensions selon le ratio
        let width = 1024, height = 1024;
        switch (aspectRatio) {
            case '16:9':
                width = 1280; height = 720;
                break;
            case '9:16':
                width = 720; height = 1280;
                break;
            case '4:3':
                width = 1024; height = 768;
                break;
            case '3:4':
                width = 768; height = 1024;
                break;
            default: // 1:1
                width = 1024; height = 1024;
        }

        // Générer le prompt avec Groq
        console.log('Generating image prompt with Groq...');
        const { prompt, title } = await generateImagePrompt(text, groqKey, style);
        console.log('Generated prompt:', prompt.substring(0, 100) + '...');

        // Générer l'image avec Pollinations
        console.log('Generating image with Pollinations...');
        const imageUrl = await generateImageWithPollinations(prompt, width, height);

        return NextResponse.json({
            imageUrl,
            prompt,
            title,
            style,
            dimensions: { width, height },
            success: true
        });

    } catch (error) {
        console.error('Image generation error:', error);
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
