'use client';

import { useState, useRef } from 'react';

// Interfaces pour le typage
interface Question {
  id: string;
  points: number;
  description: string;
}

interface GradeResult {
  totalScore: number;
  questions: {
    id: string;
    score: number;
    feedback: string;
  }[];
}

interface StudentRecord {
  filename: string;
  studentName: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: GradeResult;
  errorStr?: string;
}

export default function CopyAnalyzerPage() {
  // Navigation
  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // Etape 1: Fichiers de référence
  const [courseFile, setCourseFile] = useState<File | null>(null);
  const [examFile, setExamFile] = useState<File | null>(null);
  const [courseText, setCourseText] = useState<string>('');
  const [examText, setExamText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);

  // Etape 2: Barème
  const [questions, setQuestions] = useState<Question[]>([
    { id: 'Q1', points: 5, description: '' }
  ]);

  // Etape 3: Fichiers Étudiants
  const [studentFiles, setStudentFiles] = useState<File[]>([]);
  
  // Etape 4: Résultats
  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [progress, setProgress] = useState(0);

  // Utilitaires UI
  const courseInputRef = useRef<HTMLInputElement>(null);
  const examInputRef = useRef<HTMLInputElement>(null);
  const studentsInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // Etape 1 : Référentiel
  // -------------------------------------------------------------
  const extractTextFromServer = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/extract-text', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error("Échec d'extraction pour " + file.name);
    const data = await res.json();
    return data.text;
  };

  const validateStep1 = async () => {
    if (!courseFile || !examFile) {
      setError("Veuillez fournir le support de cours et l'épreuve.");
      return;
    }
    setError(null);
    setIsExtracting(true);
    try {
      const cText = await extractTextFromServer(courseFile);
      const eText = await extractTextFromServer(examFile);
      setCourseText(cText);
      setExamText(eText);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la lecture des fichiers.');
    } finally {
      setIsExtracting(false);
    }
  };

  // -------------------------------------------------------------
  // Etape 2 : Barème
  // -------------------------------------------------------------
  const addQuestion = () => setQuestions([...questions, { id: `Q${questions.length + 1}`, points: 0, description: '' }]);
  const removeQuestion = (idx: number) => setQuestions(questions.filter((_, i) => i !== idx));
  const updateQuestion = (idx: number, field: keyof Question, value: any) => {
    const newQ = [...questions];
    newQ[idx] = { ...newQ[idx], [field]: value };
    setQuestions(newQ);
  };

  const totalBareme = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const validateStep2 = () => {
    if (questions.length === 0 || totalBareme === 0) {
      setError("Le barème doit avoir au moins une question avec des points.");
      return;
    }
    setError(null);
    setStep(3);
  };

  // -------------------------------------------------------------
  // Etape 3 : Fichiers Etudiants
  // -------------------------------------------------------------
  const handleStudentFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files).filter(f => f.name.match(/\.(pdf|docx?|txt)$/i));
      setStudentFiles([...studentFiles, ...filesArr]);
    }
  };

  const startBatchProcessing = () => {
    if (studentFiles.length === 0) {
      setError("Veuillez importer au moins une copie.");
      return;
    }
    setError(null);
    
    // Initialiser les records
    const records = studentFiles.map(f => {
      // Nettoyer le nom du fichier ("Dupont_Jean.pdf" -> "Dupont Jean")
      let name = f.name.replace(/\.[^/.]+$/, ""); // remove extension
      name = name.replace(/[_-]/g, " ");
      return {
        filename: f.name,
        studentName: name,
        status: 'pending'
      } as StudentRecord;
    });
    setStudentRecords(records);
    setStep(4);
    
    // Lancer la boucle asynchrone (pas await pour ne pas bloquer l'UI)
    processBatchLoop(studentFiles, records);
  };

  // -------------------------------------------------------------
  // Etape 4 : Traitement & Export
  // -------------------------------------------------------------
  const processBatchLoop = async (files: File[], initialRecords: StudentRecord[]) => {
    setIsProcessingBatch(true);
    let currentRecords = [...initialRecords];
    
    for (let i = 0; i < files.length; i++) {
      currentRecords[i].status = 'processing';
      setStudentRecords([...currentRecords]); // Trigger render

      try {
        const formData = new FormData();
        formData.append('studentFile', files[i]);
        formData.append('courseText', courseText);
        formData.append('examText', examText);
        formData.append('bareme', JSON.stringify(questions));

        const res = await fetch('/api/grade-batch-single', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur de correction IA");
        
        currentRecords[i].status = 'done';
        currentRecords[i].result = data.result;
      } catch (err: any) {
        currentRecords[i].status = 'error';
        currentRecords[i].errorStr = err.message;
      }
      
      setProgress(Math.round(((i + 1) / files.length) * 100));
      setStudentRecords([...currentRecords]);
    }
    setIsProcessingBatch(false);
  };

  const exportCSV = () => {
    // Header csv: Nom, Q1, Q2, ..., Total
    const header = ['Étudiant', ...questions.map(q => q.id), 'Total'].join(';') + '\\n';
    
    const rows = studentRecords.map(record => {
      if (record.status !== 'done' || !record.result) return `${record.studentName};Erreur;0`;
      
      const qScores = questions.map(q => {
        const match = record.result!.questions.find(rq => rq.id === q.id);
        return match ? match.score : 0;
      });
      return `${record.studentName};${qScores.join(';')};${record.result.totalScore}`;
    }).join('\\n');

    const csvContent = "\\uFEFF" + header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Resultats_Correction_${new Date().toLocaleDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPrint = () => {
    window.print();
  };

  // -------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------
  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 relative z-10 pt-10 pb-20">
      
      {/* En-tête */}
      <div className="text-center mb-10 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 shadow-sm mb-6">
             <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
             <span className="text-xs font-bold text-blue-700 tracking-widest uppercase">Corrigeur Automatique Académique</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
            Traitement <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Massif</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
             Suivez les 3 étapes rapides pour configurer l'évaluation et obtenir des bordereaux de notes parfaits.
          </p>
      </div>

      {error && (
        <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            {error}
        </div>
      )}

      {/* STEP 1: Référentiel */}
      {step === 1 && (
        <div className="glass-panel p-8 md:p-12 rounded-3xl border-t-4 border-t-amber-400 bg-white/80 max-w-3xl mx-auto shadow-sm">
            <h3 className="text-2xl font-black text-slate-800 mb-6 text-center">Étape 1 : Le Référentiel</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {/* Cours */}
                <div className="border border-slate-200 bg-slate-50 rounded-xl p-5 flex flex-col relative group">
                    <p className="font-bold text-slate-700 mb-4">1. Support de Cours</p>
                    <input type="file" ref={courseInputRef} onChange={e => setCourseFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,.doc,.docx,.txt" />
                    <button onClick={() => courseInputRef.current?.click()} className="w-full py-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50 text-slate-500 transition-colors text-sm font-bold flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        {courseFile ? courseFile.name : "Importer le Cours (PDF)"}
                    </button>
                </div>
                
                {/* Epreuve */}
                <div className="border border-slate-200 bg-slate-50 rounded-xl p-5 flex flex-col relative group">
                    <p className="font-bold text-slate-700 mb-4">2. Épreuve d'Évaluation</p>
                    <input type="file" ref={examInputRef} onChange={e => setExamFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,.doc,.docx,.txt" />
                    <button onClick={() => examInputRef.current?.click()} className="w-full py-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50 text-slate-500 transition-colors text-sm font-bold flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        {examFile ? examFile.name : "Importer l'Épreuve (PDF)"}
                    </button>
                </div>
            </div>

            <button 
                onClick={validateStep1}
                disabled={isExtracting}
                className="w-full py-4 rounded-xl bg-slate-800 text-white font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
                {isExtracting ? "Extraction du texte en cours..." : "Continuer vers le Barème"}
            </button>
        </div>
      )}

      {/* STEP 2: Barème */}
      {step === 2 && (
        <div className="glass-panel p-8 md:p-12 rounded-3xl border-t-4 border-t-blue-500 bg-white/80 max-w-4xl mx-auto shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-800">Étape 2 : Créer le Barème</h3>
                <span className="bg-slate-100 px-4 py-2 rounded-lg font-bold text-slate-600">Total : <span className="text-blue-600 text-lg">{totalBareme}</span> pts</span>
            </div>

            <div className="space-y-4 mb-8">
                {questions.map((q, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                        <div className="w-full sm:w-24">
                            <label className="text-xs font-bold text-slate-500 uppercase">Question ID</label>
                            <input type="text" value={q.id} onChange={e => updateQuestion(idx, 'id', e.target.value)} className="w-full mt-1 border px-3 py-2 rounded-md font-bold text-slate-700 outline-blue-500" placeholder="Ex: Q1" />
                        </div>
                        <div className="w-full sm:w-24">
                            <label className="text-xs font-bold text-slate-500 uppercase">Points</label>
                            <input type="number" step="0.5" value={q.points} onChange={e => updateQuestion(idx, 'points', parseFloat(e.target.value))} className="w-full mt-1 border px-3 py-2 rounded-md font-bold text-slate-700 outline-blue-500" />
                        </div>
                        <div className="w-full flex-grow">
                            <label className="text-xs font-bold text-slate-500 uppercase">Attentes / Critères (pour l'IA)</label>
                            <input type="text" value={q.description} onChange={e => updateQuestion(idx, 'description', e.target.value)} className="w-full mt-1 border px-3 py-2 rounded-md text-sm text-slate-600 outline-blue-500" placeholder="Ex: Doit mentionner la notion de gravitation universelle." />
                        </div>
                        {questions.length > 1 && (
                            <button onClick={() => removeQuestion(idx)} className="absolute -top-3 -right-3 bg-red-100 hover:bg-red-500 hover:text-white text-red-500 p-2 rounded-full transition-colors shadow-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <button onClick={addQuestion} className="mb-10 text-sm font-bold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg> Ajouter une question
            </button>

            <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">Retour</button>
                <button onClick={validateStep2} className="flex-1 py-4 rounded-xl bg-slate-800 text-white font-bold hover:bg-indigo-600 transition-colors">Continuer (Imports)</button>
            </div>
        </div>
      )}

      {/* STEP 3: Upload Masse Etudiants */}
      {step === 3 && (
        <div className="glass-panel p-8 md:p-12 rounded-3xl border-t-4 border-t-emerald-500 bg-white/80 max-w-3xl mx-auto shadow-sm">
            <h3 className="text-2xl font-black text-slate-800 mb-2 text-center">Étape 3 : Fichiers Étudiants</h3>
            <p className="text-center text-slate-500 text-sm mb-8 font-medium">
               Importez toutes les copies en masse. Les fichiers doivent idéalement se nommer <code className="bg-slate-100 px-2 py-0.5 rounded text-blue-600">Nom_Prenom.pdf</code>.
            </p>

            <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-2xl p-8 flex flex-col items-center justify-center mb-8">
                <input type="file" multiple ref={studentsInputRef} onChange={handleStudentFilesSelect} className="hidden" accept=".pdf,.doc,.docx,.txt" />
                <button 
                  onClick={() => studentsInputRef.current?.click()}
                  className="bg-white border border-emerald-200 text-emerald-600 px-6 py-3 rounded-xl font-bold shadow-sm hover:scale-105 transition-transform flex items-center gap-2"
                >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                   Sélectionner les Copies
                </button>
                {studentFiles.length > 0 && (
                    <p className="mt-4 font-bold text-slate-700 bg-white px-4 py-1.5 rounded-full text-sm border shadow-sm">
                        {studentFiles.length} fichier(s) prêt(s)
                    </p>
                )}
            </div>

            <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="w-1/3 py-4 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">Retour</button>
                <button onClick={startBatchProcessing} disabled={studentFiles.length === 0} className="w-2/3 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                     Lancer l'IA sur {studentFiles.length} copies
                </button>
            </div>
        </div>
      )}

      {/* STEP 4: Résultats & Export */}
      {step === 4 && (
        <div className="bg-white p-6 md:p-10 rounded-3xl border border-slate-200 shadow-xl print-container">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 px-2">
                <div>
                   <h3 className="text-xl md:text-2xl font-black text-slate-800 print-title">Bordereau de Notes IA</h3>
                   <p className="text-slate-500 text-sm font-medium mt-1">Évaluation Automatique • Total Barème: {totalBareme} pts</p>
                </div>
                
                {/* Boutons d'export */}
                <div className="flex gap-3 no-print">
                   <button onClick={exportCSV} disabled={isProcessingBatch} className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 hover:bg-emerald-500 hover:text-white rounded-lg text-sm font-bold flex flex-center gap-2 transition-colors disabled:opacity-50">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> Exporter Excel (CSV)
                   </button>
                   <button onClick={exportPrint} disabled={isProcessingBatch} className="bg-slate-100 text-slate-600 border border-slate-200 px-4 py-2 hover:bg-slate-800 hover:text-white rounded-lg text-sm font-bold flex flex-center gap-2 transition-colors disabled:opacity-50">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> PDF / Imprimer
                   </button>
                </div>
            </div>

            {isProcessingBatch && (
                <div className="mb-8 p-6 bg-slate-50 border border-blue-200 rounded-2xl no-print">
                    <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                        <span>Évaluation par IA en cours...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left font-medium text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="p-4 rounded-tl-xl">Étudiant</th>
                            {questions.map(q => (
                               <th key={q.id} className="p-4 text-center">{q.id} <span className="opacity-50 text-[10px]">/{q.points}</span></th>
                            ))}
                            <th className="p-4 text-center text-blue-600 rounded-tr-xl">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {studentRecords.map((rec, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-slate-800">{rec.studentName}</div>
                                    <div className="text-[10px] text-slate-400 max-w-[200px] truncate">{rec.filename}</div>
                                </td>
                                
                                {/* Colonnes Questions */}
                                {questions.map(q => {
                                    if (rec.status === 'pending') return <td key={q.id} className="p-4 text-center text-slate-300">-</td>;
                                    if (rec.status === 'processing') return <td key={q.id} className="p-4 text-center"><span className="animate-pulse w-4 h-4 bg-slate-200 inline-block rounded-full"></span></td>;
                                    if (rec.status === 'error') return <td key={q.id} className="p-4 text-center text-red-400">Err</td>;
                                    
                                    const score = rec.result?.questions.find(rq => rq.id === q.id)?.score || 0;
                                    return <td key={q.id} className="p-4 text-center font-bold">{score}</td>;
                                })}

                                {/* Colonne Totale */}
                                <td className="p-4 text-center">
                                    {rec.status === 'pending' && <span className="text-slate-300">-</span>}
                                    {rec.status === 'processing' && <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></span>}
                                    {rec.status === 'error' && <span className="text-red-500 text-xs font-bold" title={rec.errorStr}>ÉCHEC</span>}
                                    {rec.status === 'done' && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-black ${
                                            (rec.result!.totalScore >= totalBareme / 2) 
                                                ? 'bg-emerald-100 text-emerald-700' 
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {rec.result!.totalScore}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <style jsx>{`
               @media print {
                  .no-print { display: none !important; }
                  .print-container { 
                      border: none; box-shadow: none; padding: 0; margin: 0;
                  }
                  .print-title { font-size: 24pt !important; text-align: center; margin-bottom: 20px; }
               }
            `}</style>
        </div>
      )}
    </div>
  );
}
