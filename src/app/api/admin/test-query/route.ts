import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        const amount = 500;
        try {
            const res = await sql`SELECT password_hash FROM users WHERE email='silveradjassoho@gmail.com' LIMIT 1`;
            return NextResponse.json({ success: true, pwd: res[0].password_hash });
        } catch (err: any) {
            return NextResponse.json({ success: false, error: "QUERY_FAILED", detail: err.message });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack });
    }
}
