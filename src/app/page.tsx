import Link from "next/link";

export default function Home() {
  return (
    <div className="container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-badge">
          <span className="hero-badge-dot"></span>
          Institut National de l'Entreprenariat
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
      </section>
    </div>
  );
}
