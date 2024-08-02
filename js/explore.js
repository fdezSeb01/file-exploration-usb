const { ipcRenderer } = require('electron');
const { execute_ls, createFileWithContent, executeCommand } = require('../utils/commands.js');
const { destination_folder_copy, password } = require('../utils/global_values.js');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');



document.addEventListener('DOMContentLoaded', async function() {
    let dir = "/";
    ipcRenderer.on('navigateArgs', (event, args) => {
        ipcRenderer.send('log', 'loading path: ' +args);
        dir = args;
    //dir = '/home/sebastianf/Downloads'
    const fileListDiv = document.getElementById('file-list');
    const breadcrumbDiv = document.getElementById('breadcrumb');
    const backToIndexButton = document.getElementById('back-to-index');
    const backToPrevButton = document.getElementById('back-to-prev');
    const addFileButton = document.getElementById('add-file');
    const selectModeButton = document.getElementById('select-mode');
    const fileOptionsButton = document.getElementById('file-options');
    let currentDirectory = dir;
    let directoryHistory = [];
    let selectionMode = false;
    let selectedItems = [];
    const renderBreadcrumb = (path) => {
        breadcrumbDiv.textContent = path;
    };
    const toggleSelection = (fileItem, file) => {
        const index = selectedItems.findIndex(item => item.absolute_path === file.absolute_path);
        if (index === -1) {
            selectedItems.push(file);
            fileItem.classList.add('selected');
        } else {
            selectedItems.splice(index, 1);
            fileItem.classList.remove('selected');
        }
    };
    const renderFiles = (files) => {
        fileListDiv.innerHTML = '';
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileIcon = document.createElement('span');
            fileIcon.className = 'file-icon';
            fileIcon.textContent = file.is_directory ? '📁' : '📄';
            
            const fileName = document.createElement('span');
            fileName.textContent = file.file_name.replace(/'$/, '');
            file.file_name =file.file_name.replace(/'$/, '');

            fileItem.appendChild(fileIcon);
            fileItem.appendChild(fileName);
            fileListDiv.appendChild(fileItem);

            fileItem.addEventListener('click', () => {
                if (selectionMode) {
                    toggleSelection(fileItem, file);
                } else {
                    if (file.is_directory) {
                        directoryHistory.push(currentDirectory);
                        loadDirectory(file.absolute_path);
                    } else {
                        console.log(file);
                        openPopup(file);
                    }
                }
            });
        });
        
        const openPopup = (file) => {
            const popupWindow = window.open('../template/file_viewer.html', 'File Viewer', 'width=800,height=600');
            if (!popupWindow) {
                alert('Popup blocked! Please allow popups for this site.');
                return;
            }
    
            popupWindow.addEventListener('load', async () => {
                const fileImage = popupWindow.document.getElementById('file-image');
                const fileText = popupWindow.document.getElementById('file-text');
    
                if (file.is_directory) {
                    fileText.textContent = 'This is a directory.';
                } else {
                    const fileExtension = file.file_name.split('.').pop().toLowerCase();
                    if (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png' || fileExtension === 'gif') {
                        fileImage.style.display = 'block';
                        fileImage.src = file.absolute_path;
                        fileText.style.display = 'none';
                    } else {
                        fileImage.style.display = 'none';
                        fileText.style.display = 'block';
                        try {
                            fileText.textContent = await executeCommand(`echo ${password} | sudo -S cat "${file.absolute_path}"`);
                        } catch (error) {
                            ipcRenderer.send('log', error);
                            fileText.textContent = error;
                        }
                    }
                }
            });
        };
    };
    const loadDirectory = async (directory) => {
        try {
            currentDirectory = directory;
            renderBreadcrumb(currentDirectory);
            const files = await execute_ls(directory);
            
            renderFiles(files);
        } catch (error) {
            console.error(`Error loading directory: ${error.message}`);
        }
    };
    backToIndexButton.addEventListener('click', () => {
        ipcRenderer.send('navigate', 'index.html');
    });
    backToPrevButton.addEventListener('click', () => {
        if (directoryHistory.length > 0) {
            const prevDirectory = directoryHistory.pop();
            loadDirectory(prevDirectory);
        }
    });
    addFileButton.addEventListener('click', async () => {
        try {
            openEditPopup();
            //const newFilePath = path.join(currentDirectory, 'test.txt');
            //await createFileWithContent(newFilePath, 'this is a test');
            //loadDirectory(currentDirectory); // Refresh the directory view
        } catch (error) {
            ipcRenderer.send('log', error.message);
        }
    });

    const openEditPopup = () => {
        const editPopUp = window.open(`../template/editor.html?directory=${encodeURIComponent(currentDirectory)}`, 'File Editor', 'width=800,height=600');
        if (!editPopUp) {
            alert('Popup blocked! Please allow popups for this site.');
            return;
        }

        editPopUp.addEventListener('load', async () => {
            editPopUp.document.getElementById('save-button').addEventListener('click', async () => {
                const filename = editPopUp.document.getElementById('filename').value;
                const content = editPopUp.document.getElementById('file-content').value;
        
                if (!filename) {
                    alert('Please enter a filename.');
                    return;
                }

                try{
                    let abs_path = path.join(currentDirectory, filename);

                    // Send the filename and content back to the main process
                    await createFileWithContent(abs_path, content);
                }catch(error){
                    ipcRenderer.send('log', error);
                }
                
                loadDirectory(currentDirectory); 
                editPopUp.window.close();
            });
        
            editPopUp.document.getElementById('back-button').addEventListener('click', () => {
                editPopUp.window.close();
            });
        });


    };

    fileOptionsButton.addEventListener('click', async () => {
        
        const destinationDir = destination_folder_copy;
        try {
            const username = os.userInfo().username;
            // Create the destination directory with sudo
            await executeCommand(`echo ${password} | sudo -S mkdir -p "${destinationDir}"`);
            await executeCommand(`echo ${password} | sudo -S chown -R ${username}:${username} "${destinationDir}"`);
    
            // Copy each selected item to the destination directory with sudo
            for (const item of selectedItems) {
                const destinationPath = path.join(destinationDir, path.basename(item.absolute_path));
                await executeCommand(`echo ${password} | sudo -S cp "${item.absolute_path}" "${destinationPath}"`);
                await executeCommand(`echo ${password} | sudo -S chown -R ${username}:${username} "${destinationPath}"`);
            }
    
            selectedItems = [];
            document.querySelectorAll('.file-item').forEach(item => item.classList.remove('selected'));
            selectionMode = false;
            selectModeButton.textContent = 'SELECT';
            alert(`Files copied onto ${destination_folder_copy}`);
        } catch (error) {
            ipcRenderer.send('log', error.message);
        }
    });
    selectModeButton.addEventListener('click', () => {
        selectionMode = !selectionMode;
        selectModeButton.textContent = selectionMode ? 'CANCEL SELECT' : 'SELECT';
        if (!selectionMode) {
            selectedItems = [];
            document.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('selected');
            });
        }
    });
    loadDirectory(currentDirectory);
    });
    
});
