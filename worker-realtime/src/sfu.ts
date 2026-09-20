const API_BASE = "https://rtc.live.cloudflare.com/v1";

export interface SfuTrack {
  location: "local" | "remote";
  mid?: string;
  sessionId?: string;
  trackName: string;
  simulcast?: { preferredRid: string; priorityOrdering: "asciibetical"; ridNotAvailable: "asciibetical" };
}

export interface TracksResponse {
  requiresImmediateRenegotiation?: boolean;
  sessionDescription?: { type: "offer" | "answer"; sdp: string };
  tracks?: { mid?: string; trackName?: string; errorCode?: string }[];
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

  newTracks(sessionId: string, tracks: SfuTrack[], offerSdp?: string): Promise<TracksResponse> {
    return this.request("POST", `/sessions/${sessionId}/tracks/new`, {
      ...(offerSdp ? { sessionDescription: { type: "offer", sdp: offerSdp } } : {}),
      tracks,
    });
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

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.appId || !this.secret) throw new SfuError("sfu_unavailable");
    const response = await fetch(`${API_BASE}/apps/${this.appId}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.secret}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as T & { errorCode?: string };
    if (!response.ok || result.errorCode) throw new SfuError(result.errorCode ?? `sfu_http_${response.status}`);
    const trackError = (result as TracksResponse).tracks?.find((track) => track.errorCode)?.errorCode;
    if (trackError) throw new SfuError(trackError);
    return result;
  }
}
