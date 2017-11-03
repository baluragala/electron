const axios = require('axios');
const api = require('./api');
const config = require('./config');
const db = require('./db');
const WebSocket = require('ws');
const _ = require('lodash');

const register = async () => {
    let players = await db.getPlayer();
    console.log(players);
    if (!players.length) {
        let systemInfo = await api.getSystemInfo();
        try {
            let device = await axios.post(config.registerEndpoint, systemInfo);
            let {registrationID, deviceID} = device.data;
            players = await db.savePlayer({registrationID, deviceID});
            players = await db.getPlayer();
        } catch (error) {
            console.log(error)
        }
    }
    await connect(players[0].registrationID)
};

const connect = async (registrationID) => {
    console.log('Connecting for registration:' + registrationID);
    const ws = new WebSocket(`wss://dev.digitalwall.in/socket/websocket?room=${registrationID}`);

    ws.on('open', function open(s) {
        console.log('Opened')
    });

    ws.on('message', async function incoming(data) {
        console.log(JSON.stringify(data));
        await db.saveServerEvent(data);
        await processServerEvent(JSON.parse(data));
    });

    ws.on('error', error => {
        console.log(error);
        setTimeout(exports.connect(registrationID), 5000) //reconnect
    })
};

const processServerEvent = async (event) => {
    console.log('Processing server event ' + event);
    console.log(event.type);
    let {clientID, orientation, volume, campID, schedules, scheduleID} = event;
    switch (event.type) {
        case 'PLAYERCREATED':
        case 'PLAYERUPDATED':
            await db.updatePlayer({clientID, orientation, volume});
            await getCampaignDetails(clientID, campID);
            await inheritSchedules(clientID, schedules);
            break;
        case 'SCHEDULECREATED':
            await getScheduleDetails(clientID, scheduleID);
            break;
        case 'SCHEDULEUPDATED':
            await db.deleteSchedule(scheduleID);
            await db.dropSchedulePlay(scheduleID);
            await getScheduleDetails(clientID, scheduleID);
            break;
        case 'SCHEDULEDELETED':
            await db.deleteSchedule(scheduleID);
            await db.dropSchedulePlay(scheduleID);
            break;
    }
};

const getCampaignDetails = async (clientID, campaignID, scheduleID = 'NOSCHED', futureSchedules = []) => {
    let headers = {clientID};
    let response = await axios.get(`${config.campaignEndpoint}/${campaignID}`, {headers});
    console.log(JSON.stringify(response.data));
    let {
        layout,
        campaignName: name,
        campaignStatus: status,
        type,
        orientation: layoutOrientation,
        resolution: layoutResolution
    } = response.data;

    try {
        let result = await db.saveCampaign({
            campaignID, clientID, name, status,
            type, layoutOrientation, layoutResolution
        });
    } catch (error) {
        console.error(error)
    }
    //channels = channels || []; // hack to fix undefined of channels
    for (let channel of layout.channels) {
        let {
            id: channelID, channelTime,
            duration, fill, height, left, mediaCount, top, volume, width, assets
        } = channel;
        try {
            let result = await db.saveCampaignChannel({
                campaignID, channelID, channelTime,
                duration, fill, height, left, mediaCount, top, volume, width
            });
        } catch (error) {
            console.error(error)
        }

        for (let asset of assets) {
            let {
                _id: assetID, originalName, type, url: downloadUrl,
                vimeoId, duration, campaignAnimation: animation, sequence
            } = asset;

            try {
                let assetSaveresult = await db.saveAsset({assetID, originalName, type, downloadUrl, vimeoId})
            } catch (error) {
                console.error(error)
            }
            try {
                let scheduledAssetSaveresult = await db.saveScheduledAsset({
                    assetID, campaignID, channelID,
                    scheduleID, duration, animation, sequence
                })
            } catch (error) {
                console.error(error)
            }

        }
    }
    console.log('Creating schedule play times for schedules' + JSON.stringify(futureSchedules));
    if (futureSchedules)
        for (let schedule of futureSchedules) {
            let startTime = schedule.startDate + ' ' + schedule.startTime;
            let endTime = schedule.endDate + ' ' + schedule.endTime;
            await createScheduleSplit(scheduleID, startTime, endTime);
        }
};

const getScheduleDetails = async (clientID, scheduleID) => {
    let headers = {clientID};
    let response = await axios.get(`${config.scheduleEndpoint}/${scheduleID}?outputFilters={"campaignId":1,"schedules":1}`, {headers});
    console.log(JSON.stringify(response.data));
    let {
        schedules,
        campaignId: campaignID
    } = response.data;

    for (let schedule of schedules) {
        let {
            startTime,
            startDate,
            endTime,
            endDate
        } = schedule;

        let startDateTime = startDate + ' ' + startTime;
        let endDateTime = endDate + ' ' + endTime;
        try {
            let result = await db.saveSchedule({
                scheduleID,
                campaignID,
                startDateTime,
                endDateTime
            })
        } catch (error) {
            console.error(error)
        }
    }

    try {
        await db.createScheduleTable(scheduleID);
    } catch (error) {
        console.error(error)
    }
    await getCampaignDetails(clientID, campaignID, scheduleID, schedules);
};

const createScheduleSplit = async (scheduleID, startTime, endTime) => {
    try {
        let assets = await db.getScheduledAssets(scheduleID);
        let allTimeSeries = await api.generateTimeSeries(startTime, endTime, assets);
        let timeSeries = _.chunk(allTimeSeries, 100);
        for (let ts of timeSeries) {
            let result = await db.savePlaySchedule(scheduleID, ts);
        }
    } catch (error) {
        console.error(error)
    }
};

const inheritSchedules = async (clientID, scheduleIDs) => {
    for (let scheduleID of scheduleIDs) {
        await getScheduleDetails(clientID, scheduleID)
    }
};

//getScheduleDetails('60mAY-vMp', 'vt_KUpdpM').then(r => console.log(r));
//exports.getCampaignDetails('60mAY-vMp', 'NryAYzXMp');

module.exports = {connect, getCampaignDetails, getScheduleDetails, register};