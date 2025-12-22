const mammoth = require('mammoth');
const fs = require('fs');

async function extractTD() {
    const buffer = fs.readFileSync('TD_Chapitre3.docx');
    
    // Extraire en HTML pour voir la structure
    const htmlResult = await mammoth.convertToHtml({ buffer }, {
        styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
        ]
    });
    
    console.log('=== HTML Structure ===');
    console.log(htmlResult.value);
    
    console.log('\n\n=== Raw Text ===');
    const textResult = await mammoth.extractRawText({ buffer });
    console.log(textResult.value);
}

extractTD().catch(console.error);
