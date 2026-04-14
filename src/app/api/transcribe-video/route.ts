import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { createReadStream } from 'fs';
import Groq from 'groq-sdk';

// ── Extraction audio depuis vidéo via ffmpeg ──────────────────────────────
async function extractAudioFromVideo(
    videoBuffer: Buffer,
    tmpIn: string,
    tmpOut: string
): Promise<void> {
    await writeFile(tmpIn, videoBuffer);
    execSync(
        `ffmpeg -i "${tmpIn}" -vn -acodec libmp3lame -ar 16000 -ac 1 -q:a 4 "${tmpOut}" -y`,
        { timeout: 120000, stdio: 'pipe' }
    );
}

// ── SRT builder ───────────────────────────────────────────────────────────
function buildSRT(words: { word: string; start: number; end: number }[]): string {
    if (!words || words.length === 0) return '';
    const fmt = (s: number) => {
        const h   = Math.floor(s / 3600);
        const m   = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        const ms  = Math.round((s % 1) * 1000);
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
    };
    const lines: string[] = [];
    let idx = 1, i = 0;
    while (i < words.length) {
        const chunk = words.slice(i, i + 8);
        lines.push(`${idx}\n${fmt(chunk[0].start)} --> ${fmt(chunk[chunk.length - 1].end)}\n${chunk.map(w => w.word).join(' ').trim()}\n`);
        idx++;
        i += 8;
    }
    return lines.join('\n');
}

// ── VTT builder ───────────────────────────────────────────────────────────
function buildVTT(words: { word: string; start: number; end: number }[]): string {
    if (!words || words.length === 0) return 'WEBVTT\n\n';
    const fmt = (s: number) => {
        const h   = Math.floor(s / 3600);
        const m   = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        const ms  = Math.round((s % 1) * 1000);
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
    };
    const lines = ['WEBVTT\n'];
    let i = 0;
    while (i < words.length) {
        const chunk = words.slice(i, i + 8);
        lines.push(`${fmt(chunk[0].start)} --> ${fmt(chunk[chunk.length - 1].end)}\n${chunk.map(w => w.word).join(' ').trim()}\n`);
        i += 8;
    }
    return lines.join('\n');
}

// ── Handler principal ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const ts       = Date.now();
    const tmpVideo = join(tmpdir(), `ced_vid_${ts}.mp4`);
    const tmpAudio = join(tmpdir(), `ced_aud_${ts}.mp3`);

    try {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            return NextResponse.json({ error: 'Clé API Groq manquante' }, { status: 500 });
        }

        const formData = await req.formData();
        const file     = formData.get('file') as File;
        const lang     = (formData.get('language') as string) || 'fr';

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
        const allowedExt = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'm4a', 'ogg'];
        if (!allowedExt.includes(ext)) {
            return NextResponse.json({
                error: `Format non supporté. Formats acceptés : ${allowedExt.join(', ')}`
            }, { status: 400 });
        }

        const videoBuffer = Buffer.from(await file.arrayBuffer());
        console.log(`Transcription started: ${file.name} (${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB)`);

        // Extraction audio si c'est une vidéo
        const isAudio = ['mp3', 'wav', 'm4a', 'ogg'].includes(ext);
        let audioPath: string;

        if (isAudio) {
            await writeFile(tmpAudio, videoBuffer);
            audioPath = tmpAudio;
        } else {
            console.log('Extracting audio via ffmpeg...');
            try {
                await extractAudioFromVideo(videoBuffer, tmpVideo, tmpAudio);
                audioPath = tmpAudio;
            } catch (e) {
                console.error('ffmpeg extraction failed, using original file:', e);
                // Fallback : écrire la vidéo et l'envoyer directement
                await writeFile(tmpAudio, videoBuffer);
                audioPath = tmpAudio;
            }
        }

        console.log('Sending to Groq Whisper via SDK...');

        // ── SDK Groq — évite le bug ETIMEDOUT du fetch natif Node.js ────────
        const groq = new Groq({ apiKey: groqKey });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transcription: any = await groq.audio.transcriptions.create({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            file: createReadStream(audioPath) as any,
            model: 'whisper-large-v3',
            language: lang,
            response_format: 'verbose_json',
            timestamp_granularities: ['word'],
        });

        const transcript   = transcription.text         || '';
        const words        = transcription.words        || [];
        const segments     = transcription.segments     || [];
        const duration     = transcription.duration     || 0;
        const detectedLang = transcription.language     || lang;

        const srt    = buildSRT(words);
        const vtt    = buildVTT(words);
        const hasSRT = srt.trim().length > 0;

        console.log(`Done: ${transcript.split(/\s+/).length} mots, hasSRT=${hasSRT}, lang=${detectedLang}`);

        return NextResponse.json({
            success: true,
            transcript,
            words,
            segments,
            duration,
            language: detectedLang,
            fileName: file.name,
            srt: hasSRT ? srt : null,
            vtt: hasSRT ? vtt : null,
        });

    } catch (error) {
        console.error('Transcription error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Erreur inconnue lors de la transcription'
        }, { status: 500 });
    } finally {
        // Nettoyage fichiers temporaires
        await Promise.all([
            unlink(tmpVideo).catch(() => {}),
            unlink(tmpAudio).catch(() => {}),
        ]);
    }
}
