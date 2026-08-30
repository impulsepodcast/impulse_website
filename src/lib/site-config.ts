function normalizeBasePath(value?: string): string {
  if (!value || value === "/") {
    return "";
  }

  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeSiteUrl(value?: string): string | null {
  if (!value) {
    return null;
  }

  return value.trim().replace(/\/+$/, "");
}

export const SITE = {
  name: "Impulse",
  description:
    "Impulse is the podcast where we dive into the most exciting breakthroughs in healthcare of our time.",
  extendedDescription:
    "In each episode, we sit down with some of the brightest minds who are using technology to rethink the way we care.",
  domain: "www.impulsepodcast.com",
  ownerName: "Mathieu Chaffard",
  hostBio:
    "Professionally, I am a biomedical engineer working in the digital health space. Being passionate about medical technology and a true podcast enthusiast, I started Impulse in 2022 to learn more about the latest advances in the field, and to meet the stakeholders redefining the limits of what is possible. I hope these in-depth conversations, from surgical robotics to spatial biology, give you practical learnings and a glimpse of what the future of healthcare could be.",
  hostTitle: "Biomedical engineer, host, and healthcare technology operator",
  hostPhoto: "/static/images/site/host-photo.jpg",
  assets: {
    brandLogo: "/static/images/site/brand-logo.png",
    healthPodcastNetworkBadge: "/static/images/site/health-podcast-network.png",
    linkedInIcon: "/static/images/site/linkedin.png",
    wave: "/static/images/site/Home_Page.svg"
  },
  links: {
    subscribe: "https://linktr.ee/impulse.podcast",
    newsletter:
      "https://impulsepodcast.substack.com/?r=24w483&utm_campaign=subscribe-page-share-screen&utm_medium=web",
    spotify: "https://open.spotify.com/show/4hMXpuZRFbxQSfpq25CBcJ?si=743539df2d324630",
    apple: "https://podcasts.apple.com/us/podcast/impulse-meeting-healthcare-pioneers/id1608213336",
    google: "https://podcasts.google.com/feed/aHR0cHM6Ly9mZWVkcy5tZWdhcGhvbmUuZm0vaW1wdWxzZQ",
    youtube: "https://www.youtube.com/@ImpulsePodcastHealthcare",
    amazon:
      "https://music.amazon.fr/podcasts/900f59b7-3488-4033-bfe2-3dddf903ffcb/impulse---meeting-healthcare-pioneers",
    rss: "https://feeds.megaphone.fm/impulse",
    brandLinkedIn: "https://www.linkedin.com/company/impulsepodcast/?viewAsMember=true",
    personalLinkedIn: "https://www.linkedin.com/in/mathieu-chaffard/",
    contactEmail: "mailto:mathieu@impulsepodcast.com",
    healthPodcastNetwork: "https://healthpodcastnetwork.com/show/impulse/"
  },
  collaborationPrompt:
    "A sponsoring campaign, a co-production, a cross-promotion, or simply a guest proposal to make?",
  latestEpisodeLabel: "Latest Episode"
} as const;

export const SITE_BASE_PATH = normalizeBasePath(process.env.SITE_BASE_PATH);
export const SITE_URL = normalizeSiteUrl(process.env.SITE_URL) ?? `https://${SITE.domain}`;
export const R2_PUBLIC_BASE_URL = normalizeSiteUrl(process.env.R2_PUBLIC_BASE_URL);

export function sitePath(pathname: string): string {
  if (!pathname) {
    return SITE_BASE_PATH || "/";
  }

  if (/^(?:[a-z]+:)?\/\//i.test(pathname) || /^(?:mailto:|tel:|#)/i.test(pathname)) {
    return pathname;
  }

  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_BASE_PATH}${normalizedPath}`;
}

export function assetPath(pathname: string): string {
  if (
    R2_PUBLIC_BASE_URL &&
    /^\/static\/(?:audio|documents|images|transcripts)\//.test(pathname)
  ) {
    return `${R2_PUBLIC_BASE_URL}${pathname}`;
  }

  return sitePath(pathname);
}

export function siteUrlForPath(pathname: string): string {
  const siteOrigin =
    SITE_BASE_PATH && SITE_URL.endsWith(SITE_BASE_PATH)
      ? SITE_URL.slice(0, -SITE_BASE_PATH.length) || SITE_URL
      : SITE_URL;
  const normalizedPath = pathname === "/" ? "" : pathname.replace(/\/+$/, "");
  return `${siteOrigin}${SITE_BASE_PATH}${normalizedPath}`;
}

export const PLATFORM_LABELS = {
  spotify: "Spotify",
  apple: "Apple Podcasts",
  google: "Google Podcasts",
  youtube: "YouTube",
  amazon: "Amazon Music",
  rss: "RSS"
} as const;

export const PLATFORM_ICON_PATHS = {
  spotify: "/static/images/platforms/spotify.png",
  apple: "/static/images/platforms/apple-podcasts.png",
  google: "/static/images/platforms/google-podcasts.png",
  youtube: "/static/images/platforms/youtube.png",
  amazon: "/static/images/platforms/amazon-music.png",
  rss: "/static/images/platforms/rss.png"
} as const;


export const SUPPORTERS = [
  {
    name: "Health Podcast Network",
    image: "/static/images/supports/health-podcast-network.png",
    url: SITE.links.healthPodcastNetwork,
    compact: true
  },
  {
    name: "health.tech",
    image: "/static/images/supports/Health.Tech-01.png",
    url: "https://www.health.tech/",
    compact: false
  },
  {
    name: "HLTH Europe",
    image: "/static/images/supports/HLTH_Europe-01.png",
    url: "https://europe.hlth.com/",
    compact: false
  },
  {
    name: "MedTech World",
    image: "/static/images/supports/MedTech_World-01.png",
    url: "https://med-tech.world/",
    compact: false
  },
  {
    name: "Robert Wood Johnson Foundation",
    image: "/static/images/supports/Robert_Wood_Johnson-01.png",
    url: "https://www.rwjf.org/",
    compact: false
  },
  {
    name: "Vanderbilt University",
    image: "/static/images/supports/Vanderbilt_University-01.png",
    url: "https://www.vanderbilt.edu/",
    compact: false
  }
] as const;

export const TESTIMONIALS = [
  {
    author: "Eva Lana",
    country: "United States",
    rating: "★★★★★",
    title: "Insider's guide to the medical world",
    body:
      "Each episode feels like peeking behind the curtain with industry leaders. After listening, I'm inspired by the innovation shaping the future of healthcare. If you're curious about the latest breakthroughs, this podcast is your insider's guide to the medical world."
  },
  {
    author: "Vivien_Louis",
    country: "Switzerland",
    rating: "★★★★★",
    title: "Fascinating topics and guests!",
    body:
      "Gives a great understanding of what's to come in medicine and what already transforms it. Very interesting, as well for those not in the healthcare space."
  },
  {
    author: "./jan",
    country: "Germany",
    rating: "★★★★★",
    title: "Fur alle die mitgestalten wollen ein absolutes Muss!",
    body:
      "Absolut empfehlenswert fur alle, die im Gesundheitswesen mitgestalten wollen. Durch spannende Gaste kommen immer wieder frische Perspektiven und Impulse auf."
  },
  {
    author: "Health_passionate",
    country: "Switzerland",
    rating: "★★★★★",
    title: "Really interesting!",
    body:
      "The hosts are knowledgeable, engaging, and make learning about medical topics enjoyable. The production quality is very good and the guests provide great insights on various health new technologies while making it accessible for everyone. I highly recommend this podcast to anyone who wants to stay informed about the latest in the world of healthcare."
  },
  {
    author: "jmlaur",
    country: "France",
    rating: "★★★★★",
    title: "Super podcast",
    body:
      "Super innovative and inspiring subjects are presented, speakers are great, and the podcast is super professional. I just love it. Looking forward to the next episodes!"
  }
] as const;
