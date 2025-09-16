import * as storage from './storage.js';
import * as fileSystem from './file-system.js';

const content = {};
let autoSaveInterval = null;

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
};

async function loadContent() {
    try {
        const response = await fetch('content.json');
        const jsonContent = await response.json();
        Object.assign(content, jsonContent);
    } catch (error) {
        console.error('Failed to load content.json:', error);
    }
}

function renderSidebar() {
    const nav = content.navigation;
    const appName = content.appName;
    
    // Get the current filename to correctly highlight the active link
    const path = window.location.pathname;
    const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

    const sidebarHTML = `
        <aside id="sidebar" class="w-64 bg-indigo-600 text-white flex flex-col fixed inset-y-0 left-0 z-30 transform -translate-x-full transition-transform duration-300 ease-in-out md:relative md:translate-x-0">
            <div class="h-20 flex items-center justify-center border-b border-indigo-700">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-sky-400 rounded-lg flex items-center justify-center font-bold text-indigo-800 text-xl">
                        ${appName.charAt(0)}
                    </div>
                    <span class="text-2xl font-bold">${appName}</span>
                </div>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                <a href="index.html" class="nav-link ${currentPage === 'index.html' ? 'active' : ''}">${nav.dashboard}</a>
                <a href="events.html" class="nav-link ${['events.html', 'event-detail.html'].includes(currentPage) ? 'active' : ''}">${nav.events}</a>
                <a href="clients.html" class="nav-link ${currentPage === 'clients.html' ? 'active' : ''}">${nav.clients}</a>
                <a href="dishes.html" class="nav-link ${currentPage === 'dishes.html' ? 'active' : ''}">${nav.dishes}</a>
            </nav>
            <div class="p-4 border-t border-indigo-700 space-y-2">
                 <a href="preferences.html" class="nav-link ${currentPage === 'preferences.html' ? 'active' : ''}">${nav.preferences}</a>
                 <a href="help.html" class="nav-link ${currentPage === 'help.html' ? 'active' : ''}">${nav.help}</a>
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

    if (!pageTitle) return;

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

async function startAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    const indicator = document.getElementById('autosave-indicator');
    const handle = await fileSystem.loadFileHandle();
    
    if (!handle) {
        indicator.innerHTML = `
            <div class="flex items-center gap-2 text-amber-300 text-xs">
              <div class="w-2 h-2 rounded-full bg-amber-400"></div>
              <span>Auto-Save Inactive</span>
            </div>`;
        return;
    }
    
    const hasPermission = await fileSystem.checkPermission(handle, true);
    if(!hasPermission) {
        indicator.innerHTML = `
            <div class="flex items-center gap-2 text-amber-300 text-xs">
              <div class="w-2 h-2 rounded-full bg-amber-400"></div>
              <span>Permission Needed</span>
            </div>`;
        return;
    }

    indicator.innerHTML = `
        <div class="flex items-center gap-2 text-emerald-300 text-xs">
          <div class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span>Auto-Save Active</span>
        </div>`;

    autoSaveInterval = setInterval(async () => {
        if (window.isDataDirty) {
            try {
                console.log('Auto-saving changes...');
                const dataString = JSON.stringify(storage.getData(), null, 2);
                await fileSystem.writeFile(handle, dataString);
                window.isDataDirty = false;
                
                const syncStatusEl = document.getElementById('autosave-sync-status');
                if(syncStatusEl) {
                    syncStatusEl.textContent = `Last synced: ${new Date().toLocaleTimeString()}`;
                }
            } catch (err) {
                 console.error("Auto-save failed. Permission may have been revoked.", err);
                 indicator.innerHTML = `
                    <div class="flex items-center gap-2 text-red-400 text-xs">
                      <div class="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>Auto-Save Failed</span>
                    </div>`;
                 clearInterval(autoSaveInterval);
                 await fileSystem.deleteFileHandle();
            }
        }
    }, 15000);
}


async function main() {
    storage.init();
    await loadContent();
    renderSidebar();
    initMobileMenu();
    await startAutoSave();

    // --- FIX IS HERE ---
    // Get the filename from the full path
    let pageFile = window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1);
    
    // Default to index.html if the path is empty (like the root of the site)
    if (pageFile === '') {
        pageFile = 'index.html';
    }
    
    // Look up the route using the correct format
    const pageKey = routes['/' + pageFile];
    // --- END OF FIX ---
    
    if (pageKey && pageInitializers[pageKey]) {
        try {
            await pageInitializers[pageKey]();
        } catch (error) {
            console.error(`Failed to initialize page: ${pageKey}`, error);
        }
    }
}

document.addEventListener('DOMContentLoaded', main);