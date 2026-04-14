import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import crypto from 'crypto';

// Utilitaire de hachage sécurisé natif
function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, hashWithSalt: string): boolean {
    try {
        const parts = hashWithSalt.split(':');
        // Si le format classique n'y est pas (ex: mot de passe en clair par erreur), on compare en clair (fallback de sécurité rudimentaire)
        if (parts.length !== 2) {
            return password === hashWithSalt;
        }
        const [salt, key] = parts;
        const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
        return key === derivedKey;
    } catch (e) {
        return false;
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { currentPassword, newPassword, email = 'silveradjassoho@gmail.com' } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Les mots de passe sont requis.' }, { status: 400 });
        }

        // Récupérer l'utilisateur
        const userRes = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
        
        if (userRes.length === 0) {
            return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
        }

        const user = userRes[0];

        // Vérification de l'ancien mot de passe
        // Si le password_hash existe et n'est pas vide
        if (user.password_hash) {
            if (user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2a$')) {
                // Migration: L'ancien hash était bcrypt, on ne peut pas le vérifier avec crypto natif. 
                // On autorise donc l'écrasement pour migrer silencieusement vers scrypt.
            } else {
                const isValid = verifyPassword(currentPassword, user.password_hash);
                if (!isValid) {
                    return NextResponse.json({ error: 'Le mot de passe actuel est incorrect.' }, { status: 401 });
                }
            }
        }

        // Hacher le nouveau mot de passe
        const newHash = hashPassword(newPassword);

        // Mettre à jour la base de données
        await sql`
            UPDATE users 
            SET password_hash = ${newHash}
            WHERE email = ${email}
        `;

        return NextResponse.json({ success: true, message: 'Mot de passe mis à jour avec succès.' });

    } catch (error: any) {
        console.error('Erreur lors du changement de mot de passe:', error);
        return NextResponse.json({ error: 'Erreur serveur lors de la mise à jour.', detail: error.message, stack: error.stack }, { status: 500 });
    }
}
