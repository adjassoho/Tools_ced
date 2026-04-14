import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_secret_cedine_tools_2026_super_secure'
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, code } = body;

        if (!email || !code) {
            return NextResponse.json({ error: 'Email et Code requis.' }, { status: 400 });
        }

        // Vérifier l'existence de l'utilisateur
        const userRes = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
        if (userRes.length === 0) {
            return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
        }

        const user = userRes[0];

        // Vérification de l'OTP
        if (!user.otp_code || user.otp_code !== code) {
            return NextResponse.json({ error: 'Code de vérification incorrect.' }, { status: 401 });
        }

        // Vérification de l'expiration
        const now = new Date();
        const expiresAt = new Date(user.otp_expires_at);
        if (now > expiresAt) {
            return NextResponse.json({ error: 'Ce code a expiré. Veuillez vous reconnecter.' }, { status: 401 });
        }

        // Si succès : nettoyer l'OTP en DB pour éviter la réutilisation
        await sql`
            UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = ${user.id}
        `;

        // Créer le JWT
        const token = await new SignJWT({
            id: user.id,
            email: user.email,
            role: user.role || 'user'
        })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d') // Valable 7 jours
        .sign(JWT_SECRET);

        // Préparer la réponse
        const response = NextResponse.json({ success: true });
        
        // Cuisiner le cookie sécurisé
        response.cookies.set({
            name: 'auth-jwt',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 // 7 jours
        });

        return response;

    } catch (error: any) {
        console.error('Erreur Vérification OTP:', error);
        return NextResponse.json({ error: 'Erreur interne lors de la vérification.' }, { status: 500 });
    }
}
