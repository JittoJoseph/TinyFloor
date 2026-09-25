import { withPostHog } from "./analytics";

export const posthogLog = {
  info(message: string) {
    withPostHog((posthog) => posthog.logger.info(message));
  },
};
