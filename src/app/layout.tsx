import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

import { cookies, headers } from 'next/headers';
import { jwtVerify } from 'jose';
import sql from '@/lib/db';

export const metadata = {
  title: "Cedine Tools | Intelligence Artificielle",
  description: "Outils IA de pointe pour l'Éducation - INE UAC",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userCredits = 0;
  let userName = "Invité";
  let userEmail = "";
  let userInitials = "";
  let isAuthenticated = false;

  // Détecter la page via les headers (sans middleware)
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  // Pages publiques sans menu
  const isPublicPage = pathname.startsWith('/login') || pathname.startsWith('/verify-otp');

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-jwt')?.value;

    if (token) {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_cedine_tools_2026_super_secure');
        const { payload } = await jwtVerify(token, secret);
        
        if (payload && payload.email) {
            isAuthenticated = true;
            userEmail = payload.email as string;
            
            // Get user real details
            const res = await sql`SELECT * FROM users WHERE email=${userEmail} LIMIT 1`;
            if (res && res.length > 0) {
              const u = res[0];
              userCredits = u.credits || 0;
              userName = u.name || (u.firstname && u.lastname ? `${u.firstname} ${u.lastname}` : u.firstname) || userEmail.split('@')[0];
              userInitials = userName.substring(0, 2).toUpperCase();
            }
        }
    }
  } catch (error) {
    console.error("Problème d'authentification layout:", error);
  }

  return (
    <html lang="fr" className="scroll-smooth">
      <body className={`${inter.className} min-h-screen flex flex-col items-center custom-scrollbar antialiased relative selection:bg-blue-500/20 selection:text-blue-900`}>
        
        {/* Effets de Fond Globaux (Clairs) */}
        <div className="fixed inset-0 w-full h-full pointer-events-none z-[-1] bg-grid-light"></div>
        <div className="glow-orb-primary"></div>
        <div className="glow-orb-secondary"></div>

        {/* Global Floating Glass Navbar (Light) */}
        {isAuthenticated && !isPublicPage && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4 pointer-events-none">
            <nav className="glass-nav w-full max-w-5xl rounded-2xl pointer-events-auto shadow-xl shadow-slate-200/50">
              <div className="px-6 py-4">
                <div className="flex justify-between items-center">
                  
                  {/* Brand */}
                  <a href="/" className="flex items-center gap-4 group">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
                       <span className="text-white font-bold text-xl tracking-tighter">C</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-lg text-slate-800 leading-tight tracking-wide">Cedine Tools</span>
                      <span className="text-[10px] text-blue-600 uppercase tracking-[0.2em] font-bold opacity-80">INE UAC System</span>
                    </div>
                  </a>
                  
                  {/* Actions & Profil */}
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner hidden sm:flex">
                      <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 12l10 10 10-10L12 2zm0 18L4.83 12 12 4.83 19.17 12 12 20z"/></svg>
                      <span className="text-sm font-bold text-slate-700">{userCredits} <span className="text-slate-400 font-medium ml-0.5">Crédits</span></span>
                    </div>

                    <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

                    <div className="relative group cursor-pointer inline-block">
                      <div className="flex items-center gap-2.5 bg-white/50 hover:bg-white transition-all px-2.5 py-1.5 rounded-xl border border-transparent hover:border-slate-200 shadow-sm">
                        <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">{userInitials}</div>
                        <span className="text-sm font-bold text-slate-800 hidden sm:block">{userName}</span>
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                      </div>
                      
                      {/* Menu Déroulant Glass */}
                      <div className="absolute right-0 top-[120%] w-60 glass-panel rounded-xl py-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 z-50 transform origin-top-right group-hover:scale-100 scale-95 border border-slate-200/60 shadow-xl">
                        <div className="px-5 py-3 border-b border-slate-100">
                          <p className="text-sm font-bold text-slate-800">{userName}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{userEmail}</p>
                        </div>
                        <a href="/admin" className="block px-5 py-3 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                          <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                          </div>
                          Administration
                        </a>
                        <a href="/profil" className="block px-5 py-3 text-sm font-semibold text-slate-600 hover:text-purple-600 hover:bg-purple-50 flex items-center gap-3 transition-colors">
                          <div className="bg-purple-100 p-1.5 rounded-lg text-purple-600">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          </div>
                          Mon Profil
                        </a>
                        <div className="h-px w-full bg-slate-100 my-1"></div>
                        <a href="/api/auth/logout" className="block px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-semibold transition-colors">
                          <div className="bg-red-100 p-1.5 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                          </div>
                          Se déconnecter
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </nav>
          </div>
        )}

        {/* Espace pour navbar conditionnel */}
        <div className={`w-full flex-grow relative z-10 flex flex-col items-center ${isAuthenticated && !isPublicPage ? 'pt-32' : 'pt-0'}`}>
          {children}
        </div>

        {/* Footer conditionnel */}
        {isAuthenticated && !isPublicPage && (
            <footer className="w-full mt-24 border-t border-slate-200/60 bg-white/50 backdrop-blur-md relative z-10">
               <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs">🎓</div>
                     <p className="text-sm text-slate-600 font-semibold">Cedine Tools — <span className="text-slate-400 font-medium">INE, Abomey-Calavi</span></p>
                  </div>
                  <p className="text-xs text-slate-400 tracking-wider font-semibold uppercase">©2026 Usage Exclusif</p>
               </div>
            </footer>
        )}

      </body>
    </html>
  );
}
