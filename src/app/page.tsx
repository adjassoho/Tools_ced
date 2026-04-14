import Link from "next/link";

export default function Home() {
  const tools = [
    {
      id: "remover-photo",
      href: "/image-remover",
      title: "Remover Photo Pro",
      desc: "Suppression chirurgicale des filigranes et logos sur tout type d'image.",
      iconPath: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
      category: "Image",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.3)]",
      borderColor: "border-t-[3px] border-t-blue-500",
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
      badgeColor: "bg-blue-100/50 text-blue-600"
    },
    {
      id: "studio-video",
      href: "/video-remover",
      title: "Studio Nettoyeur Vidéo",
      desc: "Algorithmes d'inpainting temporel pour des vidéos impeccables.",
      iconPath: "M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z",
      category: "Vidéo",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(168,85,247,0.3)]",
      borderColor: "border-t-[3px] border-t-purple-500",
      iconColor: "text-purple-500",
      iconBg: "bg-purple-50",
      badgeColor: "bg-purple-100/50 text-purple-600"
    },
    {
      id: "symphonie-vocale",
      href: "/voice-cloning",
      title: "Symphonie Vocale",
      desc: "Clonage vocal haute fidélité avec technologie neuronale avancée.",
      iconPath: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
      category: "Audio",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(236,72,153,0.3)]",
      borderColor: "border-t-[3px] border-t-pink-500",
      iconColor: "text-pink-500",
      iconBg: "bg-pink-50",
      badgeColor: "bg-pink-100/50 text-pink-600"
    },
    {
      id: "lip-sync",
      href: "/lip-sync",
      title: "Lip Sync Avatar",
      desc: "Transformez une photo en vidéo parlante avec synchronisation des lèvres.",
      iconPath: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      category: "Vidéo",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(249,115,22,0.3)]",
      borderColor: "border-t-[3px] border-t-orange-500",
      iconColor: "text-orange-500",
      iconBg: "bg-orange-50",
      badgeColor: "bg-orange-100/50 text-orange-600"
    },
    {
      id: "resume-intelligent",
      href: "/document-summary",
      title: "Résumé Intelligent",
      desc: "Analyse et résumé automatique de documents par chapitre et section.",
      iconPath: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      category: "Document",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(20,184,166,0.3)]",
      borderColor: "border-t-[3px] border-t-teal-500",
      iconColor: "text-teal-500",
      iconBg: "bg-teal-50",
      badgeColor: "bg-teal-100/50 text-teal-600"
    },
    {
      id: "generateur-quiz",
      href: "/quiz-generator",
      title: "Générateur de Quiz",
      desc: "Créez automatiquement des quiz interactifs à partir de vos documents.",
      iconPath: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      category: "Éducation",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(239,68,68,0.3)]",
      borderColor: "border-t-[3px] border-t-red-500",
      iconColor: "text-red-500",
      iconBg: "bg-red-50",
      badgeColor: "bg-red-100/50 text-red-600"
    },
    {
      id: "generateur-tp",
      href: "/tp-generator",
      title: "Générateur de TP",
      desc: "Générez des fiches de Travaux Pratiques structurées automatiquement.",
      iconPath: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
      category: "Éducation",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(6,182,212,0.3)]",
      borderColor: "border-t-[3px] border-t-cyan-500",
      iconColor: "text-cyan-500",
      iconBg: "bg-cyan-50",
      badgeColor: "bg-cyan-100/50 text-cyan-600"
    },
    {
      id: "generateur-td",
      href: "/td-generator",
      title: "Générateur de TD",
      desc: "Créez des Travaux Dirigés avec exercices et espaces de réponse.",
      iconPath: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
      category: "Éducation",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(34,197,94,0.3)]",
      borderColor: "border-t-[3px] border-t-green-500",
      iconColor: "text-green-500",
      iconBg: "bg-green-50",
      badgeColor: "bg-green-100/50 text-green-600"
    },
    {
      id: "generateur-images",
      href: "/image-generator",
      title: "Générateur d'Images",
      desc: "Créez des illustrations africaines en lien avec vos contenus.",
      iconPath: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
      category: "Image",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(249,115,22,0.3)]",
      borderColor: "border-t-[3px] border-t-orange-500",
      iconColor: "text-orange-500",
      iconBg: "bg-orange-50",
      badgeColor: "bg-orange-100/50 text-orange-600"
    },
    {
      id: "generateur-ppt",
      href: "/ppt-generator",
      title: "Générateur PowerPoint",
      desc: "Créez des présentations professionnelles automatiquement.",
      iconPath: "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z",
      category: "Document",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.3)]",
      borderColor: "border-t-[3px] border-t-blue-600",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      badgeColor: "bg-blue-100/50 text-blue-600"
    },
    {
      id: "generateur-ppt-v2",
      href: "#",
      title: "PowerPoint V2 (HTML)",
      desc: "Nouvelle version avec preview temps réel et design HTML/CSS avancé.",
      iconPath: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
      category: "Nouveau",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(245,158,11,0.3)]",
      borderColor: "border-t-[3px] border-t-amber-500",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50",
      badgeColor: "bg-amber-100/50 text-amber-600"
    },
    {
      id: "captions-video",
      href: "/video-captions",
      title: "Captions Vidéo",
      desc: "Transcription + gravure automatique de sous-titres dans la vidéo. Prévisualisez et téléchargez.",
      iconPath: "M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z",
      category: "Vidéo",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(244,63,94,0.3)]",
      borderColor: "border-t-[3px] border-t-rose-500",
      iconColor: "text-rose-500",
      iconBg: "bg-rose-50",
      badgeColor: "bg-rose-100/50 text-rose-600"
    },
    {
      id: "transcripteur-video",
      href: "/video-transcription",
      title: "Transcripteur Vidéo",
      desc: "Transcription automatique et génération de sous-titres SRT/VTT via Whisper AI.",
      iconPath: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
      category: "Vidéo",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(139,92,246,0.3)]",
      borderColor: "border-t-[3px] border-t-violet-500",
      iconColor: "text-violet-500",
      iconBg: "bg-violet-50",
      badgeColor: "bg-violet-100/50 text-violet-600"
    },
    {
      id: "correcteur-copies",
      href: "/copy-analyzer",
      title: "Correcteur de Copies",
      desc: "Correction automatique des copies d'étudiants avec IA et barème personnalisé.",
      iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      category: "Éducation",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(16,185,129,0.3)]",
      borderColor: "border-t-[3px] border-t-emerald-500",
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50",
      badgeColor: "bg-emerald-100/50 text-emerald-600"
    },
    {
      id: "ai-detector",
      href: "/ai-detector",
      title: "Détecteur d'IA & Plagiat",
      desc: "Analyse stylistique poussée (70B) pour détecter les textes générés par ChatGPT ou Claude.",
      iconPath: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7",
      category: "Éducation",
      glowColor: "group-hover:shadow-[0_10px_40px_-10px_rgba(239,68,68,0.3)]",
      borderColor: "border-t-[3px] border-t-red-500",
      iconColor: "text-red-500",
      iconBg: "bg-red-50",
      badgeColor: "bg-red-100/50 text-red-600"
    }
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6">
      
      {/* Hero Section Premium Light */}
      <div className="flex flex-col items-center text-center mt-12 mb-20 relative z-10">
        
        {/* Subtle glowing badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-white shadow-sm mb-8">
           <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse relative"></span>
           <span className="text-xs font-bold text-slate-600 tracking-widest uppercase">Institut National de l'Eau - UAC</span>
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-slate-800">
          Outils <span className="text-gradient gradient-brand">IA</span> pour l'Éducation
        </h1>
        
        <p className="text-slate-500 text-lg md:text-xl max-w-3xl font-medium leading-relaxed mb-10">
          Une suite exclusive d'outils intelligents pour le traitement d'images, de vidéos, la synthèse vocale et la création de contenus pédagogiques.
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-slate-600">
           <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
             <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/></svg>
             13 outils disponibles
           </span>
           <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
             <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
             Contexte africain
           </span>
           <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
             <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
             Usage interne
           </span>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8">
         <span className="text-2xl">🚀</span>
         <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Nos Outils</h2>
      </div>

      {/* Grille des Outils Light/Glass */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24 relative z-10">
        {tools.map((tool) => (
          <Link 
            href={tool.href} 
            key={tool.id}
            className={`glass-panel glass-card-hover rounded-2xl p-6 group flex flex-col h-full bg-white relative overflow-hidden shadow-sm hover:shadow-xl ${tool.glowColor} ${tool.borderColor}`}
          >
            <div className="flex items-start justify-between mb-5 relative z-10">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tool.iconBg} border border-white/50`}>
                <svg className={`w-6 h-6 ${tool.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tool.iconPath} />
                </svg>
              </div>
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider ${tool.badgeColor}`}>
                {tool.category}
              </span>
            </div>
            
            <h3 className="text-lg font-extrabold text-slate-800 mb-2 relative z-10 tracking-tight">{tool.title}</h3>
            <p className="text-sm text-slate-500 mb-6 flex-grow leading-relaxed font-medium relative z-10">
              {tool.desc}
            </p>
            
            <div className={`mt-auto flex items-center text-xs font-bold uppercase tracking-widest ${tool.iconColor}`}>
              Ouvrir
              <svg className="w-4 h-4 ml-1.5 transform group-hover:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Outils Externes */}
      <div className="flex items-center gap-3 mb-6">
          <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Outils Externes Recommandés</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10">
          <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" className="glass-panel bg-white rounded-2xl p-6 shadow-sm hover:-translate-y-1 transition-transform flex items-center gap-4 group">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-slate-200 transition-colors">🎥</div>
            <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">NotebookLM <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg></h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Créez des vidéos explicatives avec Google AI</p>
            </div>
          </a>
          <a href="https://gamma.app" target="_blank" rel="noopener noreferrer" className="glass-panel bg-white rounded-2xl p-6 shadow-sm hover:-translate-y-1 transition-transform flex items-center gap-4 group">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-slate-200 transition-colors">✨</div>
            <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">Gamma.app <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg></h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Créez des présentations visuelles avec l'IA</p>
            </div>
          </a>
          <a href="https://napkin.ai" target="_blank" rel="noopener noreferrer" className="glass-panel bg-white rounded-2xl p-6 shadow-sm hover:-translate-y-1 transition-transform flex items-center gap-4 group">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-slate-200 transition-colors">🧹</div>
            <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">napkin.ai <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg></h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Créez des graphiques visuelles avec l'IA</p>
            </div>
          </a>
          <a href="https://docs.google.com/videos" target="_blank" rel="noopener noreferrer" className="glass-panel bg-white rounded-2xl p-6 shadow-sm hover:-translate-y-1 transition-transform flex items-center gap-4 group border-t-2 border-t-violet-400">
            <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center text-2xl group-hover:bg-violet-100 transition-colors">🎦</div>
            <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">Google Docs Vidéos <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg></h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Captions et transcriptions de vidéos par Google</p>
                <span className="mt-1 inline-block text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-md uppercase tracking-wider">Complémentaire à notre outil</span>
            </div>
          </a>
      </div>

    </div>
  );
}
