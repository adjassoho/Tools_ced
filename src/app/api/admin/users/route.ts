import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        const users = await sql`SELECT * FROM users ORDER BY id ASC`;
        return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        return NextResponse.json({ error: 'Erreur BDD' }, { status: 500 });
    }
}
