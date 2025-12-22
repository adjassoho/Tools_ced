require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.HUGGINGFACE_API_KEY;
console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');

async function testSummarization() {
    const text = `L'eau est une ressource naturelle essentielle à la vie sur Terre. Elle couvre environ 71% de la surface de notre planète, mais seulement 2,5% de cette eau est douce. La gestion durable des ressources en eau est devenue un enjeu majeur du 21ème siècle, face aux défis du changement climatique et de la croissance démographique. Les conflits liés à l'eau se multiplient dans de nombreuses régions du monde.`;

    const models = [
        'facebook/bart-large-cnn',
        'sshleifer/distilbart-cnn-12-6',
        'Falconsai/text_summarization',
    ];

    for (const model of models) {
        console.log(`\nTesting model: ${model}`);
        try {
            // Nouvelle URL HuggingFace
            const response = await fetch(
                `https://router.huggingface.co/hf-inference/models/${model}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        inputs: text,
                        parameters: { max_length: 100, min_length: 20 }
                    }),
                }
            );
            
            console.log('Status:', response.status);
            const result = await response.json();
            console.log('Result:', JSON.stringify(result, null, 2));
            
            if (response.ok) {
                console.log('✅ Model works!');
                break;
            }
        } catch (err) {
            console.error('Error:', err.message);
        }
    }
}

testSummarization();
