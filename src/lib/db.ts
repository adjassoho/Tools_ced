import { neon, neonConfig } from '@neondatabase/serverless';

// Activer le cache de connexion pour réutiliser les connexions TCP
neonConfig.fetchConnectionCache = true;

/**
 * Client SQL HTTP pour NeonDB — Optimisé pour la production.
 * 
 * Utilise le driver HTTP (fetch) au lieu de WebSocket :
 *   ✅ ~50ms par requête au lieu de ~500ms-3s (WebSocket)
 *   ✅ Pas de handshake WebSocket/TLS à chaque requête
 *   ✅ Compatible serverless (Vercel, Netlify, etc.)
 *   ✅ Pas besoin de la librairie 'ws'
 *   ✅ Pas de crash en hot-reload Next.js
 *   ✅ Connection pooling géré côté Neon (URL -pooler)
 */
const rawSql = neon(process.env.DATABASE_URL!);

/**
 * Wrapper avec retry automatique pour gérer les cold-starts et timeout réseau.
 */
async function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
    const MAX_RETRIES = 3;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await rawSql(strings, ...values);
        } catch (error: any) {
            const isRetryable =
                error?.sourceError?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                error?.sourceError?.code === 'ETIMEDOUT' ||
                error?.sourceError?.code === 'ECONNRESET' ||
                error?.message?.includes('fetch failed') ||
                error?.message?.includes('Connect Timeout');

            if (isRetryable && attempt < MAX_RETRIES) {
                const delay = attempt * 2000;
                console.warn(`⏳ [NeonDB] Timeout (tentative ${attempt}/${MAX_RETRIES}). Retry dans ${delay/1000}s...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw error;
        }
    }
    return []; // Fallback (should normally never be reached due to throw above)
}

export default sql;
