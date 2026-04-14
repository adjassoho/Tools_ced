import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail, unauthorizedResponse } from '@/lib/auth-helpers';
import { deductCredits } from '@/lib/credits';

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    const { extractText } = await import('unpdf');
    const uint8Array = new Uint8Array(buffer);
    const result = await extractText(uint8Array);
    if (Array.isArray(result.text)) {
        return result.text.join('\n\n');
    }
    return result.text;
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
}

async function gradeWithAI(studentText: string, rubricText: string, apiKey: string) {
    const maxChars = 5000; // Limite adaptée au plan Groq gratuit (6000 TPM)
    const truncatedStudentText = studentText.length > maxChars ? studentText.substring(0, maxChars) : studentText;
    const truncatedRubricText = rubricText.length > maxChars ? rubricText.substring(0, maxChars) : rubricText;

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
                    content: `Tu es un professeur de correction universitaire impartial, strict mais juste. 
Ton rôle est d'évaluer une copie d'étudiant STRICTEMENT et UNIQUEMENT en te basant sur le canevas de correction (barème ou corrigé type) fourni. Ne fais pas d'hypothèses en dehors du canevas.

RÈGLES IMPORTANTES:
- Tu DOIS répondre EXCLUSIVEMENT avec un objet JSON valide, sans balises markdown autour du JSON (\`\`\`json etc) et sans texte additionnel.
- "score": La note attribuée sur 20 (sous forme de nombre entier ou décimal).
- "strengths": Un tableau de chaînes de caractères listant les points de la copie qui correspondent bien au canevas.
- "weaknesses": Un tableau de chaînes de caractères listant les éléments manquants, erronés ou hors-sujet par rapport au canevas.
- "feedback": Un paragraphe de commentaire global adressé à l'étudiant.

Format attendu exactement:
{
  "score": 14.5,
  "strengths": ["Bonne introduction des concepts", "Respect du schéma demandé"],
  "weaknesses": ["Omission de la conclusion majeure attendue", "Calculs erronés dans la partie 2"],
  "feedback": "L'ensemble est convenable et démontre une bonne compréhension des processus. Toutefois, la seconde partie s'éloigne sensiblement du barème attendu..."
}`
                },
                {
                    role: 'user',
                    content: `=== CANEVAS DU PROFESSEUR (RÈGLES/BARÈME) ===\n${truncatedRubricText}\n\n=== COPIE DE L'ÉTUDIANT ===\n${truncatedStudentText}\n\nNote cette copie et retourne le résultat au format JSON:`
                }
            ],
            temperature: 0.1,
            max_tokens: 1500,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content?.trim() || '';

    let jsonStr = content;
    // Nettoyer si l'IA ajoute des balises
    if (content.includes('\`\`\`json')) {
        jsonStr = content.split('\`\`\`json')[1].split('\`\`\`')[0].trim();
    } else if (content.includes('\`\`\`')) {
        jsonStr = content.split('\`\`\`')[1].trim();
    }
    
    // Extraction stricte
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Le modèle n\'a pas retourné un JSON valide.');
    
    jsonStr = match[0];
    
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
        console.error("JSON parse failure in grade-copy:", jsonStr);
        throw new Error("L'intelligence Artificielle a retourné un format invalide, veuillez réessayer avec un extrait plus court.");
    }
}

export async function POST(req: NextRequest) {
    try {
        const email = await getAuthEmail(req);
        if (!email) return unauthorizedResponse();

        const formData = await req.formData();
        const studentFile = formData.get('studentFile') as File;
        const rubricFile = formData.get('rubricFile') as File;

        if (!studentFile || !rubricFile) {
            return NextResponse.json({ error: 'Il manque soit la copie, soit le canevas.' }, { status: 400 });
        }

        async function extractFileText(file: File) {
            const buffer = Buffer.from(await file.arrayBuffer());
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                return await extractTextFromPdf(buffer);
            } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
                return await extractTextFromDocx(buffer);
            } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                return buffer.toString('utf-8');
            } else {
                throw new Error(`Format non supporté pour ${file.name}`);
            }
        }

        const studentText = await extractFileText(studentFile);
        const rubricText = await extractFileText(rubricFile);

        if (!studentText || !rubricText) {
            return NextResponse.json({ error: 'Le contenu d\'un des documents est illisible ou vide.' }, { status: 400 });
        }

        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            return NextResponse.json({ error: 'Configuration serveur : Clé API Groq manquante.' }, { status: 500 });
        }

        try {
            await deductCredits(email, 5);
        } catch (creditError: any) {
            return NextResponse.json({ error: creditError.message }, { status: 402 });
        }

        const analysis = await gradeWithAI(studentText, rubricText, groqKey);

        return NextResponse.json({
            success: true,
            results: analysis
        });

    } catch (error) {
        console.error('Grade analyzer error:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Erreur interne lors de la correction' 
        }, { status: 500 });
    }
}
