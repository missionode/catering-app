import * as storage from '../storage.js';
import { renderTable } from '../ui.js';

let content;

export function init(pageContent) {
    content = pageContent;
    document.getElementById('page-title').textContent = content.title;
    document.getElementById('add-new-button').textContent = content.addNew;
    document.getElementById('sub-title').textContent = content.allDishes;
    
    setupEventListeners();
    renderDishesTable();
    setupModal();
}

function setupEventListeners() {
    document.getElementById('add-new-button').addEventListener('click', () => openModal());
    document.getElementById('modal-close-button').addEventListener('click', closeModal);
    document.getElementById('dish-modal').addEventListener('click', (e) => {
        if (e.target.id === 'dish-modal') closeModal();
    });
    document.getElementById('dish-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('dishes-list').addEventListener('click', handleTableClick);
}

function setupModal() {
    document.getElementById('dish-name-label').textContent = content.dishName;
    document.getElementById('dish-category-label').textContent = content.category;
    document.getElementById('dish-price-label').textContent = content.price;
    document.getElementById('dish-description-label').textContent = content.description;
    document.getElementById('modal-save-button').textContent = content.saveDish;
    document.getElementById('modal-close-button').textContent = 'Cancel';
}

function renderDishesTable() {
    const dishes = storage.getDishes();
    const headers = ['Name', 'Category', 'Price', 'Actions'];
    
    const tableHTML = renderTable(headers, dishes, (dish) => `
        <tr class="border-b border-slate-100">
            <td class="p-4 font-medium">${dish.name}</td>
            <td class="p-4 text-slate-600">${dish.category}</td>
            <td class="p-4 text-slate-600">₹${Number(dish.price).toFixed(2)}</td>
            <td class="p-4 space-x-4">
                <button data-id="${dish.id}" class="edit-btn text-indigo-600 hover:underline">Edit</button>
                <button data-id="${dish.id}" class="delete-btn text-red-600 hover:underline">Delete</button>
            </td>
        </tr>
    `);
    
    document.getElementById('dishes-list').innerHTML = tableHTML;
}

function handleFormSubmit(e) {
    e.preventDefault();
    const dish = {
        id: document.getElementById('dish-id').value,
        name: document.getElementById('dish-name').value,
        category: document.getElementById('dish-category').value,
        price: document.getElementById('dish-price').value,
        description: document.getElementById('dish-description').value,
    };
    storage.saveDish(dish);
    renderDishesTable();
    closeModal();
}

function handleTableClick(e) {
    const target = e.target;
    const id = target.dataset.id;
    if (!id) return;

    if (target.classList.contains('edit-btn')) {
        const dishes = storage.getDishes();
        const dishToEdit = dishes.find(d => d.id === id);
        if (dishToEdit) openModal(dishToEdit);
    } else if (target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this dish?')) {
            storage.deleteDish(id);
            renderDishesTable();
        }
    }
}

function openModal(dish = null) {
    const form = document.getElementById('dish-form');
    form.reset();
    document.getElementById('modal-title').textContent = dish ? 'Edit Dish' : content.addNew;
    if (dish) {
        document.getElementById('dish-id').value = dish.id;
        document.getElementById('dish-name').value = dish.name;
        document.getElementById('dish-category').value = dish.category;
        document.getElementById('dish-price').value = dish.price;
        document.getElementById('dish-description').value = dish.description;
    } else {
        document.getElementById('dish-id').value = '';
    }
    document.getElementById('dish-modal').classList.remove('hidden');
    document.getElementById('dish-modal').classList.add('flex');
}

function closeModal() {
    document.getElementById('dish-modal').classList.add('hidden');
    document.getElementById('dish-modal').classList.remove('flex');
}
