/** Longer than this for an answer from the SFU, and the request fails. */
const REQUEST_TIMEOUT_MS = 8_000;
const API_BASE = "https://rtc.live.cloudflare.com/v1";

export interface SfuTrack {
  location: "local" | "remote";
  mid?: string;
  sessionId?: string;
  trackName: string;
  simulcast?: { preferredRid: string; priorityOrdering: "none" | "asciibetical"; ridNotAvailable: "none" | "asciibetical" };
}

export interface TracksResponse {
  requiresImmediateRenegotiation?: boolean;
  sessionDescription?: { type: "offer" | "answer"; sdp: string };
  tracks?: { mid?: string; trackName?: string; errorCode?: string; errorDescription?: string }[];
}

export class SfuError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/**
 * Cloudflare Realtime SFU over HTTPS. The SFU has no rooms, only sessions (one
 * peer connection each) and named tracks; the Room object decides who may see what.
 */
export class SfuApi {
  constructor(
    private readonly appId: string | undefined,
    private readonly secret: string | undefined,
  ) {}

  async newSession(): Promise<string> {
    const result = await this.request<{ sessionId: string }>("POST", "/sessions/new");
    return result.sessionId;
  }

  /**
   * Adds tracks to a session. Some can fail while others go through: each one
   * comes back with its own `errorCode`, and the SFU's offer or answer covers
   * the rest, so the caller decides; only a failed request as a whole throws.
   */
  newTracks(sessionId: string, tracks: SfuTrack[], offerSdp?: string): Promise<TracksResponse> {
    return this.request(
      "POST",
      `/sessions/${sessionId}/tracks/new`,
      {
        ...(offerSdp ? { sessionDescription: { type: "offer", sdp: offerSdp } } : {}),
        tracks,
      },
      true,
    );
  }

  async renegotiate(sessionId: string, answerSdp: string): Promise<void> {
    await this.request("PUT", `/sessions/${sessionId}/renegotiate`, {
      sessionDescription: { type: "answer", sdp: answerSdp },
    });
  }

  updateTracks(sessionId: string, tracks: SfuTrack[]): Promise<TracksResponse> {
    return this.request("PUT", `/sessions/${sessionId}/tracks/update`, { tracks });
  }

  /** Stops the tracks' data straight away, without renegotiating the connection. */
  async closeTracks(sessionId: string, mids: string[]): Promise<void> {
    if (!mids.length) return;
    await this.request("PUT", `/sessions/${sessionId}/tracks/close`, {
      tracks: mids.map((mid) => ({ mid })),
      force: true,
    });
  }

  private async request<T>(method: string, path: string, body?: unknown, partial = false): Promise<T> {
    if (!this.appId || !this.secret) throw new SfuError("sfu_unavailable");
    // A request that hangs fails on its own (sfu_timeout), so the room's queue of someone's requests moves on only
    // once it has: two at once on one session is what the queue is there to stop (room.ts sfu).
    const response = await fetch(`${API_BASE}/apps/${this.appId}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.secret}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch((error: unknown) => {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new SfuError("sfu_timeout");
      throw error;
    });
    const result = (await response.json().catch(() => ({}))) as T & { errorCode?: string; errorDescription?: string };
    const trackError = (result as TracksResponse).tracks?.find((track) => track.errorCode);
    if (!response.ok || result.errorCode || trackError) {
      // Each refusal in the worker's logs, by what was asked and why, so a meeting that
      // lost its sound can be traced to it; the session's id is left out of the path.
      console.warn("sfu request failed", {
        method,
        path: path.replace(/^\/sessions\/[^/]+/, "/sessions/:id"),
        status: response.status,
        code: result.errorCode ?? trackError?.errorCode ?? null,
        description: result.errorDescription ?? trackError?.errorDescription ?? null,
      });
    }
    if (!response.ok || result.errorCode) throw new SfuError(result.errorCode ?? `sfu_http_${response.status}`);
    if (trackError?.errorCode && !partial) throw new SfuError(trackError.errorCode);
    return result;
  }
}
