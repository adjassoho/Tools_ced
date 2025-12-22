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
        <div className="tool-container">
            <Link href="/" className="back-link">← Retour</Link>
            
            <div className="tool-header">
                <h1>🎯 Générateur de Quiz</h1>
                <p>Uploadez un document pour générer automatiquement un quiz interactif</p>
            </div>

            {!quiz ? (
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

                        <div className="quiz-options">
                            <div className="option-group">
                                <label>Nombre de questions:</label>
                                <select 
                                    value={numQuestions} 
                                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                                >
                                    <option value={5}>5 questions</option>
                                    <option value={10}>10 questions</option>
                                    <option value={15}>15 questions</option>
                                    <option value={20}>20 questions</option>
                                </select>
                            </div>
                            
                            <div className="option-group">
                                <label>Difficulté:</label>
                                <select 
                                    value={difficulty} 
                                    onChange={(e) => setDifficulty(e.target.value)}
                                >
                                    <option value="facile">🟢 Facile</option>
                                    <option value="moyen">🟡 Moyen</option>
                                    <option value="difficile">🔴 Difficile</option>
                                </select>
                            </div>
                        </div>

                        <button 
                            className="btn btn-primary"
                            onClick={generateQuiz}
                            disabled={!file || loading}
                        >
                            {loading ? progress || 'Génération...' : '🎯 Générer le Quiz'}
                        </button>
                    </div>

                    {error && <div className="error-message">{error}</div>}
                </>
            ) : showResults ? (
                <div className="quiz-results">
                    <div className="results-header">
                        <h2>📊 Résultats du Quiz</h2>
                        <div className="score-display">
                            <div className="score-circle" style={{
                                background: `conic-gradient(${score.percentage >= 70 ? '#10b981' : score.percentage >= 50 ? '#f59e0b' : '#ef4444'} ${score.percentage}%, #1e293b ${score.percentage}%)`
                            }}>
                                <span>{score.percentage}%</span>
                            </div>
                            <p>{score.correct} / {score.total} bonnes réponses</p>
                        </div>
                    </div>

                    <div className="results-details">
                        {quiz.questions.map((q, i) => (
                            <div key={i} className={`result-item ${selectedAnswers[i] === q.correctIndex ? 'correct' : 'incorrect'}`}>
                                <div className="result-question">
                                    <span className="result-icon">
                                        {selectedAnswers[i] === q.correctIndex ? '✅' : '❌'}
                                    </span>
                                    <span>Q{i + 1}: {q.question}</span>
                                </div>
                                <div className="result-answer">
                                    <span>Votre réponse: {q.options[selectedAnswers[i] || 0]}</span>
                                    {selectedAnswers[i] !== q.correctIndex && (
                                        <span className="correct-answer">Bonne réponse: {q.options[q.correctIndex]}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="results-actions">
                        <button className="btn btn-secondary" onClick={restartQuiz}>
                            🔄 Recommencer
                        </button>
                        <button className="btn btn-secondary" onClick={copyQuiz}>
                            {copied ? '✅ Copié !' : '📋 Copier le quiz'}
                        </button>
                        <button className="btn btn-secondary" onClick={exportToPDF}>
                            📄 Exporter PDF
                        </button>
                        <button className="btn btn-primary" onClick={() => setQuiz(null)}>
                            📁 Nouveau document
                        </button>
                    </div>
                </div>
            ) : currentQ && (
                <div className="quiz-container">
                    <div className="quiz-progress">
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
                            />
                        </div>
                        <span>Question {currentQuestion + 1} / {quiz.questions.length}</span>
                    </div>

                    <div className="question-card">
                        <h3 className="question-text">{currentQ.question}</h3>
                        
                        <div className="options-list">
                            {currentQ.options.map((option, i) => {
                                const isSelected = selectedAnswers[currentQuestion] === i;
                                const isCorrect = i === currentQ.correctIndex;
                                const showCorrectness = showExplanation && selectedAnswers[currentQuestion] !== null;
                                
                                let optionClass = 'option-btn';
                                if (showCorrectness) {
                                    if (isCorrect) optionClass += ' correct';
                                    else if (isSelected) optionClass += ' incorrect';
                                } else if (isSelected) {
                                    optionClass += ' selected';
                                }
                                
                                return (
                                    <button
                                        key={i}
                                        className={optionClass}
                                        onClick={() => selectAnswer(i)}
                                        disabled={showExplanation}
                                    >
                                        <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                                        <span className="option-text">{option}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {showExplanation && (
                            <div className="explanation-box">
                                <h4>💡 Explication</h4>
                                <p>{currentQ.explanation}</p>
                            </div>
                        )}
                    </div>

                    <div className="quiz-navigation">
                        <button 
                            className="btn btn-secondary" 
                            onClick={prevQuestion}
                            disabled={currentQuestion === 0}
                        >
                            ← Précédent
                        </button>
                        
                        <div className="quiz-actions-inline">
                            <button className="btn btn-icon" onClick={copyQuiz} title="Copier le quiz">
                                {copied ? '✅' : '📋'}
                            </button>
                            <button className="btn btn-icon" onClick={exportToPDF} title="Exporter en PDF">
                                📄
                            </button>
                        </div>
                        
                        <button 
                            className="btn btn-primary" 
                            onClick={nextQuestion}
                            disabled={selectedAnswers[currentQuestion] === null}
                        >
                            {currentQuestion === quiz.questions.length - 1 ? 'Voir les résultats' : 'Suivant →'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
