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

    document.querySelectorAll('.delete-link').forEach(link => {
        link.addEventListener('click', async (e) => {
        e.preventDefault();

        const userId = link.dataset.id;
        if (!userId) return;

        if (!confirm('Are you sure you want to delete this candidate?')) return;

        try {
            const res = await fetch(`/bio/${userId}/delete`, {
            method: 'POST',
            headers: {
                'CSRF-Token': csrfToken
            }
            });

            if (!res.ok) throw new Error(await res.text());

            alert('Candidate deleted.');
            const container = link.closest('.candidate-card, .candidate-row');
            if (container) container.remove();
            window.location.href = '/candidates';
        } catch (err) {
            alert('Failed to delete candidate: ' + err.message);
        }
    });
    });

    window.addEventListener('beforeunload', () => {
        sessionStorage.removeItem('candidateFiltersAutoSubmitted');
    });
});

