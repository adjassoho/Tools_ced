import sql from '@/lib/db';

/**
 * Déduit un certain montant de crédits d'un utilisateur et vérifie la solvabilité.
 * @param email L'adresse email de l'utilisateur
 * @param amount Le montant de crédits à retirer
 * @throws {Error} Si l'utilisateur n'est pas trouvé ou s'il n'a pas assez de crédits.
 */
export async function deductCredits(email: string, amount: number): Promise<void> {
    const res = await sql`SELECT credits FROM users WHERE email = ${email} LIMIT 1`;
    
    if (!res || res.length === 0) {
        throw new Error('Utilisateur introuvable.');
    }
    
    const currentCredits = res[0].credits;
    if (currentCredits < amount) {
        throw new Error(`Solde insuffisant. Requis: ${amount}, Disponible: ${currentCredits}`);
    }
    
    await sql`UPDATE users SET credits = credits - ${amount} WHERE email = ${email}`;
}
