import { Client } from "@gradio/client";
import fs from 'fs';

console.log('Test Gradio Client...');

async function testSpaces() {
    const spaces = [
        'myshell-ai/OpenVoice',
        'mrfakename/MeloTTS',
        'suno/bark'
    ];
    
    for (const space of spaces) {
        console.log(`\nTesting ${space}...`);
        try {
            const client = await Client.connect(space, { hf_token: undefined });
            console.log('✅ Connected!');
            
            // Afficher les endpoints disponibles
            const api = client.view_api();
            console.log('API:', JSON.stringify(api, null, 2).substring(0, 500));
            
            return { client, space };
        } catch (e) {
            console.log('❌ Error:', e.message.substring(0, 100));
        }
    }
    
    return null;
}

async function main() {
    const result = await testSpaces();
    
    if (result) {
        console.log(`\n✅ Working space: ${result.space}`);
    } else {
        console.log('\n❌ No working space found');
    }
}

main();
