import { debounce } from '../utils.js';

export function initLicenseEditor(csrfToken, userId) {

    document.querySelectorAll('#bioTable td[data-field="licenses"][data-type="list"]').forEach(cell => {
        const licenseList = cell.querySelector('#licenseList');
        const addBtn = cell.querySelector('#add-license');

        const saveLicenses = debounce(async () => {
            const licenses = [...licenseList.querySelectorAll('li')]
                .map(li => li.textContent.trim())
                .filter(val => val !== '');

            try {
                const res = await fetch(`/bio/${userId}/update-licenses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ licenses })
                });
                if (!res.ok) alert('License update failed: ' + await res.text());
            } catch (err) {
                console.error('Fetch failed:', err);
            }
        }, 500);

        licenseList.addEventListener('click', (e) => {
            const li = e.target.closest('li.license-item');
            if (!li || li.querySelector('input')) return;
            const originalText = li.textContent.trim();
            li.innerHTML = `<input type="text" class="license-input" value="${originalText}" />`;
            const input = li.querySelector('input');
            input.focus();

            const finishEdit = () => {
                const newValue = input.value.trim();
                if (newValue) {
                    li.textContent = newValue;
                    li.classList.add('license-item');
                    saveLicenses();
                } else {
                    li.remove();
                    saveLicenses();
                }
            };

            input.addEventListener('blur', finishEdit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') input.blur();
                if (e.key === 'Escape') {
                    li.textContent = originalText;
                    li.classList.add('license-item');
                }
            });
        });

        addBtn.addEventListener('click', () => {
            const li = document.createElement('li');
            li.className = 'license-item';
            li.innerHTML = `<input type="text" class="license-input" />`;
            licenseList.appendChild(li);
            const input = li.querySelector('input');
            input.focus();

            const finishNew = () => {
                const value = input.value.trim();
                if (value) {
                    li.textContent = value;
                    saveLicenses();
                } else {
                    li.remove();
                }
            };

            input.addEventListener('blur', finishNew);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') input.blur();
                if (e.key === 'Escape') li.remove();
            });
        });
    });
}