import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { deductCredits } from '@/lib/credits';

export async function POST(req: NextRequest) {
    try {
        // Lire le cookie directement depuis le NextRequest (fiable en Next.js 16)
        const token = req.cookies.get('auth-jwt')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }
        
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_cedine_tools_2026_super_secure');
        const { payload } = await jwtVerify(token, secret);
        const email = payload.email as string;

        const formData = await req.formData();
        const text = formData.get('text') as string;

        if (!text || text.trim() === '') {
            return NextResponse.json({ error: 'Le texte est vide.' }, { status: 400 });
        }

        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            return NextResponse.json({ error: 'Clé API manquante.' }, { status: 500 });
        }

        // Prélever 5 crédits AVANT de lancer la génération
        try {
            await deductCredits(email, 5);
        } catch (creditError: any) {
            return NextResponse.json({ error: creditError.message }, { status: 402 }); // 402 Payment Required
        }

        // Limiter le texte pour l'analyse (max ~8000 caractères)
        const truncatedText = text.substring(0, 8000);

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                response_format: { type: "json_object" }, 
                messages: [
                    {
                        role: 'system',
                        content: `Tu es un Expert Linguistique spécialisé dans la Stylométrie et la détection d'Intelligence Artificielle (AI Detection).
Ton objectif est de déterminer si le texte fourni a été généré par un humain ou par une IA (comme ChatGPT, Claude, etc).

CRITÈRES D'ANALYSE :
- Perplexité (Burstiness) : Les humains écrivent avec des longueurs de phrases très variables et un vocabulaire hétérogène. L'IA a une cadence uniforme.
- Mots-clés IA : L'IA utilise souvent "Il est crucial de", "En conclusion", "Dans un paysage en constante évolution", "Méticuleusement", "En fin de compte".
- Hyper-structuration : Listes parfaites, ton excessivement neutre et professoral.

TA MISSION RÉPONSES JSON :
Analyse le texte et retourne UNIQUEMENT un objet JSON strictement ainsi :
{
  "aiProbability": <nombre_entre_0_et_100>,
  "verdict": "<Ex: 'Généré par IA' ou 'Très probablement Humain' ou 'Mixte/Remanié'>",
  "feedback": "<Ton analyse stylométrique expliquant pourquoi : perplexité, choix des mots, etc.>",
  "sentences": [
    {
      "text": "<une phrase extraite EXACTEMENT telle que dans le texte>",
      "isAi": <true_false>
    }
  ]
}

RÈGLES : 
- L'attribut "sentences" doit être un tableau découpant aléatoirement 4 à 8 phrases représentatives du texte (des phrases suspectes et des phrases normales).
- Assigne "isAi": true pour les phrases qui puent le ChatGPT, et "isAi": false pour les phrases dont la structure semble naturelle ou maladroite (humaine).`
                    },
                    {
                        role: 'user',
                        content: `=== TEXTE À ANALYSER ===\n\n${truncatedText}\n\n=== FIN DU TEXTE ===\n\nGénère ton analyse JSON détaillée :`
                    }
                ],
                temperature: 0.1,
                max_tokens: 3000,
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
            return NextResponse.json({ success: true, result: parsed });
        } catch(e) {
            console.error("JSON parse failure in ai-detector:", content);
            throw new Error("Erreur de décodage de l'analyse IA.");
        }

    } catch (error) {
        console.error('AI detector error:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Erreur interne lors de la détection' 
        }, { status: 500 });
    }
}
