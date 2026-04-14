import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, amount, adminEmail = 'silveradjassoho@gmail.com' } = body;

        if (!userId || !amount) {
            return NextResponse.json({ error: 'Paramètres manquants: userId et amount requis' }, { status: 400 });
        }

        // 1. Ajouter les crédits
        const updateRes = await sql`
            UPDATE users
            SET credits = COALESCE(credits, 0) + ${amount}
            WHERE id = ${userId}
            RETURNING *
        `;

        if (updateRes.length === 0) {
            return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
        }

        const user = updateRes[0];

        // 2. Tenter d'historiser (Try/catch silencieux au cas où activities_logs est bloquée par Neon)
        try {
            await sql`
                CREATE TABLE IF NOT EXISTS activities_logs (
                    id SERIAL PRIMARY KEY,
                    user_email VARCHAR(255) NOT NULL,
                    action VARCHAR(255) NOT NULL,
                    credits_used INTEGER DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const actionDetails = `Ajout manuel de +${amount} crédits (nouveau solde: ${user.credits})`;
            await sql`
                INSERT INTO activities_logs (user_email, action, credits_used)
                VALUES (${user.email}, ${actionDetails}, 0)
            `;
        } catch (logError) {
            console.error('Erreur non bloquante lors du log d\'activité:', logError);
        }

        return NextResponse.json({ 
            success: true, 
            message: `${amount} crédits ajoutés à ${user.name || user.email}`,
            newBalance: user.credits 
        });

    } catch (error) {
        console.error('Erreur lors de l\'ajout de crédits:', error);
        return NextResponse.json({ error: 'Erreur BDD' }, { status: 500 });
    }
}
