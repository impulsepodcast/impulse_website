function initializeCarousel(root: HTMLElement) {
  const viewport = root.querySelector<HTMLElement>("[data-carousel-viewport]");
  const previousButton = root.querySelector<HTMLButtonElement>("[data-carousel-previous]");
  const nextButton = root.querySelector<HTMLButtonElement>("[data-carousel-next]");
  const status = root.querySelector<HTMLElement>("[data-carousel-status]");

  if (!viewport || !previousButton || !nextButton || !status) {
    return;
  }

  const safeViewport = viewport;
  const safePreviousButton = previousButton;
  const safeNextButton = nextButton;
  const safeStatus = status;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const autoplayDelay = Number.parseInt(root.dataset.carouselAutoplay ?? "", 10);
  let autoplayTimer: number | null = null;
  let updateFrame: number | null = null;

  function pageCount(): number {
    const maximumScroll = Math.max(0, safeViewport.scrollWidth - safeViewport.clientWidth);
    return Math.max(1, Math.round(maximumScroll / Math.max(safeViewport.clientWidth, 1)) + 1);
  }

  function currentPage(): number {
    return Math.min(
      pageCount(),
      Math.max(
        1,
        Math.round(safeViewport.scrollLeft / Math.max(safeViewport.clientWidth, 1)) + 1
      )
    );
  }

  function updateControls() {
    const maximumScroll = Math.max(0, safeViewport.scrollWidth - safeViewport.clientWidth);
    const page = currentPage();
    const pages = pageCount();

    safePreviousButton.disabled = safeViewport.scrollLeft <= 2;
    safeNextButton.disabled = safeViewport.scrollLeft >= maximumScroll - 2;
    safeStatus.textContent = `${page} / ${pages}`;
  }

  function queueControlsUpdate() {
    if (updateFrame !== null) {
      window.cancelAnimationFrame(updateFrame);
    }

    updateFrame = window.requestAnimationFrame(() => {
      updateFrame = null;
      updateControls();
    });
  }

  function scrollToPage(direction: -1 | 1) {
    safeViewport.scrollBy({
      left: direction * safeViewport.clientWidth,
      behavior: reducedMotion ? "auto" : "smooth"
    });
  }

  function stopAutoplay() {
    if (autoplayTimer !== null) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function startAutoplay() {
    stopAutoplay();

    if (reducedMotion || !Number.isFinite(autoplayDelay) || autoplayDelay < 2000) {
      return;
    }

    autoplayTimer = window.setInterval(() => {
      const maximumScroll = Math.max(0, safeViewport.scrollWidth - safeViewport.clientWidth);

      if (safeViewport.scrollLeft >= maximumScroll - 2) {
        safeViewport.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollToPage(1);
      }
    }, autoplayDelay);
  }

  safePreviousButton.addEventListener("click", () => scrollToPage(-1));
  safeNextButton.addEventListener("click", () => scrollToPage(1));
  safeViewport.addEventListener("scroll", queueControlsUpdate, { passive: true });
  safeViewport.addEventListener("pointerdown", stopAutoplay, { passive: true });
  root.addEventListener("mouseenter", stopAutoplay);
  root.addEventListener("mouseleave", startAutoplay);
  root.addEventListener("focusin", stopAutoplay);
  root.addEventListener("focusout", (event) => {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !root.contains(nextTarget)) {
      startAutoplay();
    }
  });
  window.addEventListener("resize", queueControlsUpdate, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  updateControls();
  startAutoplay();
}

for (const carousel of Array.from(document.querySelectorAll<HTMLElement>("[data-carousel]"))) {
  initializeCarousel(carousel);
}
