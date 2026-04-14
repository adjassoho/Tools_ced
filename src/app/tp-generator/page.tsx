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
                        border-left: 3px solid #0ea5e9;
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
                        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                        padding: 20px;
                        border-radius: 10px;
                        border: 1px solid #bae6fd;
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
        <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 relative z-10 pt-10 mb-20">
            <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 hover:shadow-sm transition-all mb-10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Retour aux Outils
            </Link>
            
            <div className="text-center mb-16 relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-200 bg-sky-50 shadow-sm mb-6">
                   <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                   <span className="text-xs font-bold text-sky-700 tracking-widest uppercase">Pratique Intensive</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
                  Générateur de <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-500">TP</span>
                </h1>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
                  Uploadez votre cours documentaire. L'IA concevra instantanément un protocole de Travaux Pratiques organisé par étapes.
                </p>
            </div>

            {!tp ? (
                <div className="glass-panel bg-white p-8 md:p-12 rounded-3xl border-t-4 border-t-sky-500 shadow-xl shadow-slate-200/50">
                    <div className="flex flex-col md:flex-row gap-10">
                        {/* Zone Upload */}
                        <div className="w-full md:w-1/2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".pdf,.docx,.doc,.txt"
                                className="hidden"
                            />
                            
                            {!file ? (
                                <div 
                                    className="w-full h-full min-h-[280px] border-2 border-dashed border-sky-200 bg-sky-50/50 rounded-2xl flex flex-col items-center justify-center py-10 cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-colors group relative overflow-hidden"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-16 h-16 bg-white border border-sky-100 rounded-2xl flex items-center justify-center mb-5 text-sky-500 group-hover:scale-110 transition-transform shadow-md">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                    </div>
                                    <span className="font-bold text-slate-700 text-base mb-1">Insérer un texte brut</span>
                                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Supporte PDF, DOCX, TXT</span>
                                </div>
                            ) : (
                                <div className="w-full h-full min-h-[280px] flex flex-col items-center justify-center bg-white border border-sky-100 rounded-2xl p-6 relative shadow-sm">
                                    <button onClick={() => setFile(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                    <div className="w-20 h-20 bg-sky-100 border border-sky-200 rounded-2xl flex items-center justify-center text-sky-600 mb-6">
                                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"></path></svg>
                                    </div>
                                    <p className="font-extrabold text-slate-800 text-lg text-center truncate w-full px-4">{file.name}</p>
                                    <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mt-2">{(file.size / 1024).toFixed(1)} Ko</p>
                                </div>
                            )}
                        </div>

                        {/* Zone Options */}
                        <div className="w-full md:w-1/2 flex flex-col justify-center">
                            <h3 className="text-lg font-extrabold text-slate-800 mb-6 tracking-tight">Paramètres du TP</h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-3">Numéro de la Fiche (TP N°)</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="99"
                                        value={tpNumber}
                                        onChange={(e) => setTpNumber(Number(e.target.value))}
                                        className="block w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors shadow-sm"
                                    />
                                </div>
                            </div>
                            
                            <button 
                                onClick={generateTP}
                                disabled={!file || loading}
                                className={`mt-8 w-full group relative overflow-hidden px-8 py-4 rounded-xl font-extrabold text-sm tracking-widest uppercase transition-all shadow-md hover:shadow-xl flex items-center justify-center gap-3 ${
                                    loading || !file
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:-translate-y-1'
                                }`}
                            >
                                {loading && (
                                    <svg className="animate-spin h-5 w-5 text-white absolute left-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {loading ? progress || 'Génération...' : '🔬 Produire le Protocole'}
                            </button>
                            {error && (
                                <p className="text-red-500 text-sm font-bold text-center mt-4 bg-red-50 p-2 rounded-lg">{error}</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass-panel bg-white p-8 md:p-12 rounded-3xl border-t-4 border-t-sky-500 shadow-xl shadow-slate-200/50">
                    
                    {/* Fiche TP Document Preview */}
                    <div className="bg-slate-50 border border-slate-200 p-8 md:p-12 rounded-2xl shadow-inner mb-10 max-w-3xl mx-auto font-sans">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 mb-8 shadow-lg text-white">
                            <h2 className="text-sm font-extrabold uppercase tracking-[0.2em] mb-2 text-sky-400">FICHE DE TP N°{tp.numero}</h2>
                            <h3 className="text-3xl font-bold leading-tight mb-2">{tp.titre.toUpperCase()}</h3>
                            <p className="text-slate-300 font-medium italic">{tp.unite}</p>
                        </div>
                        
                        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm flex flex-col md:flex-row gap-6 md:gap-12">
                            <div className="flex-1">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Thématique</div>
                                <div className="font-bold text-slate-800">{tp.theme}</div>
                            </div>
                            <div className="w-px bg-slate-200 hidden md:block"></div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">📍</div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lieu</div>
                                    <div className="font-bold text-slate-800">{tp.lieu}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">⏱️</div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Durée</div>
                                    <div className="font-bold text-slate-800">{tp.duree}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mb-10">
                            <h4 className="flex items-center gap-3 font-extrabold text-lg text-slate-800 mb-4 border-b-2 border-slate-100 pb-2">
                                <span className="bg-slate-800 text-white w-6 h-6 rounded flex items-center justify-center text-sm">1</span>
                                Objectifs de la séance
                            </h4>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {tp.objectifs.map((obj, i) => (
                                    <li key={i} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-sm text-slate-700 font-medium">
                                        <svg className="w-5 h-5 text-sky-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        {obj}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="mb-10">
                            <h4 className="flex items-center gap-3 font-extrabold text-lg text-slate-800 mb-6 border-b-2 border-slate-100 pb-2">
                                <span className="bg-slate-800 text-white w-6 h-6 rounded flex items-center justify-center text-sm">2</span>
                                Protocole Expérimental
                            </h4>
                            <div className="space-y-4">
                                {tp.protocole.map((etape, i) => (
                                    <div key={i} className="bg-white border-l-4 border-l-sky-500 rounded-r-xl p-5 shadow-sm">
                                        <div className="font-extrabold text-slate-800 mb-2 flex items-center gap-2">
                                            <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded uppercase tracking-wider">Étape {etape.etape}</span>
                                            {etape.titre}
                                        </div>
                                        <p className="text-slate-600 text-sm mb-3 font-medium leading-relaxed">{etape.description}</p>
                                        {etape.sousPoints && etape.sousPoints.length > 0 && (
                                            <ul className="pl-4 space-y-1">
                                                {etape.sousPoints.map((sp, j) => (
                                                    <li key={j} className="text-sm text-slate-500 flex items-start gap-2">
                                                        <span className="text-sky-400 mt-0.5">•</span>
                                                        {sp}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="flex items-center gap-3 font-extrabold text-lg text-slate-800 mb-4 border-b-2 border-slate-100 pb-2">
                                <span className="bg-slate-800 text-white w-6 h-6 rounded flex items-center justify-center text-sm">3</span>
                                Documents à Livrer
                            </h4>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6">
                                <p className="font-bold text-emerald-800 text-sm mb-4">{tp.livrable.description}</p>
                                <ul className="space-y-2">
                                    {tp.livrable.elements.map((el, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm font-medium text-emerald-700">
                                            <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                            {el}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    {/* Actions Menu */}
                    <div className="flex flex-wrap items-center justify-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <button onClick={copyTP} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-sm flex items-center gap-2">
                            {copied ? '✅ COPIÉ !' : '📋 COPIER TEXTE'}
                        </button>
                        <button onClick={exportToPDF} className="px-6 py-3 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-sm flex items-center gap-2">
                            📄 EXPORT PDF
                        </button>
                        <button onClick={exportToWord} className="px-6 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-sm flex items-center gap-2">
                            📝 EXPORT DOCX
                        </button>
                        <button onClick={() => setTp(null)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-md ml-auto">
                            📁 NOUVEAU
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
