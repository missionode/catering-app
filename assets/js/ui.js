export function renderTable(headers, data, renderRow) {
    if (data.length === 0) {
        return '<p class="text-slate-500 text-center py-8">No items found.</p>';
    }

    const headerHTML = headers.map(h => `<th class="p-4 text-left font-semibold text-slate-600">${h}</th>`).join('');
    const bodyHTML = data.map(renderRow).join('');

    return `
        <table class="w-full text-sm">
            <thead class="bg-slate-100 rounded-t-lg">
                <tr>${headerHTML}</tr>
            </thead>
            <tbody>
                ${bodyHTML}
            </tbody>
        </table>
    `;
}
