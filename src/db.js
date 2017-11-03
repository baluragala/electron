const sqlite3 = require('sqlite3');
const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: "./dwplayer.sqlite"
    },
    debug: true,
    useNullAsDefault: true
});

exports.savePlayer = player => knex('player').insert(player);
exports.saveServerEvent = payload => {
    let {type} = JSON.parse(payload);
    return knex('eventlog').insert({event: type, rawResponse: payload});
};
exports.saveCampaign = campaign => knex('campaign').insert(campaign);
exports.saveCampaignChannel = campaignChannel => knex('campaign_channel').insert(campaignChannel);
exports.saveAsset = asset => knex('asset').insert(asset);
exports.saveScheduledAsset = scheduledAsset => knex('scheduled_asset').insert(scheduledAsset);
exports.saveSchedule = schedule => knex('schedule').insert(schedule);

exports.updatePlayer = player => knex('player');

exports.deleteCampaign = campaignID => knex('campaign').where('campaignID', campaignID).del();
exports.deleteCampaignChannel = campaignID => knex('campaign_channel').where('campaignID', campaignID).del();
exports.deleteScheduledAsset = campaignID => knex('scheduled_asset').where('campaignID', campaignID).del();

/*
select sa.campaignID,a.type,
'assets/'|| a.assetID ||'.'||replace(downloadUrl, rtrim(downloadUrl, replace(downloadUrl, '.', '' ) ), '') as local_url,
    sa.duration,sa.animation,sa.scheduleID, a.assetID
from scheduled_asset sa, asset a where a.assetID=sa.assetID
and sa.scheduleID=? order by sa.sequence""", (scheduleID,))*/

exports.getScheduledAssets = (scheduleID) => knex
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

exports.createScheduleTable = (scheduleID) => knex.schema.createTable(scheduleID, table => {
    table.dateTime('endTime');
    table.string('campaignID');
    table.string('type');
    table.string('assetUrl');
    table.integer('duration');
    table.string('animation');
    table.string('scheduleID');
    table.string('assetID');
});

exports.savePlaySchedule = async (scheduleID, playSchedule) => knex(scheduleID).insert(playSchedule);
