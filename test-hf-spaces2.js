const fs = require('fs');

console.log('Test Hugging Face Spaces - Voice Cloning...');

const SPACES = [
    { name: 'OpenVoice', url: 'https://myshell-ai-openvoice.hf.space' },
    { name: 'WhisperSpeech', url: 'https://collabora-whisperspeech.hf.space' },
    { name: 'MeloTTS', url: 'https://mrfakename-melotts.hf.space' },
    { name: 'Bark', url: 'https://suno-bark.hf.space' }
];

async function testSpaces() {
    console.log('\nTesting TTS spaces...\n');
    
    for (const space of SPACES) {
        try {
            process.stdout.write(`${space.name}... `);
            const response = await fetch(space.url, { method: 'HEAD' });
            console.log(response.ok ? '✅ Online' : `❌ ${response.status}`);
        } catch (e) {
            console.log('❌ Error');
        }
    }
}

testSpaces();
