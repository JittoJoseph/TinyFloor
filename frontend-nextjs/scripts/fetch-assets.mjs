/**
 * Puts the licensed art in place before a build.
 *
 * The Modern Interiors and Modern Office packs may be used in this project but
 * not redistributed, so their files live in an R2 bucket rather than in git.
 * Every build pulls them into public/ and checks each one against the manifest.
 *
 * Locally, ../private-assets is used when it is there, so a working copy of the
 * packs needs no credentials. Otherwise the files come from the bucket's public
 * URL, which needs none either. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and
 * R2_SECRET_ACCESS_KEY to read a bucket that is not public instead.
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
const publicUrl = process.env.R2_PUBLIC_URL ?? manifest.publicUrl;

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

function signingKey(secret, date, region, service) {
  let key = Buffer.from(`AWS4${secret}`, "utf8");
  for (const part of [date, region, service, "aws4_request"]) {
    key = createHmac("sha256", key).update(part).digest();
  }
  return key;
}

async function fetchFromPublicUrl(key) {
  const response = await fetch(`${publicUrl}/${key}`);
  if (!response.ok) {
    throw new Error(`${publicUrl} gave ${response.status} for ${key}`);
  }
  return Buffer.from(await response.arrayBuffer());
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

// --remote ignores both the local copy and what is already in public/, to
// check the credentials a build will use.
const forceRemote = process.argv.includes("--remote");
const useLocal = !forceRemote && existsSync(localSource);
let fetched = 0;

for (const file of manifest.files) {
  const destination = path.join(root, "public", file.key);
  if (!forceRemote && existsSync(destination) && sha256(await readFile(destination)) === file.sha256)
    continue;

  let buffer;
  if (useLocal) {
    buffer = await readFile(path.join(localSource, file.key));
  } else if (publicUrl) {
    buffer = await fetchFromPublicUrl(file.key);
  } else {
    buffer = await fetchFromR2(file.key);
  }

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
    ? `assets: ${fetched} of ${manifest.files.length} written from ${
        useLocal ? "private-assets" : publicUrl ? "the bucket's public url" : `r2:${bucket}`
      }`
    : `assets: all ${manifest.files.length} already in place`,
);
