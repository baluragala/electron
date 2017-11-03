const {app, ipcMain, BrowserWindow} = require('electron');
// Module to control application life.
//const app = electron.app;
// Module to create native browser window.
//const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');
const {fork} = require('child_process');
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.

const forkedDownloadManager = fork('./src/downloadManager.js');
const forkedSyncEngine = fork('./src/syncEngine.js');

/*forked.send({
    fileName: 'abc.mp4',
    downloadUrl: 'http://www.sample-videos.com/video/mp4/720/big_buck_bunny_720p_20mb.mp4'
});*/

/*
ipcMain.on('new-player', (event, arg) => {
    event.sender.send('new-player', arg)
});
*/

let mainWindow;
let webContents;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 600, height: 600});
    //mainWindow.setFullScreen(true);
    mainWindow.setMenu(null);
    webContents = mainWindow.webContents;
    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    //bridge.register()
    // Open the DevTools.
    //mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
        forkedDownloadManager.kill();
        forkedSyncEngine.kill();
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
forkedSyncEngine.on('message', args => {
    switch (args.event) {
        case 'NEWPLAYER':
            webContents.send('new-player', args);
            break;
    }
});