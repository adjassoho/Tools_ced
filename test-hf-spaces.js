const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

console.log('Test Hugging Face Spaces - XTTS Voice Cloning...');

// Liste des spaces XTTS disponibles
const SPACES = [
    'https://coqui-xtts.hf.space',
    'https://tts-xtts.hf.space', 
    'https://mrfakename-xtts.hf.space'
];

async function findWorkingSpace() {
    console.log('\nSearching for working XTTS space...\n');
    
    for (const space of SPACES) {
        try {
            console.log(`Testing ${space}...`);
            const response = await fetch(`${space}/api/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: [] })
            });
            
            console.log(`  Status: ${response.status}`);
            
            if (response.status === 200 || response.status === 422) {
                console.log(`  ✅ Space is responding!`);
                
                // Essayer de récupérer les infos
                const infoResponse = await fetch(`${space}/info`);
                if (infoResponse.ok) {
                    const info = await infoResponse.json();
                    console.log(`  API: ${info.api ? 'Available' : 'Not available'}`);
                }
                
                return space;
            }
        } catch (e) {
            console.log(`  ❌ Error: ${e.message}`);
        }
    }
    
    return null;
}

async function testGradioClient() {
    console.log('\n--- Test with @gradio/client ---\n');
    
    try {
        // Tester si le package est installé
        const { Client } = require('@gradio/client');
        console.log('Gradio client available');
        
        // Se connecter à un space XTTS
        console.log('Connecting to XTTS space...');
        const client = await Client.connect("coqui/xtts");
        
        console.log('Connected! API info:');
        console.log(client.view_api());
        
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            console.log('Gradio client not installed.');
            console.log('Install with: npm install @gradio/client');
        } else {
            console.log('Error:', e.message);
        }
    }
}

async function main() {
    const workingSpace = await findWorkingSpace();
    
    if (workingSpace) {
        console.log(`\n✅ Found working space: ${workingSpace}`);
    } else {
        console.log('\n❌ No working space found');
    }
    
    await testGradioClient();
}

main();
