const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('back-button').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'index.html');
    });
});
