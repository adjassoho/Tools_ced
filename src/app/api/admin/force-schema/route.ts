import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

export async function GET() {
    let pool;
    try {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        // Use standard connection, usually bypassing light fetch API issues for DDL
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 1000`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Actif'`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS dept VARCHAR(100)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP WITH TIME ZONE`);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS activities_logs (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                action VARCHAR(255) NOT NULL,
                credits_used INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        return NextResponse.json({ success: true, message: "Le schéma a été forcé avec succès via Pool !" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack });
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}
