const axios = require('axios');
const api = require('./api').api;
const config = require('./config');
const db = require('./db');
const WebSocket = require('ws');
const _ = require('lodash');
const register = async () => {
    let systemInfo = await api.getSystemInfo();
    try {
        let device = await axios.post(config.registerEndpoint, systemInfo);
        let {registrationID, deviceID} = device.data;
        let player = await db.savePlayer({registrationID, deviceID});

    } catch (error) {
        console.log(error)
    }

};

const connect = async (registrationID) => {
    const ws = new WebSocket(`wss://dev.digitalwall.in/socket/websocket?room=${registrationID}`);

    ws.on('open', function open() {
        console.log('Opened')
    });

    ws.on('message', function incoming(data) {
        db.saveServerEvent(data)
            .then(result => console.log('Log saved'))
            .catch(error => console.error(error))
    });

    ws.on('error', error => {
        console.log(error);
        setTimeout(exports.connect(registrationID), 5000) //reconnect
    })
};

const getCampaignDetails = async (clientID, campaignID, scheduleID = 'NOSCHED', schedules = []) => {
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

    for (let schedule of schedules) {
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
        let timeSeries = _.chunk(allTimeSeries,100);
        for (let ts of timeSeries) {
            let result = await db.savePlaySchedule(scheduleID, ts);
        }
    } catch (error) {
        console.error(error)
    }
};

getScheduleDetails('60mAY-vMp', 'vt_KUpdpM').then(r => console.log(r));
//exports.getCampaignDetails('60mAY-vMp', 'NryAYzXMp');

exports.bridge = {connect, getCampaignDetails, getScheduleDetails, register};