const DB_KEY = 'cateringAppData';

// "Dirty flag" to track if data has changed since last auto-save
window.isDataDirty = false;

const getInitialData = () => ({
    dishes: [],
    clients: [],
    events: [],
    settings: {}
});

export function init() {
    if (!localStorage.getItem(DB_KEY)) {
        localStorage.setItem(DB_KEY, JSON.stringify(getInitialData()));
    }
}

export function getData() {
    try {
        return JSON.parse(localStorage.getItem(DB_KEY));
    } catch (e) {
        console.error("Error parsing data from localStorage", e);
        return getInitialData();
    }
}

export function saveData(data) {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
    window.isDataDirty = true; // Mark data as changed
}

// --- Generic CRUD Operations ---
function getItems(type) {
    const data = getData();
    return data[type] || [];
}

function saveItem(type, item) {
    const data = getData();
    if (!data[type]) data[type] = [];

    if (item.id) {
        const index = data[type].findIndex(d => d.id === item.id);
        if (index > -1) {
            data[type][index] = { ...data[type][index], ...item };
        } else {
            data[type].push(item);
        }
    } else {
        item.id = Date.now().toString();
        data[type].push(item);
    }
    saveData(data);
    return item;
}

function deleteItem(type, id) {
    const data = getData();
    if (data[type]) {
        data[type] = data[type].filter(item => item.id !== id);
        saveData(data);
    }
}

// --- Specific Implementations ---
export const getDishes = () => getItems('dishes');
export const saveDish = (dish) => saveItem('dishes', dish);
export const deleteDish = (id) => deleteItem('dishes', id);

export const getClients = () => getItems('clients');
export const saveClient = (client) => saveItem('clients', client);
export const deleteClient = (id) => deleteItem('clients', id);

export const getEvents = () => getItems('events');
export const getEventById = (id) => getItems('events').find(event => event.id === id);
export const saveEvent = (event) => saveItem('events', event);
export const deleteEvent = (id) => deleteItem('events', id);
