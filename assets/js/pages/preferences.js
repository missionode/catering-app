import * as storage from '../storage.js';
import * as fileSystem from '../file-system.js';

let autoSaveHandle = null;

export async function init(content) {
    // Set static text from content.json
    document.getElementById('page-title').textContent = content.title;
    document.getElementById('import-export-title').textContent = content.importExport;
    document.getElementById('import-desc').textContent = content.importDesc;
    document.getElementById('import-button').textContent = content.importButton;
    document.getElementById('export-desc').textContent = content.exportDesc;
    document.getElementById('export-button').textContent = content.exportButton;
    document.getElementById('autosave-title').textContent = content.autoSave;
    document.getElementById('autosave-desc').textContent = content.autoSaveDesc;
    document.getElementById('autosave-button-activate').textContent = content.autoSaveButton;

    setupEventListeners();
    await updateAutoSaveStatus();
}

function setupEventListeners() {
    document.getElementById('export-button').addEventListener('click', handleExport);
    document.getElementById('import-button').addEventListener('click', handleImport);
    document.getElementById('autosave-button-activate').addEventListener('click', activateAutoSave);
    document.getElementById('autosave-button-forget').addEventListener('click', forgetAutoSaveFile);
    document.getElementById('manual-sync-button').addEventListener('click', handleManualSync);
}

async function updateAutoSaveStatus() {
    autoSaveHandle = await fileSystem.loadFileHandle();
    const activeDiv = document.getElementById('autosave-status-active');
    const inactiveDiv = document.getElementById('autosave-status-inactive');
    
    if (autoSaveHandle) {
        activeDiv.classList.remove('hidden');
        inactiveDiv.classList.add('hidden');
        document.getElementById('autosave-filename').textContent = autoSaveHandle.name;
        
        const permissionStatusEl = document.getElementById('autosave-permission-status');
        const hasPermission = await fileSystem.checkPermission(autoSaveHandle, true);

        if (hasPermission) {
            permissionStatusEl.textContent = 'Status: OK';
            permissionStatusEl.className = 'mt-2 text-sm font-medium text-emerald-600 h-4';
        } else {
            permissionStatusEl.textContent = 'Action Required: Permission is needed to continue auto-saving.';
            permissionStatusEl.className = 'mt-2 text-sm font-medium text-amber-600 h-4';
        }
    } else {
        activeDiv.classList.add('hidden');
        inactiveDiv.classList.remove('hidden');
    }
}

async function activateAutoSave() {
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: `catering-autosave.json`,
            types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
        });

        if (await fileSystem.requestPermission(handle, true)) {
            await fileSystem.saveFileHandle(handle);
            alert('Auto-save activated!');
            window.isDataDirty = true;
            location.reload(); 
        } else {
            alert('Permission was not granted. Auto-save could not be activated.');
        }

    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error activating auto-save:', err);
            alert('Could not activate auto-save. See console for details.');
        }
    }
}

async function forgetAutoSaveFile() {
    if (confirm('Are you sure you want to disable auto-save? The app will forget this file.')) {
        await fileSystem.deleteFileHandle();
        alert('Auto-save has been disabled.');
        location.reload();
    }
}

async function handleManualSync() {
    const syncStatusEl = document.getElementById('autosave-sync-status');
    if (!autoSaveHandle) {
        alert('Auto-save is not configured.');
        return;
    }

    if (!(await fileSystem.requestPermission(autoSaveHandle, true))) {
        alert('Permission to save the file was denied. Please re-activate auto-save.');
        return;
    }

    try {
        syncStatusEl.textContent = 'Syncing...';
        const dataString = JSON.stringify(storage.getData(), null, 2);
        await fileSystem.writeFile(autoSaveHandle, dataString);
        window.isDataDirty = false;
        syncStatusEl.textContent = `Synced just now: ${new Date().toLocaleTimeString()}`;
        setTimeout(() => {
            if (syncStatusEl.textContent.startsWith('Synced just now')) {
                syncStatusEl.textContent = '';
            }
        }, 3000);
    } catch (err) {
        console.error('Manual sync failed:', err);
        syncStatusEl.textContent = 'Sync failed. Check console.';
    }
}

async function handleExport() {
    // ... unchanged
}

async function handleImport() {
    // ... unchanged
}
