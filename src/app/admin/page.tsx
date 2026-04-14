"use client";
import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  dept: string;
  credits: number;
  status: string;
  role: string;
  firstname?: string;
  lastname?: string;
  is_active?: boolean;
  created_at?: string;
}

interface ActivityLog {
  id: number;
  user_email: string;
  action: string;
  credits_used: number;
  created_at: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("utilisateurs");
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Erreur logs:", error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        // Table n'existe peut-être pas encore, tenter l'initialisation
        const initRes = await fetch('/api/admin/init');
        if (initRes.ok) {
          setDbInitialized(true);
          const res2 = await fetch('/api/admin/users');
          const data = await res2.json();
          setUsers(data.users || []);
        } else {
          throw new Error('Impossible de connecter la base de données.');
        }
      } else {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion à la base de données.');
    } finally {
      setLoading(false);
    }
  };

  const totalUsers = users.length;
  const activeCount = users.filter(u => u.is_active === true || u.status === 'Actif').length;
  const adminCount = users.filter(u => u.role?.toLowerCase() === 'admin').length;

  const handleAddCredits = async (userId: number, currentCredits: number) => {
    const amountStr = prompt(`Combien de crédits souhaitez-vous ajouter à cet utilisateur ? (ex: 500)`);
    if (!amountStr) return;
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
      alert("Montant invalide.");
      return;
    }
    try {
      const res = await fetch('/api/admin/add-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount })
      });
      if (res.ok) {
        alert("Crédits ajoutés avec succès !");
        fetchUsers();
        fetchLogs();
      } else {
        const err = await res.json();
        alert("Erreur: " + err.error);
      }
    } catch (e) {
      alert("Erreur réseau.");
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 relative z-10">
      
      {/* En-tête du Dashboard */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="flex items-center gap-5">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 border border-white/50">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Panneau d'Administration</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Gestion des utilisateurs et allocations de crédits.
              {dbInitialized && <span className="ml-2 text-emerald-600 font-bold">✓ Base initialisée</span>}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200 backdrop-blur-md">
           <button 
             onClick={() => setActiveTab('utilisateurs')}
             className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
               activeTab === 'utilisateurs' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
             }`}
           >
             Membres
           </button>
           <button 
             onClick={() => setActiveTab('statistiques')}
             className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
               activeTab === 'statistiques' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
             }`}
           >
             Statistiques
           </button>
        </div>
      </div>

      {/* Cartes de Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {[
          { label: "Membres Système", val: loading ? '...' : String(totalUsers), color: "blue" },
          { label: "Comptes Actifs", val: loading ? '...' : String(activeCount), color: "emerald" },
          { label: "Administrateurs", val: loading ? '...' : String(adminCount), color: "amber" },
          { label: "Inscrits en 2026", val: loading ? '...' : String(users.filter(u => u.created_at?.startsWith('2026')).length), color: "purple" },
        ].map((stat, i) => (
           <div key={i} className={`bg-white p-6 rounded-2xl relative overflow-hidden group border-t-2 border-t-${stat.color}-500 shadow-sm hover:shadow-lg transition-shadow`}>
             <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-100 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-700`}></div>
             <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
             <p className="text-4xl font-black text-slate-800 relative z-10">{stat.val}</p>
           </div>
        ))}
      </div>

      {/* État de chargement / erreur */}
      {loading && (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <svg className="animate-spin h-8 w-8 text-indigo-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-slate-600 font-bold text-sm uppercase tracking-widest">Connexion à NeonDB...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-4 p-6 bg-red-50 border border-red-200 rounded-2xl mb-6">
          <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0 font-bold">!</div>
          <div>
            <p className="font-bold text-red-700 text-sm">Erreur de connexion à la base de données</p>
            <p className="text-red-600 text-xs mt-1">{error}</p>
          </div>
          <button onClick={fetchUsers} className="ml-auto px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700">
            Réessayer
          </button>
        </div>
      )}

      {/* Tableau des utilisateurs */}
      {!loading && !error && activeTab === 'utilisateurs' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div className="flex items-center gap-3">
               <h2 className="text-sm font-extrabold text-slate-800 tracking-widest uppercase">Registre des Opérateurs</h2>
               <span className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                 Live · NeonDB
               </span>
             </div>
             <button className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-slate-700 transition-colors shadow-sm">
               + Nouvel Accès
             </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  <th className="px-6 py-4 font-bold">Identité</th>
                  <th className="px-6 py-4 font-bold">Email</th>
                  <th className="px-6 py-4 text-center font-bold">Crédits</th>
                  <th className="px-6 py-4 text-center font-bold">Statut</th>
                  <th className="px-6 py-4 font-bold">Rôle</th>
                  <th className="px-6 py-4 font-bold">Inscrit le</th>
                  <th className="px-6 py-4 text-right font-bold">Commandes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-xs shrink-0">
                          {(user.firstname?.[0] || '?').toUpperCase()}{(user.lastname?.[0] || '').toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{user.name || user.firstname + ' ' + user.lastname}</span>
                          <span className="text-xs text-slate-500 font-medium mt-0.5">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center gap-2">
                         <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{user.credits}</span>
                         <button onClick={() => handleAddCredits(user.id, user.credits)} className="w-6 h-6 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 flex items-center justify-center transition-colors tooltip" aria-label="Ajouter crédits">
                            +
                         </button>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       {user.status === 'Actif' || user.is_active ? (
                          <div className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-extrabold uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                             Actif
                          </div>
                       ) : (
                          <div className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-extrabold uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                             Inactif
                          </div>
                       )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative inline-block w-full max-w-[140px]">
                         <select
                           className={`block w-full appearance-none bg-white border px-3 py-2 pr-8 rounded-lg text-xs font-bold tracking-wide focus:outline-none focus:ring-2 transition-colors cursor-pointer ${
                             user.role === 'admin'
                               ? 'border-amber-300 text-amber-700 bg-amber-50 focus:ring-amber-500'
                               : 'border-slate-200 text-slate-600 focus:ring-blue-500'
                           }`}
                           defaultValue={user.role}
                         >
                           <option value="admin">Administrateur</option>
                           <option value="user">Utilisateur</option>
                         </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                           <svg className="fill-current w-4 h-4" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500 font-medium">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-md transition-colors">
                           Éditer
                         </button>
                         <button className="bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-500 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-md transition-all">
                           Retirer
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tableau des Statistiques (Logs) */}
      {!loading && !error && activeTab === 'statistiques' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div className="flex items-center gap-3">
               <h2 className="text-sm font-extrabold text-slate-800 tracking-widest uppercase">Journal d'Activité</h2>
             </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  <th className="px-6 py-4 font-bold">Date & Heure</th>
                  <th className="px-6 py-4 font-bold">Utilisateur</th>
                  <th className="px-6 py-4 font-bold">Action</th>
                  <th className="px-6 py-4 text-center font-bold">Coût (Crédits)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500 font-medium">
                        {new Date(log.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{log.user_email}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{log.action}</td>
                    <td className="px-6 py-4 text-center">
                       {log.credits_used > 0 ? (
                         <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md">-{log.credits_used}</span>
                       ) : (
                         <span className="text-xs font-bold text-slate-400">-</span>
                       )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-medium text-sm">
                      Aucune activité récente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
