"use client";

import { useEffect, useState } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <html lang="fr">
      <head>
        <title>DLearning INE | Suite Média Elite</title>
        <meta name="description" content="Propriété exclusive de DLearning INE. Outils de traitement média IA de haute précision." />
        <link rel="icon" href="/ced-ine-logo.png" />
      </head>
      <body>
        {/* Splash Screen */}
        <div className={`splash ${!loading ? 'hidden' : ''}`}>
          <img src="/ced-ine-logo.png" alt="INE Logo" className="splash-logo" />
          <div className="splash-text">DLearning INE</div>
        </div>

        {/* Main App */}
        {!loading && (
          <div className="fade-in">
            {/* Navbar */}
            <nav className="navbar">
              <div className="navbar-brand">
                <img src="/ced-ine-logo.png" alt="Logo" className="navbar-logo" />
                <div className="navbar-title">DLEARNING <span>INE</span></div>
              </div>

              <ul className="navbar-links">
                <li><a href="/">Accueil</a></li>
                <li><a href="/image-remover">Images</a></li>
                <li><a href="/video-remover">Vidéos</a></li>
                <li><a href="/voice-cloning">Voix</a></li>
              </ul>

              <div className="navbar-status">
                <div className="status-dot"></div>
                <span className="status-text">Service Actif</span>
              </div>
            </nav>

            {/* Main Content */}
            <main className="main-content">
              {children}
            </main>

            {/* Footer */}
            <footer className="footer">
              © 2025 DLearning INE · Tous droits réservés · Propriété Privée
            </footer>
          </div>
        )}
      </body>
    </html>
  );
}
