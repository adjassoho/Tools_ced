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
            max_tokens: 6000,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erreur Groq');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Générer une image avec FLUX sur Replicate (haute qualité, contexte africain)
async function generateAfricanImageWithFlux(slideTitle: string, slideContent: string): Promise<string | null> {
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) return null;

    const africanContext = "West African setting, Benin, authentic African environment";
    const qualityBoost = "photorealistic, professional photography, high quality, detailed, natural lighting, vibrant colors";
    const prompt = `${slideTitle}. ${slideContent.substring(0, 150)}. ${africanContext}. ${qualityBoost}`;

    try {
        const createResponse = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${replicateToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                input: {
                    prompt: prompt,
                    aspect_ratio: '16:9',
                    num_outputs: 1,
                    output_format: 'jpg',
                    output_quality: 90,
                    num_inference_steps: 4,
                    go_fast: true
                }
            }),
        });

        if (!createResponse.ok) {
            console.error('FLUX create error:', await createResponse.text());
            return null;
        }

        const prediction = await createResponse.json();
        
        if (prediction.status === 'succeeded' && prediction.output) {
            return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        }

        const predictionId = prediction.id;
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000));
            
            const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: { 'Authorization': `Bearer ${replicateToken}` }
            });

            const statusData = await statusResponse.json();

            if (statusData.status === 'succeeded') {
                return Array.isArray(statusData.output) ? statusData.output[0] : statusData.output;
            } else if (statusData.status === 'failed') {
                console.error('FLUX generation failed:', statusData.error);
                return null;
            }
            attempts++;
        }
        return null;
    } catch (error) {
        console.error('FLUX generation error:', error);
        return null;
    }
}

// Télécharger une image et la convertir en base64
async function downloadImageAsBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch (error) {
        console.error('Error downloading image:', error);
        return null;
    }
}

// Couleurs de thème
const themes: Record<string, { primary: string; secondary: string; accent: string; bg: string; text: string }> = {
    professional: { primary: '1a365d', secondary: '2c5282', accent: '3182ce', bg: 'ffffff', text: '1a202c' },
    african: { primary: 'b45309', secondary: 'd97706', accent: '16a34a', bg: 'fef3c7', text: '1c1917' },
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
    type: 'title' | 'content' | 'bullets' | 'section' | 'conclusion' | 'image';
    imagePrompt?: string;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const topic = formData.get('topic') as string;
        const slideCount = parseInt(formData.get('slideCount') as string) || 10;
        const theme = (formData.get('theme') as string) || 'african';
        const language = (formData.get('language') as string) || 'fr';
        const includeImages = formData.get('includeImages') !== 'false';

        let documentContent = '';

        if (file) {
            const buffer = Buffer.from(await file.arrayBuffer());
            if (file.name.endsWith('.txt')) {
                documentContent = buffer.toString('utf-8');
            } else if (file.name.endsWith('.docx')) {
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

        const systemPrompt = `Tu es un expert en création de présentations PowerPoint professionnelles pour un contexte AFRICAIN (Afrique de l'Ouest, Bénin).
Tu dois générer le contenu structuré pour une présentation de ${slideCount} slides.
Langue: ${language === 'fr' ? 'Français' : 'English'}

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après.
Le JSON doit être un tableau d'objets avec cette structure:
[
  {
    "title": "Titre de la slide",
    "subtitle": "Sous-titre optionnel",
    "bullets": ["Point 1", "Point 2", "Point 3", "Point 4"],
    "type": "title|content|bullets|section|conclusion|image",
    "imagePrompt": "Description courte pour générer une image africaine contextuelle"
  }
]

Types de slides:
- "title": Slide de titre (première slide) - avec subtitle
- "section": Slide de section/transition
- "bullets": Slide avec liste à puces (4-5 points)
- "image": Slide avec image ET texte (OBLIGATOIRE: inclure bullets ET imagePrompt)
- "conclusion": Slide de conclusion (dernière slide)

RÈGLES CRITIQUES:
- Maximum 4-5 points par slide (texte court et percutant)
- Première slide = titre, dernière = conclusion
- Inclure 2-3 slides de type "image" réparties dans la présentation
- POUR LES SLIDES "image": Tu DOIS inclure à la fois "bullets" (3-4 points clés) ET "imagePrompt"
- Les bullets des slides image doivent être courts (max 10 mots par point)
- Les imagePrompt doivent décrire des scènes AFRICAINES réalistes

Exemples d'imagePrompt:
- "Étudiants africains dans une salle de classe moderne au Bénin"
- "Village béninois avec système d'irrigation agricole"
- "Marché africain coloré avec vendeurs locaux"`;

        const userPrompt = documentContent 
            ? `Crée une présentation de ${slideCount} slides basée sur ce document:\n\n${documentContent.substring(0, 8000)}`
            : `Crée une présentation de ${slideCount} slides sur le sujet: ${topic}`;

        console.log('Génération du contenu avec Groq...');
        const groqResponse = await callGroq(userPrompt, systemPrompt);
        
        let slides: SlideContent[];
        try {
            let jsonStr = groqResponse.trim();
            const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
            if (jsonMatch) jsonStr = jsonMatch[0];
            slides = JSON.parse(jsonStr);
        } catch {
            console.error('Erreur parsing JSON:', groqResponse);
            return NextResponse.json({ error: 'Erreur lors de la génération du contenu' }, { status: 500 });
        }

        const pptx = new PptxGenJS();
        const colors = themes[theme] || themes.african;

        pptx.author = 'Dlearning INE UAC';
        pptx.title = slides[0]?.title || 'Présentation';
        pptx.subject = topic || 'Présentation générée par IA';
        pptx.company = 'Institut National de l\'Eau';

        // Générer les images avec FLUX
        const imagePromises: Promise<{ index: number; base64: string | null }>[] = [];
        
        if (includeImages) {
            for (let i = 0; i < slides.length; i++) {
                const slideData = slides[i];
                if (slideData.type === 'image' && slideData.imagePrompt) {
                    console.log(`Génération image FLUX pour slide ${i + 1}: ${slideData.imagePrompt}`);
                    imagePromises.push(
                        (async () => {
                            const imageUrl = await generateAfricanImageWithFlux(slideData.title, slideData.imagePrompt || '');
                            if (!imageUrl) return { index: i, base64: null };
                            const base64 = await downloadImageAsBase64(imageUrl);
                            return { index: i, base64 };
                        })()
                    );
                }
            }
        }

        const imageResults = await Promise.all(imagePromises);
        const imageMap = new Map<number, string>();
        for (const result of imageResults) {
            if (result.base64) imageMap.set(result.index, result.base64);
        }

        // Générer chaque slide
        for (let i = 0; i < slides.length; i++) {
            const slideData = slides[i];
            const slide = pptx.addSlide();
            slide.background = { color: colors.bg };

            if (slideData.type === 'title') {
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
                slide.addText('Dlearning INE UAC', {
                    x: 0.5, y: 5, w: 9, h: 0.4,
                    fontSize: 12, color: 'cccccc',
                    align: 'center'
                });

            } else if (slideData.type === 'section') {
                slide.background = { color: colors.secondary };
                slide.addText(slideData.title, {
                    x: 0.5, y: 2.2, w: 9, h: 1.2,
                    fontSize: 36, bold: true, color: 'ffffff',
                    align: 'center', valign: 'middle'
                });

            } else if (slideData.type === 'image') {
                // Slide avec image - Layout: Image à gauche, Texte à droite
                slide.addShape('rect', { x: 0, y: 0, w: 10, h: 1.1, fill: { color: colors.primary } });
                slide.addText(slideData.title, {
                    x: 0.4, y: 0.25, w: 9.2, h: 0.6,
                    fontSize: 26, bold: true, color: 'ffffff'
                });

                const imageBase64 = imageMap.get(i);
                if (imageBase64) {
                    slide.addImage({
                        data: `data:image/jpeg;base64,${imageBase64}`,
                        x: 0.3, y: 1.3, w: 5.2, h: 2.9,
                        rounding: true
                    });
                } else {
                    slide.addShape('rect', {
                        x: 0.3, y: 1.3, w: 5.2, h: 2.9,
                        fill: { color: 'e2e8f0' },
                        line: { color: 'cbd5e1', width: 1 }
                    });
                    slide.addText('🖼️', {
                        x: 0.3, y: 2.2, w: 5.2, h: 1,
                        fontSize: 32, color: '94a3b8',
                        align: 'center'
                    });
                }

                // Texte à droite - TOUJOURS présent
                if (slideData.bullets && slideData.bullets.length > 0) {
                    const bulletItems = slideData.bullets.map(text => ({
                        text: `• ${text}`,
                        options: { bullet: false, paraSpaceAfter: 8 }
                    }));
                    slide.addText(bulletItems, {
                        x: 5.7, y: 1.3, w: 4, h: 2.9,
                        fontSize: 13, color: colors.text,
                        valign: 'top', lineSpacing: 18
                    });
                }

                // Légende sous l'image
                if (slideData.imagePrompt) {
                    slide.addText(slideData.imagePrompt, {
                        x: 0.3, y: 4.3, w: 5.2, h: 0.4,
                        fontSize: 9, italic: true, color: '6b7280',
                        align: 'center'
                    });
                }

                // Ligne décorative
                slide.addShape('rect', { x: 5.5, y: 1.5, w: 0.03, h: 2.5, fill: { color: colors.accent } });
                slide.addText(`${i + 1}`, { x: 9.2, y: 5.1, w: 0.5, h: 0.3, fontSize: 10, color: colors.secondary, align: 'right' });

            } else if (slideData.type === 'conclusion') {
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
                slide.addShape('rect', { x: 0, y: 0, w: 10, h: 1.2, fill: { color: colors.primary } });
                slide.addText(slideData.title, {
                    x: 0.5, y: 0.3, w: 9, h: 0.7,
                    fontSize: 28, bold: true, color: 'ffffff'
                });

                if (slideData.bullets && slideData.bullets.length > 0) {
                    const bulletItems = slideData.bullets.map(text => ({
                        text: text,
                        options: { bullet: { type: 'bullet' as const, color: colors.accent }, indentLevel: 0 }
                    }));
                    slide.addText(bulletItems, {
                        x: 0.5, y: 1.5, w: 9, h: 3.5,
                        fontSize: 18, color: colors.text,
                        valign: 'top', paraSpaceAfter: 12
                    });
                } else if (slideData.content) {
                    slide.addText(slideData.content, {
                        x: 0.5, y: 1.5, w: 9, h: 3.5,
                        fontSize: 16, color: colors.text,
                        valign: 'top'
                    });
                }
                slide.addText(`${i + 1}`, { x: 9, y: 5.2, w: 0.5, h: 0.3, fontSize: 10, color: colors.secondary, align: 'right' });
            }
        }

        const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
        const base64 = pptxBuffer.toString('base64');

        return NextResponse.json({
            success: true,
            pptx: `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${base64}`,
            slideCount: slides.length,
            title: slides[0]?.title || 'Présentation',
            imagesGenerated: imageMap.size
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('Erreur génération PPT:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
