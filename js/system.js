const { ipcRenderer } = require('electron');
const { getSystemInfo } = require('../utils/commands.js');

document.addEventListener('DOMContentLoaded', async function() {
    let systemData = await getSystemInfo();
    
    const systemInfoDiv = document.getElementById('system-info');
    const createSystemItem = (title, value) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'system-item';
        
        const itemTitle = document.createElement('h3');
        itemTitle.textContent = title;
        
        const itemValue = document.createElement('p');
        itemValue.textContent = value;
        
        itemDiv.appendChild(itemTitle);
        itemDiv.appendChild(itemValue);
        
        return itemDiv;
    };

    systemInfoDiv.appendChild(createSystemItem('Architecture', systemData.architecture));
    systemInfoDiv.appendChild(createSystemItem('Hostname', systemData.hostname));
    systemInfoDiv.appendChild(createSystemItem('Platform', systemData.platform));
    systemInfoDiv.appendChild(createSystemItem('Release', systemData.release));
    systemInfoDiv.appendChild(createSystemItem('Total Memory', `${(systemData.totalMemory / (1024 ** 3)).toFixed(2)} GB`));
    systemInfoDiv.appendChild(createSystemItem('Free Memory', `${(systemData.freeMemory / (1024 ** 3)).toFixed(2)} GB`));

    systemData.cpus.forEach((cpu, index) => {
        systemInfoDiv.appendChild(createSystemItem(`CPU ${index + 1}`, `${cpu.model} @ ${cpu.speed} MHz`));
    });
    
    // Create a formatted list of disks
    const disksList = document.createElement('div');
    disksList.className = 'disks-list';
    systemData.disks.forEach((disk, index) => {
        const diskDiv = document.createElement('div');
        diskDiv.className = 'disk-item';

        const diskName = document.createElement('span');
        diskName.textContent = `${disk.kname}:`;

        const diskSize = document.createElement('span');
        diskSize.textContent = disk.sizeBytes;

        diskDiv.appendChild(diskName);
        diskDiv.appendChild(diskSize);

        disksList.appendChild(diskDiv);
    });
    systemInfoDiv.appendChild(createSystemItem('Disks', ''));
    systemInfoDiv.appendChild(disksList);

    // Create a formatted list of disk usage
    const diskUsageList = document.createElement('div');
    diskUsageList.className = 'disk-usage-list';
    systemData.diskUsage.forEach((diskUsage, index) => {
        diskUsageList.appendChild(createDiskUsageItem(diskUsage));
    });
    systemInfoDiv.appendChild(createSystemItem('Disk Usage', ''));
    systemInfoDiv.appendChild(diskUsageList);

    function createDiskUsageItem(diskUsage) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'disk-usage-item';

        const filesystem = document.createElement('span');
        filesystem.textContent = diskUsage.filesystem;

        const size = document.createElement('span');
        size.textContent = diskUsage.size;

        const usePercentage = document.createElement('span');
        usePercentage.textContent = diskUsage.usePercentage;

        itemDiv.appendChild(filesystem);
        itemDiv.appendChild(size);
        itemDiv.appendChild(usePercentage);

        return itemDiv;
    }

    document.getElementById('back-button').addEventListener('click', () => {
        ipcRenderer.send('navigate', 'index.html');
    });
});
