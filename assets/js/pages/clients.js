import * as storage from '../storage.js';
import { renderTable } from '../ui.js';

let content;

export function init(pageContent) {
    content = pageContent;
    document.getElementById('page-title').textContent = content.title;
    document.getElementById('add-new-button').textContent = content.addNew;
    document.getElementById('sub-title').textContent = content.allClients;

    setupEventListeners();
    renderClientsTable();
    setupModal();
}

function setupEventListeners() {
    document.getElementById('add-new-button').addEventListener('click', () => openModal());
    document.getElementById('modal-close-button').addEventListener('click', closeModal);
    document.getElementById('client-modal').addEventListener('click', (e) => { if (e.target.id === 'client-modal') closeModal(); });
    document.getElementById('client-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('clients-list').addEventListener('click', handleTableClick);
}

function renderClientsTable() {
    const clients = storage.getClients();
    const headers = ['Name', 'Contact', 'Address', 'Actions'];

    const tableHTML = renderTable(headers, clients, (client) => `
        <tr class="border-b border-slate-100">
            <td class="p-4 font-medium">${client.name}</td>
            <td class="p-4 text-slate-600 text-sm">
                <div>${client.email}</div>
                <div>${client.phone}</div>
            </td>
            <td class="p-4 text-slate-600 text-sm">${client.address || ''}</td>
            <td class="p-4 space-x-4">
                <button data-id="${client.id}" class="edit-btn text-indigo-600 hover:underline">Edit</button>
                <button data-id="${client.id}" class="delete-btn text-red-600 hover:underline">Delete</button>
            </td>
        </tr>
    `);
    
    document.getElementById('clients-list').innerHTML = tableHTML;
}

function setupModal() {
    document.getElementById('client-name-label').textContent = content.name;
    document.getElementById('client-email-label').textContent = content.email;
    document.getElementById('client-phone-label').textContent = content.phone;
    document.getElementById('client-address-label').textContent = content.address;
}

function handleFormSubmit(e) {
    e.preventDefault();
    const client = {
        id: document.getElementById('client-id').value,
        name: document.getElementById('client-name').value,
        email: document.getElementById('client-email').value,
        phone: document.getElementById('client-phone').value,
        address: document.getElementById('client-address').value,
    };
    storage.saveClient(client);
    renderClientsTable();
    closeModal();
}

function handleTableClick(e) {
    const target = e.target;
    const id = target.dataset.id;
    if (!id) return;

    if (target.classList.contains('edit-btn')) {
        const clients = storage.getClients();
        const clientToEdit = clients.find(c => c.id === id);
        if (clientToEdit) openModal(clientToEdit);
    } else if (target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this client? This might affect existing events.')) {
            storage.deleteClient(id);
            renderClientsTable();
        }
    }
}

function openModal(client = null) {
    const form = document.getElementById('client-form');
    form.reset();
    document.getElementById('modal-title').textContent = client ? 'Edit Client' : content.addNew;
    if (client) {
        document.getElementById('client-id').value = client.id;
        document.getElementById('client-name').value = client.name;
        document.getElementById('client-email').value = client.email;
        document.getElementById('client-phone').value = client.phone;
        document.getElementById('client-address').value = client.address || '';
    } else {
        document.getElementById('client-id').value = '';
    }
    document.getElementById('client-modal').classList.remove('hidden');
    document.getElementById('client-modal').classList.add('flex');
}

function closeModal() {
    document.getElementById('client-modal').classList.add('hidden');
    document.getElementById('client-modal').classList.remove('flex');
}
