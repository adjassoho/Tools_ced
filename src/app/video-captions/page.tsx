'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

/* ── Types ───────────────────────────────────────────────────── */
interface WordTimestamp { word: string; start: number; end: number; }
interface TranscriptionResult {
    transcript: string;
    words: WordTimestamp[];
    duration: number;
    language: string;
    srt: string | null;
    vtt: string | null;
}
interface CaptionStyle {
    fontSize: '18' | '22' | '28' | '34';
    fontColor: 'white' | 'yellow' | 'cyan';
    bgStyle: 'dark' | 'outline' | 'none';
}

/* ── Helpers ─────────────────────────────────────────────────── */
const LANGUAGES = [
    { code: 'fr', label: '🇫🇷 Français' },
    { code: 'en', label: '🇬🇧 English' },
    { code: 'ar', label: '🇸🇦 Arabe' },
    { code: 'es', label: '🇪🇸 Español' },
    { code: 'pt', label: '🇧🇷 Português' },
    { code: 'yo', label: '🌍 Yoruba' },
];

const FONT_SIZES = [
    { value: '18', label: 'Petit'   },
    { value: '22', label: 'Moyen'   },
    { value: '28', label: 'Grand'   },
    { value: '34', label: 'Très grand' },
];

const FONT_COLORS = [
    { value: 'white',  label: 'Blanc',  cls: 'bg-white border-slate-300 text-slate-800'   },
    { value: 'yellow', label: 'Jaune',  cls: 'bg-yellow-300 border-yellow-400 text-slate-900' },
    { value: 'cyan',   label: 'Cyan',   cls: 'bg-cyan-300 border-cyan-400 text-slate-900'    },
];

const BG_STYLES = [
    { value: 'dark',    label: '■ Boîte noire'   },
    { value: 'outline', label: '◻ Contour seulement' },
    { value: 'none',    label: '✕ Sans fond'     },
];

/* ── Composant PREVIEW PLAYER ────────────────────────────────── */
function CaptionsPreview({
    videoSrc, vttSrc, style
}: { videoSrc: string; vttSrc: string; style: CaptionStyle }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Injection CSS dynamique pour les captions natives
    const sizeMap: Record<string, string> = { '18': '1em', '22': '1.3em', '28': '1.7em', '34': '2.1em' };
    const colorMap: Record<string, string> = { white: '#fff', yellow: '#ffe135', cyan: '#00e5ff' };
    const bgMap: Record<string, string> = {
        dark: 'rgba(0,0,0,0.6)',
        outline: 'transparent',
        none: 'transparent',
    };

    const captionStyle = {
        fontSize: sizeMap[style.fontSize] || '1.3em',
        color: colorMap[style.fontColor] || '#fff',
        backgroundColor: bgMap[style.bgStyle] || 'rgba(0,0,0,0.6)',
        textShadow: style.bgStyle === 'outline' ? '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 2px 6px #000' : '1px 1px 3px #000',
        padding: style.bgStyle === 'dark' ? '4px 10px' : '0',
        borderRadius: '4px',
        fontWeight: 'bold',
        fontFamily: 'Arial, sans-serif',
    };

    return (
        <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl" style={{ aspectRatio: '16/9' }}>
            <video
                ref={videoRef}
                src={videoSrc}
                controls
                className="w-full h-full"
                style={{ objectFit: 'contain' }}
            >
                <track
                    key={vttSrc}
                    kind="subtitles"
                    src={vttSrc}
                    srcLang="fr"
                    label="Captions"
                    default
                />
            </video>

            {/* Overlay style info */}
            <style>{`
                video::cue {
                    font-size: ${captionStyle.fontSize};
                    color: ${captionStyle.color};
                    background-color: ${captionStyle.backgroundColor};
                    text-shadow: ${captionStyle.textShadow};
                    font-weight: bold;
                    font-family: Arial, sans-serif;
                    padding: ${captionStyle.padding};
                }
            `}</style>
        </div>
    );
}

/* ── Page principale ─────────────────────────────────────────── */
export default function VideoCaptionsPage() {
    // État principal
    const [step, setStep]           = useState<'upload' | 'processing' | 'preview' | 'burning'>('upload');
    const [file, setFile]           = useState<File | null>(null);
    const [language, setLanguage]   = useState('fr');
    const [progress, setProgress]   = useState('');
    const [error, setError]         = useState('');
    const [result, setResult]       = useState<TranscriptionResult | null>(null);
    const [captionStyle, setCaptionStyle] = useState<CaptionStyle>({
        fontSize: '22', fontColor: 'white', bgStyle: 'dark'
    });
    const [burnProgress, setBurnProgress] = useState('');

    // Édition du SRT
    const [editedSRT, setEditedSRT]     = useState('');
    const [srtModified, setSrtModified] = useState(false);
    const [showEditor, setShowEditor]   = useState(false);

    // Ressources Blob (URLs créées côté client)
    const [videoUrl, setVideoUrl]   = useState<string>('');
    const [vttUrl, setVttUrl]       = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cleanup Blob URLs on unmount
    useEffect(() => {
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            if (vttUrl)   URL.revokeObjectURL(vttUrl);
        };
    }, [videoUrl, vttUrl]);

    /* ── Handlers ──────────────────────────────────────── */
    const handleFileChange = (f: File | null) => {
        if (!f) return;
        setFile(f);
        setError('');
        setResult(null);
        setEditedSRT('');
        setSrtModified(false);
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(URL.createObjectURL(f));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        handleFileChange(e.dataTransfer.files?.[0] ?? null);
    };

    // Rebuild VTT depuis SRT édité (timecodes : virgule → point)
    const rebuildVttFromSrt = (srt: string): string =>
        'WEBVTT\n\n' + srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

    // Quand le SRT change → reconstruire le VTT et rafraîchir l'URL blob du player
    const handleSRTChange = (newSRT: string) => {
        setEditedSRT(newSRT);
        setSrtModified(true);
        const newVTT = rebuildVttFromSrt(newSRT);
        if (vttUrl) URL.revokeObjectURL(vttUrl);
        const blob = new Blob([newVTT], { type: 'text/vtt' });
        setVttUrl(URL.createObjectURL(blob));
    };

    const transcribe = async () => {
        if (!file) return;
        setStep('processing');
        setError('');
        setProgress('📤 Envoi de la vidéo...');

        const timers = [
            setTimeout(() => setProgress('🔊 Extraction de l\'audio...'), 4000),
            setTimeout(() => setProgress('🧠 Transcription Whisper AI...'), 9000),
            setTimeout(() => setProgress('📝 Génération des sous-titres...'), 18000),
        ];

        try {
            const form = new FormData();
            form.append('file', file);
            form.append('language', language);

            const res  = await fetch('/api/transcribe-video', { method: 'POST', body: form });
            const data = await res.json();

            timers.forEach(clearTimeout);

            if (!res.ok) throw new Error(data.error || 'Erreur de transcription');
            if (!data.srt && !data.vtt) throw new Error('Aucun sous-titre généré — pensez à réessayer avec une vidéo plus courte.');

            setResult(data);
            setEditedSRT(data.srt || '');
            setSrtModified(false);

            // Créer le Blob URL pour le VTT
            if (vttUrl) URL.revokeObjectURL(vttUrl);
            const vttBlob = new Blob([data.vtt || ''], { type: 'text/vtt' });
            setVttUrl(URL.createObjectURL(vttBlob));

            setStep('preview');
        } catch (err) {
            timers.forEach(clearTimeout);
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
            setStep('upload');
        }
    };

    const burnAndDownload = async () => {
        if (!file || !result?.srt) return;
        setStep('burning');
        setBurnProgress('⚙️ Gravure des captions en cours (FFmpeg)...');

        try {
            const form = new FormData();
            form.append('video', file);
            form.append('srt', editedSRT || result?.srt || '');
            form.append('fontSize', captionStyle.fontSize);
            form.append('fontColor', captionStyle.fontColor);
            form.append('bgStyle', captionStyle.bgStyle);

            const res = await fetch('/api/burn-captions', { method: 'POST', body: form });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Erreur lors de la gravure');
            }

            // Déclencher le téléchargement
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `${file.name.replace(/\.[^.]+$/, '')}_avec_captions.mp4`;
            a.click();
            URL.revokeObjectURL(url);

            setBurnProgress('✅ Vidéo téléchargée !');
            setTimeout(() => setStep('preview'), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de gravure');
            setStep('preview');
        }
    };

    const reset = () => {
        setStep('upload');
        setFile(null);
        setResult(null);
        setError('');
        setEditedSRT('');
        setSrtModified(false);
        setShowEditor(false);
        if (videoUrl) { URL.revokeObjectURL(videoUrl); setVideoUrl(''); }
        if (vttUrl)   { URL.revokeObjectURL(vttUrl);   setVttUrl('');   }
    };

    /* ── UI ─────────────────────────────────────────────── */
    return (
        <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 relative z-10 pt-10 mb-24">

            {/* ← Back */}
            <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 hover:shadow-sm transition-all mb-10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Retour
            </Link>

            {/* Hero */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50 shadow-sm mb-5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-bold text-rose-700 tracking-widest uppercase">Whisper AI + FFmpeg</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
                    Captions <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-600">Vidéo</span>
                </h1>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
                    Transcription automatique + gravure des sous-titres directement dans la vidéo. Prévisualisez, personnalisez, téléchargez.
                </p>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-center gap-3 mb-12">
                {(['upload','preview','download'] as const).map((s, i) => {
                    const labels = ['Uploader', 'Personnaliser', 'Télécharger'];
                    const active = (s === 'upload' && (step === 'upload' || step === 'processing'))
                                || (s === 'preview' && step === 'preview')
                                || (s === 'download' && step === 'burning');
                    const done   = (i === 0 && (step === 'preview' || step === 'burning'))
                                || (i === 1 && step === 'burning');
                    return (
                        <div key={s} className="flex items-center gap-3">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all ${
                                done ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                     : active ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
                                     : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}>
                                <span>{done ? '✓' : `${i + 1}`}</span>
                                <span>{labels[i]}</span>
                            </div>
                            {i < 2 && <div className="w-8 h-0.5 bg-slate-200 rounded" />}
                        </div>
                    );
                })}
            </div>

            {/* ═══ STEP 1 : UPLOAD ═══ */}
            {(step === 'upload' || step === 'processing') && (
                <div className="bg-white p-8 md:p-12 rounded-3xl border-t-4 border-t-rose-500 shadow-xl shadow-slate-200/50">
                    <div className="flex flex-col md:flex-row gap-10">

                        {/* Dropzone */}
                        <div className="w-full md:w-1/2">
                            <input type="file" ref={fileInputRef} onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
                                accept=".mp4,.mkv,.avi,.mov,.webm,.mp3,.wav,.m4a"
                                className="hidden" />

                            {!file ? (
                                <div
                                    className="w-full min-h-[280px] border-2 border-dashed border-rose-200 bg-rose-50/40 rounded-2xl flex flex-col items-center justify-center py-10 cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-all group"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDrop={handleDrop}
                                    onDragOver={e => e.preventDefault()}
                                >
                                    <div className="w-16 h-16 bg-white border border-rose-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                                        <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <span className="font-bold text-slate-700 text-base mb-1">Glisser-déposer ou cliquer</span>
                                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">MP4 · MKV · AVI · MOV · WebM</span>
                                    <span className="text-xs text-rose-400 font-semibold mt-2">Recommandé : max 50 Mo</span>
                                </div>
                            ) : (
                                <div className="w-full min-h-[280px] flex flex-col items-center justify-center bg-white border border-rose-100 rounded-2xl p-6 relative shadow-sm">
                                    <button onClick={reset} disabled={step === 'processing'} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>

                                    {step === 'processing' ? (
                                        <>
                                            <svg className="animate-spin h-12 w-12 text-rose-400 mb-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <p className="font-extrabold text-slate-700 text-lg text-center">{progress || 'En cours...'}</p>
                                            <p className="text-xs text-slate-400 font-medium mt-2 text-center">Cela peut prendre 30–60 secondes selon la durée de la vidéo.</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <p className="font-extrabold text-slate-800 text-base text-center truncate max-w-[220px] px-2">{file.name}</p>
                                            <p className="text-xs text-slate-500 mt-1 font-bold">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
                                            <div className="mt-4 bg-rose-50 border border-rose-100 px-4 py-2 rounded-lg">
                                                <p className="text-xs text-rose-700 font-bold">✅ Prêt pour la transcription</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Options */}
                        <div className="w-full md:w-1/2 flex flex-col justify-center">
                            <h3 className="text-lg font-extrabold text-slate-800 mb-6 tracking-tight">Paramètres</h3>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Langue parlée dans la vidéo</label>
                                <div className="relative">
                                    <select value={language} onChange={e => setLanguage(e.target.value)} disabled={step === 'processing'}
                                        className="block w-full appearance-none bg-slate-50 border border-slate-200 font-bold text-slate-800 py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors cursor-pointer disabled:opacity-50">
                                        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                        <svg className="fill-current w-4 h-4" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Ce que ça fait */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-6 space-y-2">
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-1">Processus :</p>
                                {[
                                    '🎙️ Transcription automatique par Whisper',
                                    '👁️ Prévisualisation en temps réel',
                                    '🎨 Personnalisation du style des captions',
                                    '🔥 Gravure définitive dans la vidéo',
                                    '📥 Téléchargement du MP4 final',
                                ].map((t, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />{t}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={transcribe}
                                disabled={!file || step === 'processing'}
                                className={`mt-8 w-full px-8 py-4 rounded-xl font-extrabold text-sm tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-3 ${
                                    !file || step === 'processing'
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:-translate-y-1 hover:shadow-xl'
                                }`}
                            >
                                {step === 'processing' && (
                                    <svg className="animate-spin h-5 w-5 text-white absolute" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                )}
                                {step === 'processing' ? 'Transcription...' : '🎙️ Transcrire & Prévisualiser'}
                            </button>

                            {error && (
                                <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 font-bold text-center">{error}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ STEP 2 : PREVIEW + BURN ═══ */}
            {step === 'preview' && result && videoUrl && vttUrl && (
                <div className="space-y-8">

                    {/* Player */}
                    <div className="bg-slate-900 p-4 md:p-8 rounded-3xl shadow-2xl border border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">👁️ Prévisualisation</span>
                            <span className="bg-emerald-800/50 text-emerald-300 border border-emerald-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                                ● Live — Captions WebVTT
                            </span>
                        </div>
                        <CaptionsPreview videoSrc={videoUrl} vttSrc={vttUrl} style={captionStyle} />
                        <div className="flex gap-4 flex-wrap mt-4">
                            <div className="bg-slate-800 rounded-xl px-4 py-2">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Fichier</p>
                                <p className="text-sm text-white font-bold truncate max-w-[180px]">{file?.name}</p>
                            </div>
                            <div className="bg-slate-800 rounded-xl px-4 py-2">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Mots transcrits</p>
                                <p className="text-sm text-white font-bold">{result.transcript.split(/\s+/).filter(Boolean).length}</p>
                            </div>
                            <div className="bg-slate-800 rounded-xl px-4 py-2">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Langue</p>
                                <p className="text-sm text-white font-bold uppercase">{result.language}</p>
                            </div>
                        </div>
                    </div>

                    {/* ─── PANNEAU ÉDITION SRT ─── */}
                    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                        <button
                            onClick={() => setShowEditor(v => !v)}
                            className="w-full flex items-center justify-between text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </div>
                                <div>
                                    <p className="text-sm font-extrabold text-slate-800">✏️ Éditer les captions (SRT)</p>
                                    <p className="text-xs text-slate-500 font-medium">Corrigez le texte et les timecodes avant la gravure</p>
                                </div>
                                {srtModified && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                        Modifié — Player mis à jour
                                    </span>
                                )}
                            </div>
                            <svg className={`w-5 h-5 text-slate-400 transition-transform ${showEditor ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {showEditor && (
                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] text-slate-400 font-mono">
                                        Format SRT : numéro, horodatage, texte, ligne vide
                                    </p>
                                    {srtModified && (
                                        <button
                                            onClick={() => {
                                                const orig = result?.srt || '';
                                                setEditedSRT(orig);
                                                setSrtModified(false);
                                                if (vttUrl) URL.revokeObjectURL(vttUrl);
                                                const blob = new Blob([rebuildVttFromSrt(orig)], { type: 'text/vtt' });
                                                setVttUrl(URL.createObjectURL(blob));
                                            }}
                                            className="text-xs font-bold text-red-500 hover:underline"
                                        >
                                            ↺ Réinitialiser
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={editedSRT}
                                    onChange={e => handleSRTChange(e.target.value)}
                                    rows={16}
                                    spellCheck
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                                />
                                <p className="text-[11px] text-slate-400 font-medium mt-2 text-right">
                                    {editedSRT.length} caractères — Les modifications s’appliquent en temps réel dans le player ↑
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ─ Style + Burn ─ */}
                    <div className="bg-white p-8 rounded-3xl border-t-4 border-t-rose-500 shadow-xl shadow-slate-200/50">
                        <h3 className="text-lg font-extrabold text-slate-800 mb-8 tracking-tight">🎨 Personnaliser le style des captions</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                            {/* Taille */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Taille du texte</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {FONT_SIZES.map(f => (
                                        <button key={f.value} onClick={() => setCaptionStyle(s => ({ ...s, fontSize: f.value as CaptionStyle['fontSize'] }))}
                                            className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${captionStyle.fontSize === f.value ? 'bg-rose-500 text-white border-rose-500 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'}`}>
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Couleur du texte */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Couleur du texte</label>
                                <div className="flex flex-col gap-2">
                                    {FONT_COLORS.map(c => (
                                        <button key={c.value} onClick={() => setCaptionStyle(s => ({ ...s, fontColor: c.value as CaptionStyle['fontColor'] }))}
                                            className={`flex items-center gap-3 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all ${captionStyle.fontColor === c.value ? 'ring-2 ring-rose-400 shadow-md' : 'hover:border-rose-200'}`}>
                                            <div className={`w-6 h-6 rounded-full border-2 ${c.cls}`} />
                                            {c.label}
                                            {captionStyle.fontColor === c.value && <span className="ml-auto text-rose-500">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Style de fond */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Style de fond</label>
                                <div className="flex flex-col gap-2">
                                    {BG_STYLES.map(b => (
                                        <button key={b.value} onClick={() => setCaptionStyle(s => ({ ...s, bgStyle: b.value as CaptionStyle['bgStyle'] }))}
                                            className={`py-2.5 px-4 rounded-xl border text-xs font-bold text-left transition-all ${captionStyle.bgStyle === b.value ? 'bg-slate-800 text-white border-slate-700 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                                            {b.label}
                                            {captionStyle.bgStyle === b.value && <span className="float-right">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Aperçu mini du style */}
                        <div className="bg-slate-900 rounded-2xl p-6 mb-8 flex items-center justify-center min-h-[80px]">
                            <span style={{
                                fontSize: { '18': '1em', '22': '1.3em', '28': '1.6em', '34': '2em' }[captionStyle.fontSize],
                                color: { white: '#fff', yellow: '#ffe135', cyan: '#00e5ff' }[captionStyle.fontColor],
                                backgroundColor: captionStyle.bgStyle === 'dark' ? 'rgba(0,0,0,0.6)' : 'transparent',
                                textShadow: captionStyle.bgStyle !== 'dark' ? '1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000' : '1px 1px 3px #000',
                                padding: captionStyle.bgStyle === 'dark' ? '4px 12px' : '0',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontFamily: 'Arial, sans-serif',
                            }}>
                                Exemple de caption dans votre vidéo
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <button onClick={burnAndDownload}
                                className="flex-1 min-w-[200px] py-4 px-8 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-extrabold text-sm uppercase tracking-widest rounded-xl shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all">
                                🔥 Graver & Télécharger la vidéo
                            </button>
                            <button onClick={reset}
                                className="py-4 px-6 bg-white border border-slate-200 text-slate-600 font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-colors">
                                🔄 Nouvelle vidéo
                            </button>
                        </div>

                        {error && (
                            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 font-bold">{error}</div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ STEP 3 : BURNING ═══ */}
            {step === 'burning' && (
                <div className="bg-white p-16 rounded-3xl border-t-4 border-t-rose-500 shadow-xl shadow-slate-200/50 text-center">
                    <svg className="animate-spin h-14 w-14 text-rose-400 mx-auto mb-6" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <h2 className="text-2xl font-extrabold text-slate-800 mb-3">Gravure en cours…</h2>
                    <p className="text-slate-500 font-medium text-base max-w-md mx-auto">{burnProgress}</p>
                    <p className="text-slate-400 font-medium text-sm mt-3">
                        FFmpeg grave les captions dans la vidéo. Cette opération dure <strong>1–3 minutes</strong> selon la durée.
                    </p>
                    <div className="mt-8 flex justify-center gap-2">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
