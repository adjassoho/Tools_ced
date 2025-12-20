const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.REPLICATE_API_TOKEN;
console.log('Test XTTS-v2 Voice Cloning...');
console.log('API Key:', API_KEY ? 'OK' : 'MISSING');

// Utiliser un fichier audio de test (le logo PNG ne marchera pas, il faut un vrai audio)
// Pour le test, on va juste vérifier que l'API répond

async function testXTTS() {
    console.log('\n--- Test XTTS-v2 model availability ---');
    
    const response = await fetch('https://api.replicate.com/v1/models/lucataco/xtts-v2', {
        headers: { 'Authorization': `Token ${API_KEY}` }
    });
    
    const data = await response.json();
    console.log('Model:', data.name);
    console.log('Version:', data.latest_version?.id);
    console.log('Description:', data.description?.substring(0, 100));
    
    if (data.latest_version?.id) {
        console.log('\n✅ XTTS-v2 is available and ready to use!');
        console.log('\nTo test voice cloning, upload an audio file through the web interface.');
    }
}

testXTTS();
