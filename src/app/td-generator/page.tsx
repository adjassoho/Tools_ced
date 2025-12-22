'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Header, Footer, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

interface TDQuestion {
    numero: number;
    question: string;
    contexte?: string;
    lignesReponse: number;
}

interface TDExercice {
    numero: number;
    titre: string;
    contexte?: string;
    questions: TDQuestion[];
}

interface TDStructure {
    numero: number;
    titre: string;
    matiere: string;
    unite: string;
    niveau: string;
    introduction: string;
    objectifs: string[];
    exercices: TDExercice[];
}

export default function TDGenerator() {
    const [file, setFile] = useState<File | null>(null);
    const [tdNumber, setTdNumber] = useState(1);
    const [difficulty, setDifficulty] = useState('moyen');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [td, setTd] = useState<TDStructure | null>(null);
    const [copied, setCopied] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
            setTd(null);
        }
    };

    const generateTD = async () => {
        if (!file) return;

        setLoading(true);
        setError('');
        setProgress('📄 Analyse du document...');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('tdNumber', tdNumber.toString());
            formData.append('difficulty', difficulty);

            setTimeout(() => setProgress('🧠 Génération des exercices...'), 2000);

            const response = await fetch('/api/generate-td', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la génération');
            }

            setTd(data.td);
            setProgress('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    };


    // Formater le TD en texte
    const formatTDAsText = () => {
        if (!td) return '';
        
        let text = `TRAVAUX DIRIGÉS N°${td.numero}\n`;
        text += `${td.titre.toUpperCase()}\n`;
        text += `${'='.repeat(50)}\n\n`;
        text += `Matière : ${td.matiere}\n`;
        text += `${td.unite} | Niveau : ${td.niveau}\n\n`;
        text += `${td.introduction}\n\n`;
        
        text += `OBJECTIFS PÉDAGOGIQUES :\n`;
        td.objectifs.forEach(obj => {
            text += `• ${obj}\n`;
        });
        text += '\n';
        
        td.exercices.forEach(ex => {
            text += `${'─'.repeat(40)}\n`;
            text += `EXERCICE ${ex.numero} : ${ex.titre}\n`;
            if (ex.contexte) {
                text += `\nContexte : ${ex.contexte}\n`;
            }
            text += `\nQuestions :\n`;
            ex.questions.forEach(q => {
                text += `\n${q.numero}. ${q.question}\n`;
                text += `\n${'_'.repeat(60)}\n`.repeat(q.lignesReponse);
            });
            text += '\n';
        });
        
        return text;
    };

    // Copier le TD
    const copyTD = async () => {
        const text = formatTDAsText();
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
        if (!td) return;
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>TD ${td.numero} - ${td.titre}</title>
                <style>
                    body {
                        font-family: 'Times New Roman', serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px;
                        color: #000;
                        line-height: 1.6;
                        font-size: 12pt;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 20px;
                    }
                    .header h1 {
                        margin: 0 0 5px 0;
                        font-size: 16pt;
                    }
                    .header h2 {
                        margin: 0;
                        font-size: 14pt;
                        font-weight: normal;
                    }
                    .meta {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 20px;
                        font-size: 11pt;
                    }
                    .intro {
                        text-align: justify;
                        margin-bottom: 20px;
                        padding: 15px;
                        background: #f5f5f5;
                        border-left: 3px solid #333;
                    }
                    .objectifs {
                        margin-bottom: 25px;
                    }
                    .objectifs h3 {
                        font-size: 12pt;
                        margin-bottom: 10px;
                    }
                    .objectifs ul {
                        margin: 0;
                        padding-left: 20px;
                    }
                    .objectifs li {
                        margin-bottom: 5px;
                    }
                    .exercice {
                        margin-bottom: 30px;
                        page-break-inside: avoid;
                    }
                    .exercice-header {
                        font-weight: bold;
                        font-size: 13pt;
                        border-bottom: 1px solid #000;
                        padding-bottom: 5px;
                        margin-bottom: 15px;
                    }
                    .contexte {
                        font-style: italic;
                        margin-bottom: 15px;
                        padding: 10px;
                        background: #fafafa;
                        border: 1px dashed #ccc;
                    }
                    .question {
                        margin-bottom: 20px;
                    }
                    .question-text {
                        margin-bottom: 10px;
                    }
                    .reponse-lines {
                        border-bottom: 1px solid #ccc;
                        height: 25px;
                        margin-bottom: 5px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        font-size: 10pt;
                        color: #666;
                    }
                    @media print {
                        body { padding: 20px; }
                        .exercice { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>TRAVAUX DIRIGÉS N°${td.numero}</h1>
                    <h2>${td.titre}</h2>
                </div>
                
                <div class="meta">
                    <span><strong>Matière :</strong> ${td.matiere}</span>
                    <span><strong>${td.unite}</strong></span>
                    <span><strong>Niveau :</strong> ${td.niveau}</span>
                </div>
                
                <div class="intro">
                    ${td.introduction}
                </div>
                
                <div class="objectifs">
                    <h3>Objectifs pédagogiques</h3>
                    <ul>
                        ${td.objectifs.map(obj => `<li>${obj}</li>`).join('')}
                    </ul>
                </div>
                
                ${td.exercices.map(ex => `
                    <div class="exercice">
                        <div class="exercice-header">Exercice ${ex.numero} : ${ex.titre}</div>
                        ${ex.contexte ? `<div class="contexte"><strong>Contexte :</strong> ${ex.contexte}</div>` : ''}
                        <div class="questions">
                            <strong>Questions :</strong>
                            ${ex.questions.map(q => `
                                <div class="question">
                                    <div class="question-text">${q.numero}. ${q.question}</div>
                                    ${Array(q.lignesReponse).fill('<div class="reponse-lines"></div>').join('')}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
                
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
        if (!td) return;

        // Créer les lignes de réponse vides
        const createResponseLines = (count: number) => {
            const lines = [];
            for (let i = 0; i < count; i++) {
                lines.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: '_'.repeat(80), size: 24, color: "CCCCCC" }),
                        ],
                        spacing: { after: 150 },
                    })
                );
            }
            return lines;
        };

        const doc = new Document({
            sections: [{
                properties: {},
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `TD N°${td.numero} - ${td.titre}`,
                                        size: 18,
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
                                text: `TRAVAUX DIRIGÉS N°${td.numero}`,
                                bold: true,
                                size: 32,
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: td.titre,
                                bold: true,
                                size: 28,
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 300 },
                    }),
                    // Métadonnées
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Matière : ", bold: true, size: 24 }),
                            new TextRun({ text: td.matiere, size: 24 }),
                            new TextRun({ text: "    |    ", size: 24 }),
                            new TextRun({ text: td.unite, bold: true, size: 24 }),
                            new TextRun({ text: "    |    ", size: 24 }),
                            new TextRun({ text: "Niveau : ", bold: true, size: 24 }),
                            new TextRun({ text: td.niveau, size: 24 }),
                        ],
                        spacing: { after: 300 },
                    }),
                    // Introduction
                    new Paragraph({
                        children: [
                            new TextRun({ text: td.introduction, size: 24, italics: true }),
                        ],
                        spacing: { after: 300 },
                    }),
                    // Objectifs
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Objectifs pédagogiques",
                                bold: true,
                                size: 26,
                            }),
                        ],
                        spacing: { before: 200, after: 150 },
                    }),
                    ...td.objectifs.map(obj => new Paragraph({
                        children: [
                            new TextRun({ text: "• " + obj, size: 24 }),
                        ],
                        spacing: { after: 80 },
                        indent: { left: 400 },
                    })),
                    // Exercices
                    ...td.exercices.flatMap(ex => [
                        // Séparateur
                        new Paragraph({
                            children: [],
                            spacing: { before: 400 },
                        }),
                        // Titre exercice
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Exercice ${ex.numero} : ${ex.titre}`,
                                    bold: true,
                                    size: 26,
                                }),
                            ],
                            spacing: { after: 150 },
                            border: {
                                bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                            },
                        }),
                        // Contexte si présent
                        ...(ex.contexte ? [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Contexte : ", bold: true, size: 24 }),
                                    new TextRun({ text: ex.contexte, size: 24, italics: true }),
                                ],
                                spacing: { after: 200 },
                            }),
                        ] : []),
                        // Questions label
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Questions :", bold: true, size: 24 }),
                            ],
                            spacing: { after: 150 },
                        }),
                        // Questions avec espaces de réponse
                        ...ex.questions.flatMap(q => [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `${q.numero}. ${q.question}`,
                                        size: 24,
                                    }),
                                ],
                                spacing: { before: 200, after: 150 },
                            }),
                            ...createResponseLines(q.lignesReponse),
                        ]),
                    ]),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `TD${td.numero}_${td.titre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.docx`);
    };


    return (
        <div className="tool-container">
            <Link href="/" className="back-link">← Retour</Link>
            
            <div className="tool-header">
                <h1>📝 Générateur de TD</h1>
                <p>Uploadez un document de cours pour générer automatiquement des Travaux Dirigés</p>
            </div>

            {!td ? (
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

                        <div className="td-options">
                            <div className="option-group">
                                <label>Numéro du TD:</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="99"
                                    value={tdNumber}
                                    onChange={(e) => setTdNumber(Number(e.target.value))}
                                    className="tp-number-input"
                                />
                            </div>
                            
                            <div className="option-group">
                                <label>Difficulté:</label>
                                <select 
                                    value={difficulty} 
                                    onChange={(e) => setDifficulty(e.target.value)}
                                    className="td-select"
                                >
                                    <option value="facile">🟢 Facile - Compréhension</option>
                                    <option value="moyen">🟡 Moyen - Analyse</option>
                                    <option value="difficile">🔴 Difficile - Synthèse</option>
                                </select>
                            </div>
                        </div>

                        <button 
                            className="btn btn-primary"
                            onClick={generateTD}
                            disabled={!file || loading}
                        >
                            {loading ? progress || 'Génération...' : '📝 Générer le TD'}
                        </button>
                    </div>

                    {error && <div className="error-message">{error}</div>}
                </>
            ) : (
                <div className="td-result">
                    <div className="td-card">
                        <div className="td-header">
                            <h2>TRAVAUX DIRIGÉS N°{td.numero}</h2>
                            <h3>{td.titre}</h3>
                            <div className="td-meta-line">
                                <span>{td.matiere}</span>
                                <span className="td-separator">|</span>
                                <span>{td.unite}</span>
                                <span className="td-separator">|</span>
                                <span>{td.niveau}</span>
                            </div>
                        </div>
                        
                        <div className="td-intro">
                            <p>{td.introduction}</p>
                        </div>
                        
                        <div className="td-section">
                            <h4>📚 Objectifs pédagogiques</h4>
                            <ul>
                                {td.objectifs.map((obj, i) => (
                                    <li key={i}>{obj}</li>
                                ))}
                            </ul>
                        </div>
                        
                        {td.exercices.map((ex, i) => (
                            <div key={i} className="td-exercice">
                                <div className="td-exercice-header">
                                    <span className="td-exercice-num">Exercice {ex.numero}</span>
                                    <span className="td-exercice-titre">{ex.titre}</span>
                                </div>
                                
                                {ex.contexte && (
                                    <div className="td-contexte">
                                        <strong>Contexte :</strong> {ex.contexte}
                                    </div>
                                )}
                                
                                <div className="td-questions">
                                    <strong>Questions :</strong>
                                    {ex.questions.map((q, j) => (
                                        <div key={j} className="td-question">
                                            <div className="td-question-text">
                                                {q.numero}. {q.question}
                                            </div>
                                            <div className="td-response-area">
                                                {Array(Math.min(q.lignesReponse, 4)).fill(0).map((_, k) => (
                                                    <div key={k} className="td-response-line"></div>
                                                ))}
                                                {q.lignesReponse > 4 && (
                                                    <span className="td-more-lines">+{q.lignesReponse - 4} lignes</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="td-actions">
                        <button className="btn btn-secondary" onClick={copyTD}>
                            {copied ? '✅ Copié !' : '📋 Copier'}
                        </button>
                        <button className="btn btn-secondary" onClick={exportToPDF}>
                            📄 Exporter PDF
                        </button>
                        <button className="btn btn-secondary" onClick={exportToWord}>
                            📝 Exporter Word
                        </button>
                        <button className="btn btn-primary" onClick={() => setTd(null)}>
                            📁 Nouveau document
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
