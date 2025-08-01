import { refreshStatusHistory } from './job/selectionStatusUpdater.js';

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

        if (!cell.dataset.originalValue) {
        cell.dataset.originalValue = cell.textContent.trim();
        }

        const field = cell.dataset.field;
        const type = cell.dataset.type || 'text';

        //Exceptions space
        if (!field) return;

        
        //Exceptions space


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
            if (cell.querySelector('select') || cell.querySelector('input')) return;
            if (cell.classList.contains('custom')) return;

            const currentValue = cell.textContent.trim();
            const select = document.createElement('select');

            let options = [];
            const optionsSource = cell.dataset.optionsSource;
            if (optionsSource) {
                try {
                    const res = await fetch(optionsSource);
                    options = await res.json();
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

            if (cell.dataset.field != 'position_name'){
                const otherOption = document.createElement('option');
                otherOption.value = '__other__';
                otherOption.textContent = 'Other...';
                select.appendChild(otherOption);
            }

            cell.textContent = '';
            cell.appendChild(select);
            select.focus();

            const save = async (valueToSave) => {
                const success = await saveValue(valueToSave);
                if (success) {
                    cell.textContent = valueToSave;
                } else {
                    cell.textContent = currentValue;
                }
            };

            select.addEventListener('change', () => {
            const value = select.value;

            if (value === '__other__') {
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = 'Enter custom value';
                cell.textContent = '';
                cell.appendChild(input);
                input.focus();

                const saveCustom = async () => {
                const customValue = input.value.trim();
                if (!customValue) {
                    cell.textContent = currentValue;
                    return;
                }
                const success = await saveValue(customValue);
                if (success) {
                    cell.textContent = customValue;
                    if (field === 'selection_status') {
                        await refreshStatusHistory(userId);
                    }
                } else {
                    cell.textContent = currentValue;
                }
                };

                input.addEventListener('blur', saveCustom);
                input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                }
                });
            } else {
                
                saveValue(value).then(success => {
                if (success) {
                    cell.textContent = value;
                    if (field === 'selection_status') {
                    refreshStatusHistory(userId);
                    }
                } else {
                    cell.textContent = currentValue;
                }
                });
            }
            });

            
            select.addEventListener('blur', () => {
            if (select.value !== '__other__') {
                saveValue(select.value).then(success => {
                if (success) {
                    cell.textContent = select.value;
                    if (field === 'selection_status') {
                    refreshStatusHistory(userId);
                    }
                } else {
                    cell.textContent = currentValue;
                }
                });
            }
            });
        });
    

        } if (type === 'boolean') {
            cell.addEventListener('click', () => {
            if (cell.querySelector('select')) return;

            const originalValue = cell.textContent.trim().toLowerCase();

            const booleanLabelPairs = [
                { trueLabel: 'accepted', falseLabel: 'declined' },
                { trueLabel: 'yes', falseLabel: 'no' },
                { trueLabel: 'active', falseLabel: 'inactive' },
                { trueLabel: 'currently employed', falseLabel: 'currently not employed' },
                { trueLabel: 'true', falseLabel: 'false' } 
                
            ];

            let matchedPair = booleanLabelPairs.find(pair =>
                [pair.trueLabel, pair.falseLabel].includes(originalValue)
            );

            if (!matchedPair) {
                matchedPair = booleanLabelPairs[booleanLabelPairs.length - 1];
            }

            const options = [matchedPair.trueLabel, matchedPair.falseLabel];

            const currentBoolValue = (originalValue === matchedPair.trueLabel);

            const select = document.createElement('select');

            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.text = opt.charAt(0).toUpperCase() + opt.slice(1);
                select.appendChild(option);
            });

            select.value = currentBoolValue ? options[0] : options[1];

            cell.textContent = '';
            cell.appendChild(select);
            select.focus();

            const save = async () => {
                const selectedValue = select.value.toLowerCase();
                const boolForSaving = (selectedValue === options[0]) ? 'true' : 'false';

                const success = await saveValue(boolForSaving);
                if (success) {
                    cell.textContent = selectedValue.charAt(0).toUpperCase() + selectedValue.slice(1);
                } else {
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

       } else if (type === 'file') {
            cell.setAttribute('tabindex', '0');

            cell.addEventListener('click', () => {
                if (cell.querySelector('input[type="file"]')) return;

                cell.focus();

                if (cell.dataset.cvExists !== 'true') {
                    cell.dataset.cvExtension = '';
                }

                const hasCV = cell.dataset.cvExists === 'true';
                const originalHTML = cell.innerHTML;
                cell.innerHTML = '';

                const wrapper = document.createElement('div');
                wrapper.style.display = 'flex';
                wrapper.style.alignItems = 'center';
                wrapper.style.gap = '12px';

                let preview = null;
                let filenameSpan = null;

                if (hasCV) {
                    preview = document.createElement('div');
                    preview.classList.add('file-preview');
                    preview.style.display = 'flex';
                    preview.style.alignItems = 'center';
                    preview.style.gap = '4px';

                    const icon = document.createElement('span');
                    icon.textContent = '📄';

                    filenameSpan = document.createElement('span');
                    filenameSpan.classList.add('filename');

                    const extension = cell.dataset.cvExtension || 'txt';
                    filenameSpan.textContent = 'cv.' + extension;

                    preview.appendChild(icon);
                    preview.appendChild(filenameSpan);
                }

                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.txt';
                input.style.display = 'none';

                const inputId = 'cv-upload-' + Math.random().toString(36).substring(2, 8);
                input.id = inputId;

                const label = document.createElement('label');
                label.htmlFor = inputId;
                label.textContent = 'Choose File';
                label.classList.add('btn');

                const uploadButton = document.createElement('button');
                uploadButton.textContent = 'Upload';
                uploadButton.classList.add('btn');

                wrapper.appendChild(input);
                wrapper.appendChild(label);
                if (preview) wrapper.appendChild(preview);
                wrapper.appendChild(uploadButton);

                if (hasCV) {
                    const downloadBtn = document.createElement('button');
                    downloadBtn.textContent = 'Download';
                    downloadBtn.classList.add('btn');

                    downloadBtn.addEventListener('click', () => {
                        window.open(`/${resource}/${userId}/download-cv`, '_blank');
                    });

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Delete';
                    deleteBtn.classList.add('btn');

                    deleteBtn.addEventListener('click', async () => {
                        if (!confirm('Are you sure you want to delete the CV?')) return;

                        try {
                            const res = await fetch(`/${resource}/${userId}/delete-cv`, {
                                method: 'DELETE',
                                headers: { 'CSRF-Token': csrfToken }
                            });

                            if (!res.ok) throw new Error(await res.text());

                            alert('CV deleted.');
                            wrapper.dataset.cvExists = 'false';
                            cell.dataset.cvExists = 'false';
                            cell.dataset.cvExtension = '';
                            closeFileEditor();
                        } catch (err) {
                            alert('Failed to delete CV: ' + err.message);
                            cell.innerHTML = originalHTML;
                        }
                    });

                    wrapper.appendChild(downloadBtn);
                    wrapper.appendChild(deleteBtn);
                }

                input.addEventListener('change', () => {
                    const file = input.files[0];
                    if (!file) return;

                    const fileName = file.name;

                    if (!preview) {
                        preview = document.createElement('div');
                        preview.classList.add('file-preview');
                        preview.style.display = 'flex';
                        preview.style.alignItems = 'center';
                        preview.style.gap = '4px';

                        const icon = document.createElement('span');
                        icon.textContent = '📄';

                        filenameSpan = document.createElement('span');
                        filenameSpan.classList.add('filename');

                        preview.appendChild(icon);
                        preview.appendChild(filenameSpan);
                        wrapper.insertBefore(preview, uploadButton);
                    }

                    preview.style.display = 'inline-flex';
                    filenameSpan.textContent = fileName;
                });

                uploadButton.addEventListener('click', async () => {
                    const file = input.files[0];
                    if (!file) {
                        alert('No file selected.');
                        closeFileEditor();
                        return;
                    }

                    const formData = new FormData();
                    formData.append('cv', file);

                    try {
                        const res = await fetch(`/${resource}/${userId}/upload-cv`, {
                            method: 'POST',
                            headers: { 'CSRF-Token': csrfToken },
                            body: formData
                        });

                        if (!res.ok) throw new Error(await res.text());

                        alert('File uploaded.');
                        wrapper.dataset.cvExists = 'true';
                        cell.dataset.cvExists = 'true';

                        const newExtension = file.name.split('.').pop() || 'txt';
                        cell.dataset.cvExtension = newExtension;

                        closeFileEditor();

                        const postUploadPreview = document.createElement('div');
                        postUploadPreview.classList.add('file-preview');
                        postUploadPreview.style.display = 'inline-flex';
                        postUploadPreview.style.alignItems = 'center';
                        postUploadPreview.style.gap = '6px';

                        const icon = document.createElement('span');
                        icon.textContent = '📄';

                        const filename = document.createElement('span');
                        filename.classList.add('filename');
                        filename.textContent = file.name;

                        postUploadPreview.appendChild(icon);
                        postUploadPreview.appendChild(filename);

                        cell.innerHTML = '';
                        cell.appendChild(postUploadPreview);
                    } catch (err) {
                        alert('Upload failed: ' + err.message);
                        cell.innerHTML = originalHTML;
                        closeFileEditor();
                    }
                });

                cell.appendChild(wrapper);
            });

            function closeFileEditor() {
                if (cell.dataset.cvExists === 'true' && cell.dataset.cvExtension) {
                    const ext = cell.dataset.cvExtension;
                    cell.innerHTML = `
                        <div class="file-preview">
                            <span>📄</span>
                            <span class="filename">cv.${ext}</span>
                        </div>
                    `;
                } else {
                    cell.innerHTML = 'Click to add CV';
                }
            }

            cell.addEventListener('blur', () => {
                setTimeout(() => {
                    if (!cell.contains(document.activeElement)) {
                        closeFileEditor();
                    }
                }, 100);
            });



        } else {
            if (cell.isContentEditable) {
                cell.addEventListener('blur', async () => {
                const value = cell.textContent.trim();

                if (type === 'number' && isNaN(value)) {
                    alert('Please enter a valid number.');
                    cell.textContent = cell.dataset.originalValue;
                    return;
                }
                if (type === 'email' && !isValidEmail(value)) {
                    alert('Please enter a valid email address.');
                    cell.textContent = cell.dataset.originalValue;
                    return;
                }
                if (type === 'url' && !isValidURL(value)) {
                    alert('Please enter a valid URL.');
                    cell.textContent = cell.dataset.originalValue;
                    return;
                }

                const success = await saveValue(value);
                if (!success) {
                    alert('Save failed, reverting to last valid value.');
                    cell.textContent = cell.dataset.originalValue;
                    
                } else {
                cell.dataset.originalValue = value;
                }

                });
            }
        }
    });
}