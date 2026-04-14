import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

function verifyPassword(password: string, hashWithSalt: string): boolean {
    try {
        const parts = hashWithSalt.split(':');
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

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email et Mot de passe requis.' }, { status: 400 });
        }

        // Vérifier l'existence et récupérer les coordonnées
        const userRes = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
        if (userRes.length === 0) {
            return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 });
        }

        const user = userRes[0];

        // Vérification du mot de passe
        if (user.password_hash) {
            if (user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2a$')) {
                // Ignore bcrypt check as requested for migration
            } else {
                const isValid = verifyPassword(password, user.password_hash);
                if (!isValid) {
                    return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 });
                }
            }
        }

        // Générer le code OTP
        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 15 * 60000); // 15 minutes

        // Mettre à jour l'OTP dans la DB
        await sql`
            UPDATE users 
            SET otp_code = ${otpCode}, otp_expires_at = ${expiresAt}
            WHERE id = ${user.id}
        `;

        // Configuration SMTP avec Nodemailer
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER || 'contact@cedine-uac.org',
                pass: process.env.SMTP_PASSWORD || ''
            }
        });

        const name = user.name || 'Admin';

        // Créer l'HTML EXACT demandé
        const logoUrl = 'https://i.ibb.co/HLfhhkWM/ced-ine-logo.png';

        // Créer l'HTML EXACT demandé et amélioré esthétiquement
        const mailOptions = {
            from: `"Cedine Tools INE UAC" <${process.env.SMTP_USER || 'contact@cedine-uac.org'}>`,
            to: email,
            subject: 'Cedine Tools : Code de vérification OTP 🔒',
            html: `
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { background-color: #f8fafc; color: #334155; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 60px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
                        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 20px; text-align: center; border-bottom: 4px solid #3b82f6; position: relative; overflow: hidden;}
                        .header::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.4) 0%, transparent 60%); pointer-events: none;}
                        .header img { max-width: 120px; margin-bottom: 20px; background: white; padding: 10px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); }
                        .header h1 { margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; position: relative; z-index: 1;}
                        .header p { margin: 8px 0 0 0; color: #94a3b8; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; position: relative; z-index: 1;}
                        .content { padding: 50px 40px; text-align: center; }
                        .content p { font-size: 16px; color: #475569; margin-bottom: 25px; text-align: center; line-height: 1.6; }
                        .greeting { margin-bottom: 35px !important; font-size: 20px !important; color: #0f172a !important; font-weight: 600;}
                        .otp-wrapper { padding: 35px; background: #f0f9ff; border: 2px dashed #93c5fd; border-radius: 16px; margin: 0 auto; max-width: 350px;}
                        .otp-instructions { font-size: 13px !important; color: #3b82f6 !important; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 15px !important;}
                        .otp-box p { margin: 0; font-size: 46px; font-weight: 900; letter-spacing: 18px; color: #1e3a8a; text-align: center; font-family: monospace;}
                        .divider { height: 1px; background: #e2e8f0; margin: 40px 0; width: 100%;}
                        .security-notice { font-size: 13px !important; color: #64748b !important;}
                        .security-notice strong { color: #ef4444; }
                        .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #94a3b8; font-size: 13px; border-top: 1px solid #f1f5f9;}
                        .footer a { color: #3b82f6; text-decoration: none; font-weight: 600;}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <img src="${logoUrl}" alt="Logo Cedine UAC" />
                            <h1>Cedine Tools</h1>
                            <p>Système d'Accès Sécurisé</p>
                        </div>
                        <div class="content">
                            <p class="greeting">Bonjour <strong>${name}</strong> 👋</p>
                            <p>Vous avez fait une demande de connexion sur votre espace <strong>Cedine Tools</strong>. Pour valider votre identité, veuillez utiliser le code ci-dessous :</p>
                            
                            <div class="otp-wrapper">
                                <p class="otp-instructions">Code de vérification</p>
                                <div class="otp-box">
                                    <p>${otpCode}</p>
                                </div>
                            </div>
                            
                            <div class="divider"></div>
                            
                            <p class="security-notice">Ce code expirera dans <strong>15 minutes</strong>. <br/><strong>⚠️ Ne le partagez avec personne.</strong> L'équipe Cedine ne vous le demandera jamais.</p>
                        </div>
                        <div class="footer">
                            <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
                            <p>&copy; ${new Date().getFullYear()} <a href="https://cedine-uac.org">Institut National de l'Eau - UAC</a>. Tous droits réservés.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, email: user.email });

    } catch (error: any) {
        console.error('Erreur Login/OTP:', error);
        return NextResponse.json({ 
            error: "Erreur interne ou problème d'envoi d'e-mail. Vérifiez les accès SMTP."
        }, { status: 500 });
    }
}
