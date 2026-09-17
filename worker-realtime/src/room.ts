import { DurableObject } from "cloudflare:workers";

/** One workspace room, or one copy of the public lobby. */
export class Room extends DurableObject<Env> {
  presenceCount(): number {
    return this.ctx.getWebSockets().length;
  }
}
