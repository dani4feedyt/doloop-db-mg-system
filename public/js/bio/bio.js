import { initNavigation } from '../navigation.js';
import { initLicenseEditor } from './licenseEditor.js';
import { initExperienceEditor } from './experienceEditor.js';
import { attachCellEditors } from '../cellEditor.js';

document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const userId = document.getElementById("bioTable")?.dataset.userid;
    initNavigation(csrfToken, userId);
    initLicenseEditor(csrfToken, userId);
    initExperienceEditor(csrfToken, userId);
    attachCellEditors(csrfToken, userId);
});