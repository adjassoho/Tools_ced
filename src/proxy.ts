import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Injecter le pathname dans les headers pour que le layout puisse le lire
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', pathname);

    // Définir les pages publiques (celles qui ne nécessitent pas d'être connecté)
    const isPublicPage = pathname.startsWith('/login') || pathname.startsWith('/verify-otp') || pathname.startsWith('/api/');

    // Vérifier si l'utilisateur possède le cookie d'authentification
    const hasToken = request.cookies.has('auth-jwt');

    // Redirection automatique vers /login si non authentifié et pas sur une page publique
    if (!isPublicPage && !hasToken) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

// Appliquer le middleware sur toutes les routes SAUF les assets statiques et images
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
