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

export function initFilterPopup(onSubmitCallback) {
    const modal = document.getElementById('filterModal');
    const openBtn = document.getElementById('filterBtn');
    const clearBtn = document.getElementById('clearFilters');
    const form = document.getElementById('filterForm');

    const autoSubmittedKey = 'candidateFiltersAutoSubmitted';
    const clearedFlagKey = 'candidateFiltersCleared';

    openBtn.addEventListener('click', () => modal.classList.remove('hidden'));

    clearBtn.addEventListener('click', () => {
        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        localStorage.removeItem('candidateFilters');
        sessionStorage.setItem(clearedFlagKey, 'true');

        form.querySelectorAll('input[type="text"], input[type="number"]').forEach(el => {
            el.value = '';
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const params = new URLSearchParams();

        for (const [key, value] of formData.entries()) {
            params.append(key, value);
        }

        modal.classList.add('hidden');

        sessionStorage.removeItem(clearedFlagKey);

        if (onSubmitCallback) onSubmitCallback(params.toString());
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            form.requestSubmit();
        }
    });

    const wasCleared = sessionStorage.getItem(clearedFlagKey) === 'true';
    const storedFilters = JSON.parse(localStorage.getItem('candidateFilters') || '{}');
    if (Object.keys(storedFilters).length > 0 && !sessionStorage.getItem(autoSubmittedKey) && !wasCleared) {
        sessionStorage.setItem(autoSubmittedKey, 'true');
        form.requestSubmit();
    }
}