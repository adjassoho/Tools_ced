'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface SectionSummary {
    title: string;
    level: number;
    summary: string;
}

interface SummaryResult {
    sections: SectionSummary[];
    generalSummary: string;
    aiPowered?: boolean;
    sectionsCount?: number;
}

export default function DocumentSummary() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [result, setResult] = useState<SummaryResult | null>(null);
    const [error, setError] = useState('');
    const [fontSize, setFontSize] = useState(16);
    const [fontFamily, setFontFamily] = useState('system-ui');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const validTypes = [
                'application/pdf',
                'text/plain',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword'
            ];
            if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.txt')) {
                setError('Format non supporté. Utilisez PDF, DOCX ou TXT.');
                return;
            }
            setFile(selectedFile);
            setError('');
            setResult(null);
        }
    };

    const handleSubmit = async () => {
        if (!file) return;

        setLoading(true);
        setError('');
        setResult(null);
        setProgress('📄 Extraction du texte...');

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Simuler progression
            const progressSteps = [
                '📄 Extraction du texte...',
                '🔍 Analyse de la structure...',
                '🤖 Génération des résumés IA...',
                '✨ Finalisation...'
            ];
            
            let stepIndex = 0;
            const progressInterval = setInterval(() => {
                stepIndex = Math.min(stepIndex + 1, progressSteps.length - 1);
                setProgress(progressSteps[stepIndex]);
            }, 3000);

            const response = await fetch('/api/summarize-document', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors du traitement');
            }

            setResult(data);
            setProgress('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
    };

    const copyAllSummaries = async () => {
        if (!result) return;
        
        let fullText = '=== RÉSUMÉ GÉNÉRAL ===\n\n' + result.generalSummary + '\n\n';
        fullText += '=== RÉSUMÉS PAR SECTION ===\n\n';
        
        result.sections.forEach(section => {
            const indent = '  '.repeat(section.level - 1);
            fullText += `${indent}${section.title}\n${indent}${section.summary}\n\n`;
        });
        
        await copyToClipboard(fullText);
    };

    const textStyle = {
        fontSize: `${fontSize}px`,
        fontFamily: fontFamily,
    };

    return (
        <div className="tool-container">
            <Link href="/" className="back-link">← Retour</Link>
            
            <div className="tool-header">
                <h1>📄 Résumé de Document</h1>
                <p>Uploadez un document pour obtenir un résumé structuré par chapitre et section</p>
            </div>

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

                <button 
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={!file || loading}
                >
                    {loading ? progress || 'Traitement...' : 'Analyser le document'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {result && (
                <div className="result-section">
                    <div className="success-banner">
                        ✅ Document analysé avec succès — {result.sections.length} section(s) détectée(s)
                        {result.aiPowered && ' — Résumés générés par IA'}
                    </div>
                    
                    <div className="format-controls">
                        <div className="control-group">
                            <label>Taille:</label>
                            <input 
                                type="range" 
                                min="12" 
                                max="24" 
                                value={fontSize}
                                onChange={(e) => setFontSize(Number(e.target.value))}
                            />
                            <span>{fontSize}px</span>
                        </div>
                        <div className="control-group">
                            <label>Police:</label>
                            <select 
                                value={fontFamily}
                                onChange={(e) => setFontFamily(e.target.value)}
                            >
                                <option value="system-ui">System</option>
                                <option value="Georgia, serif">Georgia</option>
                                <option value="'Times New Roman', serif">Times New Roman</option>
                                <option value="Arial, sans-serif">Arial</option>
                                <option value="'Courier New', monospace">Courier New</option>
                            </select>
                        </div>
                        <button className="btn btn-secondary" onClick={copyAllSummaries}>
                            📋 Copier tout
                        </button>
                    </div>

                    <div className="summary-block general-summary" style={textStyle}>
                        <div className="summary-header">
                            <h2>📌 Résumé Général</h2>
                            <button 
                                className="copy-btn"
                                onClick={() => copyToClipboard(result.generalSummary)}
                                title="Copier"
                            >
                                📋
                            </button>
                        </div>
                        <p>{result.generalSummary}</p>
                    </div>

                    <h2 className="sections-title">📚 Résumés par Section</h2>
                    
                    {result.sections.map((section, index) => (
                        <div 
                            key={index} 
                            className={`summary-block section-level-${section.level}`}
                            style={textStyle}
                        >
                            <div className="summary-header">
                                <h3 style={{ marginLeft: `${(section.level - 1) * 20}px` }}>
                                    {section.title}
                                </h3>
                                <button 
                                    className="copy-btn"
                                    onClick={() => copyToClipboard(`${section.title}\n\n${section.summary}`)}
                                    title="Copier"
                                >
                                    📋
                                </button>
                            </div>
                            <p style={{ marginLeft: `${(section.level - 1) * 20}px` }}>
                                {section.summary}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
