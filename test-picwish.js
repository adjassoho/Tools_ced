// Script de test simple pour PicWish API
// Usage: node test-picwish.js

const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.PICWISH_API_KEY;

console.log('='.repeat(50));
console.log('TEST API PICWISH');
console.log('='.repeat(50));

if (!API_KEY) {
    console.log('❌ ERREUR: PICWISH_API_KEY non trouvée dans .env.local');
    process.exit(1);
}

console.log('✅ Clé API:', API_KEY.substring(0, 15) + '...');

// Image de test minimaliste (1x1 pixel PNG transparent) en binaire
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const testImageBuffer = Buffer.from(testImageBase64, 'base64');

async function test() {
    console.log('\n📤 Envoi de l\'image de test (format binaire)...\n');

    // Créer un Blob à partir du buffer
    const blob = new Blob([testImageBuffer], { type: 'image/png' });
    
    const formData = new FormData();
    formData.append('image', blob, 'test.png');
    formData.append('sync', '1');

    try {
        const response = await fetch('https://techhk.aoscdn.com/api/tasks/visual/external/watermark-remove', {
            method: 'POST',
            headers: {
                'X-API-KEY': API_KEY,
            },
            body: formData,
        });

        const text = await response.text();
        console.log('STATUS HTTP:', response.status);
        console.log('RÉPONSE:');
        console.log(text);

        try {
            const json = JSON.parse(text);
            if (json.status === 200) {
                console.log('\n✅ API FONCTIONNE!');
                console.log('Image résultat:', json.data?.image?.substring(0, 50) + '...');
            } else {
                console.log('\n❌ API ERREUR:', json.message || json.status);
            }
        } catch {
            console.log('\n❌ Réponse non-JSON');
        }
    } catch (err) {
        console.log('❌ ERREUR RÉSEAU:', err.message);
    }

    console.log('\n' + '='.repeat(50));
}

test();
