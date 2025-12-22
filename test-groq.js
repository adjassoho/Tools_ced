require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GROQ_API_KEY;
console.log('Groq API Key:', apiKey ? `${apiKey.substring(0, 15)}...` : 'NOT SET');

async function testGroq() {
    const text = `L'eau est une ressource naturelle essentielle à la vie sur Terre. Elle couvre environ 71% de la surface de notre planète, mais seulement 2,5% de cette eau est douce. La gestion durable des ressources en eau est devenue un enjeu majeur du 21ème siècle, face aux défis du changement climatique et de la croissance démographique.`;

    console.log('\nTesting Groq API...');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: 'Tu es un assistant qui résume des textes en français de manière concise.'
                },
                {
                    role: 'user',
                    content: `Résume ce texte en 2 phrases:\n\n${text}`
                }
            ],
            temperature: 0.3,
            max_tokens: 200,
        }),
    });
    
    console.log('Status:', response.status);
    const result = await response.json();
    
    if (response.ok) {
        console.log('\n✅ Groq fonctionne !');
        console.log('Résumé:', result.choices[0]?.message?.content);
    } else {
        console.log('❌ Erreur:', JSON.stringify(result, null, 2));
    }
}

testGroq();
