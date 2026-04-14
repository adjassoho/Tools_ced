import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        // Créer la table users si elle n'existe pas
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                dept VARCHAR(100),
                credits INTEGER DEFAULT 1000,
                status VARCHAR(50) DEFAULT 'Actif',
                role VARCHAR(50) DEFAULT 'Utilisateur',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // Créer la table des logs
        await sql`
            CREATE TABLE IF NOT EXISTS activities_logs (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                action VARCHAR(255) NOT NULL,
                credits_used INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // Vérifier s'il y a déjà des utilisateurs pour ne pas dupliquer
        const countResult = await sql`SELECT COUNT(*) FROM users`;
        const count = parseInt(countResult[0].count);

        if (count === 0) {
            // Insérer des données initiales si la table est vide
            await sql`
                INSERT INTO users (name, email, dept, credits, status, role)
                VALUES 
                ('Admin Cedine', 'silveradjassoho@gmail.com', 'Direction', 100000, 'Actif', 'Admin'),
                ('Aurore Egounlety Biokou', 'au.ghi.07@gmail.com', 'Enseignement', 2500, 'Actif', 'Utilisateur'),
                ('Rita Houngue', 'hounguerita@gmail.com', 'Recherche', 1800, 'Actif', 'Utilisateur'),
                ('Yanel Sobatho', 'sobathoyanel04@gmail.com', 'Technique', 500, 'Inactif', 'Utilisateur'),
                ('Firmin adandedji', 'firmindiile@gmail.com', 'Enseignement', 3200, 'Actif', 'Utilisateur')
            `;
            return NextResponse.json({ message: 'Table créée et pré-remplie avec succès.' }, { status: 200 });
        }

        return NextResponse.json({ message: 'La table existe déjà et contient des données.' }, { status: 200 });

    } catch (error) {
        console.error('Erreur d\'initialisation de la BDD:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Erreur inconnue' 
        }, { status: 500 });
    }
}
