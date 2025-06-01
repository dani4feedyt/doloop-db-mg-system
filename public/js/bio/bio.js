import { initNavigation } from '../navigation.js';
import { attachCellEditors } from '../cellEditor.js';
import { initLicenseEditor } from './licenseEditor.js';
import { initExperienceEditor } from './experienceEditor.js';


document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const userId = document.getElementById("bioTable")?.dataset.userid;
    initNavigation(csrfToken, userId);
    initLicenseEditor(csrfToken, userId);
    initExperienceEditor(csrfToken, userId);
    attachCellEditors(csrfToken, userId);
});