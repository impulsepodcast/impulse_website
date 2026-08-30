import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, posix, relative, resolve } from "node:path";

interface UploadCandidate {
  absolutePath: string;
  key: string;
  size: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../..");
const applyUpload = process.argv.includes("--apply");
const listFiles = process.argv.includes("--list");

const sources = [
  { directory: join(projectRoot, "public", "images"), keyPrefix: "static/images" },
  { directory: join(projectRoot, "public", "audio"), keyPrefix: "static/audio" },
  { directory: join(projectRoot, "public", "documents"), keyPrefix: "static/documents" },
  { directory: join(projectRoot, "content", "transcripts"), keyPrefix: "static/transcripts" }
];

const contentTypes = new Map<string, string>([
  [".avif", "image/avif"],
  [".doc", "application/msword"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".mp3", "audio/mpeg"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".wav", "audio/wav"],
  [".webp", "image/webp"]
]);

async function directoryExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map(async (entry) => {
        const pathname = join(directory, entry.name);
        return entry.isDirectory() ? walkFiles(pathname) : [pathname];
      })
  );

  return nested.flat();
}

async function collectCandidates(): Promise<UploadCandidate[]> {
  const candidates: UploadCandidate[] = [];

  for (const source of sources) {
    if (!(await directoryExists(source.directory))) {
      continue;
    }

    for (const absolutePath of await walkFiles(source.directory)) {
      const fileStats = await stat(absolutePath);
      const relativePath = relative(source.directory, absolutePath).split("\\").join("/");
      candidates.push({
        absolutePath,
        key: posix.join(source.keyPrefix, relativePath),
        size: fileStats.size
      });
    }
  }

  return candidates.sort((left, right) => left.key.localeCompare(right.key));
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.r2.example and export the real value before using --apply.`);
  }

  return value;
}

function contentDisposition(candidate: UploadCandidate): string | undefined {
  if (!candidate.key.startsWith("static/documents/") && !candidate.key.startsWith("static/transcripts/")) {
    return undefined;
  }

  const filename = candidate.key.split("/").at(-1) ?? "download";
  return `attachment; filename="${filename.replaceAll('"', "")}"`;
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

async function main() {
  const candidates = await collectCandidates();
  const totalBytes = candidates.reduce((sum, candidate) => sum + candidate.size, 0);

  console.log(`Prepared ${candidates.length} R2 object(s), ${formatBytes(totalBytes)} total.`);

  if (listFiles || !applyUpload) {
    for (const candidate of candidates) {
      console.log(`${candidate.key} (${formatBytes(candidate.size)})`);
    }
  }

  if (!applyUpload) {
    console.log("Dry run only. Re-run with --apply after configuring the R2 environment variables.");
    return;
  }

  const accountId = requiredEnvironment("R2_ACCOUNT_ID");
  const bucket = requiredEnvironment("R2_BUCKET");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnvironment("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnvironment("R2_SECRET_ACCESS_KEY")
    }
  });

  let uploaded = 0;
  for (const candidate of candidates) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: candidate.key,
        Body: await readFile(candidate.absolutePath),
        ContentType: contentTypes.get(extname(candidate.absolutePath).toLowerCase()) ?? "application/octet-stream",
        CacheControl: candidate.key.startsWith("static/transcripts/")
          ? "public, max-age=3600"
          : "public, max-age=86400",
        ContentDisposition: contentDisposition(candidate)
      })
    );
    uploaded += 1;
    console.log(`Uploaded ${uploaded}/${candidates.length}: ${candidate.key}`);
  }

  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  console.log(`Uploaded ${uploaded} object(s) to R2 bucket ${bucket}.`);
  if (publicBaseUrl) {
    console.log(`Public media origin: ${publicBaseUrl}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
