import Link from "next/link";

export default function Home() {
  return (
    <div className="container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-badge">
          <span className="hero-badge-dot"></span>
          Institut National de l'Eau
        </div>

        <h1 className="hero-title">
          Outils <span className="blue">Média</span><br />
          Elite <span className="green">INE</span>
        </h1>

        <p className="hero-description">
          Découvrez la puissance de l'IA au service de DLearning. Une suite exclusive d'outils
          pour le traitement d'images, de vidéos et la synthèse vocale de précision.
        </p>

        <div className="hero-buttons">
          <button className="btn btn-primary">Accéder à la Suite</button>
          <button className="btn btn-secondary">DOCUMENTATION</button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-grid">
        <Link href="/image-remover" className="feature-card">
          <div className="feature-icon">🖼️</div>
          <h3 className="feature-title">Remover Photo Pro</h3>
          <p className="feature-description">
            Suppression chirurgicale des filigranes et logos sur tout type d'image avec une précision IA inégalée.
          </p>
          <div className="feature-link">
            Lancer l'outil <span>→</span>
          </div>
        </Link>

        <Link href="/video-remover" className="feature-card">
          <div className="feature-icon">🎬</div>
          <h3 className="feature-title">Studio Nettoyeur Vidéo</h3>
          <p className="feature-description">
            Algorithmes d'inpainting temporel pour des vidéos impeccables et sans filigranes.
          </p>
          <div className="feature-link">
            Lancer l'outil <span>→</span>
          </div>
        </Link>

        <Link href="/voice-cloning" className="feature-card">
          <div className="feature-icon">🎙️</div>
          <h3 className="feature-title">Symphonie Vocale</h3>
          <p className="feature-description">
            Clonage vocal haute fidélité avec technologie neuronale avancée et synthèse instantanée.
          </p>
          <div className="feature-link">
            Lancer l'outil <span>→</span>
          </div>
        </Link>

        <Link href="/document-summary" className="feature-card">
          <div className="feature-icon">📄</div>
          <h3 className="feature-title">Résumé Intelligent</h3>
          <p className="feature-description">
            Analyse et résumé automatique de documents par chapitre et section grâce à l'IA.
          </p>
          <div className="feature-link">
            Lancer l'outil <span>→</span>
          </div>
        </Link>

        <Link href="/quiz-generator" className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3 className="feature-title">Générateur de Quiz</h3>
          <p className="feature-description">
            Créez automatiquement des quiz interactifs à partir de vos documents pour tester vos connaissances.
          </p>
          <div className="feature-link">
            Lancer l'outil <span>→</span>
          </div>
        </Link>

        <Link href="/tp-generator" className="feature-card">
          <div className="feature-icon">📋</div>
          <h3 className="feature-title">Générateur de TP</h3>
          <p className="feature-description">
            Générez automatiquement des fiches de Travaux Pratiques structurées à partir de vos cours.
          </p>
          <div className="feature-link">
            Lancer l'outil <span>→</span>
          </div>
        </Link>

        <Link href="/td-generator" className="feature-card">
          <div className="feature-icon">📝</div>
          <h3 className="feature-title">Générateur de TD</h3>
          <p className="feature-description">
            Créez des Travaux Dirigés avec exercices et espaces de réponse à partir de vos documents.
          </p>
          <div className="feature-link">
            Lancer l'outil <span>→</span>
          </div>
        </Link>

        <Link href="/image-generator" className="feature-card">
          <div className="feature-icon">🎨</div>
          <h3 className="feature-title">Générateur d'Images</h3>
          <p className="feature-description">
            Créez des illustrations africaines en lien avec le contenu de vos documents.
          </p>
          <div className="feature-link">
            Lancer l'outil <span>→</span>
          </div>
        </Link>

        <a href="https://gamma.app" target="_blank" rel="noopener noreferrer" className="feature-card external-card">
          <div className="feature-icon">📊</div>
          <h3 className="feature-title">Gamma - PowerPoint IA</h3>
          <p className="feature-description">
            Générez des présentations PowerPoint professionnelles automatiquement avec l'IA.
          </p>
          <div className="feature-link">
            Ouvrir Gamma <span>↗</span>
          </div>
        </a>

        <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" className="feature-card external-card">
          <div className="feature-icon">🎥</div>
          <h3 className="feature-title">NotebookLM - Vidéos IA</h3>
          <p className="feature-description">
            Créez des vidéos explicatives et podcasts audio à partir de vos documents avec Google AI.
          </p>
          <div className="feature-link">
            Ouvrir NotebookLM <span>↗</span>
          </div>
        </a>
      </section>
    </div>
  );
}
