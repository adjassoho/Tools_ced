'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function RedirectPage() {
    const [countdown, setCountdown] = useState(10);
    const newUrl = 'https://lightgray-mallard-274619.hostingersite.com/';

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    window.location.href = newUrl;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #1e3a5f 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '50px 40px',
                maxWidth: '500px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
            }}>
                {/* Logo */}
                <div style={{ marginBottom: '30px' }}>
                    <Image 
                        src="/ced-ine-logo.png" 
                        alt="Cedine Tools" 
                        width={120} 
                        height={120}
                        style={{ borderRadius: '15px' }}
                    />
                </div>

                {/* Titre */}
                <h1 style={{
                    fontSize: '28px',
                    color: '#1e3a5f',
                    marginBottom: '15px',
                    fontWeight: '700'
                }}>
                    🚀 Cedine Tools a déménagé !
                </h1>

                {/* Message */}
                <p style={{
                    fontSize: '16px',
                    color: '#64748b',
                    marginBottom: '25px',
                    lineHeight: '1.6'
                }}>
                    Notre plateforme est maintenant disponible à une nouvelle adresse. 
                    Vous serez redirigé automatiquement.
                </p>

                {/* Nouvelle URL */}
                <div style={{
                    background: '#f0f9ff',
                    border: '2px solid #0ea5e9',
                    borderRadius: '12px',
                    padding: '15px 20px',
                    marginBottom: '25px'
                }}>
                    <p style={{ 
                        fontSize: '14px', 
                        color: '#0369a1',
                        marginBottom: '8px',
                        fontWeight: '600'
                    }}>
                        Nouvelle adresse :
                    </p>
                    <a 
                        href={newUrl}
                        style={{
                            fontSize: '15px',
                            color: '#0284c7',
                            textDecoration: 'none',
                            fontWeight: '500',
                            wordBreak: 'break-all'
                        }}
                    >
                        {newUrl}
                    </a>
                </div>

                {/* Countdown */}
                <div style={{
                    background: '#fef3c7',
                    borderRadius: '10px',
                    padding: '15px',
                    marginBottom: '25px'
                }}>
                    <p style={{ 
                        fontSize: '15px', 
                        color: '#92400e',
                        margin: 0
                    }}>
                        ⏱️ Redirection automatique dans <strong>{countdown}</strong> seconde{countdown > 1 ? 's' : ''}...
                    </p>
                </div>

                {/* Bouton */}
                <a 
                    href={newUrl}
                    style={{
                        display: 'inline-block',
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                        color: 'white',
                        padding: '15px 40px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontSize: '16px',
                        fontWeight: '600',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.5)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(14, 165, 233, 0.4)';
                    }}
                >
                    Accéder au nouveau site →
                </a>

                {/* Footer */}
                <p style={{
                    marginTop: '30px',
                    fontSize: '13px',
                    color: '#94a3b8'
                }}>
                    © 2025 Cedine Tools - Tous droits réservés
                </p>
            </div>
        </div>
    );
}
