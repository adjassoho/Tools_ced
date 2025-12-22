import { NextRequest, NextResponse } from 'next/server';

interface Section {
    title: string;
    level: number;
    content: string;
}

// Extraire le texte d'un fichier TXT
function extractTextFromTxt(buffer: Buffer): string {
    return buffer.toString('utf-8');
}

// Extraire le texte d'un PDF avec unpdf (léger, sans canvas)
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    const { extractText } = await import('unpdf');
    // Convertir Buffer en Uint8Array
    const uint8Array = new Uint8Array(buffer);
    const result = await extractText(uint8Array);
    // result.text peut être un tableau de strings (une par page)
    let text = '';
    if (Array.isArray(result.text)) {
        text = result.text.join('\n\n');
    } else {
        text = result.text;
    }
    
    // Post-traitement pour reconstituer les lignes coupées
    return cleanExtractedText(text);
}

// Nettoyer et reconstituer le texte extrait du PDF
function cleanExtractedText(text: string): string {
    // Remplacer les retours à la ligne multiples par des marqueurs de paragraphe
    let cleaned = text.replace(/\n{3,}/g, '\n\n§PARA§\n\n');
    
    // Reconstituer les lignes coupées au milieu d'une phrase
    // Si une ligne ne se termine pas par un signe de ponctuation finale et la suivante ne commence pas par une majuscule/numéro
    const lines = cleaned.split('\n');
    const reconstructed: string[] = [];
    let currentLine = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
            if (currentLine) {
                reconstructed.push(currentLine);
                currentLine = '';
            }
            reconstructed.push('');
            continue;
        }
        
        if (line === '§PARA§') {
            if (currentLine) {
                reconstructed.push(currentLine);
                currentLine = '';
            }
            reconstructed.push('');
            continue;
        }
        
        // Vérifier si c'est un titre (commence par un numéro ou mot-clé de section)
        const isTitleStart = /^(\d+\.|\d+\)|\d+\s|[IVX]+\.|[IVX]+\)|chapitre|partie|section|introduction|conclusion)/i.test(line);
        
        // Vérifier si la ligne précédente semble incomplète
        const prevEndsIncomplete = currentLine && 
            !currentLine.match(/[.!?:;»"]$/) && 
            !currentLine.match(/\d$/) &&
            currentLine.length < 100;
        
        // Vérifier si cette ligne semble être une continuation
        const startsLowerCase = /^[a-zà-ü]/.test(line);
        const startsWithConnector = /^(et|ou|mais|car|donc|or|ni|que|qui|dont|où|de|du|des|le|la|les|un|une|pour|par|sur|dans|avec|sans|sous|entre|vers|chez|contre|depuis|pendant|avant|après|selon|malgré|sauf|hormis|parmi|envers|hors)/i.test(line);
        
        if (currentLine && (startsLowerCase || startsWithConnector) && prevEndsIncomplete && !isTitleStart) {
            // Continuation de la ligne précédente
            currentLine += ' ' + line;
        } else {
            // Nouvelle ligne
            if (currentLine) {
                reconstructed.push(currentLine);
            }
            currentLine = line;
        }
    }
    
    if (currentLine) {
        reconstructed.push(currentLine);
    }
    
    return reconstructed.join('\n').replace(/§PARA§/g, '');
}

// Extraire le texte d'un DOCX avec préservation de la structure
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
    const mammoth = require('mammoth');
    
    // Option 1: Extraire avec les styles pour détecter les titres
    const options = {
        styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Titre'] => h1:fresh",
            "p[style-name='Titre 1'] => h1:fresh",
            "p[style-name='Titre 2'] => h2:fresh",
            "p[style-name='Titre 3'] => h3:fresh",
        ]
    };
    
    const result = await mammoth.convertToHtml({ buffer }, options);
    const html = result.value;
    
    // Marquer les titres avec des préfixes spéciaux
    let text = html
        // Marquer les titres h1 avec §H1§
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n§H1§$1§/H1§\n\n')
        // Marquer les titres h2 avec §H2§
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n§H2§$1§/H2§\n\n')
        // Marquer les titres h3 avec §H3§
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n§H3§$1§/H3§\n\n')
        // Paragraphes
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        // Listes
        .replace(/<\/li>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        // Gras - potentiellement des titres
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        // Supprimer les autres balises
        .replace(/<[^>]+>/g, '')
        // Décoder les entités HTML
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Nettoyer
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    
    console.log('DOCX extracted with markers, preview:', text.substring(0, 800));
    
    return text;
}

// Utiliser l'IA pour détecter la structure du document
async function detectStructureWithAI(text: string, apiKey: string): Promise<Section[]> {
    // Limiter le texte pour l'API
    const maxChars = 15000;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
    
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
                    content: `Tu analyses la structure de documents académiques français.

RÈGLES STRICTES pour les titres:
- Un titre de section commence par: I-, II-, 1., 2., 1.1, a), Chapitre, Partie, Introduction, Conclusion
- Le titre se TERMINE AVANT le début du contenu explicatif
- Le contenu commence généralement par: "Le", "La", "Les", "Un", "Une", "Il", "Elle", "Au", "Dans", "Pour", "Cette", "Ce", "Depuis", "Avant", etc.
- JAMAIS inclure de phrases complètes dans le titre
- Le titre fait généralement entre 5 et 100 caractères maximum

EXEMPLES:
- CORRECT: "3. Gestion durable des Ressources en Eau"
- INCORRECT: "3. Gestion durable des Ressources en Eau Depuis quelques décennies, un nouveau concept..."

- CORRECT: "2. Modes de gestion de l'AEP en milieu rural : évolution, processus, hybridation de logiques"
- INCORRECT: "2. Modes de gestion de l'AEP en milieu rural : évolution, processus, hybridation de logiques La gestion de l'AEP..."

Retourne UNIQUEMENT un JSON valide:
[{"level": 1, "title": "TITRE COURT", "content": "Contenu complet..."}]`
                },
                {
                    role: 'user',
                    content: `Analyse ce document. Extrais les titres COURTS (sans le contenu) et le contenu séparément:\n\n${truncatedText}`
                }
            ],
            temperature: 0.1,
            max_tokens: 4000,
        }),
    });
    
    if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
    }
    
    const result = await response.json();
    const content = result.choices[0]?.message?.content?.trim() || '';
    
    // Extraire le JSON de la réponse
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        throw new Error('No JSON found in response');
    }
    
    const sections = JSON.parse(jsonMatch[0]);
    
    // Post-traitement: nettoyer les titres trop longs
    return sections.map((s: { level?: number; title?: string; content?: string }) => {
        let title = s.title || 'Section';
        let sectionContent = s.content || '';
        
        // Si le titre est trop long (>120 chars), il contient probablement du contenu
        if (title.length > 120) {
            // Chercher où couper (début d'une phrase)
            const cutPatterns = [
                /\s+(Le|La|Les|L'|Un|Une|Des|Du|Cette|Ce|Ces|Il|Elle|On|Depuis|Avant|Pour|Dans|Au|Aux|En)\s+[a-zà-ü]/i,
                /\s+(Au\s+sens|À\s+ce|D'une|D'un)\s+/i,
            ];
            
            for (const pattern of cutPatterns) {
                const match = title.match(pattern);
                if (match && match.index && match.index > 20) {
                    sectionContent = title.substring(match.index).trim() + ' ' + sectionContent;
                    title = title.substring(0, match.index).trim();
                    break;
                }
            }
        }
        
        return {
            level: s.level || 1,
            title: title,
            content: sectionContent
        };
    });
}

// Fallback: Détecter la structure avec regex (si l'IA échoue)
function detectStructureWithRegex(text: string): Section[] {
    const sections: Section[] = [];
    
    // Vérifier si on a des marqueurs de titres du DOCX
    const hasDocxMarkers = text.includes('§H1§') || text.includes('§H2§') || text.includes('§H3§');
    
    if (hasDocxMarkers) {
        console.log('Using DOCX heading markers for structure detection');
        
        // Extraire les sections basées sur les marqueurs
        const parts = text.split(/§H[123]§/);
        let currentLevel = 1;
        
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const endMarkerMatch = part.match(/§\/H([123])§/);
            
            if (endMarkerMatch) {
                currentLevel = parseInt(endMarkerMatch[1]);
                const titleEnd = part.indexOf('§/H');
                const title = part.substring(0, titleEnd).trim();
                const content = part.substring(part.indexOf('§/H') + 5).trim();
                
                if (title.length > 2) {
                    sections.push({
                        title: title.replace(/\*\*/g, ''), // Enlever le gras
                        level: currentLevel,
                        content: content.replace(/§[^§]+§/g, '').replace(/\*\*/g, '')
                    });
                }
            }
        }
        
        if (sections.length > 0) {
            console.log(`Found ${sections.length} sections from DOCX markers`);
            return sections;
        }
    }
    
    // Chercher les lignes en gras qui pourraient être des titres
    const boldTitlePattern = /\*\*([^*]+)\*\*/g;
    const boldMatches = [...text.matchAll(boldTitlePattern)];
    const potentialTitles = boldMatches
        .map(m => m[1].trim())
        .filter(t => t.length > 5 && t.length < 150);
    
    if (potentialTitles.length > 0) {
        console.log('Found bold text that might be titles:', potentialTitles.slice(0, 3));
    }
    
    // D'abord, essayer d'extraire les titres depuis la table des matières
    const tocMatch = text.match(/table\s+des\s+mati[èe]res([\s\S]*?)(?=\n\n[A-ZÀ-Ü]|\n\n\d+\.|\nI[-.])/i);
    let tocTitles: string[] = [];
    
    if (tocMatch) {
        console.log('Table des matières trouvée !');
        const tocContent = tocMatch[1];
        const tocLines = tocContent.split('\n')
            .map(l => l.trim().replace(/^[•\-\*]\s*/, ''))
            .filter(l => l.length > 5 && l.length < 150);
        tocTitles = tocLines;
        console.log('Titres extraits de la TDM:', tocTitles.slice(0, 5));
    }
    
    // Pré-scan pour trouver les titres avec numéros romains
    const romanTitleRegex = /(?:^|\n)\s*((I|II|III|IV|V|VI|VII|VIII|IX|X)[-–—]\s*[A-ZÀ-Üa-zà-ü][^\n]{3,100})/gi;
    const foundRomanTitles = [...text.matchAll(romanTitleRegex)].map(m => m[1].trim());
    if (foundRomanTitles.length > 0) {
        console.log('Pre-scan found Roman numeral titles:', foundRomanTitles);
    }
    
    const lines = text.split('\n');
    
    // Patterns pour détecter les titres - AMÉLIORÉS pour les index romains
    const titlePatterns = [
        // I- Titre, II- Titre, III- Titre (tiret collé ou avec espace) - PRIORITÉ HAUTE
        { pattern: /^(I|II|III|IV|V|VI|VII|VIII|IX|X)[-–—]\s*(.+)$/i, level: 1, extract: true },
        // I - Titre (avec espaces autour du tiret)
        { pattern: /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\s+[-–—]\s*(.+)$/i, level: 1, extract: true },
        // I. Titre, II. Titre (avec point)
        { pattern: /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s*(.+)$/i, level: 1, extract: true },
        // I) Titre, II) Titre (avec parenthèse)
        { pattern: /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\)\s*(.+)$/i, level: 1, extract: true },
        // 1. Titre, 2. Titre (numéros arabes)
        { pattern: /^(\d+\.\s+[A-ZÀ-Ü].*)$/, level: 2 },
        // 1.1 Titre, 1.2 Titre
        { pattern: /^(\d+\.\d+\.?\s+.+)$/, level: 3 },
        // Chapitre, Partie, Introduction, Conclusion
        { pattern: /^((Chapitre|Partie|Introduction|Conclusion)\s*.*)$/i, level: 1 },
        // UNITÉ X : Titre
        { pattern: /^(UNIT[EÉ]\s*\d+\s*:\s*.+)$/i, level: 1 },
        // Ligne entièrement en gras
        { pattern: /^\*\*(.+)\*\*$/, level: 2 },
    ];
    
    // Aussi chercher les index romains dans le texte (pas forcément en début de ligne)
    const romanIndexPattern = /((?:^|\n)\s*(I|II|III|IV|V|VI|VII|VIII|IX|X)[-–—]\s*[A-ZÀ-Üa-zà-ü][^.!?\n]{3,100})/gi;
    const romanMatches = [...text.matchAll(romanIndexPattern)];
    const romanTitles = romanMatches
        .map(m => m[1].trim())
        .filter(t => t.length > 5 && t.length < 150);
    
    if (romanTitles.length > 0) {
        console.log('Found Roman numeral titles:', romanTitles.slice(0, 5));
    }
    
    let currentSection: Section | null = null;
    let currentContent: string[] = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Ignorer la table des matières et les marqueurs
        if (/^table\s+des\s+mati[èe]res/i.test(trimmed)) continue;
        if (/§[^§]+§/.test(trimmed)) continue;
        
        let isTitle = false;
        let matchedTitle = '';
        let level = 2;
        
        // Vérifier avec les patterns
        for (const patternDef of titlePatterns) {
            const { pattern, level: patternLevel, extract } = patternDef as { pattern: RegExp; level: number; extract?: boolean };
            const match = trimmed.match(pattern);
            if (match && trimmed.length < 200) {
                isTitle = true;
                // Pour les patterns avec extract, reconstruire le titre avec le numéro
                if (extract && match[1] && match[2]) {
                    // Reconstruire: "I- Titre" ou "II. Titre"
                    const separator = trimmed.match(/^[IVX]+\s*([-–—.)])\s*/i)?.[1] || '-';
                    matchedTitle = `${match[1].toUpperCase()}${separator} ${match[2]}`.replace(/\*\*/g, '');
                } else {
                    matchedTitle = (match[1] || trimmed).replace(/\*\*/g, '');
                }
                level = patternLevel;
                break;
            }
        }
        
        // Vérifier si la ligne contient un index romain au milieu (titre collé au contenu)
        if (!isTitle) {
            // Pattern pour I-, II-, III-, IV-, etc. (tiret collé)
            const romanInLine = trimmed.match(/^((I|II|III|IV|V|VI|VII|VIII|IX|X)[-–—]\s*[A-ZÀ-Üa-zà-ü][^.!?]{3,100})/i);
            if (romanInLine) {
                isTitle = true;
                matchedTitle = romanInLine[1].replace(/\*\*/g, '').trim();
                level = 1;
                
                // Le reste de la ligne est du contenu
                const restOfLine = trimmed.substring(romanInLine[0].length).trim();
                if (restOfLine.length > 10) {
                    currentContent.push(restOfLine);
                }
            }
        }
        // Vérifier si c'est un titre de la TDM
        if (!isTitle && tocTitles.length > 0) {
            for (const tocTitle of tocTitles) {
                const cleanTrimmed = trimmed.replace(/\*\*/g, '').toLowerCase();
                const cleanToc = tocTitle.toLowerCase();
                if (cleanTrimmed.includes(cleanToc.substring(0, 25)) ||
                    cleanToc.includes(cleanTrimmed.substring(0, 25))) {
                    isTitle = true;
                    matchedTitle = trimmed.replace(/\*\*/g, '');
                    level = tocTitle.match(/^\d+\./) ? 2 : 1;
                    break;
                }
            }
        }
        
        // Vérifier si c'est un titre en gras
        if (!isTitle && potentialTitles.length > 0) {
            const cleanTrimmed = trimmed.replace(/\*\*/g, '');
            if (potentialTitles.includes(cleanTrimmed) && cleanTrimmed.length < 100) {
                isTitle = true;
                matchedTitle = cleanTrimmed;
                level = 2;
            }
        }
        
        if (isTitle && matchedTitle.length > 3) {
            if (currentSection) {
                currentSection.content = currentContent.join('\n').trim().replace(/\*\*/g, '');
                if (currentSection.content.length > 0 || currentSection.title.length > 5) {
                    sections.push(currentSection);
                }
            }
            
            // Nettoyer le titre si trop long
            let title = matchedTitle;
            if (title.length > 120) {
                const cutMatch = title.match(/\s+(Le|La|Les|L'|Un|Une|Des|Du|Cette|Ce|Ces|Il|Elle|On|Depuis|Avant|Pour|Dans|Au|Aux|En)\s+[a-zà-ü]/i);
                if (cutMatch && cutMatch.index && cutMatch.index > 20) {
                    title = title.substring(0, cutMatch.index).trim();
                }
            }
            
            currentSection = { title, level, content: '' };
            currentContent = [];
        } else if (currentSection) {
            currentContent.push(trimmed.replace(/\*\*/g, ''));
        }
    }
    
    if (currentSection) {
        currentSection.content = currentContent.join('\n').trim().replace(/\*\*/g, '');
        if (currentSection.content.length > 0 || currentSection.title.length > 5) {
            sections.push(currentSection);
        }
    }
    
    if (sections.length === 0) {
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 100);
        paragraphs.forEach((para, idx) => {
            sections.push({
                title: `Section ${idx + 1}`,
                level: 1,
                content: para.trim().replace(/\*\*/g, '').replace(/§[^§]+§/g, '')
            });
        });
    }
    
    return sections;
}

// Fonction principale de détection de structure
async function detectStructure(text: string): Promise<Section[]> {
    const groqKey = process.env.GROQ_API_KEY;
    
    // D'abord essayer le regex (plus rapide et ne consomme pas de tokens)
    console.log('Trying regex detection first...');
    const regexSections = detectStructureWithRegex(text);
    
    // Si regex trouve des vrais titres (pas "Section X"), les utiliser
    const hasRealTitles = regexSections.some(s => !s.title.match(/^Section\s+\d+$/));
    if (hasRealTitles && regexSections.length > 0) {
        console.log(`Regex detected ${regexSections.length} sections with real titles`);
        return regexSections;
    }
    
    // Sinon, essayer avec l'IA
    if (groqKey) {
        try {
            // Attendre un peu pour éviter le rate limit si on vient de faire des appels
            console.log('Waiting before AI structure detection...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('Detecting structure with AI...');
            console.log('Text preview:', text.substring(0, 500));
            const sections = await detectStructureWithAI(text, groqKey);
            if (sections.length > 0) {
                console.log(`AI detected ${sections.length} sections`);
                const aiHasRealTitles = sections.some(s => !s.title.match(/^Section\s+\d+$/));
                if (aiHasRealTitles) {
                    return sections;
                }
                console.log('AI returned generic section names');
            }
        } catch (err) {
            console.error('AI structure detection failed:', err);
        }
    }
    
    // Retourner les sections regex même si ce sont des "Section X"
    return regexSections;
}

// Version simplifiée de la détection IA
async function detectStructureSimple(text: string, apiKey: string, retryCount = 0): Promise<Section[]> {
    const maxChars = 10000;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
    
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
                    content: `Identifie les titres de sections dans ce document académique.
Les titres commencent généralement par: I-, II-, 1., 2., Chapitre, Partie, Introduction, Conclusion.
Retourne un JSON: [{"level": 1, "title": "Le titre exact", "content": "Le contenu de la section"}]
IMPORTANT: Garde les titres EXACTS du document, ne les modifie pas.`
                },
                {
                    role: 'user',
                    content: truncatedText
                }
            ],
            temperature: 0.1,
            max_tokens: 4000,
        }),
    });
    
    // Gestion du rate limit
    if (response.status === 429 && retryCount < 2) {
        console.log('Rate limit on structure detection, waiting 5s...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return detectStructureSimple(text, apiKey, retryCount + 1);
    }
    
    if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
    }
    
    const result = await response.json();
    const content = result.choices[0]?.message?.content?.trim() || '';
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        throw new Error('No JSON found');
    }
    
    const sections = JSON.parse(jsonMatch[0]);
    return sections.map((s: { level?: number; title?: string; content?: string }) => ({
        level: s.level || 1,
        title: s.title || 'Section',
        content: s.content || ''
    }));
}

// Appeler l'API Groq pour résumer (gratuit et rapide)
async function summarizeWithGroq(text: string, apiKey: string, retryCount = 0): Promise<string> {
    const maxChars = 4000;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
    
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
                    content: 'Tu résumes des textes en français. IMPORTANT: Donne UNIQUEMENT le résumé, sans aucune introduction comme "Voici un résumé" ou "En résumé". Commence directement par le contenu du résumé.'
                },
                {
                    role: 'user',
                    content: `Résume ce texte en 2-4 phrases (donne directement le résumé sans introduction):\n\n${truncatedText}`
                }
            ],
            temperature: 0.3,
            max_tokens: 200,
        }),
    });
    
    // Gestion du rate limit avec retry
    if (response.status === 429 && retryCount < 3) {
        const errorData = await response.json();
        const waitTime = errorData.error?.message?.match(/try again in ([\d.]+)s/)?.[1];
        const delay = waitTime ? parseFloat(waitTime) * 1000 + 500 : 3000;
        console.log(`Rate limit hit, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return summarizeWithGroq(text, apiKey, retryCount + 1);
    }
    
    if (!response.ok) {
        const error = await response.text();
        console.error('Groq error:', response.status, error);
        throw new Error(`Groq API error: ${response.status}`);
    }
    
    const result = await response.json();
    let summary = result.choices[0]?.message?.content?.trim() || '';
    
    // Nettoyer le résumé : supprimer les introductions indésirables
    summary = summary
        .replace(/^(voici\s+(un\s+)?résumé[^:]*:\s*)/i, '')
        .replace(/^(en\s+résumé[^:]*:\s*)/i, '')
        .replace(/^(résumé[^:]*:\s*)/i, '')
        .replace(/^(ce\s+texte\s+[^:]*:\s*)/i, '')
        .trim();
    
    return summary;
}

// Appeler l'API HuggingFace pour résumer (fallback)
async function summarizeWithHuggingFace(text: string, apiKey: string, retries = 2): Promise<string> {
    const maxChars = 3000;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
    
    const models = [
        'facebook/bart-large-cnn',
        'sshleifer/distilbart-cnn-12-6',
        'Falconsai/text_summarization',
    ];
    
    for (const model of models) {
        try {
            const response = await fetch(
                `https://router.huggingface.co/hf-inference/models/${model}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        inputs: truncatedText,
                        parameters: {
                            max_length: 150,
                            min_length: 30,
                            do_sample: false,
                        }
                    }),
                }
            );
            
            if (!response.ok) continue;
            
            const result = await response.json();
            
            if (Array.isArray(result) && result[0]?.summary_text) {
                return result[0].summary_text;
            }
        } catch (err) {
            continue;
        }
    }
    
    throw new Error('HuggingFace models failed');
}

// Fonction principale de résumé avec fallback
async function summarizeText(text: string): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY;
    const hfKey = process.env.HUGGINGFACE_API_KEY;
    
    // Essayer Groq en premier (meilleur pour le français)
    if (groqKey) {
        try {
            console.log('Using Groq API...');
            return await summarizeWithGroq(text, groqKey);
        } catch (err) {
            console.error('Groq failed:', err);
        }
    }
    
    // Fallback sur HuggingFace
    if (hfKey) {
        try {
            console.log('Using HuggingFace API...');
            return await summarizeWithHuggingFace(text, hfKey);
        } catch (err) {
            console.error('HuggingFace failed:', err);
        }
    }
    
    throw new Error('Aucune API de résumé disponible');
}

// Résumé simple sans API (fallback)
function simpleSummarize(text: string): string {
    if (!text || text.trim().length === 0) {
        return '(Contenu non disponible pour cette section)';
    }
    
    const trimmedText = text.trim();
    
    // Si le texte est court, le retourner tel quel
    if (trimmedText.length <= 300) {
        return trimmedText;
    }
    
    const sentences = trimmedText.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length <= 3) return trimmedText;
    
    // Prendre les premières phrases importantes
    const importantSentences = sentences
        .filter(s => s.trim().length > 20)
        .slice(0, 4);
    
    if (importantSentences.length === 0) {
        return trimmedText.substring(0, 300) + '...';
    }
    
    return importantSentences.join(' ').trim();
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
        }
        
        console.log('Processing file:', file.name, file.type, file.size, 'bytes');
        
        // Lire le fichier
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        let text = '';
        
        // Extraire le texte selon le type de fichier
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
            text = extractTextFromTxt(buffer);
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            text = await extractTextFromPdf(buffer);
        } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
            text = await extractTextFromDocx(buffer);
        } else {
            return NextResponse.json({ error: 'Format de fichier non supporté' }, { status: 400 });
        }
        
        if (!text || text.trim().length < 100) {
            return NextResponse.json({ error: 'Le document est trop court ou vide' }, { status: 400 });
        }
        
        console.log('Text extracted:', text.length, 'chars');
        
        // Détecter la structure (utilise l'IA si disponible)
        const sections = await detectStructure(text);
        console.log('Sections detected:', sections.length);
        
        const groqKey = process.env.GROQ_API_KEY;
        const hfKey = process.env.HUGGINGFACE_API_KEY;
        const useAI = !!(groqKey || hfKey);
        
        // Résumer chaque section
        const sectionSummaries = [];
        
        for (const section of sections) {
            let summary: string;
            
            console.log(`Section "${section.title.substring(0, 50)}..." - content length: ${section.content.length}`);
            
            if (section.content.length === 0) {
                summary = '(Cette section ne contient pas de texte extractible)';
            } else if (useAI && section.content.length > 100) {
                try {
                    summary = await summarizeText(section.content);
                    console.log(`AI summary generated for section`);
                    // Petit délai pour éviter le rate limit
                    await new Promise(resolve => setTimeout(resolve, 1500));
                } catch (err) {
                    console.error('AI summarization failed for section:', err);
                    summary = simpleSummarize(section.content);
                }
            } else {
                summary = simpleSummarize(section.content);
            }
            
            sectionSummaries.push({
                title: section.title,
                level: section.level,
                summary: summary || '(Résumé non disponible)'
            });
        }
        
        // Résumé général
        let generalSummary: string;
        const allContent = sections.map(s => s.content).join('\n\n');
        
        if (useAI) {
            try {
                generalSummary = await summarizeText(allContent);
            } catch (err) {
                console.error('AI general summarization failed:', err);
                generalSummary = simpleSummarize(allContent);
            }
        } else {
            generalSummary = simpleSummarize(allContent);
        }
        
        return NextResponse.json({
            sections: sectionSummaries,
            generalSummary: generalSummary,
            aiPowered: useAI,
            sectionsCount: sections.length
        });
        
    } catch (error) {
        console.error('Document processing error:', error);
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
