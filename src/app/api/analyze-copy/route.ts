import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail, unauthorizedResponse } from '@/lib/auth-helpers';
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

// Fonction pour évaluer avec Groq
async function analyzeAIPlagiarism(text: string, apiKey: string) {
    const maxChars = 5000; // Limite adaptée au plan Groq gratuit (6000 TPM)
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.1-8b-instant', // Modèle très rapide
            messages: [
                {
                    role: 'system',
                    content: `Tu es un expert sophistiqué en détection d'écriture par IA et en plagiat universitaire. 
Ton rôle est d'analyser le texte soumis et de déterminer la probabilité qu'il ait été généré par une IA (comme ChatGPT, Claude, Gemini, etc.) ou s'il s'agit d'un travail purement humain. Même si tes estimations sur le plagiat sont subjectives, utilise les indices sémantiques (répétitions, style encyclopédique, manque de voix personnelle) pour déduire ces scores.

RÈGLES IMPORTANTES:
- Tu DOIS répondre EXCLUSIVEMENT avec un objet JSON valide, sans balises markdown, sans texte additionnel.
- Formule tes scores sur 100.
- "aiScore" : Pourcentage de probabilité que le texte soit de l'IA (0 = 100% Humain, 100 = 100% IA).
- "plagiarismScore" : Évaluation heuristique du risque de plagiat (0 à 100).
- "humanScore" : 100 - aiScore.
- "summary" : Un court paragraphe d'explication de ton diagnostic.

Format attendu:
{
  "aiScore": 85,
  "humanScore": 15,
  "plagiarismScore": 25,
  "summary": "Le texte présente une structure très rigide et un vocabulaire typique des modèles de langage..."
}`
                },
                {
                    role: 'user',
                    content: `Analyse cette copie d'étudiant et retourne le verdict au format JSON:\n\n${truncatedText}`
                }
            ],
            temperature: 0.1, // Basse température pour des résultats plus analytiques
            max_tokens: 1000,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content?.trim() || '';

    // Nettoyer la réponse pour isoler le JSON si l'IA ajoute du texte autour
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON found in API response');
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
    } catch(e) {
        console.error("JSON parse failure in analyzeAIPlagiarism:", jsonStr);
        throw new Error("Erreur de parsing de l'IA.");
    }
}

export async function POST(req: NextRequest) {
    try {
        const email = await getAuthEmail(req);
        if (!email) return unauthorizedResponse();

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let text = '';

        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            text = await extractTextFromPdf(buffer);
        } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
            text = await extractTextFromDocx(buffer);
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
            text = buffer.toString('utf-8');
        } else {
            return NextResponse.json({ error: 'Format non supporté (Merci de fournir un PDF, DOCX ou TXT)' }, { status: 400 });
        }

        if (!text || text.trim().length < 50) {
            return NextResponse.json({ error: 'Document trop court ou illisible' }, { status: 400 });
        }

        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            return NextResponse.json({ error: 'Clé API Groq manquante' }, { status: 500 });
        }

        try {
            await deductCredits(email, 5);
        } catch (creditError: any) {
            return NextResponse.json({ error: creditError.message }, { status: 402 });
        }

        const analysis = await analyzeAIPlagiarism(text, groqKey);

        return NextResponse.json({
            success: true,
            documentName: file.name,
            results: analysis
        });

    } catch (error) {
        console.error('Copy analyzer error:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Erreur interne lors de l\'analyse' 
        }, { status: 500 });
    }
}
