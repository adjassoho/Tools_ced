import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_secret_cedine_tools_2026_super_secure'
);

/**
 * Extracts the authenticated user's email from the JWT cookie.
 * Reads the cookie directly from the NextRequest object (works in API routes).
 * Returns the email string on success, or null on failure.
 */
export async function getAuthEmail(req: NextRequest): Promise<string | null> {
    try {
        const token = req.cookies.get('auth-jwt')?.value;
        if (!token) return null;
        const { payload } = await jwtVerify(token, SECRET);
        return payload.email as string;
    } catch {
        return null;
    }
}

export function unauthorizedResponse() {
    return NextResponse.json({ error: 'Non autorisé. Veuillez vous connecter.' }, { status: 401 });
}

export function insufficientCreditsResponse(message: string) {
    return NextResponse.json({ error: message }, { status: 402 });
}
