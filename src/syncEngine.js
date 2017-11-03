const bridge = require('./bridge');
const bridgeEvents = bridge.bridgeEvents;

async function start() {
    let player = await bridge.register();
}

bridgeEvents.on('new-player', args => {
    process.send(args)
});

start();