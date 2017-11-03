// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const {ipcRenderer} = require('electron');
ipcRenderer.on('new-player', (event, arg) => {
    document.getElementById('msg1').innerText = arg.registrationID;
    document.getElementById('msg2').innerText = arg.message;
});
