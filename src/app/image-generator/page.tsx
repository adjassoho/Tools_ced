'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface GeneratedImage {
    imageUrl: string;
    prompt: string;
    title: string;
    style: string;
    dimensions: { width: number; height: number };
}

export default function ImageGenerator() {
    const [file, setFile] = useState<File | null>(null);
    const [style, setStyle] = useState('realistic');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [result, setResult] = useState<GeneratedImage | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
            setResult(null);
        }
    };

    const generateImage = async () => {
        if (!file) return;

        setLoading(true);
        setError('');
        setProgress('📄 Analyse du document...');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('style', style);
            formData.append('aspectRatio', aspectRatio);

            setTimeout(() => setProgress('🎨 Création du prompt...'), 2000);
            setTimeout(() => setProgress('🖼️ Génération de l\'image...'), 4000);

            const response = await fetch('/api/generate-image', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la génération');
            }

            setResult(data);
            setProgress('');
            setImageLoading(true);
            setImageError(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    };

    const downloadImage = async () => {
        if (!result) return;
        
        try {
            const response = await fetch(result.imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${result.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download error:', err);
        }
    };

    const regenerateImage = () => {
        if (file) {
            generateImage();
        }
    };

    return (
        <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 relative z-10 pt-10 mb-20">
            <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 hover:shadow-sm transition-all mb-10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Retour aux Outils
            </Link>
            
            <div className="text-center mb-16 relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 shadow-sm mb-6">
                   <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                   <span className="text-xs font-bold text-indigo-700 tracking-widest uppercase">Génération Visuelle</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
                  Générateur d'<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Images</span>
                </h1>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
                  Créez des illustrations professionnelles en lien avec votre document, contextualisées pour des réalités africaines.
                </p>
            </div>

            {!result ? (
                <div className="glass-panel bg-white p-8 md:p-12 rounded-3xl border-t-4 border-t-indigo-500 shadow-xl shadow-slate-200/50">
                    <div className="flex flex-col md:flex-row gap-10">
                        {/* Zone Upload */}
                        <div className="w-full md:w-1/2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".pdf,.docx,.doc,.txt"
                                className="hidden"
                            />
                            
                            {!file ? (
                                <div 
                                    className="w-full h-full min-h-[280px] border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-2xl flex flex-col items-center justify-center py-10 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors group relative overflow-hidden"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-16 h-16 bg-white border border-indigo-100 rounded-2xl flex items-center justify-center mb-5 text-indigo-500 group-hover:scale-110 transition-transform shadow-md">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    </div>
                                    <span className="font-bold text-slate-700 text-base mb-1">Cliquer pour parcourir</span>
                                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Supporte PDF, DOCX, TXT</span>
                                </div>
                            ) : (
                                <div className="w-full h-full min-h-[280px] flex flex-col items-center justify-center bg-white border border-indigo-100 rounded-2xl p-6 relative shadow-sm">
                                    <button onClick={() => setFile(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                    <div className="w-20 h-20 bg-indigo-100 border border-indigo-200 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
                                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"></path></svg>
                                    </div>
                                    <p className="font-extrabold text-slate-800 text-lg text-center truncate w-full px-4">{file.name}</p>
                                    <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mt-2">{(file.size / 1024).toFixed(1)} Ko</p>
                                </div>
                            )}
                        </div>

                        {/* Zone Options */}
                        <div className="w-full md:w-1/2 flex flex-col justify-center">
                            <h3 className="text-lg font-extrabold text-slate-800 mb-6 tracking-tight">Paramètres Visuels</h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-3">Style Artistique</label>
                                    <div className="relative">
                                        <select 
                                            value={style} 
                                            onChange={(e) => setStyle(e.target.value)}
                                            className="block w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-sm cursor-pointer"
                                        >
                                            <option value="realistic">📷 Photographie Réaliste</option>
                                            <option value="illustration">🎨 Illustration Numérique</option>
                                            <option value="artistic">🖼️ Peinture Artistique</option>
                                            <option value="infographic">📊 Schéma / Infographie</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                            <svg className="fill-current w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-3">Format (Ratio)</label>
                                    <div className="relative">
                                        <select 
                                            value={aspectRatio} 
                                            onChange={(e) => setAspectRatio(e.target.value)}
                                            className="block w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-sm cursor-pointer"
                                        >
                                            <option value="1:1">⬜ Carré (1:1) - Réseaux Sociaux</option>
                                            <option value="16:9">🖥️ Paysage (16:9) - Présentation</option>
                                            <option value="9:16">📱 Portrait (9:16) - Mobile</option>
                                            <option value="4:3">📺 Standard (4:3) - Document</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                            <svg className="fill-current w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={generateImage}
                                disabled={!file || loading}
                                className={`mt-8 w-full group relative overflow-hidden px-8 py-4 rounded-xl font-extrabold text-sm tracking-widest uppercase transition-all shadow-md hover:shadow-xl flex items-center justify-center gap-3 ${
                                    loading || !file
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:-translate-y-1'
                                }`}
                            >
                                {loading && (
                                    <svg className="animate-spin h-5 w-5 text-white absolute left-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {loading ? (progress || 'Génération...') : '🎨 Générer l\'image'}
                            </button>
                            {error && (
                                <p className="text-red-500 text-sm font-bold text-center mt-4 bg-red-50 p-2 rounded-lg">{error}</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass-panel bg-white p-8 md:p-12 rounded-3xl border-t-4 border-t-indigo-500 shadow-xl shadow-slate-200/50">
                    
                    <div className="mb-10 text-center">
                        <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">{result.title}</h3>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest border border-indigo-100">
                            {style} • {aspectRatio}
                        </div>
                    </div>
                    
                    {/* Zone de l'image */}
                    <div className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 mb-8 flex items-center justify-center min-h-[400px] shadow-inner group">
                        
                        {imageLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/80 backdrop-blur-sm z-20">
                                <svg className="animate-spin h-10 w-10 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-sm font-bold text-slate-600 uppercase tracking-widest animate-pulse">Développement de l'image...</p>
                            </div>
                        )}
                        
                        {imageError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 z-20">
                                <svg className="w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                <p className="text-sm font-bold text-red-600 mb-4 uppercase tracking-widest">Échec du chargement</p>
                                <button className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-50" onClick={regenerateImage}>
                                    🔄 Réessayer
                                </button>
                            </div>
                        )}
                        
                        <img 
                            src={result.imageUrl} 
                            alt={result.title}
                            className={`w-full h-auto object-contain transition-opacity duration-700 ${imageLoading || imageError ? 'opacity-0' : 'opacity-100'} group-hover:scale-[1.02] transform transition-transform`}
                            onLoad={() => setImageLoading(false)}
                            onError={() => {
                                setImageLoading(false);
                                setImageError(true);
                            }}
                        />
                    </div>
                    
                    {/* Détails Prompt */}
                    <div className="max-w-3xl mx-auto mb-10">
                        <button 
                            className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                            onClick={() => setShowPrompt(!showPrompt)}
                        >
                            <span className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Prompt Utilisé (Prompt Engineering)
                            </span>
                            <svg className={`w-5 h-5 text-slate-400 transform transition-transform ${showPrompt ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        
                        {showPrompt && (
                            <div className="mt-2 p-5 bg-indigo-50 border border-indigo-100 rounded-xl">
                                <p className="text-sm font-medium text-slate-700 leading-relaxed font-mono">
                                    {result.prompt}
                                </p>
                            </div>
                        )}
                    </div>
                    
                    {/* Actions Menu */}
                    <div className="flex flex-wrap items-center justify-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <button onClick={regenerateImage} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-sm flex items-center gap-2">
                            🔄 RÉGÉNÉRER
                        </button>
                        <button onClick={downloadImage} className="px-6 py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-sm flex items-center gap-2">
                            💾 TÉLÉCHARGER (.PNG)
                        </button>
                        <button onClick={() => setResult(null)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-md ml-auto">
                            📁 NOUVEAU
                        </button>
                    </div>
                </div>
            )}
            
            {!result && (
                <div className="mt-8 bg-slate-50 border border-slate-200 p-6 rounded-2xl flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl shrink-0">🌍</div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-1">Images en contexte africain</h4>
                        <p className="text-sm text-slate-600 font-medium">Les images générées représentent des scènes, personnages et paysages africains en lien direct avec le contenu de votre document pour une régionalisation parfaite.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
