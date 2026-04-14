'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface WordTimestamp {
    word: string;
    start: number;
    end: number;
}

interface TranscriptionResult {
    transcript: string;
    words: WordTimestamp[];
    segments: { start: number; end: number; text: string }[];
    duration: number;
    language: string;
    fileName: string;
    srt: string | null;
    vtt: string | null;
}

const LANGUAGES = [
    { code: 'fr', label: '🇫🇷 Français' },
    { code: 'en', label: '🇬🇧 English' },
    { code: 'ar', label: '🇸🇦 Arabe' },
    { code: 'es', label: '🇪🇸 Español' },
    { code: 'pt', label: '🇧🇷 Português' },
    { code: 'yo', label: '🌍 Yoruba' },
    { code: 'ha', label: '🌍 Haoussa' },
];

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}min ${s}s`;
}

export default function VideoTranscriptionPage() {
    const [file, setFile]           = useState<File | null>(null);
    const [language, setLanguage]   = useState('fr');
    const [loading, setLoading]     = useState(false);
    const [progress, setProgress]   = useState('');
    const [error, setError]         = useState('');
    const [result, setResult]       = useState<TranscriptionResult | null>(null);
    const [activeTab, setActiveTab] = useState<'text' | 'srt' | 'vtt'>('text');
    const [copied, setCopied]       = useState(false);
    const fileInputRef              = useRef<HTMLInputElement>(null);

    // Contenu éditable — initiialisé depuis le résultat IA, modifiable par l'utilisateur
    const [editedText, setEditedText] = useState('');
    const [editedSRT,  setEditedSRT]  = useState('');
    const [editedVTT,  setEditedVTT]  = useState('');
    const [isModified, setIsModified] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) { setFile(f); setError(''); setResult(null); }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) { setFile(f); setError(''); setResult(null); }
    };

    const transcribe = async () => {
        if (!file) return;
        setLoading(true);
        setError('');
        setProgress('📤 Upload de la vidéo...');

        try {
            const form = new FormData();
            form.append('file', file);
            form.append('language', language);

            setTimeout(() => setProgress('🔊 Extraction de l\'audio...'), 3000);
            setTimeout(() => setProgress('🧠 Transcription par Whisper AI...'), 7000);
            setTimeout(() => setProgress('📝 Génération des sous-titres...'), 15000);

            const res = await fetch('/api/transcribe-video', { method: 'POST', body: form });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Erreur lors de la transcription');

            setResult(data);
            // Initialiser les zones éditables avec le contenu IA
            setEditedText(data.transcript || '');
            setEditedSRT(data.srt || '');
            setEditedVTT(data.vtt || '');
            setIsModified(false);
            setProgress('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    };

    const downloadFile = (content: string, filename: string, mime: string) => {
        const blob = new Blob([content], { type: mime });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyText = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    /* Retourne le contenu édité selon l'onglet actif */
    const activeContent = activeTab === 'text' ? editedText : activeTab === 'srt' ? editedSRT : editedVTT;
    const setActiveContent = (v: string) => {
        setIsModified(true);
        if (activeTab === 'text') setEditedText(v);
        else if (activeTab === 'srt') setEditedSRT(v);
        else setEditedVTT(v);
    };

    const resetEdits = () => {
        if (!result) return;
        setEditedText(result.transcript || '');
        setEditedSRT(result.srt || '');
        setEditedVTT(result.vtt || '');
        setIsModified(false);
    };

    return (
        <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 relative z-10 pt-10 mb-20">

            {/* Back */}
            <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 hover:shadow-sm transition-all mb-10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Retour aux Outils
            </Link>

            {/* Hero */}
            <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 shadow-sm mb-6">
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-violet-700 tracking-widest uppercase">Whisper AI · Groq</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
                    Transcription <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">Vidéo</span>
                </h1>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
                    Uploadez une vidéo ou un audio. L&apos;IA Whisper génère instantanément la transcription complète et les sous-titres (SRT/VTT).
                </p>
            </div>

            {!result ? (
                <div className="bg-white p-8 md:p-12 rounded-3xl border-t-4 border-t-violet-500 shadow-xl shadow-slate-200/50">
                    <div className="flex flex-col md:flex-row gap-10">

                        {/* Dropzone */}
                        <div className="w-full md:w-1/2">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange}
                                accept=".mp4,.mkv,.avi,.mov,.webm,.mp3,.wav,.m4a,.ogg"
                                className="hidden" />

                            {!file ? (
                                <div
                                    className="w-full min-h-[300px] border-2 border-dashed border-violet-200 bg-violet-50/50 rounded-2xl flex flex-col items-center justify-center py-10 cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors group"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDrop={handleDrop}
                                    onDragOver={(e) => e.preventDefault()}
                                >
                                    <div className="w-16 h-16 bg-white border border-violet-100 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-md">
                                        <svg className="w-8 h-8 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <span className="font-bold text-slate-700 text-base mb-1">Glisser-déposer ou cliquer</span>
                                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">MP4, MKV, AVI, MOV, MP3, WAV…</span>
                                    <span className="text-xs text-violet-400 font-semibold mt-2">Taille max recommandée : 25 Mo</span>
                                </div>
                            ) : (
                                <div className="w-full min-h-[300px] flex flex-col items-center justify-center bg-white border border-violet-100 rounded-2xl p-6 relative shadow-sm">
                                    <button onClick={() => setFile(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                    <div className="w-20 h-20 bg-violet-100 border border-violet-200 rounded-2xl flex items-center justify-center text-violet-600 mb-6">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <p className="font-extrabold text-slate-800 text-lg text-center truncate w-full px-4">{file.name}</p>
                                    <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mt-2">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
                                    <div className="mt-4 bg-violet-50 border border-violet-100 rounded-lg px-4 py-2">
                                        <p className="text-xs text-violet-700 font-bold">✅ Fichier prêt pour la transcription</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Options */}
                        <div className="w-full md:w-1/2 flex flex-col justify-center">
                            <h3 className="text-lg font-extrabold text-slate-800 mb-6 tracking-tight">Paramètres</h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-3">Langue de la vidéo</label>
                                    <div className="relative">
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="block w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors shadow-sm cursor-pointer"
                                        >
                                            {LANGUAGES.map(l => (
                                                <option key={l.code} value={l.code}>{l.label}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                            <svg className="fill-current w-4 h-4" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Info box */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                                    <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Ce que vous obtiendrez :</p>
                                    {[
                                        '📄 Transcription complète du texte',
                                        '🎬 Fichier de sous-titres SRT',
                                        '🌐 Fichier de sous-titres WebVTT',
                                        '⏱️ Timecodes mot par mot',
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0"></div>
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={transcribe}
                                disabled={!file || loading}
                                className={`mt-8 w-full group relative overflow-hidden px-8 py-4 rounded-xl font-extrabold text-sm tracking-widest uppercase transition-all shadow-md hover:shadow-xl flex items-center justify-center gap-3 ${
                                    loading || !file
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:-translate-y-1'
                                }`}
                            >
                                {loading && (
                                    <svg className="animate-spin h-5 w-5 text-white absolute left-6" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                )}
                                {loading ? (progress || 'Transcription en cours...') : '🎙️ Lancer la Transcription'}
                            </button>
                            {error && <p className="text-red-500 text-sm font-bold text-center mt-4 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-8 md:p-12 rounded-3xl border-t-4 border-t-violet-500 shadow-xl shadow-slate-200/50">

                    {/* Stats header */}
                    <div className="flex flex-wrap gap-4 mb-8 pb-8 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fichier</p>
                                <p className="font-extrabold text-slate-800 text-sm">{result.fileName}</p>
                            </div>
                        </div>
                        {result.duration > 0 && (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">⏱️</div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Durée</p>
                                    <p className="font-extrabold text-slate-800 text-sm">{formatDuration(result.duration)}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">🌐</div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Langue</p>
                                <p className="font-extrabold text-slate-800 text-sm uppercase">{result.language}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">📝</div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mots</p>
                                <p className="font-extrabold text-slate-800 text-sm">{result.transcript.split(/\s+/).filter(Boolean).length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl mb-6 w-fit">
                        {([
                            { k: 'text', label: '📄 Texte', disabled: !result.transcript },
                            { k: 'srt',  label: '🎬 SRT',   disabled: !result.srt },
                            { k: 'vtt',  label: '🌐 VTT',   disabled: !result.vtt },
                        ] as { k: 'text' | 'srt' | 'vtt'; label: string; disabled: boolean }[]).map(tab => (
                            <button
                                key={tab.k}
                                onClick={() => setActiveTab(tab.k)}
                                disabled={tab.disabled}
                                className={`px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                    activeTab === tab.k
                                        ? 'bg-white text-violet-700 shadow-sm border border-slate-200'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Zone éditable */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">✏️ Modifier le contenu</label>
                                {isModified && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        Modifié
                                    </span>
                                )}
                            </div>
                            {isModified && (
                                <button onClick={resetEdits} className="text-xs font-bold text-slate-500 hover:text-red-500 underline transition-colors">
                                    ↺ Réinitialiser
                                </button>
                            )}
                        </div>
                        <textarea
                            value={activeContent}
                            onChange={e => setActiveContent(e.target.value)}
                            rows={14}
                            spellCheck={activeTab === 'text'}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm text-slate-700 font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all placeholder:text-slate-300"
                            placeholder={activeTab === 'text' ? 'La transcription apparaîta ici...' : activeTab === 'srt' ? 'Sous-titres SRT...' : 'Sous-titres VTT...'}
                        />
                        <p className="text-[11px] text-slate-400 font-medium mt-2 text-right">
                            {activeContent.length} caractères · {activeContent.split(/\s+/).filter(Boolean).length} mots
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <button onClick={() => copyText(activeContent)} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-sm">
                            {copied ? '✅ COPIÉ !' : '📋 COPIER'}
                        </button>
                        <button
                            onClick={() => downloadFile(editedText, `${result.fileName}_transcription.txt`, 'text/plain')}
                            className="px-6 py-3 bg-violet-50 hover:bg-violet-100 border border-violet-100 text-violet-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-sm"
                        >
                            📄 TXT
                        </button>
                        {editedSRT && (
                            <button
                                onClick={() => downloadFile(editedSRT, `${result.fileName}.srt`, 'text/plain')}
                                className="px-6 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-sm"
                            >
                                🎬 SRT
                            </button>
                        )}
                        {editedVTT && (
                            <button
                                onClick={() => downloadFile(editedVTT, `${result.fileName}.vtt`, 'text/vtt')}
                                className="px-6 py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-sm"
                            >
                                🌐 VTT
                            </button>
                        )}
                        <button onClick={() => { setResult(null); setIsModified(false); }} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-md ml-auto">
                            🔄 NOUVELLE VIDÉO
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
