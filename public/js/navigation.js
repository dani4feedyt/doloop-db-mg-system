export function initNavigation() {
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const homeBtn = document.getElementById("home");
    const toggleViewBtn = document.getElementById("toggle-view-btn");
    const deleteBtn = document.getElementById("delete-btn");

    function getCurrentIndexAndCategory() {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const category = pathParts[0];
        const index = parseInt(pathParts[1], 10);
        return [!isNaN(index) ? index : null, category];
    }

    function updateButtons() {
        const [currentIndex, category] = getCurrentIndexAndCategory();
        prevBtn.disabled = currentIndex <= 1;

        const nextIndex = currentIndex + 1;
        fetch(`/${category}/${nextIndex}`, { method: 'HEAD' })
            .then(response => {
                nextBtn.disabled = !response.ok;
            })
            .catch(() => {
                nextBtn.disabled = true;
            });

        if (toggleViewBtn) {
            toggleViewBtn.textContent = category === 'bio' ? 'Job' : 'Bio';
        }
    }

    prevBtn?.addEventListener("click", () => {
        const [currentIndex, category] = getCurrentIndexAndCategory();
        if (currentIndex > 1) {
            window.location.href = `/${category}/${currentIndex - 1}`;
        }
    });

    nextBtn?.addEventListener("click", () => {
        const [currentIndex, category] = getCurrentIndexAndCategory();
        if (!nextBtn.disabled) {
            window.location.href = `/${category}/${currentIndex + 1}`;
        }
    });

    homeBtn?.addEventListener("click", () => {
        window.location.href = '/';
    });

    toggleViewBtn?.addEventListener("click", () => {
        const [currentIndex, category] = getCurrentIndexAndCategory();
        const newCategory = category === 'bio' ? 'job' : 'bio';
        window.location.href = `/${newCategory}/${currentIndex}`;
    });

    deleteBtn?.addEventListener("click", () => {
        if (confirm('Are you sure you want to delete this card?')) {
            const [currentIndex, category] = getCurrentIndexAndCategory();

            let source = category

            if (category=="job"){
                source = "bio";
            }
            
            fetch(`/${source}/${currentIndex}/delete`, {
                method: 'POST',
                headers: {
                    'CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
                
            }).then(res => {
                if (res.ok) {
                    if (source!="bio"){
                        window.location.href = `/${source}`;
                    } else {
                        window.location.href = '/candidates';
                    }
                } else {
                    alert('Delete failed.');
                }
            }).catch(() => alert('Delete failed.'));
        }
    });

    updateButtons();
}