// Test SadTalker via Hugging Face Spaces
const { Client } = require("@gradio/client");
const fs = require('fs');
const path = require('path');

async function testSadTalker() {
    console.log('Testing SadTalker on Hugging Face Spaces...\n');
    
    // Liste des Spaces SadTalker à tester
    const spaces = [
        'vinthony/SadTalker',
        'Tateteng/SadTalker', 
        'akin23/SadTalker-API',
        'fffiloni/SadTalker'
    ];
    
    for (const space of spaces) {
        console.log(`\n--- Testing ${space} ---`);
        try {
            const client = await Client.connect(space, {
                hf_token: process.env.HUGGINGFACE_API_KEY
            });
            
            console.log('Connected! Getting API info...');
            
            // Afficher les endpoints disponibles
            const info = client.view_api();
            console.log('API endpoints:', JSON.stringify(info, null, 2));
            
            console.log(`✅ ${space} is accessible!`);
            return { space, client };
            
        } catch (error) {
            console.log(`❌ ${space} failed:`, error.message);
        }
    }
    
    console.log('\nNo working SadTalker space found.');
    return null;
}

// Test avec Wav2Lip aussi
async function testWav2Lip() {
    console.log('\n\n=== Testing Wav2Lip Spaces ===\n');
    
    const spaces = [
        'Nekochu/Wav2Lip',
        'camenduru/Wav2Lip'
    ];
    
    for (const space of spaces) {
        console.log(`\n--- Testing ${space} ---`);
        try {
            const client = await Client.connect(space);
            console.log('Connected!');
            
            const info = client.view_api();
            console.log('API:', JSON.stringify(info, null, 2));
            
            return { space, client };
        } catch (error) {
            console.log(`❌ Failed:`, error.message);
        }
    }
    
    return null;
}

async function main() {
    const sadtalker = await testSadTalker();
    const wav2lip = await testWav2Lip();
    
    console.log('\n\n=== Summary ===');
    console.log('SadTalker:', sadtalker ? `✅ ${sadtalker.space}` : '❌ None available');
    console.log('Wav2Lip:', wav2lip ? `✅ ${wav2lip.space}` : '❌ None available');
}

main().catch(console.error);
