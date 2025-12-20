"use client";

import { useState } from "react";

export default function VoiceCloning() {
    const [voiceSample, setVoiceSample] = useState<File | null>(null);
    const [text, setText] = useState("");
    const [isCloning, setIsCloning] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setVoiceSample(file);
    };

    const handleClone = async () => {
        if (!voiceSample || !text) return;
        setIsCloning(true);
        setAudioUrl(null);

        try {
            const formData = new FormData();
            formData.append('file', voiceSample);
            formData.append('text', text);

            const response = await fetch('/api/clone-voice', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erreur lors du clonage');

            setAudioUrl(data.audio);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsCloning(false);
        }
    };

    return (
        <div className="container">
            <header className="page-header">
                <div className="page-badge">Synthèse Neuronale</div>
                <h1 className="page-title">Clonage de <span className="highlight">Voix Elite</span></h1>
                <p className="page-description">
                    Transformez vos textes en parole avec une fidélité absolue. La voix de votre succès, façonnée par l'IA d'INE.
                </p>
            </header>

            <div className="voice-grid">
                {/* Step 1: Voice Sample */}
                <div>
                    <div className="voice-step">
                        <div className="step-number">1</div>
                        <div className="step-title">Échantillon Vocal</div>
                    </div>

                    {!voiceSample ? (
                        <label className="voice-upload">
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎤</div>
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Cliquez pour ajouter l'audio</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>MP3, WAV (Min. 5s)</div>
                            <input type="file" style={{ display: 'none' }} accept="audio/*" onChange={handleVoiceUpload} />
                        </label>
                    ) : (
                        <div className="voice-file">
                            <div className="voice-file-info">
                                <div className="voice-file-icon">🎙️</div>
                                <div>
                                    <div className="voice-file-name">{voiceSample.name}</div>
                                    <div className="voice-file-size">{(voiceSample.size / 1024 / 1024).toFixed(2)} MB</div>
                                </div>
                            </div>
                            <button className="voice-file-remove" onClick={() => setVoiceSample(null)}>✕</button>
                        </div>
                    )}
                </div>

                {/* Step 2: Text Input */}
                <div>
                    <div className="voice-step">
                        <div className="step-number">2</div>
                        <div className="step-title">Texte à Générer</div>
                    </div>

                    <textarea
                        className="voice-textarea"
                        placeholder="Tapez le texte que la voix clonée doit prononcer..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>
            </div>

            {/* Action / Result */}
            <div style={{ textAlign: 'center', paddingTop: '24px' }}>
                {!audioUrl ? (
                    <button
                        className="btn btn-primary"
                        onClick={handleClone}
                        disabled={isCloning || !voiceSample || !text}
                        style={{
                            fontSize: '18px',
                            padding: '20px 48px',
                            opacity: (!voiceSample || !text) ? 0.5 : 1,
                            cursor: (!voiceSample || !text) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isCloning ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                                Génération du Clone...
                            </span>
                        ) : "Cloner la Voix"}
                    </button>
                ) : (
                    <div className="audio-result fade-in">
                        <div className="audio-result-title">Voix Clonée Prête</div>
                        <audio src={audioUrl} controls />
                        <div className="audio-result-buttons">
                            <button className="btn btn-secondary" onClick={() => setAudioUrl(null)}>Réessayer</button>
                            <a href={audioUrl} download="cloned-voice.mp3" className="btn btn-primary">Télécharger l'Audio</a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
