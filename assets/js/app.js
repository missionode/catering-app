import * as storage from './storage.js';
import * as fileSystem from './file-system.js';

const content = {};
let autoSaveInterval = null;

const INDICATOR_STATUS = {
    INACTIVE: `<div class="flex items-center gap-2 text-amber-300 text-xs"><div class="w-2 h-2 rounded-full bg-amber-400"></div><span>Auto-Save Inactive</span></div>`,
    PERMISSION: `<div class="flex items-center gap-2 text-amber-300 text-xs"><div class="w-2 h-2 rounded-full bg-amber-400"></div><span>Permission Needed</span></div>`,
    ACTIVE: `<div class="flex items-center gap-2 text-emerald-300 text-xs"><div class="w-2 h-2 rounded-full bg-emerald-400"></div><span>Auto-Save Active</span></div>`,
    SYNCING: `<div class="flex items-center gap-2 text-sky-300 text-xs"><svg class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Syncing...</span></div>`,
    FAILED: `<div class="flex items-center gap-2 text-red-400 text-xs"><div class="w-2 h-2 rounded-full bg-red-500"></div><span>Auto-Save Failed</span></div>`,
};

const routes = { /* ... routes object ... */ };
const pageInitializers = { /* ... pageInitializers object ... */ };

async function loadContent() { /* ... unchanged ... */ }
function renderSidebar() { /* ... unchanged ... */ }
function initMobileMenu() { /* ... unchanged ... */ }

function updateAutosaveIndicator(status) {
    const indicator = document.getElementById('autosave-indicator');
    if (indicator) {
        indicator.innerHTML = INDICATOR_STATUS[status] || '';
    }
}

async function startAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    
    const handle = await fileSystem.loadFileHandle();
    if (!handle) {
        updateAutosaveIndicator('INACTIVE');
        return;
    }
    
    const hasPermission = await fileSystem.checkPermission(handle, true);
    if(!hasPermission) {
        updateAutosaveIndicator('PERMISSION');
        return;
    }

    updateAutosaveIndicator('ACTIVE');

    autoSaveInterval = setInterval(async () => {
        if (window.isDataDirty) {
            updateAutosaveIndicator('SYNCING');
            try {
                const dataString = JSON.stringify(storage.getData(), null, 2);
                await fileSystem.writeFile(handle, dataString);
                window.isDataDirty = false;
                
                const syncStatusEl = document.getElementById('autosave-sync-status');
                if(syncStatusEl) {
                    syncStatusEl.textContent = `Last synced: ${new Date().toLocaleTimeString()}`;
                }
                setTimeout(() => updateAutosaveIndicator('ACTIVE'), 500); // Show "Active" again after a short delay
            } catch (err) {
                 console.error("Auto-save failed. Permission may have been revoked.", err);
                 updateAutosaveIndicator('FAILED');
                 clearInterval(autoSaveInterval);
                 await fileSystem.deleteFileHandle();
            }
        }
    }, 3000);
}


async function main() {
    storage.init();
    await loadContent();
    renderSidebar();
    initMobileMenu();
    await startAutoSave();

    let pageFile = window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1);
    if (pageFile === '' || pageFile.endsWith('/')) {
        pageFile = 'index.html';
    }
    const routePath = '/' + pageFile;
    const pageKey = routes[routePath];
    
    if (pageKey && pageInitializers[pageKey]) {
        try {
            await pageInitializers[pageKey]();
        } catch (error) {
            console.error(`Failed to initialize page: ${pageKey}`, error);
        }
    }
}

document.addEventListener('DOMContentLoaded', main);
