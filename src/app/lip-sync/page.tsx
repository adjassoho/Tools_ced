"use client";

import { useState, useRef } from "react";

export default function LipSync() {
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [audio, setAudio] = useState<File | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultVideo, setResultVideo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>("");

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
            setResultVideo(null);
            setError(null);
        }
    };

    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudio(file);
            setAudioUrl(URL.createObjectURL(file));
            setResultVideo(null);
            setError(null);
        }
    };

    const handleGenerate = async () => {
        if (!photo || !audio) return;
        
        setIsProcessing(true);
        setError(null);
        setResultVideo(null);
        setProgress("Envoi des fichiers...");

        try {
            const formData = new FormData();
            formData.append('photo', photo);
            formData.append('audio', audio);

            const response = await fetch('/api/lip-sync', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la génération');
            }

            // Polling pour le résultat
            if (data.predictionId) {
                setProgress("Génération en cours...");
                let attempts = 0;
                const maxAttempts = 120; // 4 minutes max

                while (attempts < maxAttempts) {
                    await new Promise(r => setTimeout(r, 2000));
                    
                    const statusRes = await fetch(`/api/lip-sync?id=${data.predictionId}`);
                    const statusData = await statusRes.json();

                    if (statusData.status === 'succeeded') {
                        setResultVideo(statusData.output);
                        setProgress("");
                        break;
                    } else if (statusData.status === 'failed') {
                        throw new Error(statusData.error || 'La génération a échoué');
                    }

                    attempts++;
                    setProgress(`Génération en cours... (${attempts * 2}s)`);
                }

                if (attempts >= maxAttempts) {
                    throw new Error('Timeout - la génération prend trop de temps');
                }
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
            setProgress("");
        }
    };

    const reset = () => {
        setPhoto(null);
        setPhotoPreview(null);
        setAudio(null);
        setAudioUrl(null);
        setResultVideo(null);
        setError(null);
    };

    return (
        <div className="container">
            <header className="page-header">
                <div className="page-badge">Animation IA</div>
                <h1 className="page-title">Lip Sync <span className="highlight">Avatar</span></h1>
                <p className="page-description">
                    Transformez une photo en vidéo parlante. Uploadez une photo et un audio pour créer une animation réaliste avec synchronisation des lèvres.
                </p>
            </header>

            {/* Info Box */}
            <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
            }}>
                <span style={{ fontSize: '20px' }}>💡</span>
                <div>
                    <strong style={{ color: 'var(--primary)' }}>Astuce :</strong> Utilisez d'abord{' '}
                    <a href="/voice-cloning" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                        Symphonie Vocale
                    </a>{' '}
                    pour cloner une voix, puis uploadez l'audio généré ici avec une photo pour créer votre avatar parlant !
                </div>
            </div>

            <div className="voice-grid">
                {/* Step 1: Photo */}
                <div>
                    <div className="voice-step">
                        <div className="step-number">1</div>
                        <div className="step-title">Photo du Visage</div>
                    </div>

                    {!photoPreview ? (
                        <label className="voice-upload">
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Cliquez pour ajouter une photo</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PNG, JPG (visage visible)</div>
                            <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handlePhotoUpload} />
                        </label>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <img 
                                src={photoPreview} 
                                alt="Preview" 
                                style={{ 
                                    width: '100%', 
                                    borderRadius: '12px',
                                    maxHeight: '300px',
                                    objectFit: 'cover'
                                }} 
                            />
                            <button 
                                onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    background: 'rgba(0,0,0,0.7)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer'
                                }}
                            >✕</button>
                        </div>
                    )}
                </div>

                {/* Step 2: Audio */}
                <div>
                    <div className="voice-step">
                        <div className="step-number">2</div>
                        <div className="step-title">Audio à Synchroniser</div>
                    </div>

                    {!audio ? (
                        <label className="voice-upload">
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎵</div>
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Cliquez pour ajouter l'audio</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>MP3, WAV, M4A</div>
                            <input type="file" style={{ display: 'none' }} accept="audio/*" onChange={handleAudioUpload} />
                        </label>
                    ) : (
                        <div className="voice-file">
                            <div className="voice-file-info">
                                <div className="voice-file-icon">🎙️</div>
                                <div>
                                    <div className="voice-file-name">{audio.name}</div>
                                    <div className="voice-file-size">{(audio.size / 1024 / 1024).toFixed(2)} MB</div>
                                </div>
                            </div>
                            <button className="voice-file-remove" onClick={() => { setAudio(null); setAudioUrl(null); }}>✕</button>
                        </div>
                    )}

                    {audioUrl && (
                        <audio src={audioUrl} controls style={{ width: '100%', marginTop: '12px' }} />
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginTop: '24px',
                    color: '#ef4444'
                }}>
                    <strong>Erreur :</strong> {error}
                </div>
            )}

            {/* Action Button */}
            <div style={{ textAlign: 'center', paddingTop: '24px' }}>
                {!resultVideo ? (
                    <button
                        className="btn btn-primary"
                        onClick={handleGenerate}
                        disabled={isProcessing || !photo || !audio}
                        style={{
                            fontSize: '18px',
                            padding: '20px 48px',
                            opacity: (!photo || !audio) ? 0.5 : 1,
                            cursor: (!photo || !audio) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isProcessing ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                                {progress || "Génération..."}
                            </span>
                        ) : "🎬 Générer la Vidéo"}
                    </button>
                ) : (
                    <div className="audio-result fade-in">
                        <div className="audio-result-title">🎉 Vidéo Générée !</div>
                        <video 
                            src={resultVideo} 
                            controls 
                            style={{ 
                                width: '100%', 
                                maxWidth: '500px', 
                                borderRadius: '12px',
                                marginBottom: '16px'
                            }} 
                        />
                        <div className="audio-result-buttons">
                            <button className="btn btn-secondary" onClick={reset}>Nouvelle Vidéo</button>
                            <a href={resultVideo} download="lip-sync-video.mp4" className="btn btn-primary">
                                Télécharger
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Alternative gratuite */}
            <div style={{
                marginTop: '48px',
                padding: '24px',
                background: 'var(--card-bg)',
                borderRadius: '16px',
                border: '1px dashed var(--border-color)'
            }}>
                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🌐</span> Alternative Gratuite en Ligne
                </h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Si l'API n'est pas disponible, vous pouvez utiliser ces outils gratuits en ligne :
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <a 
                        href="https://www.wav2lip.org/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        Wav2Lip.org <span>↗</span>
                    </a>
                    <a 
                        href="https://sadtalker.ai/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        SadTalker.ai <span>↗</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
