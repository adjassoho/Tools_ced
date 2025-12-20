"use client";

import { useState, useRef, useEffect } from "react";

interface SelectionBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export default function VideoRemover() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [frame, setFrame] = useState<string | null>(null);
    const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
    const [isExtracting, setIsExtracting] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>("");
    
    // Selection state
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
    const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setVideoFile(file);
        setVideoUrl(URL.createObjectURL(file));
        setFrame(null);
        setResult(null);
        setError(null);
        setSelectionBox(null);
        
        // Extraire une frame
        setIsExtracting(true);
        setProgress("Extraction d'une frame...");
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('action', 'extract-frame');
            
            const response = await fetch('/api/process-video', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            setFrame(data.frame);
            setFrameSize({ width: data.width, height: data.height });
            setProgress("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur d'extraction");
        } finally {
            setIsExtracting(false);
        }
    };


    // Dessiner la frame et la sélection
    useEffect(() => {
        if (!frame || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            if (selectionBox) {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 3;
                ctx.setLineDash([10, 5]);
                ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
                
                ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
                ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
            }
        };
        img.src = frame;
    }, [frame, selectionBox]);

    const getScaledCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const coords = getScaledCoords(e);
        setIsSelecting(true);
        setSelectionStart(coords);
        setSelectionBox(null);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isSelecting) return;
        
        const coords = getScaledCoords(e);
        const x = Math.min(selectionStart.x, coords.x);
        const y = Math.min(selectionStart.y, coords.y);
        const width = Math.abs(coords.x - selectionStart.x);
        const height = Math.abs(coords.y - selectionStart.y);
        
        setSelectionBox({ x, y, width, height });
    };

    const handleMouseUp = () => {
        setIsSelecting(false);
    };


    const processVideo = async () => {
        if (!videoFile || !selectionBox) return;
        
        setIsProcessing(true);
        setError(null);
        setProgress("Traitement en cours...");
        
        try {
            setProgress("Envoi de la vidéo...");
            
            const formData = new FormData();
            formData.append('file', videoFile);
            formData.append('action', 'process');
            formData.append('box', JSON.stringify(selectionBox));
            
            setProgress("Suppression du filigrane (1 appel API)...");
            
            const response = await fetch('/api/process-video', {
                method: 'POST',
                body: formData
            });
            
            setProgress("Reconstruction de la vidéo...");
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            setResult(data.video);
            setProgress("Terminé !");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de traitement");
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setVideoFile(null);
        setVideoUrl(null);
        setFrame(null);
        setResult(null);
        setError(null);
        setSelectionBox(null);
        setProgress("");
    };

    return (
        <div className="container">
            <header className="page-header">
                <div className="page-badge green">Traitement Intelligent</div>
                <h1 className="page-title">Studio <span className="highlight-green">Vidéo INE</span></h1>
                <p className="page-description">
                    Suppression de filigrane statique sur vidéos longues. Un seul appel API pour toute la vidéo !
                </p>
            </header>

            {error && (
                <div style={{ 
                    background: 'rgba(255,0,0,0.1)', 
                    border: '1px solid #ff4444', 
                    padding: '16px', 
                    borderRadius: '8px',
                    marginBottom: '24px',
                    color: '#ff4444'
                }}>
                    {error}
                </div>
            )}

            {!videoFile ? (
                <label className="upload-zone">
                    <div className="upload-icon">🎬</div>
                    <div className="upload-text">Uploader une vidéo</div>
                    <div className="upload-hint">MP4, MOV ou AVI</div>
                    <input type="file" style={{ display: 'none' }} accept="video/*" onChange={handleUpload} />
                </label>
            ) : !result ? (
                <div>
                    {isExtracting ? (
                        <div className="preview-box" style={{ aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <div className="spinner" style={{ width: '64px', height: '64px', marginBottom: '16px' }}></div>
                            <div>{progress}</div>
                        </div>
                    ) : frame ? (
                        <div>
                            <p style={{ marginBottom: '16px', color: 'var(--accent-blue)' }}>
                                📌 Dessinez un rectangle autour du filigrane à supprimer
                            </p>
                            <div ref={containerRef} className="preview-box" style={{ position: 'relative', overflow: 'hidden' }}>
                                <canvas
                                    ref={canvasRef}
                                    style={{ width: '100%', height: 'auto', cursor: 'crosshair' }}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                />
                                {isProcessing && (
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(0,0,0,0.8)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <div className="spinner" style={{ width: '64px', height: '64px', marginBottom: '16px' }}></div>
                                        <div style={{ fontSize: '18px', fontWeight: 700 }}>{progress}</div>
                                    </div>
                                )}
                            </div>
                            
                            {selectionBox && (
                                <p style={{ marginTop: '8px', fontSize: '14px', color: '#888' }}>
                                    Zone: {Math.round(selectionBox.width)} × {Math.round(selectionBox.height)} px
                                </p>
                            )}
                        </div>
                    ) : null}

                    <div className="button-group" style={{ marginTop: '24px' }}>
                        <button className="btn btn-secondary" onClick={reset}>
                            Changer de vidéo
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={processVideo} 
                            disabled={isProcessing || !selectionBox}
                        >
                            {isProcessing ? 'Traitement...' : 'Supprimer le filigrane'}
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                    <div className="preview-box" style={{ aspectRatio: '16/9', marginBottom: '32px' }}>
                        <video src={result} controls style={{ width: '100%', height: '100%' }} />
                    </div>
                    
                    <div className="button-group">
                        <button className="btn btn-secondary" onClick={reset}>
                            Nouvelle vidéo
                        </button>
                        <a href={result} download="video-sans-filigrane.mp4" className="btn btn-primary">
                            Télécharger
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
