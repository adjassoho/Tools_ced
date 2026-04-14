'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erreur de connexion');
            }

            // Redirection silencieuse vers la page vérifier, avec l'email en query (encodé)
            router.push(`/verify-otp?email=${encodeURIComponent(email)}`);

        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative bg-slate-900 bg-[url('/bg-simple-water.png')] bg-cover bg-center">
            
            {/* Overlay très léger pour s'assurer que la carte ressort bien (optionnel) */}
            <div className="absolute inset-0 bg-blue-900/10 pointer-events-none"></div>

            <div className="w-full max-w-[400px] relative z-10 px-5">
                
                <div className="bg-white/95 backdrop-blur-[2px] p-8 sm:p-10 rounded-3xl shadow-2xl shadow-blue-900/30">
                    
                    <div className="text-center mb-6">
                        <div className="flex justify-center mb-3">
                            <img src="/ced-ine-logo.png" alt="Cedine Logo" className="h-12 w-auto object-contain" />
                        </div>
                        <h1 className="text-[22px] font-bold text-[#1e3a5f] tracking-tight">Cedine Tools</h1>
                        <p className="text-[11px] text-slate-500 mt-1">INE - Université d'Abomey-Calavi</p>
                    </div>

                    <h2 className="text-base font-bold text-center text-slate-800 mb-6">Connexion</h2>

                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold border border-red-100 flex items-center justify-center">
                                 {error}
                            </div>
                        )}

                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                                <span>📧</span> Email
                            </label>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#2d4b73] focus:ring-1 focus:ring-[#2d4b73] transition-all text-sm"
                                placeholder="votre@email.com"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                                <span>🔒</span> Mot de passe
                            </label>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#2d4b73] focus:ring-1 focus:ring-[#2d4b73] transition-all text-sm tracking-widest placeholder:tracking-normal"
                                placeholder="........"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full mt-2 bg-[#2d4b73] hover:bg-[#1e3a5f] text-white font-medium py-3 rounded-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-sm shadow-sm"
                        >
                             {loading ? (
                                 <><svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Chargement...</>
                             ) : (
                                 <>Se connecter <span className="opacity-70 text-xs ml-1">→</span></>
                             )}
                        </button>
                    </form>

                    <div className="mt-8 text-center flex items-center justify-center gap-1.5 opacity-80">
                        <span className="text-[10px] text-blue-500">🛡️</span>
                        <p className="text-[10px] font-medium text-slate-500">
                            Accès réservé au personnel du Cedine
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
