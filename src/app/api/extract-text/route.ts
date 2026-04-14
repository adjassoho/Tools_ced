import { NextRequest, NextResponse } from 'next/server';

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
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier transmis.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let text = '';

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            text = await extractTextFromPdf(buffer);
        } else if (file.type.includes('word') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
            text = await extractTextFromDocx(buffer);
        } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
            text = buffer.toString('utf-8');
        } else {
            return NextResponse.json({ error: `Format non supporté pour ${file.name}` }, { status: 400 });
        }

        if (!text || text.trim() === '') {
            return NextResponse.json({ error: 'Le fichier ne contient aucun texte lisible.' }, { status: 400 });
        }

        return NextResponse.json({ success: true, text });

    } catch (error) {
        console.error('Extract text error:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Erreur interne lors de l\'extraction' 
        }, { status: 500 });
    }
}
