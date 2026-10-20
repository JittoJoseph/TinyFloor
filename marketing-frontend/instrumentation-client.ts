// PostHog, for both sites (web-shared/src/shell).
import "@/shell/instrumentation-client";
import { countDemoClicks } from "@/lib/demo-clicks";

countDemoClicks();
