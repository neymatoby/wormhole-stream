const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        backgroundColor: '#000000', // Matches Bornebit black
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For simple wrapper. Production apps might want true + preload.
        },
        title: "Bornebit",
        icon: path.join(__dirname, '../public/favicon.ico') // Assuming default vite favicon or similar exists
    });

    // Remove menu bar for immersive feel
    win.setMenuBarVisibility(false);

    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;

    console.log("Loading URL:", startUrl);
    win.loadURL(startUrl);

    // Open DevTools in development
    if (process.env.ELECTRON_START_URL) {
        // win.webContents.openDevTools();
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
