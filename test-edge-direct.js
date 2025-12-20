const https = require('https');
const fs = require('fs');

console.log('Test Edge TTS Direct API...');

// Liste des voix Microsoft Edge TTS (incluant africaines)
const VOICES = {
    // Français
    'fr-FR-DeniseNeural': 'French (France) - Denise',
    'fr-FR-HenriNeural': 'French (France) - Henri',
    
    // Afrique du Sud (Afrikaans)
    'af-ZA-AdriNeural': 'Afrikaans (South Africa) - Adri',
    'af-ZA-WillemNeural': 'Afrikaans (South Africa) - Willem',
    
    // Swahili (Kenya)
    'sw-KE-RafikiNeural': 'Swahili (Kenya) - Rafiki',
    'sw-KE-ZuriNeural': 'Swahili (Kenya) - Zuri',
    
    // Swahili (Tanzania)
    'sw-TZ-DaudiNeural': 'Swahili (Tanzania) - Daudi',
    'sw-TZ-RehemaNeural': 'Swahili (Tanzania) - Rehema',
    
    // Zulu (South Africa)
    'zu-ZA-ThandoNeural': 'Zulu (South Africa) - Thando',
    'zu-ZA-ThembaNeural': 'Zulu (South Africa) - Themba',
    
    // Amharic (Ethiopia)
    'am-ET-AmehaNeural': 'Amharic (Ethiopia) - Ameha',
    'am-ET-MekdesNeural': 'Amharic (Ethiopia) - Mekdes'
};

console.log('\nAvailable African voices:');
Object.entries(VOICES).forEach(([id, name]) => {
    if (!id.startsWith('fr-')) {
        console.log(`  - ${id}: ${name}`);
    }
});

console.log('\nNote: Edge TTS requires WebSocket connection.');
console.log('The packages have compatibility issues with Node.js 22.');
console.log('\nAlternative: Use ElevenLabs with a voice from their Voice Library');
console.log('that has an African accent.');
