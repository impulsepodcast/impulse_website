import { access, readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { slugify, toDateString } from "./utils.js";
const ALLOWED_LINK_KEYS = new Set([
    "spotify",
    "apple",
    "google",
    "youtube",
    "amazon",
    "rss"
]);
function parseScalar(input) {
    const trimmed = input.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    if (/^(true|false)$/i.test(trimmed)) {
        return trimmed.toLowerCase() === "true";
    }
    if (/^-?\d+$/.test(trimmed)) {
        return Number(trimmed);
    }
    return trimmed;
}
function parseFrontmatter(source, filePath) {
    if (!source.startsWith("---\n")) {
        throw new Error(`Episode markdown must start with frontmatter: ${filePath}`);
    }
    const closingIndex = source.indexOf("\n---\n", 4);
    if (closingIndex === -1) {
        throw new Error(`Episode markdown is missing the closing frontmatter fence: ${filePath}`);
    }
    const rawFrontmatter = source.slice(4, closingIndex);
    const body = source.slice(closingIndex + 5).trim();
    const lines = rawFrontmatter.split(/\r?\n/);
    const frontmatter = {};
    for (let index = 0; index < lines.length;) {
        const line = lines[index];
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            index += 1;
            continue;
        }
        const match = line.match(/^([A-Za-z][\w]*)\s*:\s*(.*)$/);
        if (!match) {
            throw new Error(`Invalid frontmatter line in ${filePath}: ${line}`);
        }
        const [, key, rawValue] = match;
        if (rawValue.trim() !== "") {
            frontmatter[key] = parseScalar(rawValue);
            index += 1;
            continue;
        }
        const nextLine = lines[index + 1] ?? "";
        if (/^\s*-\s+/.test(nextLine)) {
            const items = [];
            index += 1;
            while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
                items.push(String(parseScalar(lines[index].replace(/^\s*-\s+/, ""))));
                index += 1;
            }
            frontmatter[key] = items;
            continue;
        }
        if (/^\s{2,}[A-Za-z][\w]*\s*:/.test(nextLine)) {
            const objectValue = {};
            index += 1;
            while (index < lines.length && /^\s{2,}[A-Za-z][\w]*\s*:/.test(lines[index])) {
                const nestedMatch = lines[index].match(/^\s{2,}([A-Za-z][\w]*)\s*:\s*(.*)$/);
                if (!nestedMatch) {
                    break;
                }
                objectValue[nestedMatch[1]] = String(parseScalar(nestedMatch[2]));
                index += 1;
            }
            frontmatter[key] = objectValue;
            continue;
        }
        frontmatter[key] = "";
        index += 1;
    }
    return { frontmatter, body };
}
function markdownFilenameToSlug(fileName, number) {
    const rawBaseName = basename(fileName, extname(fileName));
    const baseSlug = slugify(rawBaseName);
    if (baseSlug.startsWith(`${number}-`)) {
        return baseSlug;
    }
    return `${number}-${baseSlug}`;
}
function coerceLinks(value, filePath) {
    if (!value) {
        return {};
    }
    if (typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`"links" must be an object in ${filePath}`);
    }
    return Object.fromEntries(Object.entries(value).filter(([linkKey, linkValue]) => ALLOWED_LINK_KEYS.has(linkKey) && Boolean(linkValue.trim())));
}
function requiredString(frontmatter, key, filePath) {
    const value = frontmatter[key];
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`Missing required "${key}" field in ${filePath}`);
    }
    return value.trim();
}
function optionalString(frontmatter, key) {
    const value = frontmatter[key];
    if (typeof value !== "string" || value.trim() === "") {
        return undefined;
    }
    return value.trim();
}
function requiredNumber(frontmatter, key, filePath) {
    const value = frontmatter[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Missing required numeric "${key}" field in ${filePath}`);
    }
    return value;
}
function requiredArray(frontmatter, key, filePath) {
    const value = frontmatter[key];
    if (!Array.isArray(value) || value.length === 0) {
        throw new Error(`Missing required list "${key}" in ${filePath}`);
    }
    return value.map((item) => item.trim()).filter(Boolean);
}
export async function loadMarkdownEpisodes(markdownDirPath) {
    try {
        await access(markdownDirPath);
    }
    catch {
        return [];
    }
    const files = (await readdir(markdownDirPath))
        .filter((fileName) => fileName.endsWith(".md"))
        .filter((fileName) => !fileName.startsWith("_"))
        .sort((left, right) => left.localeCompare(right));
    const episodes = await Promise.all(files.map(async (fileName) => {
        const filePath = join(markdownDirPath, fileName);
        const [markdownSource, fileStats] = await Promise.all([
            readFile(filePath, "utf8"),
            stat(filePath)
        ]);
        const parsed = parseFrontmatter(markdownSource, filePath);
        const number = requiredNumber(parsed.frontmatter, "number", filePath);
        const title = requiredString(parsed.frontmatter, "title", filePath);
        const guest = requiredString(parsed.frontmatter, "guest", filePath);
        const company = optionalString(parsed.frontmatter, "company");
        const summary = requiredString(parsed.frontmatter, "summary", filePath);
        const image = requiredString(parsed.frontmatter, "image", filePath);
        const releasedAt = toDateString(String(parsed.frontmatter.releasedAt ?? parsed.frontmatter.releaseDate ?? ""));
        const tags = requiredArray(parsed.frontmatter, "tags", filePath);
        const previewAudio = requiredString(parsed.frontmatter, "previewAudio", filePath);
        const links = coerceLinks(parsed.frontmatter.links, filePath);
        return {
            id: `episode-${number}`,
            number,
            slug: markdownFilenameToSlug(fileName, number),
            title,
            guest,
            company,
            summary,
            body: parsed.body,
            image,
            releasedAt,
            tags,
            links,
            previewAudio,
            source: "markdown",
            createdAt: fileStats.birthtime.toISOString(),
            updatedAt: fileStats.mtime.toISOString()
        };
    }));
    const seenNumbers = new Set();
    const seenSlugs = new Set();
    for (const episode of episodes) {
        if (seenNumbers.has(episode.number)) {
            throw new Error(`Duplicate episode number found in markdown files: ${episode.number}`);
        }
        if (seenSlugs.has(episode.slug)) {
            throw new Error(`Duplicate episode slug found in markdown files: ${episode.slug}`);
        }
        seenNumbers.add(episode.number);
        seenSlugs.add(episode.slug);
    }
    return episodes;
}
