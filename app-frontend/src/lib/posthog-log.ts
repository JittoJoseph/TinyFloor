import { withPostHog } from "web-shared/lib/analytics";

export const posthogLog = {
  info(message: string) {
    withPostHog((posthog) => posthog.logger.info(message));
  },
};
