const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

console.log('=== Recherche d\'APIs gratuites pour le clonage vocal ===\n');

// Test 1: Fish Audio (gratuit)
async function testFishAudio() {
    console.log('--- Test Fish Audio ---');
    console.log('Site: https://fish.audio');
    console.log('Gratuit: Oui, avec limites');
    
    try {
        // Vérifier si l'API est accessible
        const response = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: 'test' })
        });
        console.log('Status:', response.status);
        if (response.status === 401) {
            console.log('→ API accessible, nécessite une clé (gratuite après inscription)');
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}

// Test 2: Hugging Face Spaces (gratuit)
async function testHuggingFaceSpaces() {
    console.log('\n--- Test Hugging Face Spaces ---');
    console.log('Site: https://huggingface.co/spaces');
    console.log('Gratuit: Oui, via Gradio API');
    
    // XTTS sur Hugging Face Spaces
    const spaces = [
        'https://coqui-xtts.hf.space/api/predict',
        'https://collabora-whisperspeech.hf.space/api/predict'
    ];
    
    for (const space of spaces) {
        try {
            const response = await fetch(space, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: ['test'] })
            });
            console.log(`${space.split('/')[2]}: Status ${response.status}`);
        } catch (e) {
            console.log(`${space.split('/')[2]}: ${e.message}`);
        }
    }
}

// Test 3: PlayHT (essai gratuit)
async function testPlayHT() {
    console.log('\n--- Test PlayHT ---');
    console.log('Site: https://play.ht');
    console.log('Gratuit: Essai gratuit avec clonage vocal');
    
    const apiKey = process.env.PLAYHT_API_KEY;
    const userId = process.env.PLAYHT_USER_ID;
    
    if (!apiKey || !userId) {
        console.log('→ Clés non configurées');
        console.log('  Pour obtenir des clés gratuites:');
        console.log('  1. Inscris-toi sur https://play.ht');
        console.log('  2. Va dans Settings > API');
        console.log('  3. Ajoute PLAYHT_API_KEY et PLAYHT_USER_ID dans .env.local');
    } else {
        try {
            const response = await fetch('https://api.play.ht/api/v2/voices', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'X-User-ID': userId
                }
            });
            console.log('Status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('Voices available:', data.length || 'unknown');
            }
        } catch (e) {
            console.log('Error:', e.message);
        }
    }
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  RECOMMANDATION: PlayHT offre un essai gratuit complet    ║');
console.log('║  avec clonage vocal instantané!                           ║');
console.log('║                                                            ║');
console.log('║  1. Va sur https://play.ht et crée un compte gratuit      ║');
console.log('║  2. Tu obtiens des crédits gratuits pour tester           ║');
console.log('║  3. Le clonage vocal est inclus dans l\'essai              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function runTests() {
    await testFishAudio();
    await testHuggingFaceSpaces();
    await testPlayHT();
}

runTests();
