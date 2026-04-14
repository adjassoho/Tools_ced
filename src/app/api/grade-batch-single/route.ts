import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail, unauthorizedResponse } from '@/lib/auth-helpers';
import { deductCredits } from '@/lib/credits';

// Reuse extraction functions
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

export async function POST(req: NextRequest) {
    try {
        const email = await getAuthEmail(req);
        if (!email) return unauthorizedResponse();

        const formData = await req.formData();
        const studentFile = formData.get('studentFile') as File;
        const courseText = formData.get('courseText') as string;
        const examText = formData.get('examText') as string;
        const baremeStr = formData.get('bareme') as string;

        if (!studentFile || !courseText || !examText || !baremeStr) {
            return NextResponse.json({ error: 'Il manque un paramètre essentiel.' }, { status: 400 });
        }

        const buffer = Buffer.from(await studentFile.arrayBuffer());
        let studentText = '';

        if (studentFile.type === 'application/pdf' || studentFile.name.toLowerCase().endsWith('.pdf')) {
            studentText = await extractTextFromPdf(buffer);
        } else if (studentFile.type.includes('word') || studentFile.name.toLowerCase().endsWith('.docx') || studentFile.name.toLowerCase().endsWith('.doc')) {
            studentText = await extractTextFromDocx(buffer);
        } else if (studentFile.type === 'text/plain' || studentFile.name.toLowerCase().endsWith('.txt')) {
            studentText = buffer.toString('utf-8');
        } else {
            return NextResponse.json({ error: `Format non supporté.` }, { status: 400 });
        }

        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            return NextResponse.json({ error: 'Configuration serveur : Clé API Groq manquante.' }, { status: 500 });
        }

        try {
            await deductCredits(email, 3);
        } catch (creditError: any) {
            return NextResponse.json({ error: creditError.message }, { status: 402 });
        }

        const maxChars = 6000;
        const truncatedStudent = studentText.substring(0, maxChars);
        const truncatedCourse = courseText.substring(0, maxChars);
        const truncatedExam = examText.substring(0, maxChars);

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile', // Remplacement du 8b par le 70b (Modèle ultra intelligent) pour arrêter les hallucinations
                response_format: { type: "json_object" }, 
                messages: [
                    {
                        role: 'system',
                        content: `Tu es un professeur de correction universitaire. Ton rôle est d'évaluer la copie d'un étudiant avec une rigueur intellectuelle parfaite.

BARÈME EXACT par question (format JSON) :
${baremeStr}

RÈGLES D'ÉVALUATION (Très important) :
ATTENTION : La copie de l'étudiant est souvent un formulaire où l'énoncé de la question est DÉJÀ ÉCRIT. La vraie réponse de l'étudiant se trouve généralement *juste en dessous* de l'énoncé. Si le texte passe directement à la question suivante, c'est que l'étudiant n'a PAS écrit de réponse.

1. Pour CHAQUE question du barème, recherche la réponse tapée par l'étudiant.
2. EXCLUSION TOTALE (0 point imposé) : Si l'étudiant n'a rien écrit en dessous de la question (copie vierge), s'il répond à côté, ou écrit des expressions d'ignorance comme "je ne sais pas", "aucune idée", tu as l'INJONCTION STRICte de mettre exactement 0. Zéro point de consolation n'est autorisé.
3. Cas PARTIEL : Si la réponse contient seulement une partie des éléments attendus, donne un score partiel.
4. Cas MAXIMAL : Si la réponse est exacte ou très similaire aux attentes du barème, donne TOUS les points.
5. Format de retour obligatoire (JSON pur) :
{
  "totalScore": 0,
  "questions": [
    {
      "id": "<id_de_la_question>",
      "analyse": "<Prouve que tu as isolé la réponse de l'énoncé. Cite brièvement la réponse de l'étudiant, ou confirme l'absence de texte de réponse.>",
      "score": <note_attribuée>,
      "feedback": "<Justification claire pour l'étudiant>"
    }
  ]
}`
                    },
                    {
                        role: 'user',
                        content: `=== SUPPORT DE COURS ===\n${truncatedCourse}\n\n=== EPREUVE / SUJET ===\n${truncatedExam}\n\n=== COPIE DE L'ÉTUDIANT ===\n${truncatedStudent}\n\nGénère le dictionnaire JSON final:`
                    }
                ],
                temperature: 0.1,
                max_tokens: 2000,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq ERROR:", errorText);
            throw new Error(`Erreur API Groq (${response.status})`);
        }

        const result = await response.json();
        const content = result.choices[0]?.message?.content?.trim() || '';

        try {
            const parsed = JSON.parse(content);
            
            // Sécurité absolue: Ne jamais faire confiance aux mathématiques et aux limites de l'IA (LLaMa 8b)
            // 1. Lire le barème pour connaître le plafond exact de chaque question
            const baremeParsed = JSON.parse(baremeStr);
            let calculatedTotal = 0;
            
            if (Array.isArray(parsed.questions)) {
                parsed.questions = parsed.questions.map((q: any) => {
                    // Trouver le barème correspondant
                    const baremeItem = baremeParsed.find((b: any) => b.id === q.id);
                    const maxPoints = baremeItem ? Number(baremeItem.points) : 0;
                    
                    // S'assurer que le score est un nombre, positif, et ne dépasse JAMAIS le max
                    let safeScore = Number(q.score) || 0;
                    if (safeScore < 0) safeScore = 0;
                    if (safeScore > maxPoints) safeScore = maxPoints;

                    calculatedTotal += safeScore;

                    return {
                        ...q,
                        score: safeScore
                    };
                });
            }

            // Ignorer le totalScore de l'IA qui fait souvent des erreurs d'addition
            parsed.totalScore = calculatedTotal;

            return NextResponse.json({ success: true, result: parsed });
        } catch(e) {
            console.error("JSON parse failure in grade-batch:", content);
            throw new Error("L'IA a retourné un format invalide pour cette copie.");
        }

    } catch (error) {
        console.error('Batch analyzer error:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Erreur interne lors de la correction' 
        }, { status: 500 });
    }
}
