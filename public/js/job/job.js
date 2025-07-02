import { initNavigation } from '../navigation.js';
import { attachCellEditors } from '../cellEditor.js';
import { initStatusHistoryEditor } from './statusHistoryEditor.js'
import { initStatusHistoryUI } from './statusHistoryUI.js';


document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const userId = document.getElementById("jobTable")?.dataset.userid;
    initNavigation(csrfToken, userId);
    attachCellEditors(csrfToken, userId);
    initStatusHistoryEditor(csrfToken, userId);
    initStatusHistoryUI(csrfToken);

});