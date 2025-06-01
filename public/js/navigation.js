export function initNavigation() {
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const homeBtn = document.getElementById("home");

    function getCurrentIndexAndCategory() {
        const pathParts = window.location.pathname.split('/');
        const category = pathParts[1]; // e.g. "bio", "products", etc.
        const lastPart = pathParts[pathParts.length - 1];
        const index = parseInt(lastPart, 10);
        return [isNaN(index) ? 1 : index, category];
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
    }

    prevBtn.addEventListener("click", () => {
        const [currentIndex, category] = getCurrentIndexAndCategory();
        if (currentIndex > 1) {
            window.location.href = `/${category}/${currentIndex - 1}`;
        }
    });

    nextBtn.addEventListener("click", () => {
        const [currentIndex, category] = getCurrentIndexAndCategory();
        if (!nextBtn.disabled) {
            window.location.href = `/${category}/${currentIndex + 1}`;
        }
    });

    homeBtn.addEventListener("click", () => {
        window.location.href = '/';
    });

    updateButtons();
}