import { debounce } from './utils.js';

export function attachCellEditors(csrfToken) {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const [resource, userId] = pathParts.length >= 2 ? pathParts : [null, null];

    if (!resource || !userId) {
        console.warn("attachCellEditors: couldn't determine resource or user ID from URL.");
        return;
    }

    const table = document.querySelector('table.editable-table');
    if (!table) {
        console.warn("attachCellEditors: no editable table found (missing .editable-table class).");
        return;
    }

    const isValidEmail = val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    const isValidURL = val => /^https?:\/\/.+/.test(val);
    
    table.querySelectorAll('td[data-field]').forEach(cell => {
        const field = cell.dataset.field;
        const type = cell.dataset.type || 'text';

        if (!field) return;

        const saveValue = async (value) => {
            try {
                const res = await fetch(`/${resource}/${userId}/update-field`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ field, value })
                });

                if (!res.ok) {
                    const err = await res.text();
                    alert('Update failed: ' + err);
                    return false;
                }

                return true;
            } catch (err) {
                console.error('Fetch failed:', err);
                return false;
            }
        };

        if (type === 'list') {
        cell.addEventListener('click', async () => {
            if (cell.querySelector('select')) return;
            if (cell.classList.contains('custom')) return;

            const currentValue = cell.textContent.trim();
            const select = document.createElement('select');

            // Fetch from dynamic source if available
            let options = [];
            const optionsSource = cell.dataset.optionsSource;
            if (optionsSource) {
                try {
                    const res = await fetch(optionsSource);
                    options = await res.json(); // expected: [{ name, value }]
                } catch (e) {
                    console.error("Failed to fetch options:", e);
                    return alert('Could not load options.');
                }
            } else if (cell.dataset.options) {
                options = cell.dataset.options.split(',').map(o => {
                    const val = o.trim();
                    return { name: val, value: val };
                });
            }

            options.forEach(({ name, value }) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = name;
                if (value === currentValue) option.selected = true;
                select.appendChild(option);
            });

            cell.textContent = '';
            cell.appendChild(select);
            select.focus();

            const save = async () => {
                const value = select.value;
                const success = await saveValue(value);
                if (success) {
                    cell.textContent = value;
                } else {
                    // optional: revert or reload logic
                }
            };

            select.addEventListener('blur', save);
            select.addEventListener('change', save);
        });


        } else if (type === 'boolean') {
            cell.addEventListener('click', () => {
                if (cell.querySelector('select')) return;

                const originalValue = cell.textContent.trim().toLowerCase();
                const select = document.createElement('select');

                const valuePairs = {
                    'true': ['True', 'Accepted'],
                    'false': ['False', 'Declined']
                };

                for (const [val, labels] of Object.entries(valuePairs)) {
                    const option = document.createElement('option');
                    option.value = val;
                    option.text = labels.includes(originalValue) ? originalValue : labels[0];
                    if (labels.includes(originalValue)) option.selected = true;
                    select.appendChild(option);
                }

                cell.textContent = '';
                cell.appendChild(select);
                select.focus();

                const save = async () => {
                    const value = select.value;
                    const success = await saveValue(value);
                    if (success) {
                        cell.textContent = valuePairs[value][0];
                    } else {
                        cell.textContent = originalValue;
                    }
                };

                select.addEventListener('blur', save);
                select.addEventListener('change', save);
            });

        } else if (type === 'date') {
            cell.addEventListener('click', () => {
                if (cell.querySelector('input[type="date"]')) return;

                const originalValue = cell.textContent.trim();
                const input = document.createElement('input');
                input.type = 'date';
                input.value = originalValue;
                cell.textContent = '';
                cell.appendChild(input);
                input.focus();

                const save = async () => {
                    const value = input.value;
                    const success = await saveValue(value);
                    if (success) {
                        cell.textContent = value;
                    } else {
                        cell.textContent = originalValue;
                    }
                };

                input.addEventListener('blur', save);
                input.addEventListener('change', save);
            });

        } else {
            if (cell.isContentEditable) {
                cell.addEventListener('blur', async () => {
                    const value = cell.textContent.trim();

                    if (type === 'number' && isNaN(value)) {
                        alert('Please enter a valid number.');
                        return;
                    }
                    if (type === 'email' && !isValidEmail(value)) {
                        alert('Please enter a valid email address.');
                        return;
                    }
                    if (type === 'url' && !isValidURL(value)) {
                        alert('Please enter a valid URL.');
                        return;
                    }

                    const originalValue = cell.dataset.originalValue || '';
                    const success = await saveValue(value);
                    if (!success) {
                        cell.textContent = originalValue;
                    } else {
                        cell.dataset.originalValue = value;
                    }
                });
            }
        }
    });
}