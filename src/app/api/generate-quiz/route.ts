import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail, unauthorizedResponse } from '@/lib/auth-helpers';
import { deductCredits } from '@/lib/credits';

interface QuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
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

// Générer des questions avec Groq
async function generateQuizWithGroq(
    text: string, 
    apiKey: string, 
    numQuestions: number,
    difficulty: string
): Promise<QuizQuestion[]> {
    const maxChars = 5000; // Limite adaptée au plan Groq gratuit (6000 TPM)
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
    
    const difficultyPrompts: Record<string, string> = {
        'facile': 'Questions simples de compréhension basique, réponses évidentes dans le texte.',
        'moyen': 'Questions de compréhension et d\'analyse, nécessitant de bien comprendre le contenu.',
        'difficile': 'Questions d\'analyse approfondie, de synthèse et de réflexion critique.'
    };
    const difficultyPrompt = difficultyPrompts[difficulty] || difficultyPrompts['moyen'];
    
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
                    content: `Tu es un expert en création de quiz pédagogiques en français.
                    
Crée exactement ${numQuestions} questions à choix multiples basées sur le document fourni.

Niveau de difficulté: ${difficultyPrompt}

RÈGLES:
- Chaque question doit avoir exactement 4 options (A, B, C, D)
- Une seule réponse correcte par question
- Les questions doivent couvrir différentes parties du document
- Formule des questions claires et précises
- Les mauvaises réponses doivent être plausibles mais clairement fausses
- Ajoute une explication courte pour chaque réponse

Retourne UNIQUEMENT un JSON valide avec ce format:
[
  {
    "question": "La question ici ?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Explication de la bonne réponse..."
  }
]`
                },
                {
                    role: 'user',
                    content: `Génère ${numQuestions} questions de quiz à partir de ce document:\n\n${truncatedText}`
                }
            ],
            temperature: 0.7,
            max_tokens: 4000,
        }),
    });
    
    if (!response.ok) {
        const error = await response.text();
        console.error('Groq error:', response.status, error);
        throw new Error(`Groq API error: ${response.status}`);
    }
    
    const result = await response.json();
    const content = result.choices[0]?.message?.content?.trim() || '';
    
    // Extraire le JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        throw new Error('No JSON found in response');
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
        console.error("JSON parse failure in generate-quiz:", jsonStr);
        throw new Error("L'intelligence Artificielle a retourné un format invalide, veuillez réessayer avec un extrait plus court.");
    }
}

export async function POST(req: NextRequest) {
    try {
        const email = await getAuthEmail(req);
        if (!email) return unauthorizedResponse();

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const numQuestions = parseInt(formData.get('numQuestions') as string) || 10;
        const difficulty = (formData.get('difficulty') as string) || 'moyen';
        
        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
        }
        
        console.log('Generating quiz from:', file.name, file.type, file.size, 'bytes');
        console.log('Questions:', numQuestions, 'Difficulty:', difficulty);
        
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
            return NextResponse.json({ error: 'Format non supporté' }, { status: 400 });
        }
        
        if (!text || text.trim().length < 200) {
            return NextResponse.json({ error: 'Document trop court pour générer un quiz' }, { status: 400 });
        }
        
        console.log('Text extracted:', text.length, 'chars');
        
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            return NextResponse.json({ error: 'GROQ_API_KEY non configuré' }, { status: 500 });
        }

        try {
            await deductCredits(email, 5);
        } catch (creditError: any) {
            return NextResponse.json({ error: creditError.message }, { status: 402 });
        }

        // Générer le quiz
        const questions = await generateQuizWithGroq(text, groqKey, numQuestions, difficulty);
        
        console.log('Quiz generated:', questions.length, 'questions');
        
        return NextResponse.json({
            questions,
            documentName: file.name,
            difficulty,
            success: true
        });
        
    } catch (error) {
        console.error('Quiz generation error:', error);
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
