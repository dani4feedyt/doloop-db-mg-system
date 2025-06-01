import { debounce } from '../utils.js';

export function initExperienceEditor(csrfToken, userId) {

    document.querySelectorAll('#bioTable td[data-field="experience"][data-type="exp-block"]').forEach(cell => {
        const summaryTextSpan = cell.querySelector('.summary-text');
        if (summaryTextSpan.dataset.initialized === 'true') return;
        summaryTextSpan.dataset.initialized = 'true';

        const occupationList = cell.querySelector('#occupationList');
        const addBtn = cell.querySelector('#add-occupation');

        const saveSummary = debounce(async () => {
            const summaryText = summaryTextSpan.textContent.trim();
            try {
                const res = await fetch(`/bio/${userId}/update-field`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ field: 'experience_summary', value: summaryText })
                });
                if (!res.ok) alert('Experience summary update failed: ' + await res.text());
            } catch (err) {
                console.error('Fetch failed:', err);
            }
        }, 500);

        summaryTextSpan.addEventListener('input', saveSummary);

        const saveOccupations = debounce(async () => {
            const occupations = [...occupationList.querySelectorAll('li.occupation-item')]
                .map(li => li.textContent.trim())
                .filter(val => val !== '');

            try {
                const res = await fetch(`/bio/${userId}/update-experience-jobs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ job_names: occupations })
                });
                if (!res.ok) alert('Experience jobs update failed: ' + await res.text());
            } catch (err) {
                console.error('Fetch failed:', err);
            }
        }, 500);

        occupationList.addEventListener('click', (e) => {
            const li = e.target.closest('li.occupation-item');
            if (!li || li.querySelector('input')) return;
            const originalText = li.textContent.trim();
            li.innerHTML = `<input type="text" class="occupation-input" value="${originalText}" />`;
            const input = li.querySelector('input');
            input.focus();

            const finishEdit = () => {
                const newValue = input.value.trim();
                if (newValue) {
                    li.textContent = newValue;
                    li.classList.add('occupation-item');
                    saveOccupations();
                } else {
                    li.remove();
                    saveOccupations();
                }
            };

            input.addEventListener('blur', finishEdit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') input.blur();
                if (e.key === 'Escape') {
                    li.textContent = originalText;
                    li.classList.add('occupation-item');
                }
            });
        });

        addBtn.addEventListener('click', () => {
            const li = document.createElement('li');
            li.className = 'occupation-item';
            li.innerHTML = `<input type="text" class="occupation-input" />`;
            occupationList.appendChild(li);
            const input = li.querySelector('input');
            input.focus();

            const finishNew = () => {
                const value = input.value.trim();
                if (value) {
                    li.textContent = value;
                    saveOccupations();
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