const downloadAsset = require('./api').downloadAsset;

process.on('message', async options => {
    try {
        await downloadAsset(options.fileName, options.downloadUrl);
    } catch (error) {
        console.error(error);
        process.send(error);
    }
    process.send('done');
});

