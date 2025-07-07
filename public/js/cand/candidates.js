//import { initNavigation } from '../navigation.js';
//import { attachCellEditors } from '../cellEditor.js';
import { initViewToggle } from '../utils.js';
import { initFilterPopup } from '../utils.js';


document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    //initNavigation(csrfToken, userId);
    //attachCellEditors(csrfToken, userId);
    initViewToggle(csrfToken);
    

    initFilterPopup((filters) => {
        const query = new URLSearchParams(filters).toString();
        window.location.href = `/candidates?${query}`;
        });
    document.getElementById("home")?.addEventListener("click", () => {
        window.location.href = '/';
    });
});