import { initViewToggle } from '../utils.js';
import { initFilterPopup } from '../utils.js';


document.getElementById('filterForm').addEventListener('change', () => {
    const formData = new FormData(document.getElementById('filterForm'));
    const obj = {};
    for (const [key, value] of formData.entries()) {
        if (obj[key]) {
            obj[key] = [].concat(obj[key], value);
        } else {
            obj[key] = value;
        }
    }
    localStorage.setItem('candidateFilters', JSON.stringify(obj));
});

document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    initViewToggle(csrfToken);

    const storedFilters = JSON.parse(localStorage.getItem('candidateFilters') || '{}');
    const form = document.getElementById('filterForm');

    // Restore stored filters
    for (const key in storedFilters) {
        const values = [].concat(storedFilters[key]);
        values.forEach(val => {
            const input = form.querySelector(`[name="${key}"][value="${val}"]`);
            if (input) input.checked = true;
            else {
                const field = form.querySelector(`[name="${key}"]`);
                if (field) field.value = val;
            }
        });
    }

    initFilterPopup((queryString) => {
        window.location.href = `/candidates?${queryString}`;
    });

    document.getElementById("home")?.addEventListener("click", () => {
        sessionStorage.removeItem('candidateFiltersAutoSubmitted');
        window.location.href = '/';
    });

    window.addEventListener('beforeunload', () => {
        sessionStorage.removeItem('candidateFiltersAutoSubmitted');
    });
});

