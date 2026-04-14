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
        <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 relative z-10 pt-10 mb-20">
            <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 hover:shadow-sm transition-all mb-10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Retour aux Outils
            </Link>
            
            <div className="text-center mb-16 relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-200 bg-green-50 shadow-sm mb-6">
                   <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                   <span className="text-xs font-bold text-green-700 tracking-widest uppercase">Pédagogie Avancée</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
                  Générateur de <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-500">TD</span>
                </h1>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
                  Uploadez votre cours. L'IA va structurer un fascicule complet de Travaux Dirigés (Exercices & contextes).
                </p>
            </div>

            {!td ? (
                <div className="glass-panel bg-white p-8 md:p-12 rounded-3xl border-t-4 border-t-green-500 shadow-xl shadow-slate-200/50">
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
                                    className="w-full h-full min-h-[280px] border-2 border-dashed border-green-200 bg-green-50/50 rounded-2xl flex flex-col items-center justify-center py-10 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors group relative overflow-hidden"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-16 h-16 bg-white border border-green-100 rounded-2xl flex items-center justify-center mb-5 text-green-500 group-hover:scale-110 transition-transform shadow-md">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                    </div>
                                    <span className="font-bold text-slate-700 text-base mb-1">Cliquer pour parcourir</span>
                                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Supporte PDF, DOCX, TXT</span>
                                </div>
                            ) : (
                                <div className="w-full h-full min-h-[280px] flex flex-col items-center justify-center bg-white border border-green-100 rounded-2xl p-6 relative shadow-sm">
                                    <button onClick={() => setFile(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                    <div className="w-20 h-20 bg-green-100 border border-green-200 rounded-2xl flex items-center justify-center text-green-600 mb-6">
                                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"></path></svg>
                                    </div>
                                    <p className="font-extrabold text-slate-800 text-lg text-center truncate w-full px-4">{file.name}</p>
                                    <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mt-2">{(file.size / 1024).toFixed(1)} Ko</p>
                                </div>
                            )}
                        </div>

                        {/* Zone Options */}
                        <div className="w-full md:w-1/2 flex flex-col justify-center">
                            <h3 className="text-lg font-extrabold text-slate-800 mb-6 tracking-tight">Paramètres du TD</h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-3">Numéro de la Fiche (TD N°)</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="99"
                                        value={tdNumber}
                                        onChange={(e) => setTdNumber(Number(e.target.value))}
                                        className="block w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors shadow-sm"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-3">Niveau de Complexité</label>
                                    <div className="relative">
                                        <select 
                                            value={difficulty} 
                                            onChange={(e) => setDifficulty(e.target.value)}
                                            className="block w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors shadow-sm cursor-pointer"
                                        >
                                            <option value="facile">🟢 Facile (Application simple)</option>
                                            <option value="moyen">🟡 Moyen (Analyse de problèmes)</option>
                                            <option value="difficile">🔴 Difficile (Synthèse globale)</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                            <svg className="fill-current w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={generateTD}
                                disabled={!file || loading}
                                className={`mt-8 w-full group relative overflow-hidden px-8 py-4 rounded-xl font-extrabold text-sm tracking-widest uppercase transition-all shadow-md hover:shadow-xl flex items-center justify-center gap-3 ${
                                    loading || !file
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:-translate-y-1'
                                }`}
                            >
                                {loading && (
                                    <svg className="animate-spin h-5 w-5 text-white absolute left-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {loading ? progress || 'Génération...' : '📝 Produire le Fascicule TD'}
                            </button>
                            {error && (
                                <p className="text-red-500 text-sm font-bold text-center mt-4 bg-red-50 p-2 rounded-lg">{error}</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass-panel bg-white p-8 md:p-12 rounded-3xl border-t-4 border-t-green-500 shadow-xl shadow-slate-200/50">
                    
                    {/* Paper Document Preview */}
                    <div className="bg-slate-50 border border-slate-200 p-8 md:p-12 rounded-2xl shadow-inner mb-10 max-w-3xl mx-auto font-serif">
                        <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
                            <h2 className="text-xl font-bold uppercase mb-1 tracking-wider text-black">TRAVAUX DIRIGÉS N°{td.numero}</h2>
                            <h3 className="text-2xl font-normal text-slate-800">{td.titre}</h3>
                        </div>
                        
                        <div className="flex flex-col md:flex-row justify-between mb-8 text-sm font-sans font-bold text-slate-700 bg-white p-4 border border-slate-200 rounded">
                            <span>Matière : <span className="font-normal">{td.matiere}</span></span>
                            <span>{td.unite}</span>
                            <span>Niveau : <span className="font-normal">{td.niveau}</span></span>
                        </div>
                        
                        <div className="text-justify mb-8 italic text-slate-700 bg-slate-100 p-5 rounded-r-xl border-l-4 border-l-slate-400">
                            <p>{td.introduction}</p>
                        </div>
                        
                        <div className="mb-10 font-sans">
                            <h4 className="font-bold text-base bg-emerald-100 inline-block px-3 py-1 text-emerald-800 rounded mb-4">📚 Objectifs pédagogiques</h4>
                            <ul className="list-disc pl-6 space-y-2 text-slate-700 text-sm">
                                {td.objectifs.map((obj, i) => (
                                    <li key={i}>{obj}</li>
                                ))}
                            </ul>
                        </div>
                        
                        {td.exercices.map((ex, i) => (
                            <div key={i} className="mb-10 page-break-inside-avoid">
                                <div className="font-bold text-lg border-b border-slate-800 pb-1 mb-4 flex gap-3 text-black">
                                    <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-sm">EXERCICE {ex.numero}</span>
                                    {ex.titre}
                                </div>
                                
                                {ex.contexte && (
                                    <div className="bg-amber-50 border border-amber-200 border-dashed p-4 mb-5 text-sm">
                                        <strong className="text-amber-800">Contexte :</strong> <span className="italic text-slate-700">{ex.contexte}</span>
                                    </div>
                                )}
                                
                                <div className="space-y-6">
                                    <strong className="text-sm uppercase tracking-wider text-slate-500 font-sans">Questions :</strong>
                                    {ex.questions.map((q, j) => (
                                        <div key={j} className="text-black">
                                            <div className="mb-4 text-[15px] font-medium">
                                                {q.numero}. {q.question}
                                            </div>
                                            <div className="space-y-4">
                                                {Array(Math.min(q.lignesReponse, 4)).fill(0).map((_, k) => (
                                                    <div key={k} className="border-b border-slate-300 h-6"></div>
                                                ))}
                                                {q.lignesReponse > 4 && (
                                                    <span className="text-xs text-slate-400 italic block mt-2">+{q.lignesReponse - 4} lignes de rédaction supplémentaires dans l'export</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Actions Menu */}
                    <div className="flex flex-wrap items-center justify-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <button onClick={copyTD} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-sm flex items-center gap-2">
                            {copied ? '✅ COPIÉ !' : '📋 COPIER TEXTE'}
                        </button>
                        <button onClick={exportToPDF} className="px-6 py-3 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-sm flex items-center gap-2">
                            📄 EXPORT PDF
                        </button>
                        <button onClick={exportToWord} className="px-6 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-sm flex items-center gap-2">
                            📝 EXPORT DOCX
                        </button>
                        <button onClick={() => setTd(null)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-md ml-auto">
                            📁 NOUVEAU
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
