const fs = require('fs');

console.log('Test OpenVoice API v2...');

const SPACE = 'https://myshell-ai-openvoice.hf.space';

async function testOpenVoice() {
    // Upload un vrai fichier audio
    console.log('1. Uploading audio file...');
    
    const audioBuffer = fs.readFileSync('public/ced-ine-logo.png');
    
    const formData = new FormData();
    formData.append('files', new Blob([audioBuffer]), 'test.mp3');
    
    const uploadResponse = await fetch(`${SPACE}/upload`, {
        method: 'POST',
        body: formData
    });
    
    const uploadResult = await uploadResponse.json();
    console.log('Uploaded:', uploadResult[0]);
    
    // Tester avec fn_index: 1 et les bons paramètres
    console.log('\n2. Testing with fn_index 1...');
    
    const predictResponse = await fetch(`${SPACE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            data: [
                'Hello, this is a test.',  // Text Prompt
                'default'                   // Style
            ],
            fn_index: 1
        })
    });
    
    console.log('Status:', predictResponse.status);
    const text = await predictResponse.text();
    console.log('Response:', text.substring(0, 500));
    
    // Tester fn_index 0
    console.log('\n3. Testing with fn_index 0...');
    
    const predict0Response = await fetch(`${SPACE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            data: [
                'Hello, this is a test.',
                'default',
                uploadResult[0]  // Reference audio
            ],
            fn_index: 0
        })
    });
    
    console.log('Status:', predict0Response.status);
    const text0 = await predict0Response.text();
    console.log('Response:', text0.substring(0, 500));
    
    // Tester tous les fn_index
    console.log('\n4. Testing all fn_index...');
    
    for (let i = 0; i <= 5; i++) {
        try {
            const r = await fetch(`${SPACE}/api/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: ['Test', 'default'],
                    fn_index: i
                })
            });
            console.log(`fn_index ${i}: ${r.status}`);
        } catch (e) {
            console.log(`fn_index ${i}: error`);
        }
    }
}

testOpenVoice().catch(e => console.log('Error:', e.message));
