const mammoth = require('mammoth');
const fs = require('fs');

async function extractTP3() {
    const buffer = fs.readFileSync('TP 3 (1).docx');
    
    // Extraire en HTML pour voir la structure
    const htmlResult = await mammoth.convertToHtml({ buffer }, {
        styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Title'] => h1:fresh",
        ]
    });
    
    console.log('=== HTML Structure ===');
    console.log(htmlResult.value.substring(0, 5000));
    
    // Extraire en texte brut
    const textResult = await mammoth.extractRawText({ buffer });
    console.log('\n=== Raw Text ===');
    console.log(textResult.value.substring(0, 3000));
}

extractTP3().catch(console.error);
