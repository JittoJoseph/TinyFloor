import { DurableObject } from "cloudflare:workers";

/** Decides which copy of the public lobby a visitor goes to. */
export class LobbyRouter extends DurableObject<Env> {
  place(): string {
    return "lobby-1";
  }
}
