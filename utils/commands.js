const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { ipcRenderer } = require('electron');
const { password } = require('./global_values');


function executeCommand(command) {
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

      // Remove newline characters and extra whitespace
      const cleanedOutput = stdout.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      resolve(cleanedOutput);
    });
  });
}

async function createFileWithContent(fileName, content) {
  try {
    // Escape double quotes in content for command line
    const escapedContent = content.replace(/"/g, '\\"');
    //const command = ` echo ${password} | sudo -S echo "${escapedContent}" > "${fileName}"`;
    //const command = `echo ${password} | sudo -S bash -c 'echo "${escapedContent}" | tee "${fileName}" > /dev/null`;
    const command = `echo ${password} | sudo -S bash -c 'echo "${escapedContent}" | tee "${fileName}" > /dev/null'`;
    await executeCommand(command);
    ipcRenderer.send('log', `File ${fileName} created successfully.`);
  } catch (error) {
    ipcRenderer.send('log', `Failed to create file ${fileName}: ${error}`);
  }
}

function parseSize(sizeStr) {
  // Convert size string with units to bytes
  const sizeUnits = {
      'K': 1024,
      'M': 1024 ** 2,
      'G': 1024 ** 3,
      'T': 1024 ** 4
  };
  const unit = sizeStr.slice(-1);
  const size = parseFloat(sizeStr);
  if (sizeUnits[unit]) {
      return size * sizeUnits[unit];
  } else {
      return size;
  }
}

function cleanBlockDevices(jsonStr) {
  // Remove the slashes from the input JSON string
  const cleanedJsonStr = jsonStr.replace(/\\/g, '');

  // Parse the JSON string into an object
  const data = JSON.parse(cleanedJsonStr);

  // Clean and process the block device information
  const cleanedDevices = data.blockdevices.map(device => ({
      kname: device.kname,
      sizeBytes: device.size
  }));

  return cleanedDevices;
}

function cleanFilesystemInfo(inputStr) {
  const entries = inputStr.trim().split(/\s+/); // Split input string by whitespace

  const cleanedData = [];
  for (let i = 0; i < entries.length; i += 3) {
      const filesystem = entries[i].startsWith('/dev/') ? entries[i].slice(5) : entries[i];
      const size = entries[i + 1];
      const usePercentage = entries[i + 2];
      cleanedData.push({ filesystem, size, usePercentage });
  }

  return cleanedData;
}

async function getSystemInfo() {
  try {
    const disks = await executeCommand('lsblk -n -o KNAME,SIZE -J');
    const cleanedDisks = cleanBlockDevices(disks);
    const diskUsage = await executeCommand('df -h --output=source,size,pcent | grep -v -e loop -e tmp -efi');
    const cleanedDiskUsage = cleanFilesystemInfo(diskUsage);
    // const ram = await executeCommand('free -h');
    // const systemInfo = await executeCommand('sudo dmidecode -t system');

    const systemData = {
      architecture: os.arch(),
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus(),
      disks: cleanedDisks,
      diskUsage: cleanedDiskUsage,
      // ram: ram
      //systemInfo: systemInfo
    };

    // const systemData = {
    //   architecture: "yo",
    //   hostname: "yo",
    //   platform: "yo",
    //   release: "yo",
    //   totalMemory: "yo",
    //   freeMemory: "yo",
    //   cpus:"yo",
    //   disks: "yo",
    //   diskUsage: "yo",
    //   ram: "yo",
    //   systemInfo: "yo"
    // };

    return systemData
  } catch (error) {
    return {"ERROR":"Error retrieving System Information"}
  }
}

async function getFileInfo(filePath) {
  const statCommand = `echo ${password} | sudo -S stat --format="%F|%s|%A|%N" "${filePath}"`;

  try {
    const statsOutput = await executeCommand(statCommand);
    const [fileType, fileSize, filePermissions, fileName] = statsOutput.split('|');

    const isExecutable = filePermissions.includes('x');
    const isDirectory = fileType.toLowerCase().includes('directory');

    let isSymlink = fileType.toLowerCase().includes('symbolic link');
    let symlinkTargetIsDirectory = false;

    if (isSymlink) {
      const readlinkCommand = `echo ${password} | sudo -S readlink -f "${filePath}"`;
      const symlinkTarget = await executeCommand(readlinkCommand);
      const targetStatCommand = `echo ${password} | sudo -S stat --format="%F" "${symlinkTarget}"`;
      const targetType = await executeCommand(targetStatCommand);

      symlinkTargetIsDirectory = targetType.toLowerCase().includes('directory');
    }

    return {
      file_name: path.basename(fileName.trim()),
      file_type: isSymlink ? (symlinkTargetIsDirectory ? 'directory' : 'symbolic link') : fileType.toLowerCase() === 'regular file' ? path.extname(fileName.trim()) : 'directory',
      file_size: parseInt(fileSize, 10),
      absolute_path: path.resolve(filePath),
      is_directory: isDirectory || symlinkTargetIsDirectory,
      is_executable: isExecutable
    };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return undefined;
  }
}
  
  async function execute_ls(directory) {
    try {
      const files = await executeCommand(`echo ${password} | sudo -S ls -A1 "${directory}"`);
      const fileList = files.split(' ');
      const fileInfos = await Promise.all(fileList.map(async (file) => {
        const filePath = path.join(directory, file);
        return getFileInfo(filePath);
      }));
      
      const filteredFileInfos = fileInfos.filter(fileInfo => fileInfo !== undefined);

      return filteredFileInfos;
    } catch (error) {
      console.error(`Error: ${error.message}`);
      return [];
    }
  }

module.exports = { getSystemInfo, execute_ls,createFileWithContent,executeCommand };
