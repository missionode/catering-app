import * as storage from '../storage.js';
import { renderTable } from '../ui.js';

let currentEventMenu = [];
let eventId = null;

export function init(content) {
    const isDetailPage = window.location.pathname.includes('event-detail.html');
    if (isDetailPage) {
        initEventDetailPage(content.eventDetail);
    } else {
        initEventsListPage(content.events);
    }
}

// --- LIST PAGE LOGIC ---

function initEventsListPage(content) {
    document.getElementById('page-title').textContent = content.title;
    document.getElementById('add-new-button').textContent = content.addNew;
    document.getElementById('sub-title').textContent = content.allEvents;
    
    document.getElementById('search-events').addEventListener('input', renderEventsTable);
    document.getElementById('filter-status').addEventListener('change', renderEventsTable);
    document.getElementById('filter-date').addEventListener('input', renderEventsTable);
    document.getElementById('events-table-container').addEventListener('click', handleTableClick);

    renderEventsTable();
}

function renderEventsTable() {
    const searchTerm = document.getElementById('search-events').value.toLowerCase();
    const filterStatus = document.getElementById('filter-status').value;
    const filterDate = document.getElementById('filter-date').value;

    let allEvents = storage.getEvents();

    // --- Sorting Logic ---
    const now = new Date();
    const pastEvents = allEvents.filter(event => new Date(event.date) < now);
    const futureEvents = allEvents.filter(event => new Date(event.date) >= now);

    pastEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    futureEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const sortedEvents = [...futureEvents, ...pastEvents];

    // 1. Filter by Status
    let filteredEvents = sortedEvents;
    if (filterStatus !== 'all') {
        filteredEvents = sortedEvents.filter(event => event.status === filterStatus);
    }
    
    // 2. Filter by Date
    if (filterDate) {
        const selectedDateStr = new Date(filterDate).toDateString();
        filteredEvents = filteredEvents.filter(event => {
            if (!event.date) return false;
            const eventDate = new Date(event.date);
            const eventDateLocalStr = new Date(eventDate.getTime() + (eventDate.getTimezoneOffset() * 60000)).toDateString();
            return eventDateLocalStr === selectedDateStr;
        });
    }

    // 3. Filter by Search Term
    let searchedEvents = filteredEvents;
    if (searchTerm) {
        const clients = storage.getClients();
        searchedEvents = filteredEvents.filter(event => {
            const client = clients.find(c => c.id === event.clientId);
            const clientName = client ? client.name.toLowerCase() : '';
            const venue = event.venue ? event.venue.toLowerCase() : '';
            return clientName.includes(searchTerm) || venue.includes(searchTerm);
        });
    }

    const headers = ['Client', 'Date', 'Venue', 'Guests', 'Status', 'Actions'];
    const tableHTML = renderTable(headers, searchedEvents, (event) => {
        const client = storage.getClients().find(c => c.id === event.clientId);
        
        const today = new Date();
        const eventDate = event.date ? new Date(event.date) : null;
        const isToday = eventDate && eventDate.toDateString() === today.toDateString();
        const highlightClass = isToday ? 'bg-sky-50 border-l-4 border-sky-400' : '';

        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${highlightClass}" data-id="${event.id}">
            <td class="p-4 font-medium">${client ? client.name : 'N/A'}</td>
            <td class="p-4 text-slate-600">${event.date ? new Date(event.date).toLocaleString() : 'N/A'}</td>
            <td class="p-4 text-slate-600">${event.venue || 'N/A'}</td>
            <td class="p-4 text-slate-600 text-center">${event.guestCount || 'N/A'}</td>
            <td class="p-4"><span class="px-2 py-1 text-xs font-medium rounded-full bg-sky-100 text-sky-800">${event.status || 'N/A'}</span></td>
            <td class="p-4 space-x-4">
                <a href="event-detail.html?id=${event.id}" class="edit-btn text-indigo-600 hover:underline">Edit</a>
                <button data-id="${event.id}" class="delete-btn text-red-600 hover:underline">Delete</button>
            </td>
        </tr>
    `});
    document.getElementById('events-table-container').innerHTML = tableHTML;
}

function handleTableClick(e) {
    const target = e.target;
    
    if (target.closest('.delete-btn')) {
        const idToDelete = target.closest('.delete-btn').dataset.id;
        if (confirm('Are you sure you want to delete this event?')) {
            storage.deleteEvent(idToDelete);
            renderEventsTable();
        }
        return; 
    }

    if (target.closest('.edit-btn')) {
        return;
    }

    const row = target.closest('tr');
    const eventId = row?.dataset.id;
    if (eventId) {
        window.location.href = `event-detail.html?id=${eventId}`;
    }
}

// --- DETAIL PAGE LOGIC ---

function initEventDetailPage(content) {
    Object.keys(content).forEach(key => {
        const el = document.getElementById(key.replace(/([A-Z])/g, "-$1").toLowerCase() + '-label') || document.getElementById(key.replace(/([A-Z])/g, "-$1").toLowerCase());
        if(el) el.textContent = content[key];
    });
    document.getElementById('page-title').textContent = content.createTitle;
    document.getElementById('event-details-title').textContent = content.eventDetails;
    document.getElementById('menu-builder-title').textContent = content.menuBuilder;
    document.getElementById('add-dish-button').textContent = content.addDish;
    document.getElementById('save-event-button').textContent = content.saveEvent;

    initClientSearch();
    
    const urlParams = new URLSearchParams(window.location.search);
    eventId = urlParams.get('id');

    if (eventId) {
        document.getElementById('page-title').textContent = content.editTitle;
        const eventData = storage.getEventById(eventId);
        if (eventData) {
            populateForm(eventData);
            currentEventMenu = eventData.menu || [];
        }
    }

    renderEventMenu();
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('event-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveEventForm();
    });
    
    document.getElementById('print-button').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('add-dish-button').addEventListener('click', openAddDishModal);
    document.getElementById('modal-close-button').addEventListener('click', closeAddDishModal);
    document.getElementById('modal-add-dishes-button').addEventListener('click', addSelectedDishesToMenu);
    document.getElementById('menu-items-container').addEventListener('input', handleMenuQuantityChange);
    document.getElementById('menu-items-container').addEventListener('click', handleRemoveDishClick);
    document.getElementById('guest-count').addEventListener('input', handleGuestCountChange);
    document.getElementById('client-id').addEventListener('change', checkForConcurrentBookings);
    document.getElementById('event-date').addEventListener('change', checkForConcurrentBookings);
}

function populateForm(event) {
    document.getElementById('client-id').value = event.clientId || '';
    if (event.clientId) {
        const client = storage.getClients().find(c => c.id === event.clientId);
        if(client) document.getElementById('client-search').value = client.name;
    }
    if (event.date) {
        const d = new Date(event.date);
        const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        document.getElementById('event-date').value = formattedDate;
    }
    document.getElementById('venue').value = event.venue || '';
    document.getElementById('guest-count').value = event.guestCount || '';
    document.getElementById('status').value = event.status || 'Tentative';
    checkForConcurrentBookings();
}

function saveEventForm() {
    const clientId = document.getElementById('client-id').value;
    const eventDateStr = document.getElementById('event-date').value;
    const venue = document.getElementById('venue').value;
    const guestCount = document.getElementById('guest-count').value;

    if (!clientId || !eventDateStr || !venue || !guestCount) {
        alert('Please fill out all required fields: Client, Date, Venue, and Guest Count.');
        return;
    }

    const eventDate = new Date(eventDateStr);
    const now = new Date();

    if (eventDate < now && !eventId) {
        alert('You cannot create an event in the past. Please select a future date and time.');
        return;
    }

    const eventData = {
        id: eventId,
        clientId: clientId,
        date: eventDateStr,
        venue: venue,
        guestCount: guestCount,
        status: document.getElementById('status').value,
        menu: currentEventMenu,
    };

    storage.saveEvent(eventData);
    alert('Event saved successfully!');
    window.location.href = 'events.html';
}

function initClientSearch() {
    const searchInput = document.getElementById('client-search');
    const resultsContainer = document.getElementById('client-search-results');
    const hiddenInput = document.getElementById('client-id');
    const allClients = storage.getClients();

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        if (!searchTerm) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('hidden');
            return;
        }
        const filteredClients = allClients.filter(client => client.name.toLowerCase().includes(searchTerm));
        resultsContainer.innerHTML = filteredClients.map(client => 
            `<div class="p-2 hover:bg-indigo-100 cursor-pointer" data-id="${client.id}" data-name="${client.name}">${client.name}</div>`
        ).join('');
        resultsContainer.classList.remove('hidden');
    });

    resultsContainer.addEventListener('click', (e) => {
        if (e.target && e.target.matches('div[data-id]')) {
            hiddenInput.value = e.target.dataset.id;
            searchInput.value = e.target.dataset.name;
            resultsContainer.classList.add('hidden');
            hiddenInput.dispatchEvent(new Event('change'));
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
}

function checkForConcurrentBookings() {
    const clientId = document.getElementById('client-id').value;
    const eventDateStr = document.getElementById('event-date').value;
    const warningEl = document.getElementById('date-warning');
    warningEl.textContent = '';

    if (!clientId || !eventDateStr) return;

    const currentEventDate = new Date(eventDateStr).toDateString();
    const otherEvents = storage.getEvents().filter(e => e.id !== eventId);
    
    const conflict = otherEvents.find(e => 
        e.clientId === clientId && new Date(e.date).toDateString() === currentEventDate
    );

    if (conflict) {
        warningEl.textContent = 'Warning: Client has another booking on this day.';
    }
}

function renderEventMenu() {
    const container = document.getElementById('menu-items-container');
    const dishLibrary = storage.getDishes();
    
    if (currentEventMenu.length === 0) {
        container.innerHTML = '<p class="text-slate-500">No dishes added to this event menu yet.</p>';
    } else {
        container.innerHTML = currentEventMenu.map(menuItem => {
            const dishDetails = dishLibrary.find(d => d.id === menuItem.dishId);
            if (!dishDetails) return '';
            return `
                <div class="flex items-center gap-4 p-2 bg-slate-50 rounded-lg">
                    <div class="flex-1">
                        <p class="font-medium">${dishDetails.name}</p>
                        <p class="text-sm text-slate-500">₹${Number(dishDetails.price).toFixed(2)} per serving</p>
                    </div>
                    <div class="flex items-center gap-2" data-quantity="${menuItem.quantity}">
                        <label for="qty-${dishDetails.id}" class="text-sm">Qty:</label>
                        <input type="number" data-dish-id="${dishDetails.id}" value="${menuItem.quantity}" min="1" class="menu-qty-input w-20 rounded-md border-slate-300 shadow-sm text-sm">
                    </div>
                    <button type="button" data-dish-id="${dishDetails.id}" class="remove-dish-btn text-red-500 hover:text-red-700 text-2xl font-bold leading-none p-1">&times;</button>
                </div>
            `;
        }).join('');
    }
    calculateTotalCost();
}

function calculateTotalCost() {
    const dishLibrary = storage.getDishes();
    let total = 0;
    currentEventMenu.forEach(menuItem => {
        const dishDetails = dishLibrary.find(d => d.id === menuItem.dishId);
        if (dishDetails) {
            total += dishDetails.price * menuItem.quantity;
        }
    });
    document.getElementById('total-cost-value').textContent = `₹${total.toFixed(2)}`;
}

function openAddDishModal() {
    const modal = document.getElementById('add-dish-modal');
    const searchInput = document.getElementById('dish-search-input');
    const dishListContainer = document.getElementById('dish-library-list');

    renderDishListInModal();
    
    searchInput.addEventListener('input', renderDishListInModal);
    dishListContainer.addEventListener('change', updateModalEstimate);
    
    updateModalEstimate();
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function renderDishListInModal() {
    const dishListContainer = document.getElementById('dish-library-list');
    const searchTerm = document.getElementById('dish-search-input').value.toLowerCase();
    
    let allDishes = storage.getDishes();
    if (searchTerm) {
        allDishes = allDishes.filter(dish =>
            dish.name.toLowerCase().includes(searchTerm) ||
            dish.category.toLowerCase().includes(searchTerm)
        );
    }
    
    dishListContainer.innerHTML = allDishes.map(dish => `
        <div class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100">
            <div>
                <p class="font-medium">${dish.name}</p>
                <p class="text-sm text-slate-500">${dish.category} - ₹${Number(dish.price).toFixed(2)}</p>
            </div>
            <input type="checkbox" data-id="${dish.id}" data-price="${dish.price}" class="dish-select-checkbox h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
        </div>
    `).join('') || `<p class="text-slate-500">No dishes match your search.</p>`;

    if (allDishes.length === 0 && !searchTerm) {
        dishListContainer.innerHTML = '<p class="text-slate-500">Your dish library is empty. Please add dishes on the "Dish Library" page first.</p>';
    }
}

function closeAddDishModal() {
    const modal = document.getElementById('add-dish-modal');
    const searchInput = document.getElementById('dish-search-input');
    const dishListContainer = document.getElementById('dish-library-list');

    searchInput.removeEventListener('input', renderDishListInModal);
    dishListContainer.removeEventListener('change', updateModalEstimate);

    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function updateModalEstimate() {
    const guestCount = parseInt(document.getElementById('guest-count').value, 10) || 1;
    const checkedBoxes = document.querySelectorAll('#dish-library-list .dish-select-checkbox:checked');
    let total = 0;
    checkedBoxes.forEach(box => {
        total += parseFloat(box.dataset.price);
    });
    document.getElementById('modal-estimate').textContent = `₹${(total * guestCount).toFixed(2)}`;
}

function addSelectedDishesToMenu() {
    const checkboxes = document.querySelectorAll('#dish-library-list .dish-select-checkbox:checked');
    const guestCount = parseInt(document.getElementById('guest-count').value, 10) || 1;
    checkboxes.forEach(box => {
        const dishId = box.dataset.id;
        if (!currentEventMenu.some(item => item.dishId === dishId)) {
            currentEventMenu.push({ dishId: dishId, quantity: guestCount });
        }
    });
    renderEventMenu();
    closeAddDishModal();
}

function handleMenuQuantityChange(e) {
    if (e.target.classList.contains('menu-qty-input')) {
        const dishId = e.target.dataset.dishId;
        const newQuantity = parseInt(e.target.value, 10) || 1;
        const menuItem = currentEventMenu.find(item => item.dishId === dishId);
        if (menuItem) {
            menuItem.quantity = newQuantity;
        }
        e.target.parentElement.dataset.quantity = newQuantity;
        calculateTotalCost();
    }
}

function handleRemoveDishClick(e) {
    const button = e.target.closest('.remove-dish-btn');
    if (button) {
        const dishId = button.dataset.dishId;
        currentEventMenu = currentEventMenu.filter(item => item.dishId !== dishId);
        renderEventMenu();
    }
}

function handleGuestCountChange(e) {
    if (currentEventMenu.length > 0) {
        if (confirm('Update all dish quantities to match the new guest count?')) {
            const newGuestCount = parseInt(e.target.value, 10) || 1;
            currentEventMenu.forEach(item => {
                item.quantity = newGuestCount;
            });
            renderEventMenu();
        }
    }
}
