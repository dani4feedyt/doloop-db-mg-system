export function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

export function initViewToggle() {
    const toggle = document.getElementById('toggleView');
    const cardView = document.getElementById('cardView');
    const tableView = document.getElementById('tableView');

    if (!toggle || !cardView || !tableView) return;

    const lastView = localStorage.getItem('viewMode');
    if (lastView === 'table') {
        toggle.checked = true;
        cardView.classList.add('view-hidden');
        tableView.classList.remove('view-hidden');
    }

    toggle.addEventListener('change', () => {
        const tableMode = toggle.checked;
        localStorage.setItem('viewMode', tableMode ? 'table' : 'card');

        cardView.classList.toggle('view-hidden', tableMode);
        tableView.classList.toggle('view-hidden', !tableMode);
    });
}