import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware désactivé - Site redirigé vers Hostinger
export function middleware(request: NextRequest) {
    // Laisser passer toutes les requêtes vers la page de redirection
    return NextResponse.next();
}

export const config = {
    matcher: []
};
