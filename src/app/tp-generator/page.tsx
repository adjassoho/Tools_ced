'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Header, Footer } from 'docx';
import { saveAs } from 'file-saver';

interface TPStructure {
    numero: number;
    titre: string;
    unite: string;
    theme: string;
    lieu: string;
    duree: string;
    objectifs: string[];
    protocole: {
        etape: number;
        titre: string;
        description: string;
        sousPoints?: string[];
    }[];
    livrable: {
        description: string;
        elements: string[];
    };
}

export default function TPGenerator() {
    const [file, setFile] = useState<File | null>(null);
    const [tpNumber, setTpNumber] = useState(1);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [tp, setTp] = useState<TPStructure | null>(null);
    const [copied, setCopied] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
            setTp(null);
        }
    };

    const generateTP = async () => {
        if (!file) return;

        setLoading(true);
        setError('');
        setProgress('📄 Analyse du document...');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('tpNumber', tpNumber.toString());

            setTimeout(() => setProgress('🧠 Génération du TP...'), 2000);

            const response = await fetch('/api/generate-tp', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la génération');
            }

            setTp(data.tp);
            setProgress('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    };


    // Formater le TP en texte
    const formatTPAsText = () => {
        if (!tp) return '';
        
        let text = `FICHE DE TP N°${tp.numero} : ${tp.titre.toUpperCase()} (${tp.unite})\n\n`;
        text += `Thème : ${tp.theme}\n\n`;
        text += `Lieu : ${tp.lieu}\n`;
        text += `Durée : ${tp.duree}\n\n`;
        
        text += `1. Objectifs :\n`;
        tp.objectifs.forEach(obj => {
            text += `• ${obj}\n`;
        });
        text += '\n';
        
        text += `2. Le Protocole :\n`;
        tp.protocole.forEach(etape => {
            text += `• Étape ${etape.etape} : ${etape.titre}\n`;
            text += `  ${etape.description}\n`;
            if (etape.sousPoints && etape.sousPoints.length > 0) {
                etape.sousPoints.forEach(sp => {
                    text += `    - ${sp}\n`;
                });
            }
        });
        text += '\n';
        
        text += `3. Livrable :\n`;
        text += `${tp.livrable.description}\n`;
        tp.livrable.elements.forEach(el => {
            text += `• ${el}\n`;
        });
        
        return text;
    };

    // Copier le TP
    const copyTP = async () => {
        const text = formatTPAsText();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Erreur de copie:', err);
        }
    };

    // Exporter en PDF
    const exportToPDF = () => {
        if (!tp) return;
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>TP ${tp.numero} - ${tp.titre}</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px;
                        color: #1a1a2e;
                        line-height: 1.7;
                    }
                    .header {
                        background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
                        color: white;
                        padding: 30px;
                        border-radius: 12px;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        margin: 0 0 10px 0;
                        font-size: 1.5em;
                    }
                    .header .theme {
                        font-size: 1.1em;
                        opacity: 0.9;
                    }
                    .meta {
                        display: flex;
                        gap: 30px;
                        background: #f8fafc;
                        padding: 15px 20px;
                        border-radius: 8px;
                        margin-bottom: 25px;
                        border-left: 4px solid #2d5a87;
                    }
                    .meta-item {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .meta-item strong {
                        color: #1e3a5f;
                    }
                    .section {
                        margin-bottom: 25px;
                    }
                    .section-title {
                        font-size: 1.2em;
                        font-weight: 700;
                        color: #1e3a5f;
                        margin-bottom: 15px;
                        padding-bottom: 8px;
                        border-bottom: 2px solid #e2e8f0;
                    }
                    ul {
                        margin: 0;
                        padding-left: 20px;
                    }
                    li {
                        margin-bottom: 10px;
                    }
                    .etape {
                        background: #f8fafc;
                        padding: 15px 20px;
                        border-radius: 8px;
                        margin-bottom: 12px;
                        border-left: 3px solid #47b04d;
                    }
                    .etape-header {
                        font-weight: 600;
                        color: #1e3a5f;
                        margin-bottom: 8px;
                    }
                    .etape-desc {
                        color: #475569;
                    }
                    .sous-points {
                        margin-top: 10px;
                        padding-left: 20px;
                        font-size: 0.95em;
                    }
                    .sous-points li {
                        color: #64748b;
                        margin-bottom: 5px;
                    }
                    .livrable {
                        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                        padding: 20px;
                        border-radius: 10px;
                        border: 1px solid #a7f3d0;
                    }
                    .livrable-desc {
                        font-weight: 500;
                        margin-bottom: 12px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #e2e8f0;
                        color: #64748b;
                        font-size: 0.9em;
                    }
                    @media print {
                        body { padding: 20px; }
                        .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📋 FICHE DE TP N°${tp.numero} : ${tp.titre.toUpperCase()}</h1>
                    <div class="theme">${tp.unite} — ${tp.theme}</div>
                </div>
                
                <div class="meta">
                    <div class="meta-item">
                        <span>📍</span>
                        <strong>Lieu :</strong> ${tp.lieu}
                    </div>
                    <div class="meta-item">
                        <span>⏱️</span>
                        <strong>Durée :</strong> ${tp.duree}
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">1. Objectifs</div>
                    <ul>
                        ${tp.objectifs.map(obj => `<li>${obj}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="section">
                    <div class="section-title">2. Le Protocole</div>
                    ${tp.protocole.map(etape => `
                        <div class="etape">
                            <div class="etape-header">Étape ${etape.etape} : ${etape.titre}</div>
                            <div class="etape-desc">${etape.description}</div>
                            ${etape.sousPoints && etape.sousPoints.length > 0 ? `
                                <ul class="sous-points">
                                    ${etape.sousPoints.map(sp => `<li>${sp}</li>`).join('')}
                                </ul>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div class="section">
                    <div class="section-title">3. Livrable</div>
                    <div class="livrable">
                        <div class="livrable-desc">${tp.livrable.description}</div>
                        <ul>
                            ${tp.livrable.elements.map(el => `<li>${el}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="footer">
                    Dlearning INE UAC
                </div>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.onload = () => {
                setTimeout(() => printWindow.print(), 250);
            };
        }
    };

    // Exporter en Word
    const exportToWord = async () => {
        if (!tp) return;

        const doc = new Document({
            sections: [{
                properties: {},
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `FICHE DE TP N°${tp.numero} : ${tp.titre.toUpperCase()}`,
                                        bold: true,
                                        size: 20,
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "Dlearning INE UAC",
                                        size: 20,
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                            }),
                        ],
                    }),
                },
                children: [
                    // Titre principal
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `FICHE DE TP N°${tp.numero} : ${tp.titre.toUpperCase()}`,
                                bold: true,
                                size: 28,
                            }),
                        ],
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                    }),
                    // Unité
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: tp.unite,
                                italics: true,
                                size: 24,
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 300 },
                    }),
                    // Thème
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Thème : ", bold: true, size: 24 }),
                            new TextRun({ text: tp.theme, size: 24 }),
                        ],
                        spacing: { after: 200 },
                    }),
                    // Lieu et Durée
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Lieu : ", bold: true, size: 24 }),
                            new TextRun({ text: tp.lieu, size: 24 }),
                        ],
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Durée : ", bold: true, size: 24 }),
                            new TextRun({ text: tp.duree, size: 24 }),
                        ],
                        spacing: { after: 300 },
                    }),
                    // Section Objectifs
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "1. Objectifs :",
                                bold: true,
                                size: 24,
                            }),
                        ],
                        spacing: { before: 200, after: 150 },
                    }),
                    ...tp.objectifs.map(obj => new Paragraph({
                        children: [
                            new TextRun({ text: "• " + obj, size: 24 }),
                        ],
                        spacing: { after: 80 },
                        indent: { left: 400 },
                    })),
                    // Section Protocole
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "2. Le Protocole :",
                                bold: true,
                                size: 24,
                            }),
                        ],
                        spacing: { before: 300, after: 150 },
                    }),
                    ...tp.protocole.flatMap(etape => [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `• Étape ${etape.etape} : ${etape.titre}`,
                                    bold: true,
                                    size: 24,
                                }),
                            ],
                            spacing: { before: 150, after: 80 },
                            indent: { left: 400 },
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: etape.description, size: 24 }),
                            ],
                            spacing: { after: 80 },
                            indent: { left: 600 },
                        }),
                        ...(etape.sousPoints || []).map(sp => new Paragraph({
                            children: [
                                new TextRun({ text: "- " + sp, size: 22 }),
                            ],
                            spacing: { after: 50 },
                            indent: { left: 800 },
                        })),
                    ]),
                    // Section Livrable
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "3. Livrable :",
                                bold: true,
                                size: 24,
                            }),
                        ],
                        spacing: { before: 300, after: 150 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: tp.livrable.description, size: 24 }),
                        ],
                        spacing: { after: 100 },
                        indent: { left: 400 },
                    }),
                    ...tp.livrable.elements.map(el => new Paragraph({
                        children: [
                            new TextRun({ text: "• " + el, size: 24 }),
                        ],
                        spacing: { after: 80 },
                        indent: { left: 400 },
                    })),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `TP${tp.numero}_${tp.titre.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
    };


    return (
        <div className="tool-container">
            <Link href="/" className="back-link">← Retour</Link>
            
            <div className="tool-header">
                <h1>📋 Générateur de TP</h1>
                <p>Uploadez un document de cours pour générer automatiquement une fiche de TP structurée</p>
            </div>

            {!tp ? (
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
                                    <span>Cliquez pour sélectionner un document de cours</span>
                                    <span className="upload-formats">PDF, DOCX, TXT</span>
                                </div>
                            )}
                        </div>

                        <div className="quiz-options">
                            <div className="option-group">
                                <label>Numéro du TP:</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="99"
                                    value={tpNumber}
                                    onChange={(e) => setTpNumber(Number(e.target.value))}
                                    className="tp-number-input"
                                />
                            </div>
                        </div>

                        <button 
                            className="btn btn-primary"
                            onClick={generateTP}
                            disabled={!file || loading}
                        >
                            {loading ? progress || 'Génération...' : '📋 Générer le TP'}
                        </button>
                    </div>

                    {error && <div className="error-message">{error}</div>}
                </>
            ) : (
                <div className="tp-result">
                    <div className="tp-card">
                        <div className="tp-header">
                            <h2>FICHE DE TP N°{tp.numero}</h2>
                            <h3>{tp.titre.toUpperCase()}</h3>
                            <p className="tp-unite">{tp.unite}</p>
                        </div>
                        
                        <div className="tp-theme">
                            <strong>Thème :</strong> {tp.theme}
                        </div>
                        
                        <div className="tp-meta">
                            <div className="tp-meta-item">
                                <span className="tp-meta-icon">📍</span>
                                <span><strong>Lieu :</strong> {tp.lieu}</span>
                            </div>
                            <div className="tp-meta-item">
                                <span className="tp-meta-icon">⏱️</span>
                                <span><strong>Durée :</strong> {tp.duree}</span>
                            </div>
                        </div>
                        
                        <div className="tp-section">
                            <h4>1. Objectifs</h4>
                            <ul>
                                {tp.objectifs.map((obj, i) => (
                                    <li key={i}>{obj}</li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="tp-section">
                            <h4>2. Le Protocole</h4>
                            <div className="tp-protocole">
                                {tp.protocole.map((etape, i) => (
                                    <div key={i} className="tp-etape">
                                        <div className="tp-etape-header">
                                            <span className="tp-etape-num">Étape {etape.etape}</span>
                                            <span className="tp-etape-titre">{etape.titre}</span>
                                        </div>
                                        <p className="tp-etape-desc">{etape.description}</p>
                                        {etape.sousPoints && etape.sousPoints.length > 0 && (
                                            <ul className="tp-sous-points">
                                                {etape.sousPoints.map((sp, j) => (
                                                    <li key={j}>{sp}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="tp-section">
                            <h4>3. Livrable</h4>
                            <div className="tp-livrable">
                                <p>{tp.livrable.description}</p>
                                <ul>
                                    {tp.livrable.elements.map((el, i) => (
                                        <li key={i}>{el}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div className="tp-actions">
                        <button className="btn btn-secondary" onClick={copyTP}>
                            {copied ? '✅ Copié !' : '📋 Copier'}
                        </button>
                        <button className="btn btn-secondary" onClick={exportToPDF}>
                            📄 Exporter PDF
                        </button>
                        <button className="btn btn-secondary" onClick={exportToWord}>
                            📝 Exporter Word
                        </button>
                        <button className="btn btn-primary" onClick={() => setTp(null)}>
                            📁 Nouveau document
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
