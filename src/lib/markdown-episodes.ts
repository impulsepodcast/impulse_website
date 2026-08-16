import { access, readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

import type { Episode, EpisodeLinks } from "./types.js";
import { slugify, stableSortByNumberDesc, toDateString } from "./utils.js";

const ALLOWED_LINK_KEYS = new Set<keyof EpisodeLinks>([
  "spotify",
  "apple",
  "google",
  "youtube",
  "amazon",
  "rss"
]);

type FrontmatterValue = string | number | boolean | string[] | Record<string, string>;

interface ParsedMarkdownEpisode {
  frontmatter: Record<string, FrontmatterValue>;
  body: string;
}

function parseScalar(input: string): string | number | boolean {
  const trimmed = input.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
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

function parseFrontmatter(source: string, filePath: string): ParsedMarkdownEpisode {
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
  const frontmatter: Record<string, FrontmatterValue> = {};

  for (let index = 0; index < lines.length; ) {
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
      const items: string[] = [];
      index += 1;

      while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
        items.push(String(parseScalar(lines[index].replace(/^\s*-\s+/, ""))));
        index += 1;
      }

      frontmatter[key] = items;
      continue;
    }

    if (/^\s{2,}[A-Za-z][\w]*\s*:/.test(nextLine)) {
      const objectValue: Record<string, string> = {};
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

function markdownFilenameToSlug(fileName: string, number: number): string {
  const rawBaseName = basename(fileName, extname(fileName));
  const baseSlug = slugify(rawBaseName);

  if (baseSlug.startsWith(`${number}-`)) {
    return baseSlug;
  }

  return `${number}-${baseSlug}`;
}

function coerceLinks(value: FrontmatterValue | undefined, filePath: string): EpisodeLinks {
  if (!value) {
    return {};
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`"links" must be an object in ${filePath}`);
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([linkKey, linkValue]) =>
        ALLOWED_LINK_KEYS.has(linkKey as keyof EpisodeLinks) && Boolean(linkValue.trim())
    )
  ) as EpisodeLinks;
}

function requiredString(
  frontmatter: Record<string, FrontmatterValue>,
  key: string,
  filePath: string
): string {
  const value = frontmatter[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required "${key}" field in ${filePath}`);
  }

  return value.trim();
}

function optionalString(
  frontmatter: Record<string, FrontmatterValue>,
  key: string
): string | undefined {
  const value = frontmatter[key];
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return value.trim();
}

function requiredNumber(
  frontmatter: Record<string, FrontmatterValue>,
  key: string,
  filePath: string
): number {
  const value = frontmatter[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Missing required numeric "${key}" field in ${filePath}`);
  }

  return value;
}

function requiredArray(
  frontmatter: Record<string, FrontmatterValue>,
  key: string,
  filePath: string
): string[] {
  const value = frontmatter[key];
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Missing required list "${key}" in ${filePath}`);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function buildImageStemLookup(fileNames: string[]): Map<string, string> {
  const rankByExtension = new Map<string, number>([
    [".webp", 0],
    [".avif", 1],
    [".png", 2],
    [".jpg", 3],
    [".jpeg", 4],
    [".svg", 5]
  ]);
  const lookup = new Map<string, string>();

  for (const fileName of fileNames) {
    const stem = basename(fileName, extname(fileName));
    const current = lookup.get(stem);

    if (!current) {
      lookup.set(stem, fileName);
      continue;
    }

    const nextRank = rankByExtension.get(extname(fileName).toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const currentRank =
      rankByExtension.get(extname(current).toLowerCase()) ?? Number.MAX_SAFE_INTEGER;

    if (nextRank < currentRank) {
      lookup.set(stem, fileName);
    }
  }

  return lookup;
}

function buildImageNumberLookup(fileNames: string[]): Map<number, string> {
  const lookup = new Map<number, string>();

  for (const fileName of fileNames) {
    const match = fileName.match(/^(\d+)-/);
    if (!match) {
      continue;
    }

    const episodeNumber = Number(match[1]);
    if (!lookup.has(episodeNumber)) {
      lookup.set(episodeNumber, fileName);
    }
  }

  return lookup;
}

function resolveEpisodeImagePath(
  imagePath: string,
  episodeNumber: number,
  availableImageFiles: Set<string>,
  imageStemLookup: Map<string, string>,
  imageNumberLookup: Map<number, string>
): string {
  const staticPrefix = "/static/images/episodes/";
  if (!imagePath.startsWith(staticPrefix)) {
    return imagePath;
  }

  const fileName = imagePath.slice(staticPrefix.length);
  if (availableImageFiles.has(fileName)) {
    return imagePath;
  }

  const stem = basename(fileName, extname(fileName));
  const resolvedFileName = imageStemLookup.get(stem);

  if (resolvedFileName) {
    return `${staticPrefix}${resolvedFileName}`;
  }

  const numberMatchedFileName = imageNumberLookup.get(episodeNumber);
  if (numberMatchedFileName) {
    return `${staticPrefix}${numberMatchedFileName}`;
  }

  return imagePath;
}

export async function loadMarkdownEpisodes(markdownDirPath: string): Promise<Episode[]> {
  try {
    await access(markdownDirPath);
  } catch {
    return [];
  }

  const projectRoot = resolve(markdownDirPath, "../..");
  const imageDirPath = join(projectRoot, "public", "images", "episodes");
  const imageFiles = await readdir(imageDirPath).catch(() => []);
  const availableImageFiles = new Set(imageFiles);
  const imageStemLookup = buildImageStemLookup(imageFiles);
  const imageNumberLookup = buildImageNumberLookup(imageFiles);

  const files = (await readdir(markdownDirPath))
    .filter((fileName) => fileName.endsWith(".md"))
    .filter((fileName) => !fileName.startsWith("_"))
    .sort((left, right) => left.localeCompare(right));

  const episodes = await Promise.all(
    files.map(async (fileName) => {
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
      const image = resolveEpisodeImagePath(
        requiredString(parsed.frontmatter, "image", filePath),
        number,
        availableImageFiles,
        imageStemLookup,
        imageNumberLookup
      );
      const releasedAt = toDateString(
        String(parsed.frontmatter.releasedAt ?? parsed.frontmatter.releaseDate ?? "")
      );
      const tags = requiredArray(parsed.frontmatter, "tags", filePath);
      const previewAudio = optionalString(parsed.frontmatter, "previewAudio");
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
      } satisfies Episode;
    })
  );

  const seenNumbers = new Set<number>();
  const seenSlugs = new Set<string>();

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

  return stableSortByNumberDesc(episodes);
}
