import * as storage from '../storage.js';

export function init(content) {
    document.getElementById('page-title').textContent = content.title;
    document.getElementById('welcome-message').textContent = content.welcome;
    
    renderUpcomingEvents(content.upcomingEvents);
}

function renderUpcomingEvents(title) {
    const now = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(now.getDate() + 7);

    const allClients = storage.getClients();
    const events = storage.getEvents()
        .filter(event => {
            if (!event.date) return false;
            const eventDate = new Date(event.date);
            return eventDate >= now && eventDate <= oneWeekFromNow;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    let contentHTML = `<h2 class="text-xl font-semibold mb-4">${title} (Next 7 Days)</h2>`;

    if (events.length === 0) {
        contentHTML += '<div class="bg-white p-6 rounded-xl shadow-sm"><p class="text-slate-500">No upcoming events in the next 7 days.</p></div>';
    } else {
        contentHTML += '<div class="space-y-4">';
        events.forEach(event => {
            const client = allClients.find(c => c.id === event.clientId);
            const clientName = client ? client.name : 'Unknown Client';
            contentHTML += `
                <div class="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                    <div>
                        <p class="font-semibold text-indigo-600">${clientName}</p>
                        <p class="text-sm text-slate-500">${new Date(event.date).toLocaleString()}</p>
                    </div>
                    <a href="event-detail.html?id=${event.id}" class="text-sm font-medium text-indigo-600 hover:text-indigo-800">View Details</a>
                </div>
            `;
        });
        contentHTML += '</div>';
    }
    
    document.getElementById('dashboard-content').innerHTML = contentHTML;
}
