const fs = require('fs');
const mammoth = require('mammoth');

async function testDocxExtraction() {
    // Chercher un fichier .docx dans le dossier courant
    const files = fs.readdirSync('.').filter(f => f.endsWith('.docx'));
    
    if (files.length === 0) {
        console.log('Aucun fichier .docx trouvé. Place un fichier .docx dans le dossier racine.');
        return;
    }
    
    const file = files[0];
    console.log('Testing with:', file);
    
    const buffer = fs.readFileSync(file);
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    
    console.log('\n=== TEXTE EXTRAIT (500 premiers caractères) ===');
    console.log(text.substring(0, 500));
    
    console.log('\n=== LIGNES QUI RESSEMBLENT À DES TITRES ===');
    const lines = text.split('\n');
    const titlePatterns = [
        /^[IVX]+[-.)]\s*.+/i,
        /^\d+\.\s+[A-ZÀ-Ü].*/,
        /^\d+\.\d+\.?\s+.+/,
        /^(Chapitre|Partie|Introduction|Conclusion)\s*.*/i,
    ];
    
    lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        for (const pattern of titlePatterns) {
            if (pattern.test(trimmed) && trimmed.length < 200) {
                console.log(`Ligne ${i}: "${trimmed.substring(0, 100)}..."`);
                break;
            }
        }
    });
    
    console.log('\n=== STATISTIQUES ===');
    console.log('Longueur totale:', text.length, 'caractères');
    console.log('Nombre de lignes:', lines.length);
    console.log('Lignes non vides:', lines.filter(l => l.trim()).length);
}

testDocxExtraction().catch(console.error);
