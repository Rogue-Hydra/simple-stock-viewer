const {app, BrowserWindow} = require('electron');
require('electron-debug');
var ipcMain = require('electron').ipcMain;
var win = null;

app.on('ready', function () {
    win = new BrowserWindow({
        width: 1280,
        height: 720,
        frame: false
    });

    win.setMenu(null);
    win.openDevTools();
    win.loadURL('file://' + __dirname + '/index.html');

    win.on('closed', function () {
        win = null;
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {

    if (win === null) {
        createWindow();
    }
});

ipcMain.on('minimize', function () {
    win.minimize();
});
ipcMain.on('maximize', function () {
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
});
ipcMain.on('close', function () {
    win = null;
    app.quit();
});