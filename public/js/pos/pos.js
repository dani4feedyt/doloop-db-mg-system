import { initNavigation } from '../navigation.js';
import { attachCellEditors } from '../cellEditor.js';


document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const newPosId = document.getElementById("posTable")?.dataset.posid;
    initNavigation(csrfToken, newPosId);
    attachCellEditors(csrfToken, newPosId);
});