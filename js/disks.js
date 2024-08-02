const { exec } = require('child_process');
const { password } = require('../utils/global_values.js');
const { ipcRenderer } = require('electron');

async function loadDisks() {
    exec('lsblk -o KNAME,FSTYPE,MOUNTPOINT -J', (error, stdout) => {
        if (error) {
            ipcRenderer.send('log', error);
            return;
        }
        const fdisks = [{
          kname: "root",
          fstype: "notnull",
          mountpoint: "/"
        }];

        // Parse and filter the stdout, then concatenate the result
        const diskData = JSON.parse(stdout).blockdevices.filter(device => device.fstype);
        const disks = fdisks.concat(diskData);

        const diskSelect = document.getElementById('disk-list');

        disks.forEach(disk => {
            const btn = document.createElement('button');
            btn.className = 'button';
            btn.id = disk.kname;
            btn.value = disk.kname;
            btn.mntpoint = disk.mountpoint || null;
            btn.textContent = disk.kname;

            btn.addEventListener('click', async () => {
                let chosen_dir = await handleDeviceMount(btn.value, btn.mntpoint);
                ipcRenderer.send('navigateArgs', 'explore.html', chosen_dir);
            });

            diskSelect.appendChild(btn);
        });
    });
}

async function exec_command(command){
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            //reject(error);
            ipcRenderer.send('log', error);
            //console.log(error);
            //return;
          }
          if (stderr) {
            //reject(stderr);
            ipcRenderer.send('log', stderr);
    
            //console.log(stderr);
            //return;
          }
    
          resolve(stdout);
        });
      });
}

async function handleDeviceMount(devicePath, mountpoint) {
  if (mountpoint) {
      ipcRenderer.send('log', 'Entered valid mountpoint: '+mountpoint);
      return mountpoint.endsWith('/') ? mountpoint : mountpoint + '/';
  } else {
      ipcRenderer.send('log', 'Trying to mount device '+devicePath);
      return await mountDevice(devicePath);
  }
}

async function mountDevice(diskName) {
  const mkdir_command = `mkdir -p /mnt/${diskName}`;
  const diskCommand = `mount /dev/${diskName} /mnt/${diskName}`;
  const fullCommand1 = `echo ${password} | sudo -S ${mkdir_command}`;
  const fullCommand2 = `echo ${password} | sudo -S ${diskCommand}`;

  try {
      await exec_command(fullCommand1);
      //alert('Succes creating dir: '+ `/mnt/${diskName}/`);
      ipcRenderer.send('log', 'Succes creating dir: '+ `/mnt/${diskName}/`);
      await exec_command(fullCommand2);
      //alert('Succes mounting returning: '+ `/mnt/${diskName}/`);
      ipcRenderer.send('log','Succes mounting returning: '+ `/mnt/${diskName}/`) ;
      return `/mnt/${diskName}/`;
  } catch (error) {
      ipcRenderer.send('log', error);
      return '/';
  }
}


document.addEventListener('DOMContentLoaded', loadDisks);
