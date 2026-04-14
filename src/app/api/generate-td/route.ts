import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail, unauthorizedResponse } from '@/lib/auth-helpers';
import { deductCredits } from '@/lib/credits';

interface TDQuestion {
    numero: number;
    question: string;
    contexte?: string;
    lignesReponse: number;
}

interface TDExercice {
    numero: number;
    titre: string;
    contexte?: string;
    questions: TDQuestion[];
}

interface TDStructure {
    numero: number;
    titre: string;
    matiere: string;
    unite: string;
    niveau: string;
    introduction: string;
    objectifs: string[];
    exercices: TDExercice[];
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


// Générer le TD avec Groq
async function generateTDWithGroq(text: string, apiKey: string, tdNumber: number, difficulty: string): Promise<TDStructure> {
    const difficultyPrompt = {
        'facile': 'Questions simples de compréhension et de définition.',
        'moyen': 'Questions d\'analyse et d\'application des concepts.',
        'difficile': 'Questions de synthèse, études de cas complexes et réflexion critique.'
    }[difficulty] || 'Questions variées.';

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
                    content: `Tu es un expert en création de Travaux Dirigés (TD) pédagogiques universitaires.
Tu dois créer un TD structuré basé sur le contenu fourni.

NIVEAU DE DIFFICULTÉ: ${difficultyPrompt}

STRUCTURE OBLIGATOIRE du TD:
1. Un titre clair lié au contenu
2. La matière/discipline
3. L'unité d'enseignement
4. Le niveau suggéré
5. Une introduction contextuelle (2-3 phrases)
6. 3-5 objectifs pédagogiques (verbes d'action: Analyser, Comprendre, Identifier, etc.)
7. 3-4 exercices avec:
   - Un titre thématique
   - Un contexte optionnel (pour les études de cas)
   - 2-4 questions numérotées
   - Nombre de lignes suggéré pour chaque réponse (3-8 lignes selon complexité)

TYPES DE QUESTIONS À INCLURE:
- Questions de définition/compréhension
- Questions d'analyse
- Questions d'application/exemples
- Études de cas avec mise en situation

Retourne UNIQUEMENT un JSON valide:
{
    "numero": ${tdNumber},
    "titre": "Titre du TD",
    "matiere": "Nom de la matière",
    "unite": "Unité X",
    "niveau": "Niveau suggéré",
    "introduction": "Texte d'introduction...",
    "objectifs": ["Objectif 1", "Objectif 2"],
    "exercices": [
        {
            "numero": 1,
            "titre": "Titre de l'exercice",
            "contexte": "Contexte optionnel pour études de cas",
            "questions": [
                {"numero": 1, "question": "Question...", "lignesReponse": 5},
                {"numero": 2, "question": "Question...", "lignesReponse": 4}
            ]
        }
    ]
}`
                },
                {
                    role: 'user',
                    content: `Crée un TD pédagogique complet basé sur ce contenu de cours:\n\n${text.substring(0, 5000)}`
                }
            ],
            temperature: 0.7,
            max_tokens: 3000,
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
        console.error("JSON parse failure in generate-td:", jsonStr);
        throw new Error("L'intelligence Artificielle a retourné un format invalide, veuillez réessayer avec un extrait plus court.");
    }
}

export async function POST(req: NextRequest) {
    try {
        const email = await getAuthEmail(req);
        if (!email) return unauthorizedResponse();

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const tdNumber = parseInt(formData.get('tdNumber') as string) || 1;
        const difficulty = (formData.get('difficulty') as string) || 'moyen';

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
        }

        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            return NextResponse.json({ error: 'Clé API Groq non configurée' }, { status: 500 });
        }

        console.log('Processing file for TD:', file.name, file.type, file.size, 'bytes');

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

        // Générer le TD
        const td = await generateTDWithGroq(text, groqKey, tdNumber, difficulty);
        
        return NextResponse.json({
            td,
            documentName: file.name,
            success: true
        });

    } catch (error) {
        console.error('TD generation error:', error);
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
