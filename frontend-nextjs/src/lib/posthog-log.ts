import posthog from "posthog-js";

const posthogConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST);

export const posthogLog = {
  info(message: string) {
    if (posthogConfigured) posthog.logger.info(message);
  },
};
