const { ipcRenderer } = require('electron');
const { password } = require('../utils/global_values');

document.addEventListener("DOMContentLoaded", async function() {
    var exploreBtn = document.getElementById("explore");
    var recoverBtn = document.getElementById("recover");
    var systemBtn = document.getElementById("system");
    var settingsBtn = document.getElementById("settings");

    exploreBtn.addEventListener("click", function() {
        ipcRenderer.send('navigate', 'disks.html');
    });

    recoverBtn.addEventListener("click", function() {
        ipcRenderer.send('navigate', 'recover.html');
    });

    systemBtn.addEventListener("click", function() {
        ipcRenderer.send('navigate', 'system.html');
    });

    settingsBtn.addEventListener("click", function() {
        ipcRenderer.send('navigate', 'settings.html');
    });

    await executeCommand(`echo ${password} | sudo -S pwd`);
});

module.exports = {ipcRenderer};

