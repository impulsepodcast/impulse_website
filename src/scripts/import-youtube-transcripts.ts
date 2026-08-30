import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, resolve } from "node:path";

import { loadMarkdownEpisodes } from "../lib/markdown-episodes.js";
import type { Episode } from "../lib/types.js";

interface TranscriptFragment {
  start: number;
  text: string;
}

interface TranscriptResult {
  text: string;
  wordCount: number;
  musicTokenCount: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../..");

function optionValue(name: string): string | undefined {
  const optionIndex = process.argv.indexOf(name);
  return optionIndex === -1 ? undefined : process.argv[optionIndex + 1];
}

function youtubeVideoId(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (parsed.hostname.endsWith("youtube.com")) {
      return parsed.searchParams.get("v") ?? parsed.pathname.match(/^\/(?:embed|shorts)\/([^/?#]+)/)?.[1] ?? null;
    }
  } catch {
    return null;
  }

  return null;
}

function decodeCaptionEntities(value: string): string {
  return value
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)));
}

function timestampToSeconds(value: string): number {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/);
  if (!match) {
    return 0;
  }

  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function cleanCaptionText(value: string): string {
  return decodeCaptionEntities(value)
    .replace(/<[^>]+>/g, "")
    .replace(/>>\s*/g, "— ")
    .replace(/[♪♫♬�]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedToken(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}%]+/gu, "");
}

function removeWordOverlap(existingWords: string[], incomingWords: string[]): string[] {
  const maximumOverlap = Math.min(existingWords.length, incomingWords.length, 80);

  for (let overlap = maximumOverlap; overlap > 0; overlap -= 1) {
    const existingSlice = existingWords.slice(-overlap).map(normalizedToken);
    const incomingSlice = incomingWords.slice(0, overlap).map(normalizedToken);
    if (existingSlice.every((word, index) => word === incomingSlice[index])) {
      return incomingWords.slice(overlap);
    }
  }

  return incomingWords;
}

function parseVtt(source: string): TranscriptResult {
  const fragments: TranscriptFragment[] = [];
  const blocks = source.replace(/^\uFEFF/, "").replace(/\r/g, "").split(/\n{2,}/);

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex === -1) {
      continue;
    }

    const start = timestampToSeconds(lines[timingIndex].split(/\s+-->\s+/)[0]);
    const captionLines = lines.slice(timingIndex + 1);
    const rollingLines = captionLines.filter((line) => /<\d{2}:\d{2}:\d{2}\.\d{3}>/.test(line));
    const selectedLines = rollingLines.length > 0 ? rollingLines : captionLines;
    const text = cleanCaptionText(selectedLines.join(" "));

    if (text) {
      fragments.push({ start, text });
    }
  }

  const paragraphs: string[] = [];
  const allWords: string[] = [];
  let paragraphWords: string[] = [];
  let previousStart = 0;

  function flushParagraph() {
    if (paragraphWords.length > 0) {
      paragraphs.push(paragraphWords.join(" "));
      paragraphWords = [];
    }
  }

  for (const fragment of fragments) {
    const incomingWords = fragment.text.split(/\s+/).filter(Boolean);
    const uniqueWords = removeWordOverlap(allWords, incomingWords);
    if (uniqueWords.length === 0) {
      continue;
    }

    if ((fragment.start - previousStart > 4 && paragraphWords.length >= 20) || paragraphWords.length >= 115) {
      flushParagraph();
    }

    paragraphWords.push(...uniqueWords);
    allWords.push(...uniqueWords);
    previousStart = fragment.start;
  }

  flushParagraph();

  const text = paragraphs.join("\n\n").trim();
  const musicTokenCount = (source.match(/[♪♫♬�]/g) ?? []).length;
  return { text, wordCount: allWords.length, musicTokenCount };
}

function chooseCaptionFile(videoId: string, fileNames: string[]): string | null {
  const candidates = fileNames.filter((fileName) => fileName.startsWith(`${videoId}.`) && fileName.endsWith(".vtt"));
  return (
    candidates.find((fileName) => fileName.includes(".en-orig.")) ??
    candidates.find((fileName) => fileName.includes(".en.")) ??
    candidates[0] ??
    null
  );
}

function assertTranscriptQuality(episode: Episode, result: TranscriptResult): void {
  if (result.wordCount < 300) {
    throw new Error(`Transcript for episode ${episode.number} is suspiciously short (${result.wordCount} words).`);
  }

  if (result.musicTokenCount > result.wordCount * 0.2) {
    throw new Error(`Transcript for episode ${episode.number} contains too many music/noise tokens.`);
  }

  if (/\b(?:undefined|null|nan)\b/i.test(result.text)) {
    throw new Error(`Transcript for episode ${episode.number} contains invalid generated tokens.`);
  }
}

async function main() {
  const sourceDirectory = resolve(optionValue("--source") ?? join(projectRoot, ".transcript-work", "captions"));
  const outputDirectory = join(projectRoot, "content", "transcripts");
  const episodes = await loadMarkdownEpisodes(join(projectRoot, "content", "episodes"));
  const youtubeEpisodes = episodes.filter((episode) => Boolean(episode.links.youtube));
  const captionFiles = await readdir(sourceDirectory);

  await mkdir(outputDirectory, { recursive: true });

  for (const episode of youtubeEpisodes) {
    const videoId = youtubeVideoId(episode.links.youtube);
    if (!videoId) {
      throw new Error(`Could not parse the YouTube video ID for episode ${episode.number}.`);
    }

    const captionFile = chooseCaptionFile(videoId, captionFiles);
    if (!captionFile) {
      throw new Error(`No VTT caption file found for episode ${episode.number} (${videoId}).`);
    }

    const source = await readFile(join(sourceDirectory, captionFile), "utf8");
    const result = parseVtt(source);
    assertTranscriptQuality(episode, result);
    await writeFile(join(outputDirectory, `${episode.slug}.txt`), `${result.text}\n`, "utf8");
    console.log(
      `Imported episode ${episode.number}: ${basename(captionFile)} -> ${episode.slug}.txt (${result.wordCount} words)`
    );
  }

  console.log(`Imported and quality-checked ${youtubeEpisodes.length} YouTube transcript(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
