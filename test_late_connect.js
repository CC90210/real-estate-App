const fs = require('fs');
const { Late } = require('@getlatedev/node');

(async () => {
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        const keyLine = env.split('\n').find(l => l.startsWith('LATE_API_KEY'));
        const key = keyLine.split('=')[1].replace(/\"/g, '').trim();

        const late = new Late({ apiKey: key });

        const res = await late.profiles.createProfile({
            body: { name: 'PropFlow Agency' }
        });
        const profileId = res.data.profile._id;

        console.log('Testing connect URL with query wrapping...');
        try {
            const urlData1 = await late.connect.getConnectUrl({
                query: { platform: 'instagram', profileId, redirectUrl: 'https://propflow.pro/social' }
            });
            console.log('Using query:', urlData1.data || urlData1);
        } catch (e1) {
            console.log('Query failed:', e1.message);
        }

    } catch (e) {
        console.error('Fatal:', e);
    }
})();
