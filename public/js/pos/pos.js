import { attachCellEditors } from '../cellEditor.js';


document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const newPosId = document.getElementById("posTable")?.dataset.posid;
    attachCellEditors(csrfToken, newPosId);
    document.getElementById("home")?.addEventListener("click", () => {
        window.location.href = '/';
    });
});