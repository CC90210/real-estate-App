const fs = require('fs');
const { Late } = require('@getlatedev/node');

(async () => {
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        const keyLine = env.split('\n').find(l => l.startsWith('LATE_API_KEY'));
        const key = keyLine.split('=')[1].replace(/\"/g, '').trim();

        const late = new Late({ apiKey: key });

        const list = await late.profiles.listProfiles();
        const profiles = list.data?.profiles || list.profiles;
        if (!profiles || profiles.length === 0) return;
        const profileId = profiles[0]._id || profiles[0].id;

        const result = await late.connect.getConnectUrl({
            path: {
                platform: 'instagram'
            },
            query: {
                profileId: profileId,
                redirectUrl: 'https://propflow.pro/social',
            }
        });
        console.log('Success!', result.data || result);

    } catch (e) {
        console.error('Fatal:', e.message, e.response?.data || e);
    }
})();
