const sqlite3 = require('sqlite3');
const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: "./dwplayer.sqlite"
    },
    debug: true,
    useNullAsDefault: true
});


const savePlayer = player => knex('player').insert(player);
const saveServerEvent = payload => {
    let {type} = JSON.parse(payload);
    return knex('eventlog').insert({event: type, rawResponse: payload});
};
const saveCampaign = campaign => knex('campaign').insert(campaign);
const saveCampaignChannel = campaignChannel => knex('campaign_channel').insert(campaignChannel);
const saveAsset = asset => knex('asset').insert(asset);
const saveScheduledAsset = scheduledAsset => knex('scheduled_asset').insert(scheduledAsset);
const saveSchedule = schedule => knex('schedule').insert(schedule);
const savePlaySchedule = async (scheduleID, playSchedule) => knex(scheduleID).insert(playSchedule);

const updatePlayer = player => knex('player');

const deleteCampaign = campaignID => knex('campaign').where('campaignID', campaignID).del();
const deleteCampaignChannel = campaignID => knex('campaign_channel').where('campaignID', campaignID).del();
const deleteScheduledAsset = campaignID => knex('scheduled_asset').where('campaignID', campaignID).del();

const getScheduledAssets = (scheduleID) => knex
    .select('scheduled_asset.scheduleID',
        'scheduled_asset.campaignID',
        'asset.type',
        'asset.local_url as assetUrl',
        'scheduled_asset.duration',
        'scheduled_asset.animation',
        'asset.assetID')
    .from('scheduled_asset')
    .innerJoin('asset', 'asset.assetID', 'scheduled_asset.assetID')
    .where({'scheduled_asset.scheduleID': scheduleID});

const getPlayer = () => knex('player').select()

const createScheduleTable = (scheduleID) => knex.schema.createTable(scheduleID, table => {
    table.dateTime('endTime');
    table.string('campaignID');
    table.string('type');
    table.string('assetUrl');
    table.integer('duration');
    table.string('animation');
    table.string('scheduleID');
    table.string('assetID');
});


module.exports = {
    savePlayer,
    savePlaySchedule,
    saveSchedule,
    saveScheduledAsset,
    saveAsset,
    saveCampaignChannel,
    saveServerEvent,
    saveCampaign,
    createScheduleTable,
    updatePlayer,
    getScheduledAssets,
    deleteCampaign,
    deleteCampaignChannel,
    deleteScheduledAsset,
    getPlayer
};