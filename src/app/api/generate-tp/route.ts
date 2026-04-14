import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail, unauthorizedResponse } from '@/lib/auth-helpers';
import { deductCredits } from '@/lib/credits';

interface TPStructure {
    numero: number;
    titre: string;
    unite: string;
    theme: string;
    lieu: string;
    duree: string;
    objectifs: string[];
    protocole: {
        etape: number;
        titre: string;
        description: string;
        sousPoints?: string[];
    }[];
    livrable: {
        description: string;
        elements: string[];
    };
}

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


// Générer le TP avec Groq
async function generateTPWithGroq(text: string, apiKey: string, tpNumber: number): Promise<TPStructure> {
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
                    content: `Tu es un expert en création de Travaux Pratiques (TP) pédagogiques.
Tu dois créer un TP structuré basé sur le contenu fourni.

STRUCTURE OBLIGATOIRE du TP:
1. Un titre clair et descriptif
2. L'unité concernée (extraite du document)
3. Un thème précis
4. Lieu et durée suggérés
5. 2-4 objectifs pédagogiques clairs (commençant par un verbe d'action)
6. Un protocole en 3-5 étapes détaillées avec sous-points si nécessaire
7. Un livrable concret avec ses éléments constitutifs

Retourne UNIQUEMENT un JSON valide avec cette structure exacte:
{
    "numero": ${tpNumber},
    "titre": "TITRE DU TP",
    "unite": "Unité X",
    "theme": "Description du thème",
    "lieu": "Lieu suggéré pour le TP",
    "duree": "Durée estimée",
    "objectifs": ["Objectif 1", "Objectif 2"],
    "protocole": [
        {
            "etape": 1,
            "titre": "Titre de l'étape",
            "description": "Description détaillée",
            "sousPoints": ["Point 1", "Point 2"]
        }
    ],
    "livrable": {
        "description": "Description du livrable attendu",
        "elements": ["Élément 1", "Élément 2"]
    }
}`
                },
                {
                    role: 'user',
                    content: `Crée un TP pédagogique basé sur ce contenu de cours:\n\n${text.substring(0, 5000)}`
                }
            ],
            temperature: 0.7,
            max_tokens: 2000,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content?.trim() || '';
    
    // Extraire le JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Impossible de parser la réponse JSON');
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
        console.error("JSON parse failure in generate-tp:", jsonStr);
        throw new Error("L'intelligence Artificielle a retourné un format invalide, veuillez réessayer avec un extrait plus court.");
    }
}

export async function POST(req: NextRequest) {
    try {
        const email = await getAuthEmail(req);
        if (!email) return unauthorizedResponse();

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const tpNumber = parseInt(formData.get('tpNumber') as string) || 1;

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
        }

        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            return NextResponse.json({ error: 'Clé API Groq non configurée' }, { status: 500 });
        }

        console.log('Processing file for TP:', file.name, file.type, file.size, 'bytes');

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

        if (!text || text.trim().length < 100) {
            return NextResponse.json({ error: 'Document trop court ou vide' }, { status: 400 });
        }

        try {
            await deductCredits(email, 5);
        } catch (creditError: any) {
            return NextResponse.json({ error: creditError.message }, { status: 402 });
        }

        console.log('Text extracted:', text.length, 'chars');

        // Générer le TP
        const tp = await generateTPWithGroq(text, groqKey, tpNumber);
        
        return NextResponse.json({
            tp,
            documentName: file.name,
            success: true
        });

    } catch (error) {
        console.error('TP generation error:', error);
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
