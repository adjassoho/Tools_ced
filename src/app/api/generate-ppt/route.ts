import { NextRequest, NextResponse } from 'next/server';
import PptxGenJS from 'pptxgenjs';

// Fonction pour appeler Groq
async function callGroq(prompt: string, systemPrompt: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY non configurée');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 4000,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erreur Groq');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Couleurs de thème
const themes: Record<string, { primary: string; secondary: string; accent: string; bg: string; text: string }> = {
    professional: { primary: '1a365d', secondary: '2c5282', accent: '3182ce', bg: 'ffffff', text: '1a202c' },
    modern: { primary: '6b46c1', secondary: '805ad5', accent: 'd53f8c', bg: 'faf5ff', text: '1a202c' },
    nature: { primary: '276749', secondary: '38a169', accent: '48bb78', bg: 'f0fff4', text: '1a202c' },
    ocean: { primary: '0077b6', secondary: '00b4d8', accent: '90e0ef', bg: 'caf0f8', text: '03045e' },
    sunset: { primary: 'c2410c', secondary: 'ea580c', accent: 'fb923c', bg: 'fff7ed', text: '1c1917' },
    dark: { primary: '1e293b', secondary: '334155', accent: '60a5fa', bg: '0f172a', text: 'f1f5f9' },
};

interface SlideContent {
    title: string;
    subtitle?: string;
    bullets?: string[];
    content?: string;
    type: 'title' | 'content' | 'bullets' | 'section' | 'conclusion';
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const topic = formData.get('topic') as string;
        const slideCount = parseInt(formData.get('slideCount') as string) || 10;
        const theme = (formData.get('theme') as string) || 'professional';
        const language = (formData.get('language') as string) || 'fr';

        let documentContent = '';

        // Extraire le contenu du document si fourni
        if (file) {
            const buffer = Buffer.from(await file.arrayBuffer());
            
            if (file.name.endsWith('.txt')) {
                documentContent = buffer.toString('utf-8');
            } else if (file.name.endsWith('.docx')) {
                // Extraction basique du texte DOCX
                const mammoth = await import('mammoth');
                const result = await mammoth.extractRawText({ buffer });
                documentContent = result.value;
            } else {
                documentContent = buffer.toString('utf-8');
            }
        }

        if (!documentContent && !topic) {
            return NextResponse.json({ error: 'Veuillez fournir un document ou un sujet' }, { status: 400 });
        }

        // Générer le contenu des slides avec Groq
        const systemPrompt = `Tu es un expert en création de présentations PowerPoint professionnelles.
Tu dois générer le contenu structuré pour une présentation de ${slideCount} slides.
Langue: ${language === 'fr' ? 'Français' : 'English'}

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après.
Le JSON doit être un tableau d'objets avec cette structure:
[
  {
    "title": "Titre de la slide",
    "subtitle": "Sous-titre optionnel",
    "bullets": ["Point 1", "Point 2", "Point 3"],
    "type": "title|content|bullets|section|conclusion"
  }
]

Types de slides:
- "title": Slide de titre (première slide)
- "section": Slide de section/transition
- "bullets": Slide avec liste à puces
- "content": Slide avec contenu textuel
- "conclusion": Slide de conclusion (dernière slide)

Règles:
- Maximum 5-6 points par slide
- Texte concis et impactant
- Progression logique des idées
- Première slide = titre, dernière = conclusion`;

        const userPrompt = documentContent 
            ? `Crée une présentation de ${slideCount} slides basée sur ce document:\n\n${documentContent.substring(0, 8000)}`
            : `Crée une présentation de ${slideCount} slides sur le sujet: ${topic}`;

        console.log('Génération du contenu avec Groq...');
        const groqResponse = await callGroq(userPrompt, systemPrompt);
        
        // Parser le JSON
        let slides: SlideContent[];
        try {
            // Nettoyer la réponse pour extraire le JSON
            let jsonStr = groqResponse.trim();
            const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }
            slides = JSON.parse(jsonStr);
        } catch (e) {
            console.error('Erreur parsing JSON:', groqResponse);
            return NextResponse.json({ error: 'Erreur lors de la génération du contenu' }, { status: 500 });
        }

        // Créer le PowerPoint
        const pptx = new PptxGenJS();
        const colors = themes[theme] || themes.professional;

        pptx.author = 'Dlearning INE UAC';
        pptx.title = slides[0]?.title || 'Présentation';
        pptx.subject = topic || 'Présentation générée par IA';
        pptx.company = 'Institut National de l\'Eau';

        // Générer chaque slide
        for (let i = 0; i < slides.length; i++) {
            const slideData = slides[i];
            const slide = pptx.addSlide();

            // Fond
            slide.background = { color: colors.bg };

            if (slideData.type === 'title') {
                // Slide de titre
                slide.background = { color: colors.primary };
                
                slide.addText(slideData.title, {
                    x: 0.5, y: 2, w: 9, h: 1.5,
                    fontSize: 44, bold: true, color: 'ffffff',
                    align: 'center', valign: 'middle'
                });

                if (slideData.subtitle) {
                    slide.addText(slideData.subtitle, {
                        x: 0.5, y: 3.5, w: 9, h: 0.8,
                        fontSize: 24, color: 'ffffff',
                        align: 'center', valign: 'middle'
                    });
                }

                // Footer
                slide.addText('Dlearning INE UAC', {
                    x: 0.5, y: 5, w: 9, h: 0.4,
                    fontSize: 12, color: 'cccccc',
                    align: 'center'
                });

            } else if (slideData.type === 'section') {
                // Slide de section
                slide.background = { color: colors.secondary };
                
                slide.addText(slideData.title, {
                    x: 0.5, y: 2.2, w: 9, h: 1.2,
                    fontSize: 36, bold: true, color: 'ffffff',
                    align: 'center', valign: 'middle'
                });

            } else if (slideData.type === 'conclusion') {
                // Slide de conclusion
                slide.background = { color: colors.primary };
                
                slide.addText(slideData.title, {
                    x: 0.5, y: 1.5, w: 9, h: 1,
                    fontSize: 36, bold: true, color: 'ffffff',
                    align: 'center'
                });

                if (slideData.bullets && slideData.bullets.length > 0) {
                    const bulletText = slideData.bullets.map(b => `• ${b}`).join('\n');
                    slide.addText(bulletText, {
                        x: 1, y: 2.8, w: 8, h: 2,
                        fontSize: 18, color: 'ffffff',
                        align: 'center', valign: 'top'
                    });
                }

                slide.addText('Merci de votre attention !', {
                    x: 0.5, y: 4.5, w: 9, h: 0.5,
                    fontSize: 20, italic: true, color: 'cccccc',
                    align: 'center'
                });

            } else {
                // Slides de contenu standard
                // Barre de titre
                slide.addShape('rect', {
                    x: 0, y: 0, w: 10, h: 1.2,
                    fill: { color: colors.primary }
                });

                slide.addText(slideData.title, {
                    x: 0.5, y: 0.3, w: 9, h: 0.7,
                    fontSize: 28, bold: true, color: 'ffffff'
                });

                // Contenu
                if (slideData.bullets && slideData.bullets.length > 0) {
                    const bulletItems = slideData.bullets.map(text => ({
                        text: text,
                        options: { bullet: { type: 'bullet', color: colors.accent }, indentLevel: 0 }
                    }));

                    slide.addText(bulletItems, {
                        x: 0.5, y: 1.5, w: 9, h: 3.5,
                        fontSize: 18, color: colors.text,
                        valign: 'top',
                        paraSpaceAfter: 12
                    });
                } else if (slideData.content) {
                    slide.addText(slideData.content, {
                        x: 0.5, y: 1.5, w: 9, h: 3.5,
                        fontSize: 16, color: colors.text,
                        valign: 'top'
                    });
                }

                // Numéro de page
                slide.addText(`${i + 1}`, {
                    x: 9, y: 5.2, w: 0.5, h: 0.3,
                    fontSize: 10, color: colors.secondary,
                    align: 'right'
                });
            }
        }

        // Générer le fichier
        const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
        const base64 = pptxBuffer.toString('base64');

        return NextResponse.json({
            success: true,
            pptx: `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${base64}`,
            slideCount: slides.length,
            title: slides[0]?.title || 'Présentation'
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('Erreur génération PPT:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
