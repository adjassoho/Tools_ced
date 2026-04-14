import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Couleurs texte en format BGR pour FFmpeg/libass
const COLOR_MAP: Record<string, string> = {
    white:  '&H00FFFFFF',
    yellow: '&H0000FFFF',
    cyan:   '&H00FFFF00',
};

// Couleur de fond en BGR+alpha (AA=opacité, ex: 80=50%)
const BG_MAP: Record<string, string> = {
    dark:        '&H80000000', // boîte noire semi-transparente
    none:        '&H00000000', // transparent (pas de fond)
    outline:     '&H00000000', // transparent (mais contour uniquement)
};

export async function POST(req: NextRequest) {
    const ts = Date.now();
    const tmpInput  = join(tmpdir(), `cedcap_in_${ts}.mp4`);
    const tmpSrt    = join(tmpdir(), `cedcap_${ts}.srt`);
    const tmpOutput = join(tmpdir(), `cedcap_out_${ts}.mp4`);

    try {
        const formData   = await req.formData();
        const videoFile  = formData.get('video') as File;
        const srtContent = formData.get('srt') as string;
        const fontSize   = (formData.get('fontSize') as string)  || '24';
        const fontColor  = (formData.get('fontColor') as string) || 'white';
        const bgStyle    = (formData.get('bgStyle') as string)   || 'dark';

        if (!videoFile || !srtContent) {
            return NextResponse.json({ error: 'Vidéo et sous-titres requis' }, { status: 400 });
        }

        const primaryColor = COLOR_MAP[fontColor] ?? COLOR_MAP.white;
        const backColor    = BG_MAP[bgStyle]       ?? BG_MAP.dark;

        // BorderStyle: 3 = boîte opaque, 1 = contour classique
        const borderStyle  = bgStyle === 'dark' ? '3' : '1';
        const outlineWidth = bgStyle === 'outline' ? '3' : (bgStyle === 'none' ? '2' : '0');

        // Écriture des fichiers temporaires
        await writeFile(tmpInput, Buffer.from(await videoFile.arrayBuffer()));
        await writeFile(tmpSrt, srtContent, 'utf-8');

        const fileSizeMB = videoFile.size / 1024 / 1024;
        console.log(`Burning captions: ${fileSizeMB.toFixed(1)} MB, fontSize=${fontSize}, fontColor=${fontColor}, bgStyle=${bgStyle}`);

        // Style de captions
        const style = [
            `FontName=Arial`,
            `FontSize=${fontSize}`,
            `PrimaryColour=${primaryColor}`,
            `BackColour=${backColor}`,
            `Outline=${outlineWidth}`,
            `Shadow=1`,
            `BorderStyle=${borderStyle}`,
            `Alignment=2`,
            `MarginV=25`,
            `Bold=1`,
        ].join(',');

        // Si la vidéo est grande (>80 Mo), on réduit la résolution pour accélérer le traitement
        // Cela n'affecte pas la qualité de lecture sur mobile/web
        const scaleFilter = fileSizeMB > 80 ? `scale='min(1280,iw)':-2,` : '';
        const crf = fileSizeMB > 80 ? '26' : '22'; // compression plus forte pour grande vidéo

        // Commande ffmpeg : graver les sous-titres dans la vidéo
        const vfFilter = `${scaleFilter}subtitles='${tmpSrt}':force_style='${style}'`;
        const cmd = `ffmpeg -i "${tmpInput}" -vf "${vfFilter}" -c:v libx264 -crf ${crf} -preset fast -c:a copy "${tmpOutput}" -y`;
        
        console.log('Running FFmpeg:', cmd);
        execSync(cmd, { timeout: 280000, stdio: 'pipe' });

        const outputBuffer = await readFile(tmpOutput);
        console.log(`Output video: ${(outputBuffer.length / 1024 / 1024).toFixed(1)} MB`);

        const baseName = videoFile.name.replace(/\.[^.]+$/, '');

        return new NextResponse(outputBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${baseName}_avec_captions.mp4"`,
                'Content-Length': outputBuffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('Burn captions error:', error);
        const msg = error instanceof Error ? error.message : 'Erreur FFmpeg inconnue';
        return NextResponse.json({ error: msg }, { status: 500 });
    } finally {
        // Nettoyage des fichiers temporaires
        await Promise.all([
            unlink(tmpInput).catch(() => {}),
            unlink(tmpSrt).catch(() => {}),
            unlink(tmpOutput).catch(() => {}),
        ]);
    }
}
