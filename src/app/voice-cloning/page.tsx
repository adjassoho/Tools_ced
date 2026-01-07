"use client";

import { useState, useRef, useEffect } from "react";

export default function VoiceCloning() {
    // Mode: 'upload' ou 'record'
    const [inputMode, setInputMode] = useState<'upload' | 'record'>('upload');
    
    // Upload mode
    const [voiceSample, setVoiceSample] = useState<File | null>(null);
    const [samplePreviewUrl, setSamplePreviewUrl] = useState<string | null>(null);
    
    // Record mode
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    
    // Text & Generation
    const [text, setText] = useState("");
    const [isCloning, setIsCloning] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Cleanup URLs on unmount
    useEffect(() => {
        return () => {
            if (samplePreviewUrl) URL.revokeObjectURL(samplePreviewUrl);
            if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        };
    }, []);

    const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVoiceSample(file);
            if (samplePreviewUrl) URL.revokeObjectURL(samplePreviewUrl);
            setSamplePreviewUrl(URL.createObjectURL(file));
            setError(null);
        }
    };

    const clearUpload = () => {
        setVoiceSample(null);
        if (samplePreviewUrl) URL.revokeObjectURL(samplePreviewUrl);
        setSamplePreviewUrl(null);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setRecordedBlob(blob);
                if (recordedUrl) URL.revokeObjectURL(recordedUrl);
                setRecordedUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            setError(null);

            timerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);

        } catch (err) {
            setError("Impossible d'accéder au microphone. Vérifiez les permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const clearRecording = () => {
        setRecordedBlob(null);
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(null);
        setRecordingTime(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getAudioSource = (): File | Blob | null => {
        if (inputMode === 'upload') return voiceSample;
        return recordedBlob;
    };

    const handleClone = async () => {
        const audioSource = getAudioSource();
        if (!audioSource || !text) return;
        
        setIsCloning(true);
        setAudioUrl(null);
        setError(null);

        try {
            const formData = new FormData();
            
            if (audioSource instanceof File) {
                formData.append('file', audioSource);
            } else {
                formData.append('file', audioSource, 'recording.webm');
            }
            formData.append('text', text);

            const response = await fetch('/api/clone-voice', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erreur lors du clonage');

            setAudioUrl(data.audio);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsCloning(false);
        }
    };

    const hasAudioSample = inputMode === 'upload' ? !!voiceSample : !!recordedBlob;
    const canGenerate = hasAudioSample && text.trim().length > 0;

    return (
        <div className="container">
            <header className="page-header">
                <div className="page-badge">Synthèse Neuronale</div>
                <h1 className="page-title">Symphonie <span className="highlight">Vocale</span></h1>
                <p className="page-description">
                    Clonez n'importe quelle voix et générez des audios personnalisés. 
                    Importez un échantillon ou enregistrez directement votre voix.
                </p>
            </header>

            {/* Mode Selector */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '32px'
            }}>
                <button
                    onClick={() => setInputMode('upload')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '12px',
                        border: inputMode === 'upload' ? '2px solid var(--primary)' : '2px solid var(--border-color)',
                        background: inputMode === 'upload' ? 'rgba(59, 130, 246, 0.1)' : 'var(--card-bg)',
                        color: inputMode === 'upload' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    <span style={{ fontSize: '20px' }}>📁</span>
                    Importer un fichier
                </button>
                <button
                    onClick={() => setInputMode('record')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '12px',
                        border: inputMode === 'record' ? '2px solid var(--primary)' : '2px solid var(--border-color)',
                        background: inputMode === 'record' ? 'rgba(59, 130, 246, 0.1)' : 'var(--card-bg)',
                        color: inputMode === 'record' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    <span style={{ fontSize: '20px' }}>🎙️</span>
                    Enregistrer ma voix
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    {error}
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '32px',
                marginBottom: '48px'
            }}>
                {/* Step 1: Voice Sample */}
                <div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '14px'
                        }}>1</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>Échantillon Vocal</div>
                    </div>

                    {inputMode === 'upload' ? (
                        // Upload Mode
                        !voiceSample ? (
                            <label style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '220px',
                                background: 'var(--card-bg)',
                                border: '2px dashed var(--border-color)',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}>
                                <div style={{ fontSize: '56px', marginBottom: '16px' }}>📂</div>
                                <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '16px' }}>
                                    Glissez ou cliquez pour importer
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    MP3, WAV, M4A, OGG (Min. 5 secondes)
                                </div>
                                <input 
                                    type="file" 
                                    style={{ display: 'none' }} 
                                    accept="audio/*" 
                                    onChange={handleVoiceUpload} 
                                />
                            </label>
                        ) : (
                            <div style={{
                                background: 'var(--card-bg)',
                                borderRadius: '16px',
                                padding: '20px',
                                border: '1px solid var(--border-color)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '24px'
                                        }}>🎵</div>
                                        <div>
                                            <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                                                {voiceSample.name.length > 25 
                                                    ? voiceSample.name.substring(0, 25) + '...' 
                                                    : voiceSample.name}
                                            </div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                                {(voiceSample.size / 1024 / 1024).toFixed(2)} MB
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={clearUpload}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        Supprimer
                                    </button>
                                </div>
                                {samplePreviewUrl && (
                                    <audio src={samplePreviewUrl} controls style={{ width: '100%' }} />
                                )}
                            </div>
                        )
                    ) : (
                        // Record Mode
                        <div style={{
                            background: 'var(--card-bg)',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid var(--border-color)',
                            textAlign: 'center',
                            minHeight: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {!recordedBlob ? (
                                <>
                                    {/* Recording Button */}
                                    <button
                                        onClick={isRecording ? stopRecording : startRecording}
                                        style={{
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '50%',
                                            border: 'none',
                                            background: isRecording 
                                                ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                                                : 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '40px',
                                            boxShadow: isRecording 
                                                ? '0 0 0 8px rgba(239, 68, 68, 0.2)' 
                                                : '0 4px 20px rgba(59, 130, 246, 0.3)',
                                            transition: 'all 0.3s',
                                            animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                                        }}
                                    >
                                        {isRecording ? '⏹️' : '🎙️'}
                                    </button>
                                    
                                    {/* Timer */}
                                    <div style={{
                                        marginTop: '20px',
                                        fontSize: '32px',
                                        fontWeight: 700,
                                        fontFamily: 'monospace',
                                        color: isRecording ? '#ef4444' : 'var(--text-muted)'
                                    }}>
                                        {formatTime(recordingTime)}
                                    </div>
                                    
                                    <div style={{
                                        marginTop: '8px',
                                        fontSize: '14px',
                                        color: 'var(--text-muted)'
                                    }}>
                                        {isRecording 
                                            ? "Enregistrement en cours... Cliquez pour arrêter" 
                                            : "Cliquez pour commencer l'enregistrement"}
                                    </div>
                                    
                                    {/* Tip */}
                                    <div style={{
                                        marginTop: '16px',
                                        padding: '12px 16px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        color: 'var(--primary)'
                                    }}>
                                        💡 Enregistrez au moins 5 secondes pour de meilleurs résultats
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Recorded Audio Preview */}
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '36px',
                                        marginBottom: '16px'
                                    }}>✓</div>
                                    
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                        Enregistrement terminé
                                    </div>
                                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                        Durée: {formatTime(recordingTime)}
                                    </div>
                                    
                                    {recordedUrl && (
                                        <audio src={recordedUrl} controls style={{ width: '100%', marginBottom: '16px' }} />
                                    )}
                                    
                                    <button
                                        onClick={clearRecording}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '10px 20px',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        🔄 Réenregistrer
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Step 2: Text Input */}
                <div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '14px'
                        }}>2</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>Texte à Générer</div>
                    </div>

                    <div style={{
                        background: 'var(--card-bg)',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <textarea
                            className="voice-textarea"
                            placeholder="Tapez le texte que la voix clonée doit prononcer...

Exemple: Bonjour, je suis votre assistant virtuel créé par l'Institut National de l'Eau. Comment puis-je vous aider aujourd'hui?"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            style={{
                                minHeight: '180px',
                                fontSize: '15px',
                                lineHeight: '1.6'
                            }}
                        />
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '12px',
                            fontSize: '13px',
                            color: 'var(--text-muted)'
                        }}>
                            <span>{text.length} caractères</span>
                            <span>~{Math.ceil(text.length / 150)} secondes d'audio</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action / Result */}
            <div style={{ textAlign: 'center', paddingTop: '32px' }}>
                {!audioUrl ? (
                    <button
                        className="btn btn-primary"
                        onClick={handleClone}
                        disabled={isCloning || !canGenerate}
                        style={{
                            fontSize: '18px',
                            padding: '20px 48px',
                            opacity: !canGenerate ? 0.5 : 1,
                            cursor: !canGenerate ? 'not-allowed' : 'pointer',
                            background: canGenerate 
                                ? 'linear-gradient(135deg, var(--primary), #8b5cf6)' 
                                : undefined
                        }}
                    >
                        {isCloning ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                                Génération en cours...
                            </span>
                        ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>🎵</span> Cloner la Voix
                            </span>
                        )}
                    </button>
                ) : (
                    <div className="audio-result fade-in" style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '20px',
                        padding: '32px',
                        maxWidth: '500px',
                        margin: '0 auto'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            margin: '0 auto 16px'
                        }}>🎉</div>
                        <div className="audio-result-title" style={{ fontSize: '20px', marginBottom: '20px' }}>
                            Voix Clonée avec Succès !
                        </div>
                        <audio src={audioUrl} controls style={{ width: '100%', marginBottom: '20px' }} />
                        <div className="audio-result-buttons" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => setAudioUrl(null)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                🔄 Nouveau texte
                            </button>
                            <a 
                                href={audioUrl} 
                                download="voix-clonee.mp3" 
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                💾 Télécharger
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Tips Section */}
            <div style={{
                marginTop: '48px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
            }}>
                <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎯</div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Qualité audio</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Utilisez un échantillon clair, sans bruit de fond, pour de meilleurs résultats.
                    </div>
                </div>
                <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏱️</div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Durée idéale</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Un échantillon de 10-30 secondes donne les meilleurs clones vocaux.
                    </div>
                </div>
                <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎭</div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Lip Sync</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Combinez avec <a href="/lip-sync" style={{ color: 'var(--primary)' }}>Lip Sync Avatar</a> pour créer des vidéos parlantes !
                    </div>
                </div>
            </div>
        </div>
    );
}
