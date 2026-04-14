'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyOTPContent() {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    
    const searchParams = useSearchParams();
    const router = useRouter();
    const email = searchParams.get('email');

    useEffect(() => {
        if (!email) {
            router.push('/login');
        }
    }, [email, router]);

    const handleChange = (index: number, value: string) => {
        if (!/^[0-9]*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Auto-focus next input
        if (value !== '' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit if all 6 are filled
        if (value !== '' && index === 5 && newCode.every(v => v !== '')) {
            submitOTP(newCode.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && code[index] === '' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/[^0-9]/g, '');
        if (pastedData) {
            const newCode = [...code];
            for (let i = 0; i < pastedData.length; i++) {
                newCode[i] = pastedData[i];
            }
            setCode(newCode);
            if (pastedData.length === 6) {
                submitOTP(pastedData);
            } else {
                inputRefs.current[pastedData.length]?.focus();
            }
        }
    };

    const submitOTP = async (otpString: string) => {
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: otpString })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Code invalide.');
            }

            // Succès ! On redirige vers le dashboard et on force le rafraîchissement global du Layout serveur
            window.location.href = '/';

        } catch (err: any) {
            setError(err.message);
            // On vide le dernier champ pour re-tenter
            const newCode = [...code];
            newCode[5] = '';
            setCode(newCode);
            inputRefs.current[5]?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative bg-slate-900 bg-[url('/bg-simple-water.png')] bg-cover bg-center">
            
            {/* Overlay léger */}
            <div className="absolute inset-0 bg-blue-900/10 pointer-events-none"></div>

            <div className="w-full max-w-[400px] relative z-10 px-5">
                <div className="bg-white/95 backdrop-blur-[2px] p-8 sm:p-10 rounded-3xl shadow-2xl shadow-blue-900/30">

                    <div className="text-center mb-7">
                        {/* Icône Email animée */}
                        <div className="flex justify-center mb-4">
                            <div className="relative w-16 h-16 flex items-center justify-center bg-blue-50 rounded-2xl shadow-inner">
                                <svg className="w-8 h-8 text-[#2d4b73]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {/* Badge vert animé */}
                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                                </span>
                            </div>
                        </div>
                        <h1 className="text-[20px] font-bold text-[#1e3a5f] tracking-tight">Vérification en 2 étapes</h1>
                        <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">
                            Un code à 6 chiffres a été envoyé à<br/>
                            <span className="font-bold text-[#2d4b73]">{email}</span>
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold border border-red-100 flex items-center justify-center gap-2 mb-5">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            {error}
                        </div>
                    )}

                    {/* Champs OTP */}
                    <div className="flex justify-center gap-2 sm:gap-3 mb-7" onPaste={handlePaste}>
                        {code.map((digit, idx) => (
                            <input
                                key={idx}
                                ref={(el) => { inputRefs.current[idx] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                autoFocus={idx === 0}
                                disabled={loading}
                                onChange={(e) => handleChange(idx, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(idx, e)}
                                className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-2xl font-black rounded-xl border-2 outline-none transition-all duration-200 disabled:opacity-50 bg-slate-50
                                    ${digit ? 'border-[#2d4b73] bg-blue-50/50 text-[#1e3a5f] scale-105 shadow-md shadow-blue-500/10' : 'border-slate-200 text-slate-800'}
                                    focus:border-[#2d4b73] focus:ring-4 focus:ring-blue-500/10 focus:scale-105`}
                            />
                        ))}
                    </div>

                    {/* Indicateur de progression */}
                    <div className="flex justify-center gap-1.5 mb-6">
                        {code.map((digit, idx) => (
                            <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${digit ? 'w-6 bg-[#2d4b73]' : 'w-3 bg-slate-200'}`}></div>
                        ))}
                    </div>

                    <div className="flex flex-col items-center gap-3">
                        <button
                            onClick={() => submitOTP(code.join(''))}
                            disabled={loading || code.some(v => v === '')}
                            className="w-full bg-[#2d4b73] hover:bg-[#1e3a5f] text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-sm"
                        >
                            {loading ? (
                                <><svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Vérification...</>
                            ) : (
                                <>Confirmer l'accès <span className="opacity-70 text-xs ml-1">→</span></>
                            )}
                        </button>

                        <button
                            onClick={() => router.push('/login')}
                            className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors py-1"
                        >
                            Annuler et retourner
                        </button>
                    </div>

                    <div className="mt-7 pt-5 border-t border-slate-100 text-center flex items-center justify-center gap-1.5 opacity-80">
                        <span className="text-[10px] text-blue-500">🛡️</span>
                        <p className="text-[10px] font-medium text-slate-400">
                            Code valable 10 minutes • Ne partagez jamais ce code
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function VerifyOTPPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[url('/bg-simple-water.png')] bg-cover bg-center flex items-center justify-center">
                <div className="bg-white/90 rounded-2xl px-8 py-6 shadow-xl">
                    <p className="text-[#1e3a5f] font-bold text-sm">Chargement...</p>
                </div>
            </div>
        }>
            <VerifyOTPContent />
        </Suspense>
    );
}
