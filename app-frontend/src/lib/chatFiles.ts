"use client";

import { FILE_MAX, isPicture, type ChatFile } from "@shared/chat";
import { API_URL } from "@/lib/api";

/**
 * Files in chat, on the browser's side (docs/product.md). A picture is made
 * small before it leaves (2048 pixels on its long side, WebP), so a phone's
 * 12 MB photo goes up as a few hundred kilobytes and still looks sharp on a
 * big screen; its size travels with it, so it takes its room before it loads.
 * Anything else goes up as it is. GIFs stay GIFs, to keep moving.
 */

const LONG_SIDE = 2048;
/** A picture already this small, and no bigger than the long side, goes up untouched. */
const SMALL_ENOUGH = 600 * 1024;

export interface Prepared {
  blob: Blob;
  name: string;
  type: string;
  width?: number;
  height?: number;
}

export class FileProblem extends Error {
  constructor(readonly code: "too_big" | "slow_down" | "failed") {
    super(code);
  }
}

/** Where a shared file is read from: the API, which checks you're in the office first. `download` saves it rather than showing it. */
export function fileUrl(file: Pick<ChatFile, "key">, download = false): string {
  return `${API_URL}/files/${file.key.slice("att/".length)}${download ? "?download" : ""}`;
}

/** Ready to go up: a picture shrunk if it needs to be, with its size; anything else as it is. */
export async function prepare(file: File): Promise<Prepared> {
  const type = file.type || "application/octet-stream";
  const plain = { blob: file, name: file.name || "file", type };
  if (!isPicture({ type })) return plain;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return plain;
  }
  const { width, height } = bitmap;
  const scale = Math.min(1, LONG_SIDE / Math.max(width, height));
  // Moving pictures, and small ones, keep their own bytes.
  if (type === "image/gif" || (scale === 1 && file.size <= SMALL_ENOUGH)) {
    bitmap.close();
    return { ...plain, width, height };
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  // A browser that can't write WebP hands back a PNG; if that's bigger than what we had, keep the original.
  if (!blob || (blob.type !== "image/webp" && blob.size >= file.size)) return { ...plain, width, height };
  const name = blob.type === "image/webp" ? file.name.replace(/\.[^.]+$/, "") + ".webp" : file.name;
  return { blob, name, type: blob.type, width: canvas.width, height: canvas.height };
}

/**
 * Sends a prepared file up, saying how far along it is; resolves with the file
 * as chat keeps it. `signal` calls it off (the file was taken out of the box).
 */
export function upload(officeId: string, file: Prepared, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<ChatFile> {
  if (file.blob.size > FILE_MAX) return Promise.reject(new FileProblem("too_big"));
  const query = new URLSearchParams({ name: file.name, type: file.type });
  if (file.width && file.height) {
    query.set("width", String(file.width));
    query.set("height", String(file.height));
  }
  return new Promise((resolve, reject) => {
    // XHR rather than fetch: it's the one that can say how much has gone up.
    const request = new XMLHttpRequest();
    request.open("POST", `${API_URL}/offices/${encodeURIComponent(officeId)}/files?${query}`);
    request.withCredentials = true;
    // The bytes as bytes; what kind of file it is goes in the address (see worker-api's files.ts).
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.upload.onprogress = (event) => event.lengthComputable && onProgress?.(event.loaded / event.total);
    request.onload = () => {
      if (request.status === 201) {
        try {
          resolve((JSON.parse(request.responseText) as { file: ChatFile }).file);
        } catch {
          reject(new FileProblem("failed"));
        }
      } else reject(new FileProblem(request.status === 413 ? "too_big" : request.status === 429 ? "slow_down" : "failed"));
    };
    request.onerror = () => reject(new FileProblem("failed"));
    request.onabort = () => reject(new FileProblem("failed"));
    signal?.addEventListener("abort", () => request.abort(), { once: true });
    request.send(file.blob);
  });
}

/**
 * A file that went up but was never sent (taken out of the box, or left there
 * when the conversation changed) is deleted, so nothing is kept that no message
 * shows. `keepalive` lets it finish as the page goes.
 */
export function discard(file: Pick<ChatFile, "key">) {
  void fetch(`${API_URL}/files/${file.key.slice("att/".length)}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    keepalive: true,
  }).catch(() => {});
}

/** "2.4 MB", "830 KB", the way a file's size is said. */
export function sizeOf(bytes: number, locale?: string): string {
  const format = (value: number, unit: "kilobyte" | "megabyte") =>
    new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short", maximumFractionDigits: value < 10 ? 1 : 0 }).format(value);
  return bytes >= 1024 * 1024 ? format(bytes / (1024 * 1024), "megabyte") : format(Math.max(1, bytes / 1024), "kilobyte");
}
