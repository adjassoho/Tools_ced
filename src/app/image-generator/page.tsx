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
        <div className="tool-container">
            <Link href="/" className="back-link">← Retour</Link>
            
            <div className="tool-header">
                <h1>🎨 Générateur d'Images</h1>
                <p>Créez des illustrations africaines en lien avec votre document</p>
            </div>

            {!result ? (
                <>
                    <div className="upload-section">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".pdf,.docx,.doc,.txt"
                            style={{ display: 'none' }}
                        />
                        
                        <div 
                            className="upload-zone"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {file ? (
                                <div className="file-info">
                                    <span className="file-icon">📄</span>
                                    <span className="file-name">{file.name}</span>
                                    <span className="file-size">({(file.size / 1024).toFixed(1)} Ko)</span>
                                </div>
                            ) : (
                                <div className="upload-placeholder">
                                    <span className="upload-icon">📁</span>
                                    <span>Cliquez pour sélectionner un document</span>
                                    <span className="upload-formats">PDF, DOCX, TXT</span>
                                </div>
                            )}
                        </div>

                        <div className="image-options">
                            <div className="option-group">
                                <label>Style d'image:</label>
                                <select 
                                    value={style} 
                                    onChange={(e) => setStyle(e.target.value)}
                                    className="image-select"
                                >
                                    <option value="realistic">📷 Réaliste</option>
                                    <option value="illustration">🎨 Illustration</option>
                                    <option value="artistic">🖼️ Artistique</option>
                                    <option value="infographic">📊 Infographie</option>
                                </select>
                            </div>
                            
                            <div className="option-group">
                                <label>Format:</label>
                                <select 
                                    value={aspectRatio} 
                                    onChange={(e) => setAspectRatio(e.target.value)}
                                    className="image-select"
                                >
                                    <option value="1:1">⬜ Carré (1:1)</option>
                                    <option value="16:9">🖥️ Paysage (16:9)</option>
                                    <option value="9:16">📱 Portrait (9:16)</option>
                                    <option value="4:3">📺 Standard (4:3)</option>
                                </select>
                            </div>
                        </div>

                        <button 
                            className="btn btn-primary"
                            onClick={generateImage}
                            disabled={!file || loading}
                        >
                            {loading ? progress || 'Génération...' : '🎨 Générer l\'image'}
                        </button>
                    </div>

                    {error && <div className="error-message">{error}</div>}
                    
                    <div className="image-info-box">
                        <h4>🌍 Images en contexte africain</h4>
                        <p>Les images générées représentent des scènes, personnages et paysages africains en lien direct avec le contenu de votre document.</p>
                    </div>
                </>
            ) : (
                <div className="image-result">
                    <div className="image-card">
                        <div className="image-title">
                            <h3>{result.title}</h3>
                            <span className="image-style-badge">{style}</span>
                        </div>
                        
                        <div className="image-preview">
                            {imageLoading && (
                                <div className="image-loading">
                                    <div className="loading-spinner"></div>
                                    <p>Chargement de l'image...</p>
                                </div>
                            )}
                            {imageError && (
                                <div className="image-error">
                                    <p>⚠️ Erreur de chargement</p>
                                    <button className="btn btn-secondary" onClick={regenerateImage}>
                                        🔄 Réessayer
                                    </button>
                                </div>
                            )}
                            <img 
                                src={result.imageUrl} 
                                alt={result.title}
                                className="generated-image"
                                style={{ display: imageLoading || imageError ? 'none' : 'block' }}
                                onLoad={() => setImageLoading(false)}
                                onError={() => {
                                    setImageLoading(false);
                                    setImageError(true);
                                }}
                            />
                        </div>
                        
                        <div className="image-details">
                            <button 
                                className="prompt-toggle"
                                onClick={() => setShowPrompt(!showPrompt)}
                            >
                                {showPrompt ? '🔼 Masquer le prompt' : '🔽 Voir le prompt utilisé'}
                            </button>
                            
                            {showPrompt && (
                                <div className="prompt-box">
                                    <p>{result.prompt}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="image-actions">
                        <button className="btn btn-secondary" onClick={regenerateImage}>
                            🔄 Régénérer
                        </button>
                        <button className="btn btn-secondary" onClick={downloadImage}>
                            💾 Télécharger
                        </button>
                        <button className="btn btn-primary" onClick={() => setResult(null)}>
                            📁 Nouveau document
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
