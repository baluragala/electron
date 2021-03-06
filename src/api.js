const fs = require('fs');
const BluePromise = require('bluebird').Promise;
const momentTimezone = require('moment-timezone');
const moment = require('moment');

const getSystemInfo = async _ => {
    const exec = BluePromise.promisify(require('child_process').exec);
    const readFile = BluePromise.promisify(fs.readFile);

    let lscpu = await exec('lscpu');
    //let fbset = await exec('fbset -s');
    let osRelease = await readFile('/etc/os-release');


    let deviceID = 1234567890;
    let deviceModel //;= lscpu.split('\\n')[8].split(':')[1].trim();
    let deviceResolution //= fbset.split(' ')[1].replace('\\n', '').replace('"', '');
    let deviceVolume = '';
    let deviceType = '';
    let deviceOsVersion = '';
    let deviceOS = '';
    let ipv4 = '';
    let timezone = momentTimezone.tz.guess();
    let distribution; // = osRelease.toString().split('\\n')[0].split('=')[1].replace('"', '');
    let kernelVersion = '';
    let cpuFrequency; //= lscpu.split('\\n')[9].split(':')[1].strip().split('.')[0];

    return {
        deviceID,
        deviceModel,
        deviceResolution,
        deviceVolume,
        deviceType,
        deviceOsVersion,
        deviceOS,
        ipv4,
        timezone,
        distribution,
        kernelVersion,
        cpuFrequency
    }
};

const generateTimeSeries = (startTime, endTime, assets) => {
    let start = moment(startTime);
    let end = moment(endTime);
    let assetIndex = 0;
    let timeSeries = [];
    while (1) {
        if (assetIndex > assets.length - 1)
            assetIndex = 0;
        start = start.add(parseInt(assets[assetIndex].duration / 1000), 's');
        timeSeries.push(Object.assign({endTime: start.format('YYYY-MM-DD HH:mm:ss')}, assets[assetIndex]));

        if (start > end) {
            timeSeries.pop(timeSeries.length - 1);
            timeSeries.push(Object.assign({endTime: end.format('YYYY-MM-DD HH:mm:ss')}, assets[assetIndex]));
            break;
        }
        assetIndex++;
    }
    return timeSeries;
};

/*
console.log(generateTimeSeries('2017-11-02 18:00:00', '2017-11-02 18:10:05', [{
    duration: 10000,
    assetID: 1
}, {duration: 15000, assetID: 2}]));*/
const downloadAsset = async (filename, url) => {
    const path = require('path');
    const fs = require('fs');
    const mtd = require('zeltice-mt-downloader');
    if (fs.existsSync(path.join(process.env['HOME'], 'assets', `${filename}.mtd`))) {
        filename = `${filename}.mtd`;
        url = null;
    }
    let fileSavePath = path.join(process.env['HOME'], 'assets', filename);
    const downloader = new mtd(fileSavePath, url);
    await downloader.start()
};

//downloadAsset('abc.mp4', 'http://www.sample-videos.com/video/mp4/720/big_buck_bunny_720p_20mb.mp4');
module.exports = {getSystemInfo, generateTimeSeries, downloadAsset};