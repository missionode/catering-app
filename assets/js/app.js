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

const routes = {
    '/index.html': 'dashboard',
    '/events.html': 'events',
    '/event-detail.html': 'events',
    '/clients.html': 'clients',
    '/dishes.html': 'dishes',
    '/preferences.html': 'preferences',
    '/help.html': 'help'
};

const pageInitializers = {
    dashboard: () => import('./pages/dashboard.js').then(module => module.init(content.dashboard)),
    events: () => import('./pages/events.js').then(module => module.init(content)),
    clients: () => import('./pages/clients.js').then(module => module.init(content.clients)),
    dishes: () => import('./pages/dishes.js').then(module => module.init(content.dishes)),
    preferences: () => import('./pages/preferences.js').then(module => module.init(content.preferences)),
    help: () => import('./pages/help.js').then(module => module.init(content.help))
};

async function loadContent() {
    try {
        const response = await fetch('content.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonContent = await response.json();
        Object.assign(content, jsonContent);
    } catch (error) {
        console.error('Failed to load content.json:', error);
        Object.assign(content, { navigation: {}, appName: 'App' }); 
    }
}

function renderSidebar() {
    const nav = content.navigation || {};
    const appName = content.appName || 'App';
    
    const path = window.location.pathname;
    const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

    const sidebarHTML = `
        <aside id="sidebar" class="w-64 bg-indigo-600 text-white flex flex-col fixed inset-y-0 left-0 z-30 transform -translate-x-full transition-transform duration-300 ease-in-out md:relative md:translate-x-0">
            <div class="h-20 flex items-center justify-center border-b border-indigo-700">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-sky-400 rounded-lg flex items-center justify-center font-bold text-indigo-800 text-xl">
                        ${appName.charAt(0) || 'A'}
                    </div>
                    <span class="text-2xl font-bold">${appName}</span>
                </div>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                <a href="index.html" class="nav-link ${currentPage === 'index.html' ? 'active' : ''}">${nav.dashboard || 'Dashboard'}</a>
                <a href="events.html" class="nav-link ${['events.html', 'event-detail.html'].includes(currentPage) ? 'active' : ''}">${nav.events || 'Events'}</a>
                <a href="clients.html" class="nav-link ${currentPage === 'clients.html' ? 'active' : ''}">${nav.clients || 'Clients'}</a>
                <a href="dishes.html" class="nav-link ${currentPage === 'dishes.html' ? 'active' : ''}">${nav.dishes || 'Dishes'}</a>
            </nav>
            <div class="p-4 border-t border-indigo-700 space-y-2">
                 <a href="preferences.html" class="nav-link ${currentPage === 'preferences.html' ? 'active' : ''}">${nav.preferences || 'Preferences'}</a>
                 <a href="help.html" class="nav-link ${currentPage === 'help.html' ? 'active' : ''}">${nav.help || 'Help'}</a>
                 <div id="autosave-indicator" class="px-1 pt-2"></div>
            </div>
        </aside>
        <div id="sidebar-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-20 hidden md:hidden"></div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        .nav-link { display: block; padding: 0.75rem 1rem; border-radius: 0.5rem; transition: background-color 0.2s; font-weight: 500; }
        .nav-link:hover { background-color: rgba(255, 255, 255, 0.1); }
        .nav-link.active { background-color: rgba(255, 255, 255, 0.2); }
    `;
    document.head.appendChild(style);

    const wrapper = document.getElementById('app-wrapper');
    wrapper.insertAdjacentHTML('afterbegin', sidebarHTML);
}

function initMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const pageTitle = document.getElementById('page-title');

    if (!pageTitle || !sidebar || !overlay) return;

    const menuButton = document.createElement('button');
    menuButton.id = 'menu-toggle';
    menuButton.className = 'p-2 rounded-md text-slate-600 hover:bg-slate-200 md:hidden';
    menuButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>`;
    
    pageTitle.insertAdjacentElement('beforebegin', menuButton);

    const toggleSidebar = () => {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    };

    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });
    overlay.addEventListener('click', toggleSidebar);
}

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
                setTimeout(() => updateAutosaveIndicator('ACTIVE'), 500);
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