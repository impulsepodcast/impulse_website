interface Episode {
  slug: string;
  title: string;
  guest: string;
  summary: string;
  tags: string[];
}

const PAGE_SIZE = 9;
const COLLAPSED_TAG_COUNT = 10;

function readJson<T>(id: string): T {
  const element = document.getElementById(id);
  if (!element?.textContent) {
    throw new Error(`Missing JSON payload: ${id}`);
  }

  return JSON.parse(element.textContent) as T;
}

function updateQuery(search: string, tags: string[], page: number) {
  const nextUrl = new URL(window.location.href);

  if (search) {
    nextUrl.searchParams.set("search", search);
  } else {
    nextUrl.searchParams.delete("search");
  }

  if (tags.length > 0) {
    nextUrl.searchParams.set("tags", tags.join(","));
  } else {
    nextUrl.searchParams.delete("tags");
  }

  if (page > 1) {
    nextUrl.searchParams.set("page", String(page));
  } else {
    nextUrl.searchParams.delete("page");
  }

  window.history.replaceState({}, "", nextUrl);
}

function main() {
  const episodes = readJson<Episode[]>("episodes-data");
  const searchForm = document.getElementById("episode-search-form") as HTMLFormElement | null;
  const searchInput = document.getElementById("episode-search") as HTMLInputElement | null;
  const grid = document.getElementById("episode-grid");
  const count = document.getElementById("episode-count");
  const emptyState = document.getElementById("empty-state");
  const clearButton = document.getElementById("clear-filters");
  const pagination = document.getElementById("episodes-pagination");
  const tagToggle = document.getElementById("toggle-tags") as HTMLButtonElement | null;
  const tagBar = document.getElementById("tag-filter-bar");
  const tagButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-tag]"));

  if (!searchForm || !searchInput || !grid || !count || !emptyState || !clearButton || !pagination || !tagBar) {
    return;
  }

  const safeSearchForm = searchForm;
  const safeSearchInput = searchInput;
  const safeGrid = grid;
  const safeCount = count;
  const safeEmptyState = emptyState;
  const safeClearButton = clearButton;
  const safePagination = pagination;
  const safeTagBar = tagBar;
  const url = new URL(window.location.href);
  const activeTags = new Set(
    (url.searchParams.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  );
  let currentPage = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  let areTagsExpanded = false;
  safeSearchInput.value = url.searchParams.get("search") ?? "";

  function syncTagVisibility() {
    const shouldCollapse = tagButtons.length > COLLAPSED_TAG_COUNT;

    for (const [index, button] of tagButtons.entries()) {
      button.hidden = shouldCollapse && !areTagsExpanded && index >= COLLAPSED_TAG_COUNT;
    }

    safeTagBar.classList.toggle("is-collapsed", shouldCollapse && !areTagsExpanded);

    if (!tagToggle) {
      return;
    }

    tagToggle.hidden = !shouldCollapse;
    tagToggle.textContent = areTagsExpanded ? "Show fewer tags" : "See all tags";
    tagToggle.setAttribute("aria-expanded", String(areTagsExpanded));
  }

  function renderPagination(totalItems: number) {
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);

    if (totalItems === 0 || totalPages === 1) {
      safePagination.innerHTML = "";
      safePagination.hidden = true;
      return;
    }

    safePagination.hidden = false;
    const buttons: string[] = [];

    buttons.push(
      `<button class="pagination__button" type="button" data-page="${currentPage - 1}" ${
        currentPage === 1 ? "disabled" : ""
      }>Previous</button>`
    );

    for (let page = 1; page <= totalPages; page += 1) {
      buttons.push(
        `<button class="pagination__button${page === currentPage ? " is-active" : ""}" type="button" data-page="${page}" aria-current="${
          page === currentPage ? "page" : "false"
        }">${page}</button>`
      );
    }

    buttons.push(
      `<button class="pagination__button" type="button" data-page="${currentPage + 1}" ${
        currentPage === totalPages ? "disabled" : ""
      }>Next</button>`
    );

    safePagination.innerHTML = buttons.join("");
  }

  function applyFilters() {
    const search = safeSearchInput.value.trim().toLowerCase();
    const cards = Array.from(safeGrid.querySelectorAll<HTMLElement>("[data-episode-card]"));
    const matchingCards: HTMLElement[] = [];

    for (const card of cards) {
      const searchableText = card.dataset.search ?? "";
      const cardTags = (card.dataset.tags ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const matchesSearch = search === "" || searchableText.includes(search);
      const matchesTags =
        activeTags.size === 0 || cardTags.some((tag) => activeTags.has(tag));

      if (matchesSearch && matchesTags) {
        matchingCards.push(card);
      }
    }

    const visibleCount = matchingCards.length;
    const totalPages = Math.max(1, Math.ceil(visibleCount / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageCards = new Set(matchingCards.slice(start, end));

    for (const card of cards) {
      card.hidden = !pageCards.has(card);
    }

    for (const button of tagButtons) {
      const tag = button.dataset.tag ?? "";
      button.classList.toggle("is-active", activeTags.has(tag));
      button.setAttribute("aria-pressed", String(activeTags.has(tag)));
    }

    safeCount.textContent = `${visibleCount} ${visibleCount === 1 ? "episode" : "episodes"}`;
    safeEmptyState.hidden = visibleCount !== 0;
    renderPagination(visibleCount);
    updateQuery(search, [...activeTags], currentPage);
  }

  safeSearchInput.addEventListener("input", () => {
    currentPage = 1;
    applyFilters();
  });
  safeSearchInput.addEventListener("search", () => {
    currentPage = 1;
    applyFilters();
  });
  safeSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    currentPage = 1;
    applyFilters();
  });

  for (const button of tagButtons) {
    button.addEventListener("click", () => {
      const tag = button.dataset.tag;
      if (!tag) {
        return;
      }

      if (activeTags.has(tag)) {
        activeTags.delete(tag);
      } else {
        activeTags.add(tag);
      }

      currentPage = 1;
      applyFilters();
    });
  }

  safePagination.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const pageButton = target?.closest<HTMLButtonElement>("[data-page]");
    if (!pageButton || pageButton.disabled) {
      return;
    }

    const nextPage = Number.parseInt(pageButton.dataset.page ?? "", 10);
    if (!Number.isFinite(nextPage) || nextPage < 1) {
      return;
    }

    currentPage = nextPage;
    applyFilters();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  tagToggle?.addEventListener("click", () => {
    areTagsExpanded = !areTagsExpanded;
    syncTagVisibility();
  });

  safeClearButton.addEventListener("click", () => {
    activeTags.clear();
    safeSearchInput.value = "";
    currentPage = 1;
    applyFilters();
  });

  syncTagVisibility();

  if (episodes.length > 0) {
    applyFilters();
  }
}

main();
