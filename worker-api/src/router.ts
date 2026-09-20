export interface Context {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
  params: Record<string, string>;
}

export type Handler = (c: Context) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

/** A small path router: `/workspaces/:id/rooms` style patterns, matched in order. */
export class Router {
  private readonly routes: Route[] = [];

  add(method: string, path: string, handler: Handler): this {
    const keys: string[] = [];
    const source = path.replace(/:(\w+)/g, (_, key: string) => {
      keys.push(key);
      return "([^/]+)";
    });
    this.routes.push({ method, pattern: new RegExp(`^${source}$`), keys, handler });
    return this;
  }

  match(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = route.pattern.exec(pathname);
      if (!match) continue;
      try {
        const params = Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]));
        return { handler: route.handler, params };
      } catch {
        return null; // Malformed escapes in the path.
      }
    }
    return null;
  }
}
