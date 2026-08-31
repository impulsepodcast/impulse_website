function normalizeBasePath(value) {
    if (!value || value === "/") {
        return "";
    }
    const trimmed = value.trim().replace(/\/+$/, "");
    if (!trimmed) {
        return "";
    }
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
function normalizeSiteUrl(value) {
    if (!value) {
        return null;
    }
    return value.trim().replace(/\/+$/, "");
}
export const SITE = {
    name: "Impulse",
    description: "Impulse is the podcast where we dive into the most exciting breakthroughs in healthcare of our time.",
    extendedDescription: "In each episode, we sit down with some of the brightest minds who are using technology to rethink the way we care.",
    domain: "www.impulsepodcast.com",
    ownerName: "Mathieu Chaffard",
    hostBio: "Professionally, I am a biomedical engineer working in the digital health space. Being passionate about medical technology and a true podcast enthusiast, I started Impulse in 2022 to learn more about the latest advances in the field, and to meet the stakeholders redefining the limits of what is possible. I hope these in-depth conversations, from surgical robotics to spatial biology, give you practical learnings and a glimpse of what the future of healthcare could be.",
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
        newsletter: "https://impulsepodcast.substack.com/?r=24w483&utm_campaign=subscribe-page-share-screen&utm_medium=web",
        spotify: "https://open.spotify.com/show/4hMXpuZRFbxQSfpq25CBcJ?si=743539df2d324630",
        apple: "https://podcasts.apple.com/us/podcast/impulse-meeting-healthcare-pioneers/id1608213336",
        google: "https://podcasts.google.com/feed/aHR0cHM6Ly9mZWVkcy5tZWdhcGhvbmUuZm0vaW1wdWxzZQ",
        youtube: "https://www.youtube.com/@ImpulsePodcastHealthcare",
        amazon: "https://music.amazon.fr/podcasts/900f59b7-3488-4033-bfe2-3dddf903ffcb/impulse---meeting-healthcare-pioneers",
        rss: "https://feeds.megaphone.fm/impulse",
        brandLinkedIn: "https://www.linkedin.com/company/impulsepodcast/?viewAsMember=true",
        personalLinkedIn: "https://www.linkedin.com/in/mathieu-chaffard/",
        contactEmail: "mailto:mathieu@impulsepodcast.com",
        healthPodcastNetwork: "https://healthpodcastnetwork.com/show/impulse/"
    },
    collaborationPrompt: "A sponsoring campaign, a co-production, a cross-promotion, or simply a guest proposal to make?",
    latestEpisodeLabel: "Latest Episode"
};
export const SITE_BASE_PATH = normalizeBasePath(process.env.SITE_BASE_PATH);
export const SITE_URL = normalizeSiteUrl(process.env.SITE_URL) ?? `https://${SITE.domain}`;
export const R2_PUBLIC_BASE_URL = normalizeSiteUrl(process.env.R2_PUBLIC_BASE_URL);
export function sitePath(pathname) {
    if (!pathname) {
        return SITE_BASE_PATH || "/";
    }
    if (/^(?:[a-z]+:)?\/\//i.test(pathname) || /^(?:mailto:|tel:|#)/i.test(pathname)) {
        return pathname;
    }
    const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    return `${SITE_BASE_PATH}${normalizedPath}`;
}
export function assetPath(pathname) {
    if (R2_PUBLIC_BASE_URL &&
        /^\/static\/(?:audio|documents|images|transcripts)\//.test(pathname)) {
        return `${R2_PUBLIC_BASE_URL}${pathname}`;
    }
    return sitePath(pathname);
}
export function siteUrlForPath(pathname) {
    const siteOrigin = SITE_BASE_PATH && SITE_URL.endsWith(SITE_BASE_PATH)
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
};
export const PLATFORM_ICON_PATHS = {
    spotify: "/static/images/platforms/spotify.png",
    apple: "/static/images/platforms/apple-podcasts.png",
    google: "/static/images/platforms/google-podcasts.png",
    youtube: "/static/images/platforms/youtube.png",
    amazon: "/static/images/platforms/amazon-music.png",
    rss: "/static/images/platforms/rss.png"
};
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
];
export const TESTIMONIALS = [
    {
        author: "./jan",
        country: "Germany",
        rating: "★★★★★",
        date: "September 10, 2025",
        title: "Für alle die Mitgestalten wollen ein absolutes Muss!",
        body: "Absolut empfehlenswert für alle, die im Gesundheitswesen mitgestalten wollen. Durch spannende Gäste, kommen immer wieder frische Perspektiven und Impulse auf!"
    },
    {
        author: "Xxiwjfcknsa",
        country: "Switzerland",
        rating: "★★★★★",
        date: "September 4, 2025",
        title: "Recommended",
        body: "Great format, very interesting guests and a very thoughtful host"
    },
    {
        author: "Eva Lana",
        country: "United States",
        rating: "★★★★★",
        date: "April 1, 2024",
        title: "❤️❤️❤️❤️❤️",
        body: "Each episode feels like peeking behind the curtain with industry leaders. After listening, I'm inspired by the innovation shaping the future of healthcare. If you're curious about the latest breakthroughs, this podcast is your insider's guide to the medical world."
    },
    {
        author: "Terrify04",
        country: "United States",
        rating: "★★★★★",
        date: "March 28, 2024",
        title: "Truly innovative!",
        body: "I love tuning in to see what the next topic will be as they are so good! These are truly innovative ways to approach care and I always take something back with me into my practice!"
    },
    {
        author: "Vivien_Louis",
        country: "Switzerland",
        rating: "★★★★★",
        date: "March 10, 2024",
        title: "Fascinating topics and guests!",
        body: "Gives a great understanding of what's to come in medicine and what already transforms it! Very interesting, as well for those not in the healthcare space!"
    },
    {
        author: "iMatt'",
        country: "France",
        rating: "★★★★★",
        date: "March 10, 2024",
        title: "Highly recommended!",
        body: "A must listen for all healthcare enthusiasts!"
    },
    {
        author: "Claranais",
        country: "France",
        rating: "★★★★★",
        date: "August 16, 2023",
        title: "Really relevant podcast",
        body: "Very interesting and relevant podcast about the biomedical field. As accessible to experts as to neophytes. Impulse features passionate specialists on a variety of subjects. I recommend listening to it !"
    },
    {
        author: "Soif de Sens",
        country: "France",
        rating: "★★★★★",
        date: "June 12, 2023",
        title: "Keep going!",
        body: "Great speakers and themes"
    },
    {
        author: "vgcn5",
        country: "France",
        rating: "★★★★★",
        date: "June 5, 2023",
        title: "Super enrichissant",
        body: "Merci pour ce contenu qualitatif et précis 🙏"
    },
    {
        author: "Superbalotelli45",
        country: "Canada",
        rating: "★★★★★",
        date: "June 5, 2023",
        title: "Great Medical podcast",
        body: "Thanks Mathieu for meeting such interesting professionals and sharing their expertise !"
    },
    {
        author: "Health_passionate",
        country: "Switzerland",
        rating: "★★★★★",
        date: "March 6, 2023",
        title: "Really interesting !",
        body: "The hosts are knowledgeable, engaging, and makes learning about medical topics enjoyable. The production quality is very good and the guests provide great insights on various health new technologies while making it accessible for everyone! I highly recommend this podcast to anyone who wants to stay informed about the latest in the world of healthcare. 5 stars!"
    },
    {
        author: "jmlaur",
        country: "France",
        rating: "★★★★★",
        date: "April 20, 2022",
        title: "Super podcast",
        body: "Super innovative and inspiring subjects are presented, speakers are great, and the podcast is super professional. I just love it. Looking forward to the next episodes!"
    },
    {
        author: "La Chaff",
        country: "France",
        rating: "★★★★★",
        date: "March 12, 2022",
        title: "Nice discovery",
        body: "Though I'm not from the field, I found the first two episodes very instructive and inspiring! Keep it up!"
    },
    {
        author: "elsa alb",
        country: "France",
        rating: "★★★★★",
        date: "March 9, 2022",
        title: "What a great initiative!",
        body: "Mathieu has managed to gather the « Crème de la crème » of international experts and introduce very specific topics even to novices! Thanks for putting such effort into this, hope it'll go big!"
    },
    {
        author: "Tiffany Lyly",
        country: "France",
        rating: "★★★★★",
        date: "March 2, 2022",
        title: "Brilliant!",
        body: "Thanks for initiating a podcast on Healthcare Pioneers. It is very interesting and eye-opening!"
    },
    {
        author: "NicoHnk",
        country: "Switzerland",
        rating: "★★★★★",
        date: "March 1, 2022",
        title: "Novative podcast initiative in medtech",
        body: "Thanks for sharing these stories! They are refreshing and bringing true heroes in front of the mic! Looking forward to listening the next career adventures!"
    },
    {
        author: "vaervera",
        country: "Switzerland",
        rating: "★★★★★",
        date: "March 1, 2022",
        title: "Well-structured & clear statements",
        body: "Well-structured, interessting and clear statements (even without huge medical knowledge)"
    }
];
