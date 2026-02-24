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
        console.log(`Found ${profiles?.length || 0} profiles`);

        if (profiles) {
            for (const p of profiles) {
                console.log('Deleting profile:', p.name, p._id);
                try {
                    await late.profiles.deleteProfile({ path: { id: p._id } });
                    console.log('Deleted!');
                } catch (err) {
                    console.log('Failed to delete:', err.message);
                }
            }
        }
    } catch (e) {
        console.error('Error cleanup:', e.message);
    }
})();
