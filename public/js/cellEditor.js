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

    table.querySelectorAll('td[data-field]').forEach(cell => {
        const field = cell.dataset.field;
        const type = cell.dataset.type || 'text';

        if (['list', 'exp-block'].includes(type)) return;

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
                }
            } catch (err) {
                console.error('Fetch failed:', err);
            }
        };

        if (type === 'boolean') {
            cell.addEventListener('click', () => {
                if (cell.querySelector('select')) return;

                const currentValue = cell.textContent.trim().toLowerCase();
                const select = document.createElement('select');

                ['true', 'false'].forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.text = opt.charAt(0).toUpperCase() + opt.slice(1);
                    if (opt === currentValue) option.selected = true;
                    select.appendChild(option);
                });

                cell.textContent = '';
                cell.appendChild(select);
                select.focus();

                const save = () => {
                    const value = select.value;
                    cell.textContent = value.charAt(0).toUpperCase() + value.slice(1);
                    saveValue(value);
                };

                select.addEventListener('blur', save);
                select.addEventListener('change', save);
            });

        } else if (type === 'date') {
            cell.addEventListener('click', () => {
                if (cell.querySelector('input[type="date"]')) return;

                const currentValue = cell.textContent.trim();
                const input = document.createElement('input');
                input.type = 'date';
                input.value = currentValue;
                cell.textContent = '';
                cell.appendChild(input);
                input.focus();

                const save = () => {
                    const value = input.value;
                    cell.textContent = value;
                    saveValue(value);
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
                    if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        alert('Please enter a valid email address.');
                        return;
                    }
                    if (type === 'url' && !/^https?:\/\/.+/.test(value)) {
                        alert('Please enter a valid URL.');
                        return;
                    }

                    await saveValue(value);
                });
            }
        }
    });
}