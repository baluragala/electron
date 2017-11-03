const bridge = require('./bridge');

async function start() {
    let player = await bridge.register();
    await bridge.connect(player.registrationID)
}

start();