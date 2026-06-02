const setupBrandCarousel = (section) => {
    const carousel = section.querySelector(".video-row");
    const dotsContainer = section.querySelector(".carousel-dots");
    const counter = section.querySelector(".carousel-counter");
    const items = Array.from(carousel.querySelectorAll(".video-item"));
    let dots = [];
    let activePage = 0;
    let scrollFrame;

    const getVisibleCount = () => {
        const value = getComputedStyle(document.documentElement).getPropertyValue("--visible-items");
        return Math.max(1, parseInt(value, 10) || 1);
    };

    const getPageCount = () => Math.ceil(items.length / getVisibleCount());
    const pad = n => String(n).padStart(2, '0');

    const setActiveDot = (pageIndex) => {
        activePage = Math.max(0, Math.min(getPageCount() - 1, pageIndex));
        dots.forEach((dot, i) => {
            const active = i === activePage;
            dot.classList.toggle("is-active", active);
            dot.setAttribute("aria-pressed", String(active));
        });
        if (counter) counter.textContent = `${pad(activePage + 1)} / ${pad(getPageCount())}`;
    };

    const updateVisibleItems = () => {
        const carouselRect = carousel.getBoundingClientRect();
        items.forEach((item) => {
            const rect = item.getBoundingClientRect();
            const visible = rect.right > carouselRect.left + 12 && rect.left < carouselRect.right - 12;
            item.classList.toggle("is-visible", visible);
        });
        const firstVisibleIndex = items.findIndex(item => item.classList.contains("is-visible"));
        setActiveDot(Math.max(0, Math.floor(firstVisibleIndex / getVisibleCount())));
    };

    const scrollToPage = (pageIndex) => {
        const targetIndex = Math.min(items.length - 1, pageIndex * getVisibleCount());
        carousel.scrollTo({
            left: items[targetIndex].offsetLeft - carousel.offsetLeft,
            behavior: "smooth"
        });
        setActiveDot(pageIndex);
    };

    const buildDots = () => {
        dotsContainer.innerHTML = "";
        dots = Array.from({ length: getPageCount() }, (_, i) => {
            const dot = document.createElement("button");
            dot.className = "carousel-dot";
            dot.type = "button";
            dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
            dot.setAttribute("aria-pressed", "false");
            dot.addEventListener("click", () => scrollToPage(i));
            dotsContainer.appendChild(dot);
            return dot;
        });
        updateVisibleItems();
    };

    carousel.addEventListener("scroll", () => {
        cancelAnimationFrame(scrollFrame);
        scrollFrame = requestAnimationFrame(updateVisibleItems);
    }, { passive: true });

    const updateCentering = () => {
        carousel.classList.toggle("is-centered", items.length <= getVisibleCount());
    };

    window.addEventListener("resize", () => {
        buildDots();
        scrollToPage(activePage);
        updateCentering();
    });

    buildDots();
    updateCentering();
};

document.querySelectorAll(".brand-carousel").forEach(setupBrandCarousel);
