"use client";

import { useState, useRef, useEffect } from "react";

interface SelectionBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export default function ImageRemover() {
    const [image, setImage] = useState<string | null>(null);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [selection, setSelection] = useState<SelectionBox | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setImageSize({ width: img.width, height: img.height });
                };
                img.src = event.target?.result as string;
                setImage(event.target?.result as string);
                setResult(null);
                setSelection(null);
            };
            reader.readAsDataURL(file);
        }
    };

    // Dessiner le rectangle de sélection
    useEffect(() => {
        if (!canvasRef.current || !image) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dessiner la sélection si elle existe
        if (selection) {
            ctx.strokeStyle = '#1570bd';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);

            // Fond semi-transparent
            ctx.fillStyle = 'rgba(21, 112, 189, 0.15)';
            ctx.fillRect(selection.x, selection.y, selection.width, selection.height);

            // Coins de la sélection
            const cornerSize = 10;
            ctx.fillStyle = '#1570bd';
            ctx.setLineDash([]);

            // Coin supérieur gauche
            ctx.fillRect(selection.x - cornerSize / 2, selection.y - cornerSize / 2, cornerSize, cornerSize);
            // Coin supérieur droit
            ctx.fillRect(selection.x + selection.width - cornerSize / 2, selection.y - cornerSize / 2, cornerSize, cornerSize);
            // Coin inférieur gauche
            ctx.fillRect(selection.x - cornerSize / 2, selection.y + selection.height - cornerSize / 2, cornerSize, cornerSize);
            // Coin inférieur droit
            ctx.fillRect(selection.x + selection.width - cornerSize / 2, selection.y + selection.height - cornerSize / 2, cornerSize, cornerSize);
        }
    }, [selection, image]);

    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getMousePos(e);
        setIsDrawing(true);
        setStartPoint(pos);
        setSelection({ x: pos.x, y: pos.y, width: 0, height: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const pos = getMousePos(e);
        setSelection({
            x: Math.min(startPoint.x, pos.x),
            y: Math.min(startPoint.y, pos.y),
            width: Math.abs(pos.x - startPoint.x),
            height: Math.abs(pos.y - startPoint.y)
        });
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
    };

    const processImage = async () => {
        if (!image || !selection || selection.width < 10 || selection.height < 10) {
            alert('Veuillez dessiner une zone de sélection autour du filigrane');
            return;
        }

        setIsProcessing(true);
        setResult(null);

        try {
            // Calculer les coordonnées relatives à l'image originale
            const canvas = canvasRef.current;
            if (!canvas) throw new Error('Canvas non trouvé');

            const scaleX = imageSize.width / canvas.width;
            const scaleY = imageSize.height / canvas.height;

            const box = {
                x: Math.round(selection.x * scaleX),
                y: Math.round(selection.y * scaleY),
                width: Math.round(selection.width * scaleX),
                height: Math.round(selection.height * scaleY)
            };

            const formData = new FormData();
            const res = await fetch(image);
            const blob = await res.blob();
            formData.append('file', blob, 'image.png');
            formData.append('box', JSON.stringify(box));
            formData.append('imageSize', JSON.stringify(imageSize));

            const response = await fetch('/api/process-image', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erreur lors du traitement');
            
            // Vérifier si c'est un fallback (erreur silencieuse)
            if (data.fallback) {
                throw new Error(data.error || 'Erreur lors du traitement API');
            }

            setResult(data.resultUrl);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container">
            <header className="page-header">
                <div className="page-badge">Intelligence Visuelle</div>
                <h1 className="page-title">Nettoyage <span className="highlight">D'Images</span></h1>
                <p className="page-description">
                    Dessinez un rectangle autour du filigrane à supprimer, puis lancez le traitement.
                </p>
            </header>

            {!image ? (
                <label className="upload-zone">
                    <div className="upload-icon">📸</div>
                    <div className="upload-text">Cliquer pour uploader ou glisser-déposer</div>
                    <div className="upload-hint">PNG, JPG ou WEBP (Max. 10MB)</div>
                    <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleUpload} />
                </label>
            ) : (
                <div>
                    <div className="preview-grid">
                        <div>
                            <div className="preview-label">
                                Original - <span style={{ color: '#1570bd' }}>Dessinez autour du filigrane</span>
                            </div>
                            <div
                                ref={containerRef}
                                className="preview-box"
                                style={{ position: 'relative', cursor: 'crosshair' }}
                            >
                                <img
                                    ref={imageRef}
                                    src={image}
                                    alt="Original"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    onLoad={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        if (canvasRef.current) {
                                            canvasRef.current.width = img.clientWidth;
                                            canvasRef.current.height = img.clientHeight;
                                        }
                                    }}
                                />
                                <canvas
                                    ref={canvasRef}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        cursor: 'crosshair'
                                    }}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                />
                            </div>
                            {selection && selection.width > 10 && (
                                <div style={{
                                    marginTop: '12px',
                                    fontSize: '12px',
                                    color: '#47b04d',
                                    textAlign: 'center'
                                }}>
                                    ✓ Zone sélectionnée ({Math.round(selection.width)}x{Math.round(selection.height)}px)
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="preview-label">Résultat</div>
                            <div className="preview-box">
                                {isProcessing ? (
                                    <div className="processing">
                                        <div className="spinner"></div>
                                        <div className="processing-text">Suppression du filigrane...</div>
                                    </div>
                                ) : result ? (
                                    <img src={result} alt="Résultat" />
                                ) : (
                                    <span style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                                        Dessinez une zone sur l'image de gauche, puis cliquez sur "Supprimer"
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="button-group">
                        <button className="btn btn-secondary" onClick={() => { setImage(null); setSelection(null); }}>
                            Changer d'image
                        </button>
                        {selection && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => setSelection(null)}
                                style={{ borderColor: '#ff6b6b', color: '#ff6b6b' }}
                            >
                                Effacer la sélection
                            </button>
                        )}
                        {!result ? (
                            <button
                                className="btn btn-primary"
                                onClick={processImage}
                                disabled={isProcessing || !selection || selection.width < 10}
                                style={{
                                    opacity: (!selection || selection.width < 10) ? 0.5 : 1,
                                    cursor: (!selection || selection.width < 10) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Supprimer le filigrane
                            </button>
                        ) : (
                            <a href={result} download="result.png" className="btn btn-primary">
                                Télécharger
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
