const { app } = require('electron');
console.log('App object:', app ? 'DEFINED' : 'UNDEFINED');
console.log('Electron version:', process.versions.electron);

if (app) {
    app.whenReady().then(() => {
        console.log('Electron is ready!');
        process.exit(0);
    });
} else {
    console.error('Failed to get app object from require("electron")');
    process.exit(1);
}
