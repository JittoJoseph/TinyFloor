/**
 * Puts the licensed art in place before a build.
 *
 * The Modern Interiors and Modern Office packs may be used in this project but
 * not redistributed, so their files live in an R2 bucket rather than in git.
 * Every build pulls them into public/ and checks each one against the manifest.
 *
 * Locally, ../private-assets is used when it is there, so a working copy of the
 * packs needs no credentials. In CI, set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY and optionally R2_BUCKET.
 */
import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const root = path.join(here, "..");
const manifest = JSON.parse(await readFile(path.join(root, "assets.manifest.json"), "utf8"));
const localSource = path.join(root, "..", "private-assets");
const bucket = process.env.R2_BUCKET ?? manifest.bucket;

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

function signingKey(secret, date, region, service) {
  let key = Buffer.from(`AWS4${secret}`, "utf8");
  for (const part of [date, region, service, "aws4_request"]) {
    key = createHmac("sha256", key).update(part).digest();
  }
  return key;
}

/** A plain SigV4 GET against the S3 endpoint, so the build needs no extra dependency. */
async function fetchFromR2(key) {
  const account = process.env.R2_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!account || !accessKey || !secret) {
    throw new Error(
      `No ${localSource} and no R2 credentials, so ${key} cannot be fetched. ` +
        "Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.",
    );
  }

  const host = `${account}.r2.cloudflarestorage.com`;
  const stamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
  const date = stamp.slice(0, 8);
  const payload = sha256(Buffer.alloc(0));
  const canonical = [
    "GET",
    `/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`,
    "",
    `host:${host}`,
    `x-amz-content-sha256:${payload}`,
    `x-amz-date:${stamp}`,
    "",
    "host;x-amz-content-sha256;x-amz-date",
    payload,
  ].join("\n");
  const scope = `${date}/auto/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256(Buffer.from(canonical))].join("\n");
  const signature = createHmac("sha256", signingKey(secret, date, "auto", "s3"))
    .update(toSign)
    .digest("hex");

  const response = await fetch(`https://${host}/${bucket}/${key}`, {
    headers: {
      host,
      "x-amz-content-sha256": payload,
      "x-amz-date": stamp,
      authorization:
        `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, ` +
        "SignedHeaders=host;x-amz-content-sha256;x-amz-date, " +
        `Signature=${signature}`,
    },
  });
  if (!response.ok) {
    throw new Error(`R2 gave ${response.status} for ${key}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const useLocal = existsSync(localSource);
let fetched = 0;

for (const file of manifest.files) {
  const destination = path.join(root, "public", file.key);
  if (existsSync(destination) && sha256(await readFile(destination)) === file.sha256) continue;

  const buffer = useLocal
    ? await readFile(path.join(localSource, file.key))
    : await fetchFromR2(file.key);

  const actual = sha256(buffer);
  if (actual !== file.sha256) {
    throw new Error(`${file.key} does not match the manifest (${actual.slice(0, 12)})`);
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, buffer);
  fetched += 1;
}

console.log(
  fetched
    ? `assets: ${fetched} of ${manifest.files.length} written from ${useLocal ? "private-assets" : `r2:${bucket}`}`
    : `assets: all ${manifest.files.length} already in place`,
);
