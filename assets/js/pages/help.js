export function init(content) {
    const pageTitle = document.getElementById('page-title');
    if (pageTitle && content.title) {
        pageTitle.textContent = content.title;
    }
}
