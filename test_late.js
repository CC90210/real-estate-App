const fs = require('fs');
const { Late } = require('@getlatedev/node');

(async () => {
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        const keyLine = env.split('\n').find(l => l.startsWith('LATE_API_KEY'));
        const key = keyLine.split('=')[1].replace(/\"/g, '').trim();

        const late = new Late({ apiKey: key });

        // Let's try sending it inside 'body' array
        const res = await late.profiles.createProfile({
            body: {
                name: 'PropFlow Agency'
            }
        });
        console.log('Success:', res);

    } catch (e) {
        console.error('Error MESSAGE:', e.message);
        console.error('Error RESPONSE:', e.response?.data || e);
    }
})();
