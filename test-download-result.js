const fs = require('fs');
const https = require('https');

// URL de l'image résultat du dernier test
const resultUrl = 'https://wxtechhk.oss-cn-hongkong.aliyuncs.com/tasks/output/watermark/570a140d-a0b0-4276-9b4f-a2f9fbeea4c6.jpg?x-oss-credential=LTAI5tGjJnh66c1txANiRBQN/20251219/cn-hongkong/oss/aliyun_v4_request&x-oss-date=20251219T011802Z&x-oss-expires=3600&x-oss-signature=e42594aa9cfd671971281e2c62594b6e0ccdab7664e1f3f681b9dd88f93d3587&x-oss-signature-version=OSS4-HMAC-SHA256';

console.log('Downloading result image...');

https.get(resultUrl, (res) => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync('result-image.jpg', buffer);
        console.log('Saved to result-image.jpg');
        console.log('Size:', buffer.length, 'bytes');
    });
}).on('error', (e) => {
    console.error('Error:', e.message);
});
