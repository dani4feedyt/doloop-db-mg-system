import { debounce } from '../utils.js';

export function initStatusHistoryEditor(csrfToken, userId) {

    document.querySelectorAll('#jobTable td[data-field="status_history"][data-type="list"]').forEach(cell => {
        const historyList = cell.querySelector('#statusHistoryList');
        const addBtn = cell.querySelector('#add-status-entry');

        const saveHistory = debounce(async () => {
            const history = [...historyList.querySelectorAll('li')]
                .map(li => {
                    const status = li.dataset.status?.trim() || '';
                    const date = li.dataset.date?.trim() || '';
                    return status && date ? { status, changed_at: date } : null;
                })
                .filter(Boolean);

            try {
                const res = await fetch(`/job/${userId}/update-status-history`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ history })
                });
                if (!res.ok) alert('History update failed: ' + await res.text());
            } catch (err) {
                console.error('Fetch failed:', err);
            }
        }, 500);

        historyList.addEventListener('click', (e) => {
            const li = e.target.closest('li.status-history-item');
            if (!li || li.querySelector('input')) return;

            const originalStatus = li.dataset.status;
            const originalDate = li.dataset.date;

            li.innerHTML = `
                <input type="text" class="status-input" value="${originalStatus}" />
                <input type="date" class="date-input" value="${originalDate}" />
            `;

            const [statusInput, dateInput] = li.querySelectorAll('input');
            statusInput.focus();

            const finishEdit = () => {
                const status = statusInput.value.trim();
                const date = dateInput.value;
                if (status && date) {
                    li.dataset.status = status;
                    li.dataset.date = date;
                    li.innerHTML = `<span>${status} → ${date}</span>`;
                    li.classList.add('status-history-item');
                    saveHistory();
                } else {
                    li.remove();
                    saveHistory();
                }
            };

            const cancelEdit = () => {
                li.innerHTML = `<span>${originalStatus} → ${originalDate}</span>`;
                li.dataset.status = originalStatus;
                li.dataset.date = originalDate;
            };

            // Add event listeners to both inputs
            [statusInput, dateInput].forEach(input => {
                input.addEventListener('blur', () => {
                    // Delay to allow focus switch between inputs
                    setTimeout(() => {
                        if (!li.contains(document.activeElement)) finishEdit();
                    }, 150);
                });

                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        finishEdit();
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEdit();
                    }
                });
            });
        });

        addBtn.addEventListener('click', () => {
            const li = document.createElement('li');
            li.className = 'status-history-item';
            li.innerHTML = `
                <input type="text" class="status-input" placeholder="Status" />
                <input type="date" class="date-input" />
            `;
            historyList.appendChild(li);

            const [statusInput, dateInput] = li.querySelectorAll('input');
            statusInput.focus();

            const finishNew = () => {
                const status = statusInput.value.trim();
                const date = dateInput.value;
                if (status && date) {
                    li.dataset.status = status;
                    li.dataset.date = date;
                    li.innerHTML = `<span>${status} → ${date}</span>`;
                    saveHistory();
                } else {
                    li.remove();
                }
            };

            const cancelNew = () => {
                li.remove();
            };

            [statusInput, dateInput].forEach(input => {
                input.addEventListener('blur', () => {
                    setTimeout(() => {
                        if (!li.contains(document.activeElement)) finishNew();
                    }, 150);
                });

                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        finishNew();
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelNew();
                    }
                });
            });
        });
    });
}
