'use client';

import { useState, useRef } from 'react';

interface Sentence {
  text: string;
  isAi: boolean;
}

interface AnalysisResult {
  aiProbability: number;
  verdict: string;
  feedback: string;
  sentences: Sentence[];
}

export default function AIDetectorPage() {
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gère l'extraction locale du ficher via l'API (pour word/pdf)
  const extractTextFromFile = async (f: File) => {
    const formData = new FormData();
    formData.append('file', f);
    const res = await fetch('/api/extract-text', { method: 'POST', body: formData });
    if (!res.ok) throw new Error("Impossible d'extraire le texte du fichier.");
    const data = await res.json();
    return data.text;
  };

  const handleAnalyze = async () => {
    let textToAnalyze = inputText;

    setError(null);
    setResult(null);

    // Si on a un fichier mais que le champ texte est vide, on l'extrait
    if (file && textToAnalyze.trim() === '') {
        setIsAnalyzing(true);
        try {
            textToAnalyze = await extractTextFromFile(file);
            setInputText(textToAnalyze); // Met à jour la box
        } catch(e: any) {
            setError(e.message);
            setIsAnalyzing(false);
            return;
        }
    }

    if (textToAnalyze.trim().length < 50) {
        setError("Le texte est trop court pour une analyse fiable (minimum 50 caractères).");
        return;
    }

    setIsAnalyzing(true);

    try {
        const formData = new FormData();
        formData.append('text', textToAnalyze);

        const res = await fetch('/api/detect-ai', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur du moteur d'analyse.");

        setResult(data.result);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsAnalyzing(false);
        setFile(null); // On libère le fichier après analyse
    }
  };

  // Couleurs dynamiques selon la probabilité
  const getProbabilityColor = (prob: number) => {
      if (prob >= 80) return 'text-red-500 stroke-red-500';
      if (prob >= 50) return 'text-amber-500 stroke-amber-500';
      return 'text-emerald-500 stroke-emerald-500';
  };

  const getVerdictBg = (prob: number) => {
      if (prob >= 80) return 'bg-red-50 border-red-200 text-red-700';
      if (prob >= 50) return 'bg-amber-50 border-amber-200 text-amber-700';
      return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 relative z-10 pt-10 pb-20">
      
      {/* En-tête */}
      <div className="text-center mb-12 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 shadow-sm mb-6">
             <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
             <span className="text-xs font-bold text-red-700 tracking-widest uppercase">Scanner Stylométrique LLaMa 70B</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
            Détecteur <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">IA & Plagiat</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
             Analysez la perplexité d'un texte pour révéler s'il a été généré par ChatGPT, Claude ou un Humain.
          </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Colonne d'entrée (Gauche) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
              
              <div className="glass-panel bg-white p-6 rounded-3xl border-t-4 border-t-red-500 shadow-sm flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-black text-slate-800 text-lg">Texte à analyser</h3>
                      
                      {/* Upload button caché derrière fileInputRef */}
                      <input type="file" ref={fileInputRef} onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,.doc,.docx,.txt" />
                      
                      <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                          Extraire depuis un fichier
                      </button>
                  </div>

                  {file && (
                      <div className="mb-4 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"></path></svg>
                             <span className="text-sm font-bold text-blue-800">{file.name}</span>
                          </div>
                          <button onClick={() => setFile(null)} className="text-blue-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                      </div>
                  )}

                  <textarea 
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      placeholder={file ? "Le texte du fichier apparaîtra ici après le clic sur Analyser..." : "Collez le texte de l'étudiant ou l'article ici (minimum 50 caractères)..."}
                      className="w-full flex-grow min-h-[300px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 resize-none transition-all"
                  ></textarea>
                  
                  {error && (
                      <div className="mt-4 text-sm font-bold text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
                          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                          {error}
                      </div>
                  )}

                  <button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || (!file && inputText.trim() === '')}
                      className="w-full mt-6 bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md relative overflow-hidden group"
                  >
                      {!isAnalyzing && <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>}
                      
                      {isAnalyzing ? (
                          <><svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Analyse Médico-légale en cours...</>
                      ) : (
                          <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> Lancer le Détecteur</>
                      )}
                  </button>
              </div>
          </div>

          {/* Colonne de Résultat (Droite) */}
          <div className="lg:col-span-5">
              {result ? (
                  <div className="flex flex-col gap-6 h-full">
                      {/* Carte Score */}
                      <div className="bg-white p-8 rounded-3xl border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
                          <div className={`absolute top-0 w-full h-2 ${getVerdictBg(result.aiProbability).split(' ')[0]}`}></div>
                          
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 mt-2">Probabilité Robotique</p>
                          
                          {/* Gauge CSS */}
                          <div className="relative flex items-center justify-center mb-6">
                             <svg className={`w-40 h-40 transform -rotate-90 ${getProbabilityColor(result.aiProbability).split(' ')[0]}`} viewBox="0 0 36 36">
                                <path className="stroke-slate-100" strokeWidth="3" fill="none" strokeLinecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path strokeDasharray={`${result.aiProbability}, 100`} strokeWidth="3" strokeLinecap="round" className={getProbabilityColor(result.aiProbability).split(' ')[1]} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                             </svg>
                             <div className="absolute flex flex-col items-center justify-center">
                                <span className={`text-5xl font-black ${getProbabilityColor(result.aiProbability).split(' ')[0]}`}>{result.aiProbability}%</span>
                             </div>
                          </div>

                          <div className={`px-4 py-2 rounded-full font-bold text-sm ${getVerdictBg(result.aiProbability)}`}>
                             Verdict : {result.verdict}
                          </div>
                      </div>

                      {/* Carte Analyse Stylométrique */}
                      <div className="bg-slate-800 text-white p-8 rounded-3xl shadow-xl flex-grow flex flex-col">
                          <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                             Rapport Stylométrique
                          </h4>
                          <p className="text-slate-300 text-sm leading-relaxed mb-8">{result.feedback}</p>
                          
                          <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 mt-auto">Traceurs IA Révélés :</h4>
                          <div className="bg-slate-900/50 p-4 rounded-xl space-y-3 h-[200px] overflow-y-auto border border-slate-700">
                             {result.sentences.map((sent, idx) => (
                                 <div key={idx} className="flex items-start gap-3">
                                     {sent.isAi ? (
                                         <span className="shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1.5 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
                                     ) : (
                                         <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500 mt-1.5"></span>
                                     )}
                                     <p className={`text-xs font-medium ${sent.isAi ? 'text-red-200' : 'text-emerald-200/60'}`}>
                                         "{sent.text}"
                                     </p>
                                 </div>
                             ))}
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                      </div>
                      <h4 className="text-lg font-bold text-slate-600 mb-2">Aucune donnée</h4>
                      <p className="text-slate-400 text-sm max-w-xs">Lancez le détecteur sur un texte ou document pour générer le rapport analytique de Tricherie IA.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}
