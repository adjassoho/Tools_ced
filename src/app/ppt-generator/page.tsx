"use client";

import { useState } from "react";

const themes = [
    { id: 'african', name: 'Africain 🌍', colors: ['#b45309', '#d97706', '#16a34a'] },
    { id: 'professional', name: 'Professionnel', colors: ['#1a365d', '#2c5282', '#3182ce'] },
    { id: 'modern', name: 'Moderne', colors: ['#6b46c1', '#805ad5', '#d53f8c'] },
    { id: 'nature', name: 'Nature', colors: ['#276749', '#38a169', '#48bb78'] },
    { id: 'ocean', name: 'Océan', colors: ['#0077b6', '#00b4d8', '#90e0ef'] },
    { id: 'sunset', name: 'Coucher de soleil', colors: ['#c2410c', '#ea580c', '#fb923c'] },
    { id: 'dark', name: 'Sombre', colors: ['#1e293b', '#334155', '#60a5fa'] },
];

export default function PptGenerator() {
    const [inputMode, setInputMode] = useState<'document' | 'topic'>('topic');
    const [file, setFile] = useState<File | null>(null);
    const [topic, setTopic] = useState("");
    const [slideCount, setSlideCount] = useState(10);
    const [selectedTheme, setSelectedTheme] = useState('african');
    const [includeImages, setIncludeImages] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<{ pptx: string; title: string; slideCount: number; imagesGenerated?: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleGenerate = async () => {
        if (inputMode === 'document' && !file) {
            setError("Veuillez sélectionner un document");
            return;
        }
        if (inputMode === 'topic' && !topic.trim()) {
            setError("Veuillez entrer un sujet");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            if (file && inputMode === 'document') {
                formData.append('file', file);
            }
            formData.append('topic', topic);
            formData.append('slideCount', slideCount.toString());
            formData.append('theme', selectedTheme);
            formData.append('language', 'fr');
            formData.append('includeImages', includeImages.toString());

            const response = await fetch('/api/generate-ppt', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la génération');
            }

            setResult(data);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!result?.pptx) return;
        
        const link = document.createElement('a');
        link.href = result.pptx;
        link.download = `${result.title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const canGenerate = inputMode === 'document' ? !!file : topic.trim().length > 0;

    return (
        <div className="container">
            <header className="page-header">
                <div className="page-badge">Générateur IA</div>
                <h1 className="page-title">PowerPoint <span className="highlight">Intelligent</span></h1>
                <p className="page-description">
                    Créez des présentations PowerPoint professionnelles avec des images africaines contextuelles,
                    automatiquement à partir d'un document ou d'un simple sujet.
                </p>
            </header>

            {/* Info Banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <span style={{ fontSize: '24px' }}>📊</span>
                <div>
                    <strong style={{ color: '#6366f1' }}>Génération automatique !</strong>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                        L'IA structure et génère le contenu de vos slides automatiquement.
                    </span>
                </div>
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

            {/* Mode Selector */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '32px'
            }}>
                <button
                    onClick={() => setInputMode('topic')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '12px',
                        border: inputMode === 'topic' ? '2px solid var(--primary)' : '2px solid var(--border-color)',
                        background: inputMode === 'topic' ? 'rgba(59, 130, 246, 0.1)' : 'var(--card-bg)',
                        color: inputMode === 'topic' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    <span style={{ fontSize: '20px' }}>💡</span>
                    À partir d'un sujet
                </button>
                <button
                    onClick={() => setInputMode('document')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '12px',
                        border: inputMode === 'document' ? '2px solid var(--primary)' : '2px solid var(--border-color)',
                        background: inputMode === 'document' ? 'rgba(59, 130, 246, 0.1)' : 'var(--card-bg)',
                        color: inputMode === 'document' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    <span style={{ fontSize: '20px' }}>📄</span>
                    À partir d'un document
                </button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px',
                marginBottom: '32px'
            }}>
                {/* Input Section */}
                <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '14px',
                            color: 'white'
                        }}>1</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>
                            {inputMode === 'topic' ? 'Sujet de la présentation' : 'Document source'}
                        </div>
                    </div>

                    {inputMode === 'topic' ? (
                        <textarea
                            placeholder="Ex: L'impact du changement climatique sur les ressources en eau en Afrique de l'Ouest..."
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            style={{
                                width: '100%',
                                minHeight: '150px',
                                padding: '16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-color)',
                                color: 'var(--text-color)',
                                fontSize: '15px',
                                resize: 'vertical',
                                fontFamily: 'inherit'
                            }}
                        />
                    ) : (
                        <>
                            {!file ? (
                                <label style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '150px',
                                    border: '2px dashed var(--border-color)',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}>
                                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📂</div>
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                        Glissez ou cliquez pour importer
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        DOCX, TXT, PDF
                                    </div>
                                    <input
                                        type="file"
                                        style={{ display: 'none' }}
                                        accept=".docx,.txt,.pdf"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(99, 102, 241, 0.3)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '32px' }}>📄</span>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{file.name}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                                {(file.size / 1024).toFixed(1)} KB
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setFile(null)}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            color: '#ef4444',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Options Section */}
                <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '14px',
                            color: 'white'
                        }}>2</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>Options</div>
                    </div>

                    {/* Slide Count */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                        }}>
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>📑 Nombre de slides</span>
                            <span style={{
                                background: 'rgba(99, 102, 241, 0.1)',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                fontSize: '14px',
                                color: '#6366f1',
                                fontWeight: 600
                            }}>
                                {slideCount}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="25"
                            value={slideCount}
                            onChange={(e) => setSlideCount(parseInt(e.target.value))}
                            style={{
                                width: '100%',
                                height: '6px',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                accentColor: '#6366f1'
                            }}
                        />
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            marginTop: '4px'
                        }}>
                            <span>5 slides</span>
                            <span>25 slides</span>
                        </div>
                    </div>

                    {/* Theme Selection */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>
                            🎨 Thème visuel
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '8px'
                        }}>
                            {themes.map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => setSelectedTheme(theme.id)}
                                    style={{
                                        padding: '12px 8px',
                                        borderRadius: '10px',
                                        border: selectedTheme === theme.id 
                                            ? '2px solid #6366f1' 
                                            : '1px solid var(--border-color)',
                                        background: selectedTheme === theme.id 
                                            ? 'rgba(99, 102, 241, 0.1)' 
                                            : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        marginBottom: '6px'
                                    }}>
                                        {theme.colors.map((color, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    borderRadius: '4px',
                                                    background: color
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: selectedTheme === theme.id ? '#6366f1' : 'var(--text-muted)',
                                        fontWeight: selectedTheme === theme.id ? 600 : 400
                                    }}>
                                        {theme.name}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Include Images Toggle */}
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                        <div 
                            onClick={() => setIncludeImages(!includeImages)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                background: includeImages ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                border: includeImages ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '20px' }}>🌍</span>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>Images africaines (FLUX)</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        Illustrations haute qualité contextuelles
                                    </div>
                                </div>
                            </div>
                            <div style={{
                                width: '44px',
                                height: '24px',
                                borderRadius: '12px',
                                background: includeImages ? '#10b981' : 'var(--border-color)',
                                position: 'relative',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: 'white',
                                    position: 'absolute',
                                    top: '2px',
                                    left: includeImages ? '22px' : '2px',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }} />
                            </div>
                        </div>
                        {includeImages && (
                            <div style={{
                                marginTop: '8px',
                                padding: '10px 12px',
                                background: 'rgba(251, 191, 36, 0.1)',
                                borderRadius: '8px',
                                fontSize: '12px',
                                color: '#b45309',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span>⏱️</span>
                                La génération avec images prend plus de temps (~1-2 min)
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Generate Button */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                {!result ? (
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !canGenerate}
                        style={{
                            fontSize: '18px',
                            padding: '18px 48px',
                            borderRadius: '12px',
                            border: 'none',
                            background: canGenerate 
                                ? 'linear-gradient(135deg, #6366f1, #a855f7)' 
                                : 'var(--border-color)',
                            color: 'white',
                            cursor: canGenerate ? 'pointer' : 'not-allowed',
                            opacity: canGenerate ? 1 : 0.5,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.3s'
                        }}
                    >
                        {isGenerating ? (
                            <>
                                <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                                Génération en cours...
                            </>
                        ) : (
                            <>
                                <span>📊</span> Générer le PowerPoint
                            </>
                        )}
                    </button>
                ) : (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1))',
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
                        <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                            PowerPoint Généré !
                        </div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                            {result.slideCount} slides {result.imagesGenerated ? `• ${result.imagesGenerated} images 🌍` : ''} • {result.title}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setResult(null)}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)',
                                    background: 'transparent',
                                    color: 'var(--text-color)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                🔄 Nouvelle présentation
                            </button>
                            <button
                                onClick={handleDownload}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                💾 Télécharger .pptx
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tips */}
            <div style={{
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
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>💡</div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Sujet précis</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Plus votre sujet est détaillé, plus la présentation sera pertinente.
                    </div>
                </div>
                <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Documents structurés</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Les documents avec titres et sections donnent de meilleurs résultats.
                    </div>
                </div>
                <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎨</div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Personnalisable</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Ouvrez le fichier dans PowerPoint pour ajuster les détails.
                    </div>
                </div>
            </div>
        </div>
    );
}
