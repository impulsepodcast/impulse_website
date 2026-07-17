import { PLATFORM_ICON_PATHS, PLATFORM_LABELS, SITE, SUPPORTS_PATHS } from "./site-config.js";
import { escapeAttribute, escapeHtml, formatDate } from "./utils.js";
function pageTitle(title) {
    if (title === SITE.name) {
        return `${SITE.name} | Healthcare Pioneers`;
    }
    return `${title} | ${SITE.name}`;
}
function navLink(path, label, currentPath) {
    const active = path === currentPath;
    return `<a class="nav-link${active ? " is-active" : ""}" href="${path}"${active ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`;
}
function titleCaseWords(value) {
    return value
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}
function displayGuestName(episode) {
    if (episode.guest.includes(" ")) {
        return episode.guest;
    }
    const imageMatch = episode.image.match(/\/([^/?#]+)\.(png|jpe?g|webp|avif)(?:[?#].*)?$/i);
    const fileStem = imageMatch?.[1]
        ?.replace(/_stripe(?:-\d+)?$/i, "")
        ?.replace(/-stripe(?:-\d+)?$/i, "")
        ?.replace(/[_-]+/g, " ")
        ?.trim();
    if (!fileStem || !fileStem.includes(" ")) {
        return episode.guest;
    }
    const candidate = titleCaseWords(fileStem);
    const normalizedGuest = episode.guest.trim().toLowerCase();
    return candidate.toLowerCase().startsWith(normalizedGuest) ? candidate : episode.guest;
}
function displayCompanyName(episode) {
    if (episode.company) {
        return episode.company;
    }
    const match = episode.summary.match(/\bat\s+([^,.;]+?)(?=,|\.| who | which | and )/i);
    if (match?.[1]) {
        return match[1].trim();
    }
    return null;
}
function renderPlatformIconLink(key, url, options) {
    const label = options?.label ?? PLATFORM_LABELS[key];
    return `
    <a class="platform-link${options?.withText ? " platform-link--text" : ""}" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">
      <span class="platform-icon">
        <img src="${escapeAttribute(PLATFORM_ICON_PATHS[key])}" alt="${escapeAttribute(label)}">
      </span>
      ${options?.withText ? `<span>${escapeHtml(label)}</span>` : ""}
    </a>
  `;
}
function renderEpisodePlatformLinks(episode, withText = false) {
    const ordered = [
        "spotify",
        "apple",
        "google",
        "youtube",
        "amazon"
    ];
    return ordered
        .filter((key) => Boolean(episode.links[key]))
        .map((key) => renderPlatformIconLink(key, episode.links[key], { withText }))
        .join("");
}
function renderSitePlatformLinks(withText = false) {
    return [
        renderPlatformIconLink("spotify", SITE.links.spotify, { withText, label: "Spotify" }),
        renderPlatformIconLink("apple", SITE.links.apple, { withText, label: "Apple" }),
        renderPlatformIconLink("google", SITE.links.google, { withText, label: "Google" }),
        renderPlatformIconLink("amazon", SITE.links.amazon, { withText, label: "Amazon" })
    ].join("");
}
function renderEpisodePlatformCtas(episode) {
    const links = renderEpisodePlatformLinks(episode, false);
    if (links) {
        return links;
    }
    return renderSitePlatformLinks(false);
}
function serializeJsonScript(value) {
    return JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}
function renderMarkdownInline(value) {
    return escapeHtml(value).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label, url) => `<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer"/>`);
}
function renderEpisodeBody(markdown) {
    if (!markdown?.trim()) {
        return "";
    }
    const lines = markdown.split(/\r?\n/);
    const blocks = [];
    let paragraph = [];
    let listItems = [];
    function flushParagraph() {
        if (paragraph.length === 0) {
            return;
        }
        blocks.push(`<p>${renderMarkdownInline(paragraph.join(" "))}</p>`);
        paragraph = [];
    }
    function flushList() {
        if (listItems.length === 0) {
            return;
        }
        blocks.push(`<ul>${listItems.map((item) => `<li>${renderMarkdownInline(item)}</li>`).join("")}</ul>`);
        listItems = [];
    }
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            flushParagraph();
            flushList();
            continue;
        }
        if (trimmed.startsWith("## ")) {
            flushParagraph();
            flushList();
            blocks.push(`<h2>${renderMarkdownInline(trimmed.slice(3))}</h2>`);
            continue;
        }
        if (trimmed.startsWith("### ")) {
            flushParagraph();
            flushList();
            blocks.push(`<h3>${renderMarkdownInline(trimmed.slice(4))}</h3>`);
            continue;
        }
        if (trimmed.startsWith("- ")) {
            flushParagraph();
            listItems.push(trimmed.slice(2));
            continue;
        }
        flushList();
        paragraph.push(trimmed);
    }
    flushParagraph();
    flushList();
    if (blocks.length === 0) {
        return "";
    }
    return `
    <section class="episode-notes">
      <div class="container episode-notes__inner">
        ${blocks.join("")}
      </div>
    </section>
  `;
}
function renderStickyPlayer(episode) {
    if (!episode) {
        return "";
    }
    const company = displayCompanyName(episode);
    const guestName = displayGuestName(episode);
    // Adjust this property to whichever artwork field exists in your Episode type.
    const artwork = episode.image ||
        "/images/default-podcast-cover.png";
    return `
    <div class="sticky-player" data-sticky-player data-sticky-player-url="/episodes/${escapeAttribute(episode.slug)}">
      ${episode.previewAudio
        ? `
            <audio
              preload="metadata"
              playsinline
              data-sticky-player-audio
            >
              <source
                src="${escapeAttribute(episode.previewAudio)}"
                type="audio/mpeg"
              >
            </audio>
          `
        : ""}

      <div class="sticky-player__progress">
        <div
          class="sticky-player__progress-fill"
          data-sticky-player-progress-fill
        ></div>
      </div>

      <div class="sticky-player__inner">
        <div class="sticky-player__controls">
          <button
            class="sticky-player__control sticky-player__skip"
            type="button"
            aria-label="Skip back 15 seconds"
            data-sticky-player-back
            ${episode.previewAudio ? "" : "disabled"}
          >
            <span class="sticky-player__skip-arrow">↶</span>
            <span class="sticky-player__skip-value">15</span>
          </button>

          <button
            class="sticky-player__control sticky-player__play"
            type="button"
            aria-label="Play episode"
            data-sticky-player-play
            ${episode.previewAudio ? "" : "disabled"}
          >
            <svg
              class="sticky-player__play-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M7 4.5v15l12-7.5z"></path>
            </svg>

            <svg
              class="sticky-player__pause-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M6 4h4v16H6zM14 4h4v16h-4z"></path>
            </svg>
          </button>

          <button
            class="sticky-player__control sticky-player__skip"
            type="button"
            aria-label="Skip forward 15 seconds"
            data-sticky-player-forward
            ${episode.previewAudio ? "" : "disabled"}
          >
            <span class="sticky-player__skip-arrow">↷</span>
            <span class="sticky-player__skip-value">15</span>
          </button>
        </div>

        <div class="sticky-player__episode">
          <img
            class="sticky-player__artwork"
            src="${escapeAttribute(artwork)}"
            alt=""
          >

          <div class="sticky-player__content">
            <h2 class="sticky-player__title">
              ${escapeHtml(episode.title)}
            </h2>

            <div class="sticky-player__meta-row">
              <div class="sticky-player__platforms">
                ${renderEpisodePlatformCtas(episode)}
              </div>

              <span class="sticky-player__separator" aria-hidden="true"></span>

              <p class="sticky-player__meta">
                ${escapeHtml(guestName)}
                ${company
        ? `<span class="sticky-player__company"> · ${escapeHtml(company)}</span>`
        : ""}
              </p>
            </div>
          </div>
        </div>

        <div class="sticky-player__right-controls">
          <button
            class="sticky-player__icon-button"
            type="button"
            aria-label="Mute audio"
            data-sticky-player-mute
            ${episode.previewAudio ? "" : "disabled"}
          >
            <svg
              class="sticky-player__volume-on"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M3 9v6h4l5 4V5L7 9H3z"></path>
              <path
                d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              ></path>
            </svg>

            <svg
              class="sticky-player__volume-off"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M3 9v6h4l5 4V5L7 9H3z"></path>
              <path
                d="m16 9 5 5m0-5-5 5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              ></path>
            </svg>
          </button>

        </div>
      </div>

      ${!episode.previewAudio
        ? `
            <div class="sticky-player__audio-unavailable">
              Preview unavailable for this episode.
            </div>
          `
        : ""}
    </div>
  `;
}
function renderHeader(path) {
    return `
    <header class="site-header">
      <div class="container shell shell--legacy">
        <a class="brand brand--legacy" href="/">
          <img
            class="brand-image"
            src="${SITE.assets.brandLogo}"
            alt="Impulse Podcast"
          >
        </a>
        <nav class="site-nav" aria-label="Primary">
          ${navLink("/", "Home", path)}
          ${navLink("/episodes", "Episodes", path)}
          ${navLink("/about", "About", path)}
        </nav>
        <a class="button button--primary header-subscribe" href="${SITE.links.subscribe}" target="_blank" rel="noreferrer">Subscribe!</a>
      </div>
    </header>
  `;
}
function footerLink(url, label) {
    return `<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}
function renderFooter() {
    return `
    <footer class="site-footer">
      <section class="support-strip">
        <div class="container support-strip__inner">
          <h2>They Support Us!</h2>

          <div class="support-carousel">
            <div class="support-carousel__track">
              <!-- Logos -->
              <img src="${escapeAttribute(SUPPORTS_PATHS['png1'])}" alt="">
              <img src="${escapeAttribute(SUPPORTS_PATHS['png2'])}" alt=">
              <img src="${escapeAttribute(SUPPORTS_PATHS['png3'])}" alt="">
              <img src="${escapeAttribute(SUPPORTS_PATHS['png4'])}" alt="">
              <img src="${escapeAttribute(SUPPORTS_PATHS['png5'])}" alt="">
              <img src="${escapeAttribute(SUPPORTS_PATHS['png6'])}" alt="">

              <img src="${escapeAttribute(SUPPORTS_PATHS['png1'])}" alt="">
              <img src="${escapeAttribute(SUPPORTS_PATHS['png2'])}" alt=">
              <img src="${escapeAttribute(SUPPORTS_PATHS['png3'])}" alt="">
              <img src="${escapeAttribute(SUPPORTS_PATHS['png4'])}" alt="">
              <img src="${escapeAttribute(SUPPORTS_PATHS['png5'])}" alt="">
              <img src="${escapeAttribute(SUPPORTS_PATHS['png6'])}" alt="">
            </div>
          </div>

        </div>
      </section>
      <section class="subscribe-strip">
        <div class="container subscribe-strip__inner">
          <div class="subscribe-strip__intro">
            <h2>Subscribe To The Podcast!</h2>
          </div>
          <div class="platform-grid">
            ${renderSitePlatformLinks()}
          </div>
        </div>
      </section>
      <div class="footer-bottom">
        <div class="container footer-panel">
        <div class="footer-brand">
          <img
            class="footer-brand-image"
            src="${SITE.assets.brandLogo}"
            alt="Impulse Podcast"
          >
          <p>${escapeHtml(SITE.description)} ${escapeHtml(SITE.extendedDescription)}</p>
          <a class="support-badge" href="${SITE.links.healthPodcastNetwork}" target="_blank" rel="noreferrer">
            <img src="${SITE.assets.healthPodcastNetworkBadge}" alt="Health Podcast Network">
          </a>
        </div>
        <div class="footer-columns">
          <div>
            <p class="footer-title">Social Media</p>
            <div class="footer-links">
              ${footerLink(SITE.links.brandLinkedIn, "LinkedIn")}
            </div>
          </div>
          <div>
            <p class="footer-title">Streaming Platforms</p>
            <div class="footer-links">
              ${footerLink(SITE.links.spotify, "Spotify")}
              ${footerLink(SITE.links.apple, "Apple Podcasts")}
              ${footerLink(SITE.links.google, "Google Podcasts")}
              ${footerLink(SITE.links.amazon, "Amazon")}
            </div>
          </div>
          <div>
            <p class="footer-title">Contact</p>
            <div class="footer-links">
              <a href="${SITE.links.contactEmail}">Email</a>
              ${footerLink(SITE.links.personalLinkedIn, "LinkedIn")}
              ${footerLink(SITE.links.newsletter, "Newsletter")}
            </div>
          </div>
        </div>
      </div>
      </div>
      <span class = "footer-copyrights">© 2026 by ${escapeHtml(SITE.ownerName)} - All Rights Reserved</span>
    </footer>
  `;
}
function renderListenLinks(episode) {
    const entries = Object.entries(episode.links);
    if (entries.length === 0) {
        return `
      <div class="listen-links">
        <a class="button button--primary" href="${SITE.links.subscribe}" target="_blank" rel="noreferrer">Subscribe to the show</a>
      </div>
    `;
    }
    return `
    <div class="listen-links">
      ${entries
        .map(([key, value]) => `<a class="pill-link" href="${escapeAttribute(value)}" target="_blank" rel="noreferrer">${escapeHtml(PLATFORM_LABELS[key])}</a>`)
        .join("")}
    </div>
  `;
}
function renderTag(tag) {
    return `<button class="tag tag-button" type="button" data-tag="${escapeAttribute(tag)}" aria-pressed="false">${escapeHtml(tag)}</button>`;
}
function renderTagList(tags) {
    return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}
function renderEpisodeCard(episode) {
    const guestName = displayGuestName(episode);
    return `
    <article class="episode-card" data-episode-card data-tags="${escapeAttribute(episode.tags.join(","))}" data-search="${escapeAttribute(`${episode.title} ${guestName} ${episode.summary}`.toLowerCase())}">
      <a class="episode-card__image" href="/episodes/${escapeAttribute(episode.slug)}">
        <img src="${escapeAttribute(episode.image)}" alt="${escapeAttribute(`${guestName} on Impulse`)}" loading="lazy">
      </a>
      <div class="episode-card__body">
        <div class="episode-card__meta">
          <span class="episode-number">Episode ${episode.number}</span>
          <span>${escapeHtml(formatDate(episode.releasedAt))}</span>
        </div>
        <h3><a href="/episodes/${escapeAttribute(episode.slug)}">${escapeHtml(episode.title)}</a></h3>
        <p class="episode-guest">${escapeHtml(guestName)}</p>
        <p class="episode-summary">${escapeHtml(episode.summary)}</p>
        <div class="tag-row">
          ${renderTagList(episode.tags)}
        </div>
      </div>
    </article>
  `;
}
function renderBasePage(options) {
    const description = options.description ?? SITE.description;
    const scriptSet = new Set(["/static/client/player.js", ...(options.scripts ?? [])]);
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(pageTitle(options.title))}</title>
    <meta name="description" content="${escapeAttribute(description)}">
    <meta property="og:title" content="${escapeAttribute(pageTitle(options.title))}">
    <meta property="og:description" content="${escapeAttribute(description)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://${SITE.domain}${options.path === "/" ? "" : options.path}">
    <link rel="stylesheet" href="/static/styles.css">
  </head>
  <body>
    <div class="page-bg page-bg--top"></div>
    <div class="page-bg page-bg--side"></div>
    ${renderHeader(options.path)}
    ${options.body}
    ${renderStickyPlayer(options.stickyPlayerEpisode ?? null)}
    ${renderFooter()}
    ${[...scriptSet]
        ?.map((script) => `<script type="module" src="${escapeAttribute(script)}"></script>`)
        .join("")}
  </body>
</html>`;
}
export function renderHomePage(episodes, tags) {
    const latest = episodes[0];
    const featured = episodes.slice(1, 5);
    const latestGuest = displayGuestName(latest);
    const latestCompany = displayCompanyName(latest);
    const stickyPlayerEpisode = episodes.find((episode) => Boolean(episode.previewAudio)) ?? latest;
    return renderBasePage({
        title: SITE.name,
        path: "/",
        description: `${SITE.description} ${SITE.extendedDescription}`,
        stickyPlayerEpisode,
        body: `
      <main>
        <section class="brand-hero">
          <div class="container">
            <div class="brand-hero__inner reveal">
              <div class="brand-hero__copy">
                <div class="brand-hero__statement">
                  <div class="brand-hero__wave">
                    <svg viewBox="0 0 900 220" aria-hidden="true" class="heartbeat-svg">
                      <path d="M0 140 H290 L315 140 L334 20 L356 208 L384 140 H900" class="heartbeat-svg__shadow"></path>
                      <path d="M0 132 H290 L315 132 L334 12 L356 200 L384 132 H900" class="heartbeat-svg__main"></path>
                    </svg>
                  </div>
                  <text class="brand-hero__wave__text">Meet the people shaping medical progress</h1>
                </div>
                <div class="brand-hero__socials">
                  <div class="brand-hero__socials__follow">
                    <p class="brand-hero__label">Follow the podcast:</p>
                    <a class="platform-link" href="${SITE.links.brandLinkedIn}" target="_blank" rel="noreferrer">
                      <span class="platform-icon">
                        <img src="${SITE.assets.linkedInIcon}" alt="LinkedIn">
                      </span>
                    </a>
                  </div>
                  <div class="brand-hero__socials__links">
                    <p class="brand-hero__label">Listen on your favorite platform:</p>
                    <div class="listen-links">
                      ${renderSitePlatformLinks(false)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="latest-hero">
          <div class="container latest-hero__grid reveal">
            <div class="latest-hero__content">
              <p class="latest-hero__date">${escapeHtml(latest.releasedAt.split("-").reverse().join("."))}</p>
              <p class="latest-hero__number">#${latest.number}</p>
              <h2 class="latest-hero__guest">${escapeHtml(latestGuest)}</h2>
              ${latestCompany
            ? `<h3 class="latest-hero__company">${escapeHtml(latestCompany)}</h3>`
            : ""}
              <p class="latest-hero__title">${escapeHtml(latest.title)}</p>
              <div class="listen-group">
                <p class="listen-label">Listen on your favorite platform:</p>
                <div class="listen-links listen-links--icons">
                  ${renderEpisodePlatformLinks(latest)}
                </div>
              </div>
            </div>
            <a class="latest-hero__image" href="/episodes/${escapeAttribute(latest.slug)}">
              <img src="${escapeAttribute(latest.image)}" alt="${escapeAttribute(`${latestGuest} on Impulse`)}">
            </a>
            <div class="latest-hero__player">
              <p class="latest-hero__excerpt">${escapeHtml(latest.summary)}</p>
            </div>
          </div>
        </section>

        <section class="home-archive">
          <div class="container">
            <h2 class="home-archive__heading">Discover Other Episodes</h2>
            <div class="home-archive__grid">
              ${featured
            .map((episode) => `
                    <a class="home-archive__card" href="/episodes/${escapeAttribute(episode.slug)}">
                      <img src="${escapeAttribute(episode.image)}" alt="${escapeAttribute(`${displayGuestName(episode)} on Impulse`)}">
                      <span class="home-archive__number">#${episode.number}</span>
                    </a>
                  `)
            .join("")}
              <a class="home-archive__more" href="/episodes">
                <span>View all episodes</span>
              </a>
            </div>
          </div>
        </section>

      </main>
    `
    });
}
export function renderEpisodesPage(episodes, tags) {
    const stickyPlayerEpisode = episodes.find((episode) => Boolean(episode.previewAudio)) ?? episodes[0];
    return renderBasePage({
        title: "Episodes",
        path: "/episodes",
        description: "Browse the full Impulse archive and filter episodes by topic tags.",
        scripts: ["/static/client/episodes.js"],
        stickyPlayerEpisode,
        body: `
      <main>
        <section class="page-hero page-hero--legacy">
          <div class="container section-heading section-heading--stack section-heading--legacy">
            <h1>Find conversations by topic, company, or guest!</h1>
          </div>
        </section>

        <section class="legacy-section">
          <div class="container filters-panel">
            <form id="episode-search-form" class="search-field" role="search">
              <span>Search episodes</span>
              <input id="episode-search" type="search" placeholder="AI, oncology, Ricardo, imaging...">
            </form>
            <div class="filters-toolbar">
              <p id="episode-count" class="filters-count">${episodes.length} episodes</p>
              <button id="clear-filters" class="button button--ghost" type="button">Clear filters</button>
            </div>
            <div id="tag-filter-bar" class="tag-bar" aria-label="Tag filters">
              ${tags.map(renderTag).join("")}
            </div>
          </div>
        </section>

        <section class="legacy-section">
          <div class="container">
            <div id="episode-grid" class="cards-grid cards-grid--legacy">
              ${episodes.map(renderEpisodeCard).join("")}
            </div>
            <p id="empty-state" class="empty-state" hidden>No episodes match the current filters.</p>
          </div>
        </section>
      </main>
      <script id="episodes-data" type="application/json">${serializeJsonScript(episodes)}</script>
      <script id="episode-tags" type="application/json">${serializeJsonScript(tags)}</script>
    `
    });
}
export function renderEpisodePage(episode, episodes) {
    const guestName = displayGuestName(episode);
    const companyName = displayCompanyName(episode);
    const relatedEpisodes = episodes.filter((entry) => entry.slug !== episode.slug).slice(0, 4);
    const stickyPlayerEpisode = episode.previewAudio ? episode : (episodes.find((entry) => Boolean(entry.previewAudio)) ?? episode);
    return renderBasePage({
        title: episode.title,
        path: `/episodes/${episode.slug}`,
        description: episode.summary,
        stickyPlayerEpisode,
        body: `
      <main>
        <section class="latest-hero latest-hero--page">
          <div class="container latest-hero__grid reveal">
            <div class="latest-hero__content">
              <p class="latest-hero__date">${escapeHtml(episode.releasedAt.split("-").reverse().join("."))}</p>
              <p class="latest-hero__number">#${episode.number}</p>
              <h2 class="latest-hero__guest">${escapeHtml(guestName)}</h2>
              ${companyName
            ? `<h3 class="latest-hero__company">${escapeHtml(companyName)}</h3>`
            : ""}
              <p class="latest-hero__title">${escapeHtml(episode.title)}</p>
              <div class="listen-group">
                <p class="listen-label">Listen on your favorite platform:</p>
                <div class="listen-links listen-links--icons">
                  ${renderEpisodePlatformLinks(episode)}
                </div>
              </div>
            </div>
            <a class="latest-hero__image" href="/episodes/${escapeAttribute(episode.slug)}">
              <img src="${escapeAttribute(episode.image)}" alt="${escapeAttribute(`${guestName} on Impulse`)}">
            </a>
            <div class="latest-hero__player">
              <div class="audio-bar">
                <span class="audio-bar__play"></span>
                <span class="audio-bar__track"></span>
              </div>
              <p class="latest-hero__excerpt">${escapeHtml(episode.summary)}</p>
            </div>
          </div>
        </section>

        <section class="home-archive home-archive--detail">
          <div class="container">
            <h2 class="home-archive__heading">Discover Other Episodes</h2>
            <div class="home-archive__grid">
              ${relatedEpisodes
            .map((relatedEpisode) => `
                    <a class="home-archive__card" href="/episodes/${escapeAttribute(relatedEpisode.slug)}">
                      <img src="${escapeAttribute(relatedEpisode.image)}" alt="${escapeAttribute(`${displayGuestName(relatedEpisode)} on Impulse`)}">
                      <span class="home-archive__number">#${relatedEpisode.number}</span>
                    </a>
                  `)
            .join("")}
              <a class="home-archive__more" href="/episodes">
                <span>View all episodes</span>
              </a>
            </div>
          </div>
        </section>
        ${renderEpisodeBody(episode.body)}
      </main>
    `
    });
}
export function renderAboutPage(episodes) {
    const stickyPlayerEpisode = episodes.find((episode) => Boolean(episode.previewAudio)) ?? episodes[0];
    return renderBasePage({
        title: "About",
        path: "/about",
        description: "Meet the host behind Impulse and learn how the podcast approaches healthcare innovation.",
        stickyPlayerEpisode,
        body: `
      <main>
        <section class="page-hero page-hero--legacy">
          <div class="container about-grid about-grid--legacy">
            <div class="about-photo">
              <img src="${escapeAttribute(SITE.hostPhoto)}" alt="${escapeAttribute(SITE.ownerName)}">
            </div>
            <div class="about-copy">
              <h1 class = "about_name">${escapeHtml(SITE.ownerName)}</h1>
              <p class="about-role">${escapeHtml(SITE.hostTitle)}</p>
              <p>${escapeHtml(SITE.hostBio)}</p>
              <div class="about-contact">
                <p class="about-contact__label">Reach out by email or connect on LinkedIn.</p>
                <div class="about-contact__actions">
                  <a class="button button--ghost about-contact__button" href="${SITE.links.contactEmail}">
                    <span class="about-contact__icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path
                          d="M3 6.75A1.75 1.75 0 0 1 4.75 5h14.5A1.75 1.75 0 0 1 21 6.75v10.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25zm1.8-.25 7.2 5.4 7.2-5.4zm14.7 1-6.9 5.18a1 1 0 0 1-1.2 0L4.5 7.5v9.75c0 .14.11.25.25.25h14.5a.25.25 0 0 0 .25-.25z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span>Reach out by email</span>
                  </a>
                  <a
                    class="button button--ghost about-contact__button"
                    href="${SITE.links.personalLinkedIn}"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span class="about-contact__icon" aria-hidden="true">
                      <img src="${escapeAttribute(SITE.assets.linkedInIcon)}" alt="">
                    </span>
                    <span>Connect on LinkedIn</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="legacy-section">
          <div class="container spotlight-grid">
            <div class="spotlight-card spotlight-card--white">
              <p class="eyebrow">What Impulse covers</p>
              <h2>Conversations with people pushing healthcare forward</h2>
              <p>${escapeHtml(SITE.description)} ${escapeHtml(SITE.extendedDescription)}</p>
            </div>
            <div class="spotlight-card spotlight-card--white">
              <p class="eyebrow">Current archive</p>
              <h2>${episodes.length} episodes and growing</h2>
              <p>New episodes now ship from markdown files, which keeps publishing lightweight while preserving the visual language of the original site.</p>
              <a class="inline-link" href="/episodes">Explore the archive</a>
            </div>
          </div>
        </section>
      </main>
    `
    });
}
export function renderNotFoundPage() {
    return renderBasePage({
        title: "Not Found",
        path: "/404",
        description: "The page you are looking for does not exist.",
        body: `
      <main>
        <section class="page-hero page-hero--legacy">
          <div class="container section-heading section-heading--stack section-heading--legacy">
            <p class="eyebrow">404</p>
            <h1>That page does not exist</h1>
            <p>Try the archive or jump back to the homepage.</p>
            <div class="hero-actions hero-actions--tight">
              <a class="button button--primary" href="/">Home</a>
              <a class="button button--ghost" href="/episodes">Episodes</a>
            </div>
          </div>
        </section>
      </main>
    `
    });
}
