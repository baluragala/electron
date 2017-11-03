const bridge = require('./bridge');

async function start() {
    let player = await bridge.register();
}

start();