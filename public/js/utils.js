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

export function initFilter() {
    const openBtn = document.getElementById('openFilter');
    const closeBtn = document.getElementById('closeFilter');
    const modal = document.getElementById('filterModal');

    openBtn?.addEventListener('click', () => modal.classList.remove('hidden'));
    closeBtn?.addEventListener('click', () => modal.classList.add('hidden'));

    const form = document.getElementById('filterForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const search = formData.get('search').toLowerCase();
        const city = formData.get('city');
        const gender = formData.get('gender');

        document.querySelectorAll('.interactive-card').forEach(card => {
        const name = card.textContent.toLowerCase();
        const cardCity = card.getAttribute('data-location') || '';
        const cardGender = card.getAttribute('data-gender') || '';

        const matchSearch = name.includes(search);
        const matchCity = !city || cardCity === city;
        const matchGender = !gender || cardGender === gender;

        card.style.display = (matchSearch && matchCity && matchGender) ? '' : 'none';
        });

        modal.classList.add('hidden');
    });
}