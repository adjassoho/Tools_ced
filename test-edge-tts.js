const { MsEdgeTTS, OUTPUT_FORMAT } = require('edge-tts-node');
const fs = require('fs');

console.log('Test Edge TTS Node...');

async function testTTS() {
    try {
        const tts = new MsEdgeTTS();
        
        console.log('Getting voices...');
        const voices = await tts.getVoices();
        
        console.log('Total voices:', voices.length);
        
        // Voix françaises
        console.log('\nFrench voices:');
        voices.filter(v => v.ShortName?.startsWith('fr-')).forEach(v => 
            console.log(`  - ${v.ShortName}: ${v.FriendlyName}`)
        );
        
        // Voix africaines
        console.log('\nAfrican region voices:');
        const africanPrefixes = ['af-ZA', 'sw-KE', 'sw-TZ', 'zu-ZA', 'am-ET'];
        voices.filter(v => africanPrefixes.some(p => v.ShortName?.startsWith(p))).forEach(v => 
            console.log(`  - ${v.ShortName}: ${v.FriendlyName}`)
        );
        
        // Test génération
        console.log('\nGenerating audio with French voice...');
        await tts.setMetadata('fr-FR-DeniseNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
        
        const readable = tts.toStream('Bonjour, ceci est un test de synthèse vocale Microsoft Edge.');
        
        const chunks = [];
        for await (const chunk of readable) {
            chunks.push(chunk);
        }
        
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync('edge-tts-test.mp3', buffer);
        
        console.log('✅ Audio saved:', buffer.length, 'bytes');
        
    } catch (e) {
        console.log('Error:', e.message);
        console.log('Stack:', e.stack?.substring(0, 500));
    }
}

testTTS();
