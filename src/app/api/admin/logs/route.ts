import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        // Vérifier si la table existe avant de requêter (pour éviter l'erreur 500 sur Neon)
        const tableCheck = await sql`SELECT to_regclass('public.activities_logs') as exists`;
        if (!tableCheck[0].exists) {
            return NextResponse.json({ logs: [] }, { status: 200 });
        }

        const logs = await sql`SELECT * FROM activities_logs ORDER BY created_at DESC LIMIT 100`;
        return NextResponse.json({ logs }, { status: 200 });
    } catch (error) {
        console.error('Erreur lors de la récupération des logs:', error);
        return NextResponse.json({ logs: [] }, { status: 200 }); // Fail gracefuly
    }
}
