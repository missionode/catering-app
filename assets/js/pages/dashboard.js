import * as storage from '../storage.js';

const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ICONS = {
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
    revenue: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 11V3m0 8h8m-8 0l-4 4m12 0l-4-4m4 4v8m-12-8h8m-8 0l-4 4m12 0l-4-4m4 4v8"/></svg>`,
    outstanding: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08 .402 2.599 1M12 8V7m0 1v.01M12 12h.01M12 12V7m0 5v.01M12 12h.01M12 12V7m0 5h.01M12 12V7m0 5v4m0 0H9m3 0h3m-3 0v-4m0 4H9m3 0h3m-6 0v-4m0 4h3m3 0h3m-3 0v-4m0 4h3m-3 0h3"/></svg>`,
    users: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
};

export function init(content) {
    document.getElementById('page-title').textContent = content.title;
    document.getElementById('welcome-message').textContent = content.welcome;
    
    renderKpiCards();
    renderUpcomingEvents(content.upcomingEvents);
    renderEventStatusChart();
    renderPredictiveInsights(content.opportunities);
}

function calculateEventTotal(event) {
    if (!event || !event.menu) return 0;
    return event.menu.reduce((menuSum, item) => {
        const dish = storage.getDishes().find(d => d.id === item.dishId);
        return menuSum + (dish ? dish.price * item.quantity : 0);
    }, 0);
}

function renderKpiCards() {
    const events = storage.getEvents();
    const clients = storage.getClients();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const upcomingEvents = events.filter(e => new Date(e.date) >= now);
    const upcomingRevenue = upcomingEvents.reduce((sum, event) => sum + calculateEventTotal(event), 0);
    
    const uncollectedEvents = events.filter(e => !e.paymentCollected);
    const outstandingPayments = uncollectedEvents.reduce((sum, event) => {
        const total = calculateEventTotal(event);
        const advance = event.advancePaid || 0;
        const discount = event.discount || 0;
        const balance = total - discount - advance;
        return sum + (balance > 0 ? balance : 0);
    }, 0);

    const newClientsThisMonth = clients.filter(c => c.createdAt && new Date(c.createdAt) >= startOfMonth);

    document.getElementById('kpi-upcoming-events').innerHTML = createKpiCard(ICONS.calendar, upcomingEvents.length, "Upcoming Events");
    document.getElementById('kpi-upcoming-revenue').innerHTML = createKpiCard(ICONS.revenue, formatCurrency(upcomingRevenue), "Est. Upcoming Revenue");
    document.getElementById('kpi-outstanding-payments').innerHTML = createKpiCard(ICONS.outstanding, formatCurrency(outstandingPayments), "Outstanding Payments");
    document.getElementById('kpi-new-clients').innerHTML = createKpiCard(ICONS.users, newClientsThisMonth.length, "New Clients This Month");
}

function renderUpcomingEvents(title) {
    document.getElementById('upcoming-events-title').textContent = `${title} (Next 7 Days)`;
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

    const container = document.getElementById('upcoming-events-list');
    if (events.length === 0) {
        container.innerHTML = '<div class="bg-white p-6 rounded-xl shadow-sm"><p class="text-slate-500">No upcoming events in the next 7 days.</p></div>';
        return;
    }

    container.innerHTML = events.map(event => {
        const client = allClients.find(c => c.id === event.clientId);
        return `
            <a href="event-detail.html?id=${event.id}" class="block bg-white p-4 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-semibold text-indigo-600">${client ? client.name : 'Unknown Client'}</p>
                        <p class="text-sm text-slate-500">${new Date(event.date).toLocaleString()}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-slate-500">${event.guestCount} Guests</p>
                        <span class="px-2 py-1 text-xs font-medium rounded-full bg-sky-100 text-sky-800">${event.status}</span>
                    </div>
                </div>
            </a>
        `;
    }).join('');
}

function renderEventStatusChart() {
    const events = storage.getEvents();
    const statusCounts = events.reduce((acc, event) => {
        acc[event.status] = (acc[event.status] || 0) + 1;
        return acc;
    }, {});

    const container = document.getElementById('event-status-chart');
    if (events.length === 0) {
        container.innerHTML = `<p class="text-center text-slate-500">No event data for chart.</p>`;
        return;
    }

    const statusColors = {
        'Tentative': 'bg-yellow-400',
        'Confirmed': 'bg-sky-400',
        'Completed': 'bg-emerald-400',
        'Cancelled': 'bg-slate-400'
    };

    container.innerHTML = Object.entries(statusCounts).map(([status, count]) => {
        const percentage = (count / events.length) * 100;
        return `
            <div>
                <div class="flex justify-between items-center mb-1 text-sm">
                    <span class="font-medium text-slate-700">${status}</span>
                    <span class="text-slate-500">${count}</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-2.5">
                    <div class="${statusColors[status] || 'bg-gray-400'} h-2.5 rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderPredictiveInsights(title) {
    document.getElementById('opportunities-title').textContent = title;
    const container = document.getElementById('predictive-insights');
    const allEvents = storage.getEvents();
    const allClients = storage.getClients();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneMonthFromNow = new Date();
    oneMonthFromNow.setDate(today.getDate() + 30);
    
    const elevenMonthsAgo = new Date();
    elevenMonthsAgo.setMonth(today.getMonth() - 11);
    
    const tenMonthsAgo = new Date();
    tenMonthsAgo.setMonth(today.getMonth() - 10);

    const recurringEventTypes = ['Birthday', 'Anniversary'];
    let opportunities = [];

    allEvents.forEach(event => {
        if (!event.date || !event.eventType) return;
        
        const eventDate = new Date(event.date);
        if (eventDate >= today) return;

        const client = allClients.find(c => c.id === event.clientId);
        if (!client) return;

        // Logic for recurring types like Birthdays
        if (recurringEventTypes.includes(event.eventType)) {
            let anniversaryDate = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
            if (anniversaryDate < today) {
                anniversaryDate.setFullYear(today.getFullYear() + 1);
            }
            if (anniversaryDate >= today && anniversaryDate <= oneMonthFromNow) {
                opportunities.push({
                    event: event,
                    client: client,
                    message: `Had a <b>${event.eventType}</b> event around this time last year. Good time to follow up!`
                });
            }
        }

        // Logic for corporate events
        if (event.eventType === 'Corporate') {
            if (eventDate >= elevenMonthsAgo && eventDate < tenMonthsAgo) {
                 opportunities.push({
                    event: event,
                    client: client,
                    message: `It's been almost a year since their last <b>Corporate</b> event. Time to reconnect!`
                });
            }
        }
    });
    
    if(opportunities.length === 0) {
        container.innerHTML = '<div class="bg-white p-6 rounded-xl shadow-sm"><p class="text-slate-500">No upcoming opportunities in the next month.</p></div>';
        return;
    }

    container.innerHTML = opportunities.map(opp => {
        return `
            <div class="bg-white p-4 rounded-xl shadow-sm">
                 <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <p class="font-semibold text-sky-600">${opp.client.name}</p>
                        <p class="text-sm text-slate-500">${opp.message}</p>
                        <p class="text-xs text-slate-400 mt-1">Original Event: ${new Date(opp.event.date).toLocaleDateString()}</p>
                    </div>
                    <a href="event-detail.html" class="text-sm font-medium bg-slate-100 px-3 py-1 rounded-lg hover:bg-slate-200 whitespace-nowrap ml-4">New Event</a>
                </div>
            </div>
        `;
    }).join('');
}

function createKpiCard(icon, value, label) {
    return `
        ${icon}
        <div>
            <p class="text-2xl font-bold text-slate-900">${value}</p>
            <p class="text-sm font-medium text-slate-500">${label}</p>
        </div>
    `;
}
