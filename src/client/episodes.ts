interface Episode {
  slug: string;
  title: string;
  guest: string;
  summary: string;
  tags: string[];
}

function readJson<T>(id: string): T {
  const element = document.getElementById(id);
  if (!element?.textContent) {
    throw new Error(`Missing JSON payload: ${id}`);
  }

  return JSON.parse(element.textContent) as T;
}

function updateQuery(search: string, tags: string[]) {
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
  const tagButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-tag]"));

  if (!searchForm || !searchInput || !grid || !count || !emptyState || !clearButton) {
    return;
  }

  const safeSearchForm = searchForm;
  const safeSearchInput = searchInput;
  const safeGrid = grid;
  const safeCount = count;
  const safeEmptyState = emptyState;
  const safeClearButton = clearButton;
  const url = new URL(window.location.href);
  const activeTags = new Set(
    (url.searchParams.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  );
  safeSearchInput.value = url.searchParams.get("search") ?? "";

  function applyFilters() {
    const search = safeSearchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    const cards = Array.from(safeGrid.querySelectorAll<HTMLElement>("[data-episode-card]"));
    for (const card of cards) {
      const searchableText = card.dataset.search ?? "";
      const cardTags = (card.dataset.tags ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const matchesSearch = search === "" || searchableText.includes(search);
      const matchesTags =
        activeTags.size === 0 || cardTags.some((tag) => activeTags.has(tag));

      const visible = matchesSearch && matchesTags;
      card.hidden = !visible;
      if (visible) {
        visibleCount += 1;
      }
    }

    for (const button of tagButtons) {
      const tag = button.dataset.tag ?? "";
      button.classList.toggle("is-active", activeTags.has(tag));
      button.setAttribute("aria-pressed", String(activeTags.has(tag)));
    }

    safeCount.textContent = `${visibleCount} ${visibleCount === 1 ? "episode" : "episodes"}`;
    safeEmptyState.hidden = visibleCount !== 0;
    updateQuery(search, [...activeTags]);
  }

  safeSearchInput.addEventListener("input", applyFilters);
  safeSearchInput.addEventListener("search", applyFilters);
  safeSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
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

      applyFilters();
    });
  }

  safeClearButton.addEventListener("click", () => {
    activeTags.clear();
    safeSearchInput.value = "";
    applyFilters();
  });

  if (episodes.length > 0) {
    applyFilters();
  }
}

main();
