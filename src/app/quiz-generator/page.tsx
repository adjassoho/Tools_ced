'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface QuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

interface QuizResult {
    questions: QuizQuestion[];
    documentName: string;
    difficulty: string;
}

export default function QuizGenerator() {
    const [file, setFile] = useState<File | null>(null);
    const [numQuestions, setNumQuestions] = useState(10);
    const [difficulty, setDifficulty] = useState('moyen');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    
    // Quiz state
    const [quiz, setQuiz] = useState<QuizResult | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Formater le quiz en texte pour la copie
    const formatQuizAsText = () => {
        if (!quiz) return '';
        
        let text = `📝 QUIZ - ${quiz.documentName}\n`;
        text += `Difficulté: ${quiz.difficulty}\n`;
        text += `${'='.repeat(50)}\n\n`;
        
        quiz.questions.forEach((q, i) => {
            text += `Question ${i + 1}: ${q.question}\n\n`;
            q.options.forEach((opt, j) => {
                const letter = String.fromCharCode(65 + j);
                const isCorrect = j === q.correctIndex;
                text += `  ${letter}) ${opt}${isCorrect ? ' ✓' : ''}\n`;
            });
            text += `\n💡 Explication: ${q.explanation}\n`;
            text += `${'-'.repeat(40)}\n\n`;
        });
        
        return text;
    };

    // Copier le quiz dans le presse-papier
    const copyQuiz = async () => {
        const text = formatQuizAsText();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Erreur de copie:', err);
        }
    };

    // Exporter le quiz en PDF
    const exportToPDF = () => {
        if (!quiz) return;
        
        // Créer le contenu HTML pour le PDF
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Quiz - ${quiz.documentName}</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px;
                        color: #333;
                        line-height: 1.6;
                    }
                    h1 {
                        color: #2563eb;
                        border-bottom: 3px solid #2563eb;
                        padding-bottom: 10px;
                    }
                    .meta {
                        background: #f1f5f9;
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 30px;
                    }
                    .question {
                        background: #fff;
                        border: 1px solid #e2e8f0;
                        border-radius: 10px;
                        padding: 20px;
                        margin-bottom: 25px;
                        page-break-inside: avoid;
                    }
                    .question-header {
                        font-weight: bold;
                        color: #1e40af;
                        font-size: 1.1em;
                        margin-bottom: 15px;
                    }
                    .options {
                        margin-left: 20px;
                    }
                    .option {
                        padding: 8px 0;
                        display: flex;
                        align-items: flex-start;
                    }
                    .option-letter {
                        font-weight: bold;
                        margin-right: 10px;
                        min-width: 25px;
                    }
                    .correct {
                        color: #059669;
                        font-weight: bold;
                    }
                    .correct::after {
                        content: ' ✓';
                    }
                    .explanation {
                        background: #ecfdf5;
                        border-left: 4px solid #10b981;
                        padding: 12px 15px;
                        margin-top: 15px;
                        font-size: 0.95em;
                    }
                    .explanation-title {
                        font-weight: bold;
                        color: #059669;
                        margin-bottom: 5px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        color: #64748b;
                        font-size: 0.9em;
                    }
                    @media print {
                        body { padding: 20px; }
                        .question { box-shadow: none; }
                    }
                </style>
            </head>
            <body>
                <h1>📝 Quiz</h1>
                <div class="meta">
                    <strong>Document:</strong> ${quiz.documentName}<br>
                    <strong>Difficulté:</strong> ${quiz.difficulty}<br>
                    <strong>Nombre de questions:</strong> ${quiz.questions.length}
                </div>
                
                ${quiz.questions.map((q, i) => `
                    <div class="question">
                        <div class="question-header">Question ${i + 1}: ${q.question}</div>
                        <div class="options">
                            ${q.options.map((opt, j) => `
                                <div class="option ${j === q.correctIndex ? 'correct' : ''}">
                                    <span class="option-letter">${String.fromCharCode(65 + j)})</span>
                                    <span>${opt}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="explanation">
                            <div class="explanation-title">💡 Explication</div>
                            ${q.explanation}
                        </div>
                    </div>
                `).join('')}
                
                <div class="footer">
                    Généré par Tools CED - INE
                </div>
            </body>
            </html>
        `;
        
        // Ouvrir dans une nouvelle fenêtre pour impression/PDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            // Attendre le chargement puis lancer l'impression
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                }, 250);
            };
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
            setQuiz(null);
            setShowResults(false);
        }
    };

    const generateQuiz = async () => {
        if (!file) return;

        setLoading(true);
        setError('');
        setProgress('📄 Analyse du document...');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('numQuestions', numQuestions.toString());
            formData.append('difficulty', difficulty);

            setTimeout(() => setProgress('🧠 Génération des questions...'), 2000);

            const response = await fetch('/api/generate-quiz', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la génération');
            }

            setQuiz(data);
            setSelectedAnswers(new Array(data.questions.length).fill(null));
            setCurrentQuestion(0);
            setShowResults(false);
            setProgress('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    };

    const selectAnswer = (index: number) => {
        if (showResults) return;
        const newAnswers = [...selectedAnswers];
        newAnswers[currentQuestion] = index;
        setSelectedAnswers(newAnswers);
        setShowExplanation(true);
    };

    const nextQuestion = () => {
        setShowExplanation(false);
        if (currentQuestion < (quiz?.questions.length || 0) - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            setShowResults(true);
        }
    };

    const prevQuestion = () => {
        setShowExplanation(false);
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    const restartQuiz = () => {
        setSelectedAnswers(new Array(quiz?.questions.length || 0).fill(null));
        setCurrentQuestion(0);
        setShowResults(false);
        setShowExplanation(false);
    };

    const calculateScore = () => {
        if (!quiz) return { correct: 0, total: 0, percentage: 0 };
        let correct = 0;
        quiz.questions.forEach((q, i) => {
            if (selectedAnswers[i] === q.correctIndex) correct++;
        });
        return {
            correct,
            total: quiz.questions.length,
            percentage: Math.round((correct / quiz.questions.length) * 100)
        };
    };

    const currentQ = quiz?.questions[currentQuestion];
    const score = calculateScore();

    return (
        <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 relative z-10 pt-10 mb-20">
            <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 hover:shadow-sm transition-all mb-10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Retour aux Outils
            </Link>
            
            <div className="text-center mb-16 relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 shadow-sm mb-6">
                   <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                   <span className="text-xs font-bold text-red-700 tracking-widest uppercase">Génération Interactive</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
                  Générateur de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Quiz</span>
                </h1>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
                  Uploadez un document de cours pour générer automatiquement un quiz d'évaluation sur mesure avec l'IA.
                </p>
            </div>

            {!quiz ? (
                <div className="glass-panel bg-white p-8 md:p-12 rounded-3xl border-t-4 border-t-red-500 shadow-xl shadow-slate-200/50">
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
                                    className="w-full h-full min-h-[280px] border-2 border-dashed border-red-200 bg-red-50/50 rounded-2xl flex flex-col items-center justify-center py-10 cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors group relative overflow-hidden"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-16 h-16 bg-white border border-red-100 rounded-2xl flex items-center justify-center mb-5 text-red-500 group-hover:scale-110 transition-transform shadow-md">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                    </div>
                                    <span className="font-bold text-slate-700 text-base mb-1">Cliquer pour parcourir</span>
                                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Supporte PDF, DOCX, TXT</span>
                                </div>
                            ) : (
                                <div className="w-full h-full min-h-[280px] flex flex-col items-center justify-center bg-white border border-red-100 rounded-2xl p-6 relative shadow-sm">
                                    <button onClick={() => setFile(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                    <div className="w-20 h-20 bg-red-100 border border-red-200 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"></path></svg>
                                    </div>
                                    <p className="font-extrabold text-slate-800 text-lg text-center truncate w-full px-4">{file.name}</p>
                                    <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mt-2">{(file.size / 1024).toFixed(1)} Ko</p>
                                </div>
                            )}
                        </div>

                        {/* Zone Options */}
                        <div className="w-full md:w-1/2 flex flex-col justify-center">
                            <h3 className="text-lg font-extrabold text-slate-800 mb-6 tracking-tight">Paramètres du Quiz</h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-3">Nombre de questions</label>
                                    <div className="relative">
                                        <select 
                                            value={numQuestions} 
                                            onChange={(e) => setNumQuestions(Number(e.target.value))}
                                            className="block w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors shadow-sm cursor-pointer"
                                        >
                                            <option value={5}>5 Questions (Rapide)</option>
                                            <option value={10}>10 Questions (Standard)</option>
                                            <option value={15}>15 Questions (Approfondi)</option>
                                            <option value={20}>20 Questions (Complet)</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                            <svg className="fill-current w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-3">Difficulté cognitive</label>
                                    <div className="relative">
                                        <select 
                                            value={difficulty} 
                                            onChange={(e) => setDifficulty(e.target.value)}
                                            className="block w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors shadow-sm cursor-pointer"
                                        >
                                            <option value="facile">🟢 Niveau Facile (Mémoire)</option>
                                            <option value="moyen">🟡 Niveau Moyen (Compréhension)</option>
                                            <option value="difficile">🔴 Niveau Difficile (Analyse)</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                            <svg className="fill-current w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={generateQuiz}
                                disabled={!file || loading}
                                className={`mt-8 w-full group relative overflow-hidden px-8 py-4 rounded-xl font-extrabold text-sm tracking-widest uppercase transition-all shadow-md hover:shadow-xl flex items-center justify-center gap-3 ${
                                    loading || !file
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:-translate-y-1'
                                }`}
                            >
                                {loading && (
                                    <svg className="animate-spin h-5 w-5 text-white absolute left-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {loading ? (progress || 'Génération...') : '🧠 Générer le Quiz'}
                            </button>
                            {error && (
                                <p className="text-red-500 text-sm font-bold text-center mt-4 bg-red-50 p-2 rounded-lg">{error}</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : showResults ? (
                <div className="glass-panel bg-white p-8 md:p-12 rounded-3xl border-t-4 border-t-blue-500 shadow-xl shadow-slate-200/50">
                    <div className="flex flex-col items-center mb-10 pb-10 border-b border-slate-100">
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-8">Bilan de l'Évaluation</h2>
                        
                        <div className="relative flex flex-col items-center justify-center">
                            <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center border-4 shadow-lg ${score.percentage >= 70 ? 'border-emerald-500 bg-emerald-50' : score.percentage >= 50 ? 'border-amber-500 bg-amber-50' : 'border-red-500 bg-red-50'}`}>
                                <span className={`text-4xl font-black ${score.percentage >= 70 ? 'text-emerald-600' : score.percentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{score.percentage}%</span>
                            </div>
                            <p className="mt-4 font-bold text-slate-600 bg-slate-100 px-4 py-1.5 rounded-full text-sm">{score.correct} / {score.total} exactes</p>
                        </div>
                    </div>

                    <div className="space-y-6 mb-12">
                        {quiz.questions.map((q, i) => {
                            const isUserCorrect = selectedAnswers[i] === q.correctIndex;
                            return (
                                <div key={i} className={`p-6 rounded-2xl border ${isUserCorrect ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold ${isUserCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {isUserCorrect ? '✓' : '✗'}
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mt-1">Q{i + 1}. {q.question}</h3>
                                    </div>
                                    <div className="ml-12 p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                                        <p className="text-sm font-medium text-slate-600 mb-2">Votre choix : <span className={`font-bold ${isUserCorrect ? 'text-emerald-600' : 'text-red-500'}`}>{q.options[selectedAnswers[i] || 0]}</span></p>
                                        {!isUserCorrect && (
                                            <p className="text-sm font-medium text-slate-600">Réponse attendue : <span className="font-bold text-emerald-600">{q.options[q.correctIndex]}</span></p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 border-t border-slate-100 pt-8">
                        <button onClick={restartQuiz} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors">
                            🔄 Reprendre
                        </button>
                        <button onClick={copyQuiz} className="px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors border border-blue-100 flex items-center gap-2">
                            {copied ? '✅ COPIÉ !' : '📋 COPIER TEXTE'}
                        </button>
                        <button onClick={exportToPDF} className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors border border-red-100 flex items-center gap-2">
                            📄 EXPORT PDF
                        </button>
                        <button onClick={() => setQuiz(null)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-md">
                            📁 NOUVEAU
                        </button>
                    </div>
                </div>
            ) : currentQ && (
                <div className="glass-panel bg-white p-6 md:p-10 rounded-3xl border-t-4 border-t-amber-500 shadow-xl shadow-slate-200/50">
                    
                    {/* Progress Bar */}
                    <div className="mb-10">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-extrabold text-slate-500 uppercase tracking-widest">Évolution de l'évaluation</span>
                            <span className="text-sm font-extrabold text-amber-600 bg-amber-50 px-3 py-1 rounded-md">{currentQuestion + 1} / {quiz.questions.length}</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 ease-out"
                                style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Question */}
                    <div className="mb-10">
                        <h3 className="text-2xl font-extrabold text-slate-800 leading-relaxed tracking-tight mb-8">
                            {currentQ.question}
                        </h3>
                        
                        <div className="space-y-4">
                            {currentQ.options.map((option, i) => {
                                const isSelected = selectedAnswers[currentQuestion] === i;
                                const isCorrect = i === currentQ.correctIndex;
                                const showCorrectness = showExplanation && selectedAnswers[currentQuestion] !== null;
                                
                                let baseClass = "w-full p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all ";
                                
                                if (showCorrectness) {
                                    if (isCorrect) baseClass += "border-emerald-500 bg-emerald-50 text-emerald-800";
                                    else if (isSelected) baseClass += "border-red-500 bg-red-50 text-red-800";
                                    else baseClass += "border-slate-200 opacity-50 bg-white";
                                } else if (isSelected) {
                                    baseClass += "border-amber-500 bg-amber-50 text-amber-800 shadow-sm";
                                } else {
                                    baseClass += "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/30 text-slate-700 cursor-pointer";
                                }
                                
                                return (
                                    <button
                                        key={i}
                                        className={baseClass}
                                        onClick={() => selectAnswer(i)}
                                        disabled={showExplanation}
                                    >
                                        <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-black shrink-0 ${isSelected || (showCorrectness && isCorrect) ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                                            {String.fromCharCode(65 + i)}
                                        </span>
                                        <span className="font-bold mt-1 text-[15px]">{option}</span>
                                        
                                        {/* Icons Validation */}
                                        {showCorrectness && isCorrect && <svg className="w-6 h-6 ml-auto text-emerald-500 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                        {showCorrectness && isSelected && !isCorrect && <svg className="w-6 h-6 ml-auto text-red-500 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Explication */}
                    {showExplanation && (
                        <div className="mb-10 p-6 bg-slate-50 border border-emerald-100 border-l-4 border-l-emerald-500 rounded-xl rounded-l-none">
                            <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">💡 Base de Connaissances</h4>
                            <p className="text-slate-700 font-medium text-sm leading-relaxed">{currentQ.explanation}</p>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-8 mt-auto">
                        <button 
                            className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-sm uppercase tracking-widest rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            onClick={prevQuestion}
                            disabled={currentQuestion === 0}
                        >
                            Précédent
                        </button>
                        
                        <button 
                            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white shadow-md font-bold text-sm uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                            onClick={nextQuestion}
                            disabled={selectedAnswers[currentQuestion] === null}
                        >
                            {currentQuestion === quiz.questions.length - 1 ? 'Clôturer & Résultats' : 'Suivant'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
