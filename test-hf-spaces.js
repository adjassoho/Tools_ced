const fs = require('fs');

');

nnels
const SPACES = [
    { name: 'Whi
    { name: 'Parler TTS', url: 'ht
    { name: 'MeloTTS', url: 'http.space' },
    { name: 'OpenVoice', url: 'https:/
  ' },

];

asyn{
    console.log('\nTesting availa);
    
    const working = [];
    
    for (const space of SPACES) {
        try {
            process.stdout.write(`Testing ${space.e}... `);
            
            r();
            const timeout = setTimeout(() => controller.
            
            const response = await fetch(space.url, {
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (response.ok) {
                console.log(`✅ Online (${response.status})`);
                wace);
            } el{
                console.log(`}`);
            }
        } catch (e) {
            if (e.name === 'AbortError') {
         
     
    `);
            }
 
   }
    
    console.log('\n--- Working Spaces ---');
    
        w));
    } else {
        console.log('No spaces currently available');
    }
    
    return working;
}

async fu) {
    console.log('\n--- Testing OpenVoice Spa);
    
    try 
        const rest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ll]
            })
        });
        
 );
;
        console.log('Re));
        
    h (e) {
        console.log('Er
    }
}

asyncn main() {
    s();
    
 

    }


main();}
