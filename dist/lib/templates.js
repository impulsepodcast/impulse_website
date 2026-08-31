import { PLATFORM_ICON_PATHS, PLATFORM_LABELS, SITE, SUPPORTERS, TESTIMONIALS, assetPath, sitePath, siteUrlForPath } from "./site-config.js";
import { escapeAttribute, escapeHtml, formatDate } from "./utils.js";
function pageTitle(title) {
    if (title === SITE.name) {
        return `${SITE.name} | Healthcare Pioneers`;
    }
    return `${title} | ${SITE.name}`;
}
function navLink(path, label, currentPath) {
    const active = path === currentPath;
    const href = sitePath(path);
    return `<a class="nav-link${active ? " is-active" : ""}" href="${escapeAttribute(href)}"${active ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`;
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
function episodeMixScore(episode) {
    let score = 2166136261;
    for (const character of episode.slug) {
        score ^= character.charCodeAt(0);
        score = Math.imul(score, 16777619);
    }
    return score >>> 0;
}
export function selectMixedEpisodes(episodes, count) {
    return [...episodes]
        .sort((left, right) => episodeMixScore(left) - episodeMixScore(right))
        .slice(0, count);
}
function renderPlatformIconLink(key, url, options) {
    const label = options?.label ?? PLATFORM_LABELS[key];
    return `
    <a class="platform-link${options?.withText ? " platform-link--text" : ""}" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">
      <span class="platform-icon">
        <img src="${escapeAttribute(assetPath(PLATFORM_ICON_PATHS[key]))}" alt="${escapeAttribute(label)}" loading="lazy" decoding="async">
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
        renderPlatformIconLink("youtube", SITE.links.youtube, { withText, label: "YouTube" }),
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
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function buildEpisodeNumberLookup(episodes) {
    return new Map(episodes.map((episode) => [episode.number, episode]));
}
function resolveEpisodePageUrl(url, episodeNumberLookup) {
    const episodeMatch = url.match(/^https?:\/\/(?:www\.)?impulsepodcast\.com\/episode-(\d+)\/?$/i);
    if (episodeMatch && episodeNumberLookup) {
        const episode = episodeNumberLookup.get(Number(episodeMatch[1]));
        if (episode) {
            return {
                href: sitePath(`/episodes/${episode.slug}`),
                external: false
            };
        }
    }
    return { href: url, external: /^(?:[a-z]+:)?\/\//i.test(url) };
}
function highlightBuzzwords(value, buzzwords) {
    let highlighted = value;
    for (const buzzword of [...new Set(buzzwords.map((tag) => tag.trim()).filter(Boolean))].sort((left, right) => right.length - left.length)) {
        const pattern = new RegExp(`(^|[^A-Za-z0-9])(${escapeRegExp(buzzword)})(?=$|[^A-Za-z0-9])`, "gi");
        highlighted = highlighted.replace(pattern, (_match, prefix, matchedBuzzword) => `${prefix}<strong class="buzzword">${matchedBuzzword}</strong>`);
    }
    return highlighted;
}
function serializeJsonScript(value) {
    return JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}
function renderMarkdownInline(value, options) {
    const anchors = [];
    const withLinksReplaced = escapeHtml(value).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label, url) => {
        const { href, external } = resolveEpisodePageUrl(url, options?.episodeNumberLookup);
        const anchor = external
            ? `<a class="inline-link" href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
            : `<a class="inline-link" href="${escapeAttribute(href)}">${escapeHtml(label)}</a>`;
        const token = `__ANCHOR_${anchors.length}__`;
        anchors.push(anchor);
        return token;
    });
    const highlighted = options?.buzzwords?.length
        ? highlightBuzzwords(withLinksReplaced, options.buzzwords)
        : withLinksReplaced;
    return highlighted.replace(/__ANCHOR_(\d+)__/g, (_match, index) => anchors[Number(index)] ?? "");
}
function renderMarkdownBlocks(markdown, options) {
    const lines = markdown.split(/\r?\n/);
    const blocks = [];
    let paragraph = [];
    let listItems = [];
    function flushParagraph() {
        if (paragraph.length === 0) {
            return;
        }
        blocks.push(`<p>${renderMarkdownInline(paragraph.join(" "), options)}</p>`);
        paragraph = [];
    }
    function flushList() {
        if (listItems.length === 0) {
            return;
        }
        blocks.push(`<ul>${listItems.map((item) => `<li>${renderMarkdownInline(item, options)}</li>`).join("")}</ul>`);
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
            blocks.push(`<h2>${renderMarkdownInline(trimmed.slice(3), options)}</h2>`);
            continue;
        }
        if (trimmed.startsWith("### ")) {
            flushParagraph();
            flushList();
            blocks.push(`<h3>${renderMarkdownInline(trimmed.slice(4), options)}</h3>`);
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
    return blocks.join("");
}
function renderEpisodeBody(markdown, options) {
    if (!markdown?.trim()) {
        return "";
    }
    const transcriptHeading = /^##\s+Transcript\s*$/im.exec(markdown);
    const notesMarkdown = transcriptHeading?.index === undefined
        ? markdown
        : markdown.slice(0, transcriptHeading.index);
    const transcriptMarkdown = transcriptHeading?.index === undefined
        ? ""
        : markdown.slice(transcriptHeading.index + transcriptHeading[0].length);
    const notes = renderMarkdownBlocks(notesMarkdown, options);
    const transcript = renderMarkdownBlocks(transcriptMarkdown, options);
    if (!notes && !transcript) {
        return "";
    }
    return `
    <section class="episode-notes">
      <div class="container">
        <div class="episode-notes__inner">
          <div class="episode-notes__surface">
            ${notes}
            ${transcript
        ? `
                  <details class="episode-transcript">
                    <summary>Read the full transcript</summary>
                    <div class="episode-transcript__body">${transcript}</div>
                  </details>
                `
        : ""}
          </div>
        </div>
      </div>
    </section>
  `;
}
function youtubeVideoId(url) {
    if (!url) {
        return null;
    }
    try {
        const parsed = new URL(url);
        if (parsed.hostname === "youtu.be") {
            return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
        }
        if (parsed.hostname.endsWith("youtube.com")) {
            return (parsed.searchParams.get("v") ??
                parsed.pathname.match(/^\/(?:embed|shorts)\/([^/?#]+)/)?.[1] ??
                null);
        }
    }
    catch {
        return null;
    }
    return null;
}
function renderEpisodeVideo(episode) {
    const videoId = youtubeVideoId(episode.links.youtube);
    if (!videoId || !episode.links.youtube) {
        return "";
    }
    return `
    <section class="episode-video">
      <div class="container episode-video__inner">
        <a class="episode-video__card" href="${escapeAttribute(episode.links.youtube)}" target="_blank" rel="noreferrer">
          <img
            src="https://i.ytimg.com/vi/${escapeAttribute(videoId)}/maxresdefault.jpg"
            alt="Video preview for ${escapeAttribute(episode.title)}"
            loading="lazy"
            decoding="async"
          >
          <span class="episode-video__copy">
            <span class="eyebrow">Watch the conversation</span>
            <strong>${escapeHtml(episode.title)}</strong>
            <span class="episode-video__action">Play on YouTube</span>
          </span>
        </a>
      </div>
    </section>
  `;
}
function renderEpisodeTranscript(episode) {
    if (!episode.transcript?.trim() || !episode.transcriptDownload) {
        return "";
    }
    const paragraphs = episode.transcript
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
        .filter(Boolean)
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join("");
    return `
    <section class="episode-transcript-section" aria-labelledby="episode-transcript-${episode.number}">
      <div class="container episode-transcript-section__inner">
        <div class="episode-transcript-card">
          <div class="episode-transcript-card__heading">
            <div>
              <p class="eyebrow">Full conversation</p>
              <h2 id="episode-transcript-${episode.number}">Episode transcript</h2>
              <p>Generated from the YouTube captions and lightly cleaned for readability. Names and technical terms may contain transcription errors.</p>
            </div>
            <a class="episode-transcript-download" href="${escapeAttribute(assetPath(episode.transcriptDownload))}" download="${escapeAttribute(`${episode.slug}-transcript.txt`)}">Download transcript (.txt)</a>
          </div>
          <details class="episode-transcript episode-transcript--standalone">
            <summary>Read the full transcript</summary>
            <div class="episode-transcript__body">${paragraphs}</div>
          </details>
        </div>
      </div>
    </section>
  `;
}
function renderCarouselControls(label) {
    return `
    <div class="carousel-controls" aria-label="${escapeAttribute(label)}">
      <button class="carousel-control" type="button" data-carousel-previous aria-label="Previous ${escapeAttribute(label)}">←</button>
      <span class="carousel-status" data-carousel-status aria-live="polite">1 / 1</span>
      <button class="carousel-control" type="button" data-carousel-next aria-label="Next ${escapeAttribute(label)}">→</button>
    </div>
  `;
}
function renderTestimonialsSection() {
    return `
    <section class="testimonials-section" data-carousel>
      <div class="container">
        <div class="section-heading section-heading--stack testimonials-section__heading">
          <h2>Conversations that resonate across the healthtech ecosystem</h2>
          <p>Professionals, physicians, researchers, founders, and listeners who make the Impulse community what it is.</p>
        </div>
        <div class="testimonials-grid" role="region" aria-label="Listener reviews" tabindex="0" data-carousel-viewport>
          ${TESTIMONIALS.map((testimonial) => `
              <article class="testimonial-card">
                <div class="testimonial-card__body">
                  <p class="testimonial-card__rating">${escapeHtml(testimonial.rating)}</p>
                  <p class="testimonial-card__date">${escapeHtml(testimonial.date)}</p>
                  <h3>${escapeHtml(testimonial.title)}</h3>
                  <p class="testimonial-card__quote">${escapeHtml(testimonial.body)}</p>
                  <p class="testimonial-card__author">
                    <span>${escapeHtml(testimonial.author)}</span>
                    <span>${escapeHtml(testimonial.country)}</span>
                  </p>
                </div>
              </article>
            `).join("")}
        </div>
        ${renderCarouselControls("reviews")}
      </div>
    </section>
  `;
}
function renderCollaborationSection() {
    return `
    <section class="collaboration-strip">
      <div class="container collaboration-strip__inner">
        <div class="collaboration-strip__copy">
          <p class="eyebrow">Let’s build something together</p>
          <h2>A collaboration to propose?</h2>
          <p>${escapeHtml(SITE.collaborationPrompt)} Let’s get in touch.</p>
        </div>
        <a class="button button--primary collaboration-strip__button" href="${escapeAttribute(SITE.links.contactEmail)}">Let’s get in touch</a>
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
    <div class="sticky-player" data-sticky-player data-sticky-player-url="${escapeAttribute(sitePath(`/episodes/${episode.slug}`))}">
      ${episode.previewAudio
        ? `
            <audio
              preload="metadata"
              playsinline
              data-sticky-player-audio
            >
              <source
                src="${escapeAttribute(assetPath(episode.previewAudio))}"
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
            src="${escapeAttribute(assetPath(artwork))}"
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
    </div>
  `;
}
function renderHeader(path) {
    return `
    <header class="site-header">
      <div class="container shell shell--legacy">
        <a class="brand brand--legacy" href="${escapeAttribute(sitePath("/"))}">
          <img
            class="brand-image"
            src="${escapeAttribute(assetPath(SITE.assets.brandLogo))}"
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
    const supporterLinks = (duplicate = false) => SUPPORTERS.map((supporter) => {
        const className = `support-carousel__link${duplicate ? " support-carousel__link--duplicate" : ""}`;
        const accessibilityAttributes = duplicate
            ? 'aria-hidden="true" tabindex="-1"'
            : `aria-label="Visit ${escapeAttribute(supporter.name)}"`;
        return `<a class="${className}" href="${escapeAttribute(supporter.url)}" target="_blank" rel="noreferrer" ${accessibilityAttributes}><img src="${escapeAttribute(assetPath(supporter.image))}" class="${supporter.compact ? "image-network" : "image-carrousel"}" alt="${duplicate ? "" : escapeAttribute(supporter.name)}" loading="lazy" decoding="async"></a>`;
    }).join("\n");
    return `
    <footer class="site-footer">
      <section class="support-strip">
        <div class="container support-strip__inner">
          <h2>They support us!</h2>

          <div class="support-carousel">
            <div class="support-carousel__track">
              ${supporterLinks()}
              ${supporterLinks(true)}
            </div>
          </div>

        </div>
      </section>
      <section class="subscribe-strip">
        <div class="container subscribe-strip__inner">
          <div class="subscribe-strip__intro">
            <h2>Subscribe to the podcast!</h2>
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
            src="${escapeAttribute(assetPath(SITE.assets.brandLogo))}"
            alt="Impulse Podcast"
          >
          <p>${escapeHtml(SITE.description)} ${escapeHtml(SITE.extendedDescription)}</p>
          <a class="support-badge" href="${SITE.links.healthPodcastNetwork}" target="_blank" rel="noreferrer">
            <img src="${escapeAttribute(assetPath(SITE.assets.healthPodcastNetworkBadge))}" alt="Health Podcast Network" loading="lazy" decoding="async">
          </a>
        </div>
        <div class="footer-columns">
          <div>
            <p class="footer-title">Social media</p>
            <div class="footer-links">
              ${footerLink(SITE.links.brandLinkedIn, "LinkedIn")}
            </div>
          </div>
          <div>
            <p class="footer-title">Streaming platforms</p>
            <div class="footer-links">
              ${footerLink(SITE.links.spotify, "Spotify")}
              ${footerLink(SITE.links.apple, "Apple Podcasts")}
              ${footerLink(SITE.links.youtube, "YouTube")}
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
    const episodePath = sitePath(`/episodes/${episode.slug}`);
    return `
    <article class="episode-card" data-episode-card data-tags="${escapeAttribute(episode.tags.join(","))}" data-search="${escapeAttribute(`${episode.title} ${guestName} ${episode.summary}`.toLowerCase())}">
      <a class="episode-card__image" href="${escapeAttribute(episodePath)}">
        <img src="${escapeAttribute(assetPath(episode.image))}" alt="${escapeAttribute(`${guestName} on Impulse`)}" loading="lazy" decoding="async">
      </a>
      <div class="episode-card__body">
        <div class="episode-card__meta">
          <span class="episode-number">Episode ${episode.number}</span>
          <span>${escapeHtml(formatDate(episode.releasedAt))}</span>
        </div>
        <h3><a href="${escapeAttribute(episodePath)}">${escapeHtml(episode.title)}</a></h3>
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
    const scriptSet = new Set([
        sitePath("/static/client/player.js"),
        sitePath("/static/client/carousels.js"),
        ...(options.scripts ?? []).map(sitePath)
    ]);
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(pageTitle(options.title))}</title>
    <meta name="description" content="${escapeAttribute(description)}">
    <meta property="og:title" content="${escapeAttribute(pageTitle(options.title))}">
    <meta property="og:description" content="${escapeAttribute(description)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapeAttribute(siteUrlForPath(options.path))}">
    <link rel="preconnect" href="https://static.wixstatic.com" crossorigin>
    <link rel="dns-prefetch" href="//static.wixstatic.com">
    <link rel="stylesheet" href="${escapeAttribute(sitePath("/static/styles.css"))}">
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
    return html.replace(/[ \t]+$/gm, "");
}
export function renderHomePage(episodes, tags) {
    const latest = episodes[0];
    const featured = episodes.slice(1);
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
                    <img src="${escapeAttribute(assetPath(SITE.assets.wave))}" aria-hidden="true" class="heartbeat-svg" decoding="async" fetchpriority="high">
                  </div>
                  <h1 class="brand-hero__mobile-title">Meet the people shaping medical progress</h1>
                </div>
                <div class="brand-hero__socials">
                  <div class="brand-hero__socials__follow">
                    <p class="brand-hero__label">Follow the podcast:</p>
                    <a class="platform-link" href="${SITE.links.brandLinkedIn}" target="_blank" rel="noreferrer">
                      <span class="platform-icon">
                        <img src="${escapeAttribute(assetPath(SITE.assets.linkedInIcon))}" alt="LinkedIn" decoding="async">
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
            <a class="latest-hero__image" href="${escapeAttribute(sitePath(`/episodes/${latest.slug}`))}">
              <img src="${escapeAttribute(assetPath(latest.image))}" alt="${escapeAttribute(`${latestGuest} on Impulse`)}" decoding="async" fetchpriority="high">
            </a>
            <p class="latest-hero__excerpt">${escapeHtml(latest.summary)}</p>
          </div>
        </section>

        <section class="home-archive" data-carousel data-carousel-autoplay="5200">
          <div class="container">
            <h2 class="home-archive__heading">Discover other episodes</h2>
            <div class="home-archive__grid" role="region" aria-label="Featured episodes" tabindex="0" data-carousel-viewport>
              ${featured
            .map((episode) => `
                    <a class="home-archive__card" href="${escapeAttribute(sitePath(`/episodes/${episode.slug}`))}">
                      <img src="${escapeAttribute(assetPath(episode.image))}" alt="${escapeAttribute(`${displayGuestName(episode)} on Impulse`)}" loading="lazy" decoding="async">
                    </a>
                  `)
            .join("")}
            </div>
            ${renderCarouselControls("featured episodes")}
            <a class="home-archive__more" href="${escapeAttribute(sitePath("/episodes"))}">
              <span>View all episodes</span>
            </a>
          </div>
        </section>
        ${renderTestimonialsSection()}
        ${renderCollaborationSection()}
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
        <section class="page-hero page-hero--legacy page-hero--episodes">
          <div class="container section-heading section-heading--stack section-heading--legacy">
            <h1>Find conversations by topic, company, or guest!</h1>
          </div>
        </section>

        <section class="legacy-section legacy-section--episodes">
          <div class="container filters-panel">
            <form id="episode-search-form" class="search-field" role="search">
              <span>Search episodes</span>
              <input id="episode-search" type="search" placeholder="AI, oncology, Ricardo, imaging...">
            </form>
            <div class="filters-toolbar">
              <p id="episode-count" class="filters-count">${episodes.length} episodes</p>
            </div>
            <div class="filters-tags">
              <div id="tag-filter-bar" class="tag-bar tag-bar--collapsible" aria-label="Tag filters">
                ${tags.map(renderTag).join("")}
              </div>
              <button id="toggle-tags" class="filters-tags__toggle" type="button" hidden aria-expanded="false">
                See all tags
              </button>
            </div>
            <div class="filters-actions">
              <button id="clear-filters" class="button button--ghost filters-clear" type="button">Clear filters</button>
            </div>
          </div>
        </section>

        <section class="legacy-section">
          <div class="container">
            <div id="episode-grid" class="cards-grid cards-grid--legacy">
              ${episodes.map(renderEpisodeCard).join("")}
            </div>
            <nav id="episodes-pagination" class="pagination" aria-label="Episodes pages"></nav>
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
    const relatedEpisodes = selectMixedEpisodes(episodes.filter((entry) => entry.slug !== episode.slug), 8);
    const stickyPlayerEpisode = episode.previewAudio ? episode : (episodes.find((entry) => Boolean(entry.previewAudio)) ?? episode);
    const episodeNumberLookup = buildEpisodeNumberLookup(episodes);
    const buzzwords = episode.tags;
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
            <a class="latest-hero__image" href="${escapeAttribute(sitePath(`/episodes/${episode.slug}`))}">
              <img src="${escapeAttribute(assetPath(episode.image))}" alt="${escapeAttribute(`${guestName} on Impulse`)}" decoding="async" fetchpriority="high">
            </a>
            <p class="latest-hero__excerpt">${renderMarkdownInline(episode.summary, {
            buzzwords,
            episodeNumberLookup
        })}</p>
          </div>
        </section>

        ${renderEpisodeBody(episode.body, { buzzwords, episodeNumberLookup })}
        ${renderEpisodeVideo(episode)}
        ${renderEpisodeTranscript(episode)}

        <section class="home-archive home-archive--detail" data-carousel>
          <div class="container">
            <h2 class="home-archive__heading">Discover other episodes</h2>
            <div class="home-archive__grid" role="region" aria-label="Related episodes" tabindex="0" data-carousel-viewport>
              ${relatedEpisodes
            .map((relatedEpisode) => `
                    <a class="home-archive__card" href="${escapeAttribute(sitePath(`/episodes/${relatedEpisode.slug}`))}">
                      <img src="${escapeAttribute(assetPath(relatedEpisode.image))}" alt="${escapeAttribute(`${displayGuestName(relatedEpisode)} on Impulse`)}" loading="lazy" decoding="async">
                    </a>
                  `)
            .join("")}
            </div>
            ${renderCarouselControls("related episodes")}
            <a class="home-archive__more" href="${escapeAttribute(sitePath("/episodes"))}">
              <span>View all episodes</span>
            </a>
          </div>
        </section>
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
        <section class="page-hero page-hero--legacy page-hero--about">
          <div class="container about-grid about-grid--legacy">
            <h1 class="about-name about-name--mobile">${escapeHtml(SITE.ownerName)}</h1>
            <div class="about-photo">
              <img src="${escapeAttribute(assetPath(SITE.hostPhoto))}" alt="${escapeAttribute(SITE.ownerName)}" decoding="async">
            </div>
            <div class="about-copy">
              <h1 class="about-name about-name--desktop">${escapeHtml(SITE.ownerName)}</h1>
              <p class="about-role">${escapeHtml(SITE.hostTitle)}</p>
              <p>${escapeHtml(SITE.hostBio)}</p>
              <div class="about-contact">
                <p class="about-contact__label">Reach out by email or connect on LinkedIn.</p>
                <div class="about-contact__actions">
                  <a class="button button--blue about-contact__button" href="${SITE.links.contactEmail}">
                    <span>Reach out by email</span>
                  </a>
                  <a
                    class="button button--blue about-contact__button"
                    href="${SITE.links.personalLinkedIn}"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Connect on LinkedIn</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        ${renderTestimonialsSection()}
        ${renderCollaborationSection()}
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
              <a class="button button--primary" href="${escapeAttribute(sitePath("/"))}">Home</a>
              <a class="button button--ghost" href="${escapeAttribute(sitePath("/episodes"))}">Episodes</a>
            </div>
          </div>
        </section>
      </main>
    `
    });
}
